const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
class Element { constructor(){this.listeners={};this.disabled=false;this.value='';this.classList={remove(){}};} addEventListener(n,fn){this.listeners[n]=fn;} querySelectorAll(){return [];} }
function env(){
 const elements={};const c={console,Date,URLSearchParams,AbortController,setTimeout,localStorage:{getItem:()=>null},document:{getElementById:id=>elements[id]??(elements[id]=new Element()),querySelectorAll:()=>[],addEventListener(){}},DESAuth:{isGuest:()=>false,getCurrentUser:()=>({facultyId:'FAC001',name:'Faculty'})},confirm:()=>true};c.window=c;vm.createContext(c);
 for(const file of ['evaluation-policies.js','evaluation-rules.js','data/models.js','data/repository.js','services/bulk-evaluation-service.js','submissions-browser.js'])vm.runInContext(fs.readFileSync('faculty/js/'+file,'utf8'),c);
 vm.runInContext('this.Browser=SubmissionsBrowser;',c);return c;
}
const user={facultyId:'FAC001',name:'Faculty'};
function fixture(c,id='SUB-1',slug='Keys'){
 const p=c.DESEvaluationPolicies[slug];const activities=Object.entries(p.activities).map(([id,r])=>({id,activityId:id,name:id,maxMarks:r.maxMarks,systemSuggestedMarks:r.allowAutomated?Math.min(r.maxMarks,1.25):null,facultyMarks:r.allowAutomated?'':r.maxMarks}));
 return {id,studentName:'Student '+id,challenge:p.title,challengeId:p.id,submissionStatus:'Submitted',activities,
  rawPayload:{studentInformation:{facultyId:'FAC001'},submission:{submissionId:id},challengeMetadata:{id:p.id},submissionData:{activityResponses:copy(activities)}}};
}
function api(records){const written=[];return {written,getSubmissionForEvaluation:async id=>copy(records.find(r=>r.id===id)),getEvaluationCapabilities:async()=>({bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}),saveEvaluation:async p=>{written.push(copy(p));return {success:true,persisted:true};}};}
test('bulk preview includes every filtered submission across pages without saving',async()=>{
 const c=env(),records=Array.from({length:23},(_,i)=>fixture(c,'SUB-'+i)),service=api(records),bulk=new c.DESBulkEvaluation(service);
 const plan=await bulk.prepare(records,user,()=>true);assert.equal(plan.items.length,23);assert.equal(plan.items.filter(i=>i.status==='Ready').length,23);assert.equal(service.written.length,0);
 await bulk.save(plan,user);assert.equal(service.written.length,23);assert.ok(service.written.every(p=>p.status==='Draft'));assert.ok(plan.items.every(i=>i.status==='Saved draft'));
});
test('duplicate list entries are not saved twice; used previews cannot be retried blindly',async()=>{
 const c=env(),r=fixture(c),service=api([r]),bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare([r,r],user,()=>true);
 assert.equal(plan.items.length,1);await bulk.save(plan,user);await assert.rejects(()=>bulk.save(plan,user),/already used/);assert.equal(service.written.length,1);
});
test('manual marks and zero scores are preserved; missing suggestions remain blank',async()=>{
 const c=env(),r=fixture(c);r.activities.find(a=>a.id==='key-design-calculation').facultyMarks=0;
 r.activities.forEach(a=>{a.systemSuggestedMarks=null;});
 const bulk=new c.DESBulkEvaluation(api([r])),plan=await bulk.prepare([r],user,()=>true);assert.equal(plan.items[0].status,'Ready');assert.equal(plan.items[0].payload.evaluation.activities.find(a=>a.id==='key-design-calculation').facultyMarks,0);assert.equal(plan.items[0].payload.evaluation.activities.find(a=>a.id==='design-requirements').facultyMarks,null);
});
test('finalized, unauthorized, unavailable and conflicting submissions are skipped individually',async()=>{
 const c=env(),r=fixture(c,'done');r.submissionStatus='Evaluated';const foreign=fixture(c,'foreign'),conflict=fixture(c,'conflict','borewell-pump'),missing=fixture(c,'missing');
 conflict.activities[0].maxMarks=-1;const service=api([r,foreign,conflict]);service.getSubmissionForEvaluation=async id=>{if(id==='missing')throw Error('offline');return copy([r,foreign,conflict].find(r=>r.id===id));};
 const plan=await new c.DESBulkEvaluation(service).prepare([r,foreign,conflict,missing],user,r=>r.id!=='foreign');
 assert.equal(plan.items.filter(i=>i.status==='Ready').length,0);assert.equal(plan.items.find(i=>i.id==='conflict').status,'Needs correction');assert.equal(service.written.length,0);
});
test('invalid suggestions and activity totals prevent a submission entering the save set',async()=>{
 const c=env(),bad=fixture(c,'bad'),total=fixture(c,'total');bad.activities.find(a=>a.id==='key-design-calculation').systemSuggestedMarks=50;total.activities[2].maxMarks=200;
 const service=api([bad,total]),plan=await new c.DESBulkEvaluation(service).prepare([bad,total],user,()=>true);assert.ok(plan.items.every(i=>i.status==='Needs correction'));assert.equal(service.written.length,0);
});
test('partial failures and local-only responses never count as persisted drafts',async()=>{
 const c=env(),records=['one','two','three'].map(id=>fixture(c,id)),service=api(records);service.saveEvaluation=async p=>{if(p.submissionId==='two')throw Error('write failed');if(p.submissionId==='three')return {success:true,localOnly:true};return {success:true,persisted:true};};
 const bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare(records,user,()=>true);await bulk.save(plan,user);assert.equal(plan.items[0].status,'Saved draft');assert.equal(plan.items[1].status,'Failed');assert.equal(plan.items[2].status,'Failed');
});
test('missing backend support prevents all writes, including support lost after preview',async()=>{
 const c=env(),r=fixture(c),service=api([r]),bulk=new c.DESBulkEvaluation(service);service.getEvaluationCapabilities=async()=>{throw Error('Backend update required');};
 let plan=await bulk.prepare([r],user,()=>true);assert.match(plan.saveError,/update/);await assert.rejects(()=>bulk.save(plan,user),/update/);assert.equal(service.written.length,0);
 service.getEvaluationCapabilities=async()=>({bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true});plan=await bulk.prepare([r],user,()=>true);service.getEvaluationCapabilities=async()=>{throw Error('Backend changed');};await assert.rejects(()=>bulk.save(plan,user),/changed/);assert.equal(service.written.length,0);
});
test('repository checks draft capabilities before making any write to an older deployment',async()=>{
 const c=env(),calls=[];c.DESRepository.request=async action=>{calls.push(action);return {success:true,data:{}};};await assert.rejects(()=>c.DESRepository.saveEvaluation({status:'Draft'}),/does not support/);assert.deepEqual(calls,['evaluationCapabilities']);
});
test('concurrent saves and changed faculty identities are rejected',async()=>{
 const c=env(),r=fixture(c),service=api([r]),bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare([r],user,()=>true);
 await assert.rejects(()=>bulk.save(plan,{facultyId:'FAC002'}),/identity/);let release;service.saveEvaluation=()=>new Promise(resolve=>{release=resolve;});const saving=bulk.save(plan,user);await new Promise(resolve=>setImmediate(resolve));await assert.rejects(()=>bulk.save(plan,user),/already running/);release({persisted:true});await saving;
});
test('backend rejects stale previews, manual overrides, fabricated scores and finalization',async()=>{
 const c=env(),r=fixture(c),service=api([r]),bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare([r],user,()=>true);const p=plan.items[0].payload;
 vm.runInContext(fs.readFileSync('Google Script/05_EvaluationPolicies.gs','utf8'),c);vm.runInContext(fs.readFileSync('Google Script/03_Faculty.gs','utf8'),c);c.safeJsonStringify=JSON.stringify;
 assert.equal(c.validateBulkAcceptance_(p,r.rawPayload,null,'EC-08','FAC001'),'');
 assert.match(c.validateBulkAcceptance_({...p,status:'Evaluated'},r.rawPayload,null,'EC-08','FAC001'),/drafts only/);
 assert.match(c.validateBulkAcceptance_(p,r.rawPayload,{activities:[]},'EC-08','FAC001'),/changed after preview/);
 const tampered=copy(p);tampered.evaluation.activities.find(a=>a.id==='key-design-calculation').facultyMarks=3;assert.match(c.validateBulkAcceptance_(tampered,r.rawPayload,null,'EC-08','FAC001'),/remain unchanged/);
 const manual=copy(p);manual.evaluation.activities.find(a=>a.id==='engineering-decision').facultyMarks=0;assert.match(c.validateBulkAcceptance_(manual,r.rawPayload,null,'EC-08','FAC001'),/remain unchanged/);
 assert.match(c.validateBulkAcceptance_(p,r.rawPayload,null,'EC-08','FAC002'),/allocation/);
});
test('UI requires confirmation, preserves filter snapshot and disables institute/unique/guest bulk access',async()=>{
 const c=env(),b=new c.Browser(),r=fixture(c);b.currentScope='my';b.viewMode='details';b.filteredData=[r];b.canEvaluateRecord=()=>true;c.DESSubmissionService=api([r]);b.showPlaceholderNotice=()=>{};
 await b.prepareBulkSystemMarks();assert.equal(b.bulkPlan.items.length,1);assert.equal(b.elements.bulkSave.disabled,false);c.confirm=()=>false;await b.saveBulkSystemMarks();assert.equal(c.DESSubmissionService.written.length,0);
 c.confirm=()=>true;await b.saveBulkSystemMarks();assert.equal(c.DESSubmissionService.written.length,1);
 b.invalidateBulkPlan();assert.equal(b.elements.bulkSave.disabled,true);
 b.currentScope='institute';b.updateBulkControls();assert.equal(b.elements.bulkPreview.disabled,true);b.currentScope='my';b.viewMode='unique';b.updateBulkControls();assert.equal(b.elements.bulkPreview.disabled,true);b.viewMode='details';c.DESAuth.isGuest=()=>true;b.updateBulkControls();assert.equal(b.elements.bulkPreview.disabled,true);
});
test('bulk UI, service and backend helpers are synchronized and served from local mirrors',()=>{
 for(const file of ['evaluation.html','submissions.html','js/submissions-browser.js','js/services/submission-service.js','js/services/bulk-evaluation-service.js','js/data/repository.js'])assert.equal(fs.readFileSync('faculty/'+file,'utf8'),fs.readFileSync('outputs/meilp/faculty/'+file,'utf8'));
});


test('stepId/maxMarks rubrics resolve to workflow activities and canonical EA/EC IDs',async()=>{
 const c=env();
 for(const slug of ['hydraulic-press','recirculating-ball-steering','mobile-scissor-lift']) {
  const p=c.DESEvaluationPolicies[slug];assert.equal(p.errors.length,0,p.errors.join('; '));assert.equal(p.total,12);
  const rubric=JSON.parse(fs.readFileSync('assignments/'+slug+'/rubric.json','utf8'));
  for(const criterion of rubric.criteria) {
   assert.ok(p.activities[criterion.stepId]);assert.equal(p.activities[criterion.stepId].maxMarks,criterion.maxMarks);
   assert.equal(p.activities[criterion.id],undefined); // crit-01 is a criterion identifier, not a workflow activity.
  }
  const record=fixture(c,'SUB-'+slug,slug);record.challengeId=p.id.replace('EC-','EA-');assert.equal(c.DESEvaluationRules.policy(record).id,p.id);
  const plan=await new c.DESBulkEvaluation(api([record])).prepare([record],user,()=>true);assert.equal(plan.items[0].status,'Ready',plan.items[0].errors.join('; '));
  vm.runInContext(fs.readFileSync('Google Script/05_EvaluationPolicies.gs','utf8'),c);vm.runInContext(fs.readFileSync('Google Script/03_Faculty.gs','utf8'),c);
  assert.equal(c.validateEvaluationMarks_(plan.items[0].payload,record.challengeId),'');
 }
});
test('template suggestions never become student scores when actual recorded suggestions are absent',async()=>{
 const c=env(),record=fixture(c,'NO-SUGGESTIONS','recirculating-ball-steering');
 record.activities.forEach(a=>{delete a.systemSuggestedMarks;});
 const plan=await new c.DESBulkEvaluation(api([record])).prepare([record],user,()=>true);
 assert.equal(plan.items[0].status,'Ready');assert.equal(plan.items[0].accepted.length,0);assert.equal(plan.items[0].payload.suggestionsOnly,true);
 assert.equal(plan.items[0].errors.length,0);assert.ok(plan.items[0].skipped.some(s=>s.includes('No system suggestion')));
 const browser=new c.Browser();browser.renderBulkReport(plan);assert.match(browser.elements.bulkReport.innerHTML,/faculty marks remain blank/);
});
test('approved EA-04/EA-05 definition corrections have valid totals and mappings',()=>{
 const c=env();assert.equal(c.DESEvaluationPolicies['borewell-pump'].errors.length,0);assert.equal(c.DESEvaluationPolicies['failure-analysis'].errors.length,0);assert.equal(c.DESEvaluationPolicies['failure-analysis'].total,12);
 assert.equal(c.DESEvaluationPolicies['helical-spring-design'].id,'EC-12');assert.equal(c.DESEvaluationPolicies['helical-spring-design'].errors.length,0);
});


test('preview distinguishes saved automatic marks, absent calculation answers and manual review',async()=>{
 const c=env(),record=fixture(c,'saved-and-missing','elevator');record.activities.forEach(a=>{a.facultyMarks=null;});
 for(const id of ['identify-components','free-body-diagram'])record.activities.find(a=>a.id===id).facultyMarks=2;
 const calc=record.activities.find(a=>a.id==='engineering-calculations');calc.systemSuggestedMarks=null;calc.systemAssessment={status:'not-assessed',reason:'No answers to graded checks were recorded'};
 const service=api([record]),plan=await new c.DESBulkEvaluation(service).prepare([record],user,()=>true);const entry=plan.items[0];
 assert.equal(entry.status,'Ready');assert.match(entry.summary,/7 faculty marks remain blank/);assert.equal(entry.payload.evaluation.activities.find(a=>a.id==='identify-components').facultyMarks,2);assert.ok(entry.skipped.some(s=>s.includes('No answers to graded checks were recorded')));assert.equal(entry.skipped.length+entry.accepted.length,record.activities.length);assert.equal(service.written.length,0);
});
