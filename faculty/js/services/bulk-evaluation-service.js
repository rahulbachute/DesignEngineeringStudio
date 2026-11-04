(function(global) {
  'use strict';
  const rules = global.DESEvaluationRules;
  const hasMark = rules.has;
  function payloadFor(record, activities, policy, user) {
    const rows = activities.map(a => {
      const mark = rules.number(a.facultyMarks);
      return { id:a.id, activityId:a.id, name:a.name, maxMarks:rules.number(a.maxMarks), marks:mark, facultyMarks:mark, reason:a.reason||'' };
    });
    const totalMarks = rows.reduce((sum,a)=>Math.round((sum+(a.facultyMarks??0))*100)/100,0);
    const percentage = Number(((totalMarks / policy.total) * 100).toFixed(2));
    const evaluation = {activities:rows,totalMarks,maxMarks:policy.total,percentage,evaluatedAt:new Date().toISOString()};
    const saved = record.rawPayload?.facultyEvaluation;
    const feedback = saved?.feedback || saved?.remarks || '';
    return { submissionId:record.id, challengeId:policy.id,facultyId:user.facultyId,authFacultyId:user.facultyId,
      facultyName:user.name||'Faculty',facultyEmail:user.email||'',status:'Draft',evaluation,totalMarks,maxMarks:policy.total,percentage,
      rubricScores:Object.fromEntries(rows.map(a=>[a.id,a.facultyMarks])),remarks:feedback,feedback,
      bulkAcceptance:true,suggestionsOnly:true,bulkAcceptedActivityIds:[],expectedEvaluation:saved?.evaluation||null };
  }
  class BulkEvaluation {
    constructor(service) { this.service=service; this.running=false; this.used=new WeakSet(); }
    async prepare(records, user, canEvaluate, progress=()=>{}) {
      if(!user?.facultyId) throw new Error('A signed-in faculty identity is required.');
      if(this.running) throw new Error('A bulk operation is already running.');
      this.running=true;
      const plan={items:[],facultyId:user.facultyId,saveError:'',completed:false};
      try {
        const seen=new Set();
        for(const record of records) {
          const id=String(record.id||'');
          if(!id||seen.has(id)) continue;seen.add(id);
          const entry={id,student:record.studentName||record.prn||id,assignment:record.challenge||record.challengeId||'',status:'Skipped',accepted:[],skipped:[],errors:[]};
          plan.items.push(entry);
          try {
            if(!canEvaluate(record)) throw new Error('This submission is outside your assigned evaluation queue.');
            if(String(record.submissionStatus).toLowerCase()==='evaluated') throw new Error('Already finalized.');
            const detail=await this.service.getSubmissionForEvaluation(id);
            if(!detail||String(detail.id)!==id) throw new Error('Fresh submission details could not be verified.');
            const saved=detail.rawPayload?.facultyEvaluation;
            if(String(saved?.status||detail.submissionStatus).toLowerCase()==='evaluated') throw new Error('Already finalized.');
            const policy=rules.policy(detail), activities=rules.normalize(detail);
            const corrected=detail.rawPayload?.assessmentSummary?.maximumCorrections||[];
            entry.notices=corrected.length?['Reassessed '+corrected.length+' maximum-mark mappings from stored responses; original sheet data is unchanged.']:[];
            entry.accepted=[]; entry.skipped=[];
            for(const activity of activities) {
              const suggestion=rules.number(activity.systemSuggestedMarks);
              if(suggestion!==null && rules.number(activity.maxMarks)>0 && !activity.rule?.procedural) {
                entry.accepted.push((activity.name||activity.id)+': system suggestion '+suggestion+'; faculty mark unchanged');
              } else entry.skipped.push((activity.name||activity.id)+': '+(activity.systemAssessment?.reason||'No system suggestion; faculty review pending'));
            }
            const validation=rules.validate(activities,policy,false);
            if(!validation.valid) { entry.errors=validation.errors;entry.status='Needs correction'; }
            else {
              const pending=activities.filter(a=>rules.number(a.maxMarks)>0&&!hasMark(a.facultyMarks)).length;
              entry.summary=entry.accepted.length+' system suggestions will be saved separately; '+pending+' faculty marks remain blank for review.';
              entry.status='Ready';
              entry.payload=payloadFor(detail,activities,policy,user);
            }
          } catch(error) { entry.errors=[error.message||'Unable to prepare this submission.']; }
          progress(plan);
        }
        if(plan.items.some(item=>item.status==='Ready')) {
          try { await this.service.getEvaluationCapabilities(); }
          catch(error) { plan.saveError=error.message||'Backend draft support is unavailable.'; }
        }
        return plan;
      } finally { this.running=false; }
    }
    async save(plan, user, progress=()=>{}) {
      if(this.running) throw new Error('A bulk operation is already running.');
      if(!plan||this.used.has(plan)||plan.completed) throw new Error('This preview was already used. Create a fresh preview.');
      if(user?.facultyId!==plan.facultyId) throw new Error('Faculty identity changed. Create a fresh preview.');
      if(plan.saveError) throw new Error(plan.saveError);
      this.running=true;
      try {
        // A read-only protocol check must succeed before any draft write reaches an older backend.
        await this.service.getEvaluationCapabilities();
        this.used.add(plan);
        for(const item of plan.items.filter(i=>i.status==='Ready')) {
          item.status='Saving';progress(plan);
          try {
            const result=await this.service.saveEvaluation(item.payload);
            if(!result||result.persisted!==true||result.localOnly||result.success===false||result.ok===false) throw new Error('Backend persistence was not verified. Reload before retrying.');
            item.status='Saved draft';
          } catch(error) {item.status='Failed';item.errors=[error.message||'Draft save failed. Reload before retrying.'];}
          progress(plan);
        }
        plan.completed=true;
        return plan;
      } finally {this.running=false;}
    }
  }
  global.DESBulkEvaluation=BulkEvaluation;
})(window);
