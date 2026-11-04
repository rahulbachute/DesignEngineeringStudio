(function(global) {
 'use strict';
 const number = value => (typeof value==='number'||typeof value==='string') && String(value).trim()!=='' && Number.isFinite(Number(value)) ? Number(value) : null;
 const has = value => value!==null && value!==undefined && value!=='';
 function policy(record) {
  const key=String(record.challengeId||record.rawPayload?.challengeMetadata?.id||'').replace(/^EA-/i,'EC-');
  return Object.values(global.DESEvaluationPolicies||{}).find(p=>p.id===key||p.slug===key||p.title===record.challenge||p.title===record.challengeName)||null;
 }
 function normalize(record) {
  const p=policy(record), raw=record.rawPayload||{};
  const source=record.activities?.length?record.activities:(raw.submissionData?.activityResponses||[]);
  const scores=raw.facultyEvaluation?.rubricScores||{};
  const savedActivities=raw.facultyEvaluation?.evaluation?.activities||[];
  return source.map((a,index)=>{
   const id=a.id||a.activityId||'activity-'+(index+1), rule=p?.activities[id];
   const saved=savedActivities.find(x=>(x.id||x.activityId)===id)||{};
   return {...a,id,name:a.name||a.title||id,title:a.title||a.name||id,
    response:a.response??a.studentResponse??a.answers,
    maxMarks:a.maxMarks ?? a.cceMarks ?? rule?.maxMarks ?? null,
    systemSuggestedMarks:a.systemSuggestedMarks ?? a.suggestedMarks ?? null,
    facultyMarks:saved.facultyMarks ?? a.facultyMarks ?? scores[id] ?? '',
    reason:saved.reason||a.reason||'', rule:rule||null};
  });
 }
 function eligible(a) { return !!a.rule?.allowAutomated && !a.rule.procedural && number(a.maxMarks)>0; }
 function validate(activities,p,complete=true) {
  const errors=[...(p?.errors||[])];
  if(!p) errors.push('Assignment evaluation policy is unavailable.');
  if(!activities.length) errors.push('No recorded activities are available.');
  const ids=new Set(); let maximum=0;
  for(const a of activities) {
   const label=a.name||a.id, m=number(a.maxMarks), f=number(a.facultyMarks), s=number(a.systemSuggestedMarks);
   if(ids.has(a.id)) errors.push(label+': duplicate activity ID'); ids.add(a.id);
   if(!a.rule) errors.push(label+': activity is not mapped to the assignment policy');
   if(m===null||m<0) errors.push(label+': invalid maximum marks');
   else { maximum=Math.round((maximum+m)*100)/100; if(a.rule && m!==number(a.rule.maxMarks)) errors.push(label+': maximum differs from assignment policy'); }
   if(has(a.systemSuggestedMarks)&&(s===null||s<0||m===null||s>m)) errors.push(label+': invalid system suggestion');
   if(has(a.facultyMarks)&&(f===null||f<0||m===null||f>m)) errors.push(label+': faculty marks are out of range or invalid');
   if(complete&&m>0&&f===null) errors.push(label+': faculty marks are missing');
  }
  if(p) {
   for(const [id,r] of Object.entries(p.activities)) if(number(r.maxMarks)>0&&!ids.has(id)) errors.push(id+': scored activity missing from submission');
   if(number(p.total)===null||maximum!==p.total) errors.push('Activity maxima do not equal the assignment total.');
  }
  return {valid:errors.length===0,errors:[...new Set(errors)],message:[...new Set(errors)].join('; ')};
 }
 function accept(activities,p) {
  const accepted=[],skipped=[];
  for(const a of activities) {
   let reason=''; const s=number(a.systemSuggestedMarks),m=number(a.maxMarks);
   if(p?.errors?.length) reason='assignment mapping requires correction';
   else if(m===0||a.rule?.procedural) reason='procedural/zero marks';
   else if(!eligible(a)) reason='independent faculty review required by policy';
   else if(has(a.facultyMarks)&&a.markOrigin!=='system-accepted') reason='faculty marks preserved';
   else if(s===null) reason='missing or invalid suggestion';
   else if(m===null||s<0||s>m) reason='suggestion outside valid range';
   else if(a.rule && m!==number(a.rule.maxMarks)) reason='maximum mapping mismatch';
   if(reason) skipped.push((a.name||a.id)+': '+reason);
   else { a.facultyMarks=s;a.markOrigin='system-accepted';a.isModified=false;accepted.push((a.name||a.id)+': '+s); }
  }
  return {accepted,skipped,errors:validate(activities,p).errors};
 }
 function reportText(report) {
  return 'Accepted '+report.accepted.length+'; skipped '+report.skipped.length+'; validation errors '+report.errors.length+'.'+
   (report.accepted.length?'\nAccepted: '+report.accepted.join('; '):'')+
   (report.skipped.length?'\nSkipped: '+report.skipped.join('; '):'')+
   (report.errors.length?'\nValidation: '+report.errors.join('; '):'');
 }
 global.DESEvaluationRules={number,has,policy,normalize,eligible,validate,accept,reportText};
})(window);
