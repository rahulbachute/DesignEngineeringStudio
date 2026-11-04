const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = p => fs.readFileSync(p, 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
class Element {
 constructor() { this.listeners={};this.disabled=false;this.value='';this.dataset={};this.classList={remove(){}};this.innerHTML=''; }
 addEventListener(name,fn) { this.listeners[name]=fn; }
 async click() { return this.listeners.click?.(); }
 querySelector() {return null;}
 querySelectorAll() {return [];}
}
function env() {
 const elements={};const document={getElementById:id=>elements[id]??(elements[id]=new Element()),addEventListener(){},querySelectorAll:()=>[]};
 const c={console,document,URLSearchParams,Date,setTimeout,AbortController,localStorage:{getItem:()=>null}, confirm:()=>true, DESAuth:{getCurrentUser:()=>({name:'Faculty',facultyId:'FAC001'}),isGuest:()=>false},bootstrap:{Modal:class {show(){}static getInstance(){return null;}}}};
 c.window=c;vm.createContext(c);
 for(const p of ['evaluation-policies.js','evaluation-rules.js','data/models.js','data/repository.js','evaluation-engine.js','submissions-browser.js']) vm.runInContext(read('faculty/js/'+p),c);
 vm.runInContext('this.Engine=EvaluationEngine;this.Browser=SubmissionsBrowser;this.Activity=ActivityModel;',c);
 return c;
}
function fixture(c,slug='Keys') {
 const p=c.DESEvaluationPolicies[slug];
 const activities=Object.entries(p.activities).map(([id,r])=>({id,name:id,maxMarks:r.maxMarks,systemSuggestedMarks:r.allowAutomated?Math.min(r.maxMarks,1.25):null,facultyMarks:r.allowAutomated?'':r.maxMarks}));
 return {id:'SUB-TEST',challengeId:p.id,challenge:p.title,activities};
}
function engine(c,record=fixture(c)) {
 const e=new c.Engine();e.currentEvaluation=e.createEvaluationFromSubmission(record);e.activityState=e.createActivityState(e.currentEvaluation.activities);e.renderActivities=()=>{};e.renderSummary=()=>{};e.renderHeader=()=>{};e.showToast=()=>{};e.bindEvents();return e;
}
function backend(c) {
 const b={console,JSON,Date,Number,String,Array,Object,isFinite};vm.createContext(b);
 vm.runInContext(read('Google Script/05_EvaluationPolicies.gs'),b);
 vm.runInContext(read('Google Script/03_Faculty.gs'),b);
 b.safeJsonParse=(s,f)=>{try{return JSON.parse(s);}catch{return f;}};
 b.safeJsonStringify=JSON.stringify;b.response=(data,success=true,error='',status=200)=>({data,success,error,status});b.logError=()=>{};b.debugLog=()=>{};
 b.getHeaderMap=h=>Object.fromEntries(h.map((x,i)=>[x,i]));
 b.CONFIG={SHEETS:{SUBMISSIONS:'subs',EVALUATION:'eval'},HEADERS:{EVALUATION:['Submission ID','Status','Evaluation','Total Marks','Max Marks','Rubric Scores','Faculty ID']},LOCK_TIMEOUT_MS:1000};
 b.LockService={getScriptLock:()=>({waitLock(){},tryLock:()=>true,releaseLock(){}})};
 let flushed=0;
 b.SpreadsheetApp={flush:()=>{flushed++;}};
 class Sheet {
  constructor(rows){this.rows=rows;this.fail=false;this.corrupt=false;}
  getDataRange(){return {getValues:()=>copy(this.rows)};}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return this.rows[0].length;}
  appendRow(row){if(this.fail)throw Error('write failure');this.rows.push(copy(row));if(this.corrupt)this.rows[this.rows.length-1][2]='{}';}
  getRange(row,col,n=1,m=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.rows[row+i-1]?.[col+j-1]??'')),setValue:v=>{this.rows[row-1][col-1]=v;},setValues:values=>{for(let i=0;i<n;i++){this.rows[row+i-1]??=[];for(let j=0;j<m;j++)this.rows[row+i-1][col+j-1]=values[i][j];}}};}
 }
 const subs=new Sheet([['Submission ID','Status','Challenge ID','Student Name'],['SUB-TEST','Submitted','EC-08','Student']]);
 const evaluations=new Sheet([b.CONFIG.HEADERS.EVALUATION.slice()]);
 b.getSheet=name=>name==='subs'?subs:evaluations;b.getSheetSafe_=()=>null;
 return {b,subs,evaluations,flushed:()=>flushed};
}
test('accept uses actual suggestions, repeats safely, and preserves every independently entered score and reason',async()=>{
 const c=env(),e=engine(c);const r=c.DESEvaluationRules;
 const manual=e.activityState.find(a=>a.id==='design-requirements');manual.facultyMarks=0;manual.reason='Reviewed independently';
 await e.elements.acceptAllButton.click();
 const a=e.activityState.find(a=>a.id==='key-design-calculation');assert.equal(a.facultyMarks,1.25);assert.notEqual(a.facultyMarks,a.maxMarks);
 assert.equal(manual.facultyMarks,0);assert.equal(manual.reason,'Reviewed independently');
 const first=copy(e.activityState);await e.elements.acceptAllButton.click();assert.deepEqual(copy(e.activityState),first);
 a.facultyMarks=0.5;a.markOrigin='faculty';await e.elements.acceptAllButton.click();assert.equal(a.facultyMarks,0.5);
 assert.ok(e.lastAcceptanceReport.skipped.some(s=>s.includes('faculty marks preserved')));
});
test('missing suggestions never become full marks, including during model/repository normalization',()=>{
 const c=env(),record=fixture(c);record.activities.find(a=>a.id==='key-design-calculation').systemSuggestedMarks=null;
 const e=engine(c,record);e.acceptSystemMarks();assert.equal(e.activityState.find(a=>a.id==='key-design-calculation').facultyMarks,'');assert.equal(e.validateEvaluation().valid,false);
 const model=new c.Activity({id:'x',maxMarks:3,facultyMarks:0});assert.equal(model.systemSuggestedMarks,null);assert.equal(model.facultyMarks,0);
 const extracted=c.DESRepository.extractActivities({submissionData:{activityResponses:[{activityId:'x',cceMarks:3}]}},{});assert.equal(extracted[0].systemSuggestedMarks,null);
});
test('zero marks, procedural activities, independent academic judgement and explicit policy opt-outs are skipped',()=>{
 const c=env(),p=c.DESEvaluationPolicies.Keys;
 const a=[{id:'zero',name:'zero',maxMarks:0,systemSuggestedMarks:0,facultyMarks:'',rule:{maxMarks:0,allowAutomated:true}}, {id:'setup',name:'setup',maxMarks:1,systemSuggestedMarks:1,facultyMarks:'',rule:{maxMarks:1,allowAutomated:true,procedural:true}}, {id:'decision',name:'decision',maxMarks:2,systemSuggestedMarks:2,facultyMarks:'',rule:{maxMarks:2,allowAutomated:false}}];
 const report=c.DESEvaluationRules.accept(a,p);assert.equal(report.accepted.length,0);assert.equal(report.skipped.length,3);
 assert.equal(c.DESEvaluationPolicies.shafts.activities['shaft-design-calculation'].allowAutomated,false);
});
test('valid zero suggestion is accepted; missing, nonnumeric, infinite and out-of-range marks block final submission',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const a=e.activityState.find(a=>a.id==='key-design-calculation');
 a.facultyMarks='';a.systemSuggestedMarks=0;e.acceptSystemMarks();assert.equal(a.facultyMarks,0);assert.equal(e.validateEvaluation().valid,true);
 for(const value of ['',null,undefined,'NaN',Infinity,true,-1,4]) {a.facultyMarks=value;assert.equal(e.validateEvaluation().valid,false,String(value));}
 a.facultyMarks=1;for(const value of ['bad',Infinity,-1,4]){a.systemSuggestedMarks=value;assert.equal(e.validateEvaluation().valid,false);}
});
test('assignment maxima, totals, duplicate IDs and missing scored activities are validated',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();assert.equal(e.validateEvaluation().valid,true);
 e.activityState[0].maxMarks=-1;assert.equal(e.validateEvaluation().valid,false);
 const f=engine(c);f.acceptSystemMarks();f.policy={...f.policy,total:100};assert.equal(f.validateEvaluation().valid,false);
 f.policy=c.DESEvaluationPolicies.Keys;f.activityState=f.activityState.filter(a=>a.id!=='key-design-calculation');assert.equal(f.validateEvaluation().valid,false);
});
test('EA-01 through EA-09 use canonical IDs, maxima and policy conflicts, without placeholder activities',()=>{
 const c=env();for(const slug of ['elevator','motorcycle','materials-selection','borewell-pump','failure-analysis','stress-concentration','shafts','Keys','coupling']){
  const record=fixture(c,slug);record.challengeId=record.challengeId.replace('EC-','EA-');const p=c.DESEvaluationRules.policy(record);assert.equal(p.slug,slug);
  const e=engine(c,{...record,activities:record.activities.slice(0,1)});assert.equal(e.activityState.length,1);assert.equal(e.validateEvaluation().valid,false);
 }
 assert.equal(c.DESEvaluationPolicies.elevator.total,24);assert.equal(c.DESEvaluationPolicies['materials-selection'].total,30);
 assert.equal(c.DESEvaluationPolicies['borewell-pump'].errors.length,0);
 assert.equal(c.DESEvaluationPolicies['failure-analysis'].errors.length,0);
});
test('both routes normalize identical recorded suggestions and preserve saved faculty scores',()=>{
 const c=env(),record=fixture(c);record.rawPayload={facultyEvaluation:{rubricScores:{'key-design-calculation':0.5}}};
 const saved=record.activities.find(a=>a.id==='key-design-calculation');delete saved.facultyMarks;
 const e=engine(c,record),browser=new c.Browser();assert.deepEqual(copy(e.activityState.map(a=>[a.id,a.maxMarks,a.systemSuggestedMarks,a.facultyMarks])),copy(browser.evaluationActivities(record).map(a=>[a.id,a.maxMarks,a.systemSuggestedMarks,a.facultyMarks])));
 assert.equal(e.activityState.find(a=>a.id==='key-design-calculation').facultyMarks,0.5);
});
test('engine acceptance never calls save; final save requires explicit confirmation',async()=>{
 const c=env(),e=engine(c);let calls=0;c.DESEvaluationService={saveEvaluation:async()=>{calls++;return {persisted:true};}};
 await e.elements.acceptAllButton.click();assert.equal(calls,0);
 c.confirm=()=>false;await e.elements.submitButton.click();assert.equal(calls,0);
 c.confirm=()=>true;await e.elements.submitButton.click();assert.equal(calls,1);
});
test('repository rejects network failures, local-only success, unverified success and mismatched backend readback',async()=>{
 const c=env(),repo=c.DESRepository,e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated');
 repo.request=async()=>{throw Error('offline');};await assert.rejects(()=>repo.saveEvaluation(payload),/offline/);
 for(const result of [{success:true,localOnly:true},{success:true,data:{submissionId:payload.submissionId,status:'Evaluated'}},{success:true,data:{persisted:true,submissionId:payload.submissionId,status:'Evaluated',evaluation:{}}}]){
  repo.request=async action=>action==='evaluationCapabilities'?{success:true,data:{bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}}:result;await assert.rejects(()=>repo.saveEvaluation(payload),/persistence/);
 }
});
test('backend rejects invalid totals, out-of-range marks and conflicting assignment mappings before writes',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated'),{b}=backend(c);
 assert.equal(b.validateEvaluationMarks_(payload,'EC-08'),'');
 const bad=copy(payload);bad.totalMarks+=1;assert.match(b.validateEvaluationMarks_(bad,'EC-08'),/total/);
 const range=copy(payload);range.evaluation.activities.find(a=>a.id==='key-design-calculation').facultyMarks=99;assert.match(b.validateEvaluationMarks_(range,'EC-08'),/range/);
 assert.match(b.validateEvaluationMarks_(payload,'EC-04'),/identity mismatch/);
});
test('successful persistence requires actual backend row readback and then repository verification',async()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated');const {b,subs,evaluations,flushed}=backend(c);
 const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);assert.equal(result.data.persisted,true);assert.ok(flushed()>0);assert.equal(evaluations.rows.length,2);assert.equal(subs.rows[1][1],'Evaluated');
 c.DESRepository.request=async action=>action==='evaluationCapabilities'?{success:true,data:{bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}}:copy(result);const verified=await c.DESRepository.saveEvaluation(payload);assert.equal(verified.persisted,true);
 const reloaded=b.attachSavedEvaluation_({},payload.submissionId);assert.equal(reloaded.facultyEvaluation.rubricScores['key-design-calculation'],1.25);
 const duplicate=b.saveEvaluation(payload);assert.equal(duplicate.success,false);assert.equal(evaluations.rows.length,2);
});
test('backend write and readback failures cannot produce persistence success',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated');
 for(const fault of ['fail','corrupt']){const {b,evaluations}=backend(c);evaluations[fault]=true;const result=b.saveEvaluation(payload);assert.equal(result.success,false,fault);assert.notEqual(result.data?.persisted,true);}
});
test('draft saves keep submission open and final saves update the same draft row',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const {b,subs,evaluations}=backend(c);
 const draft=e.buildEvaluationPayload('Draft');let result=b.saveEvaluation(draft);assert.equal(result.success,true,result.error);assert.equal(subs.rows[1][1],'Submitted');assert.equal(result.data.status,'Draft');
 result=b.saveEvaluation(e.buildEvaluationPayload('Evaluated'));assert.equal(result.success,true,result.error);assert.equal(evaluations.rows.length,2);assert.equal(subs.rows[1][1],'Evaluated');
});
test('mirrored evaluation routes and shared dependencies stay byte-identical',()=>{
 for(const file of ['evaluation.html','submissions.html','js/evaluation-engine.js','js/submissions-browser.js','js/evaluation-policies.js','js/evaluation-rules.js','js/data/models.js','js/data/repository.js']) assert.equal(read('faculty/'+file),read('outputs/meilp/faculty/'+file));
});


class EvaluationContent extends Element {
 set innerHTML(html) {
  this.html=html;this.inputs=[];
  for(const tag of html.match(/<input[^>]+data-eval-marks[^>]*>/g)||[]) {
   const input=new Element();input.value=tag.match(/value="([^"]*)"/)?.[1]||'';input.dataset.activityId=tag.match(/data-activity-id="([^"]*)"/)?.[1];this.inputs.push(input);
  }
  this.accept=new Element();this.report=new Element();this.total=new Element();this.remarks=new Element();
 }
 get innerHTML(){return this.html;}
 querySelector(selector){return {'[data-accept-system]':this.accept,'[data-acceptance-report]':this.report,'[data-eval-total]':this.total,'[data-eval-remarks]':this.remarks}[selector]||null;}
 querySelectorAll(selector){return selector.includes(',')?[...this.inputs,this.accept,this.remarks]:selector==='[data-eval-marks]'?this.inputs:[];}
}
test('modal one-click acceptance and save controls preserve manual edits, validate fields and require confirmation',async()=>{
 const c=env(),browser=new c.Browser(),record=fixture(c);browser.canEvaluateRecord=()=>true;browser.loadSubmissionDetail=async()=>record;browser.renderTable=()=>{};browser.showPlaceholderNotice=()=>{};
 browser.elements.evaluationContent=new EvaluationContent();browser.bindEvents();await browser.openEvaluationModal(record);
 const content=browser.elements.evaluationContent;assert.equal(browser.elements.saveEvaluationButton.disabled,true);
 assert.equal(content.inputs.find(a=>a.dataset.activityId==='key-design-calculation').value,'');
 let saved=0;c.DESSubmissionService={saveEvaluation:async payload=>{saved++;return {success:true,persisted:true};}};
 await content.accept.click();assert.equal(saved,0);assert.equal(content.inputs.find(a=>a.dataset.activityId==='key-design-calculation').value,1.25);assert.equal(browser.elements.saveEvaluationButton.disabled,false);
 const manual=content.inputs.find(a=>a.dataset.activityId==='key-design-calculation');manual.value='0';manual.listeners.input();await content.accept.click();assert.equal(manual.value,'0');
 const payload=browser.buildEvaluationPayload(record);assert.equal(payload.evaluation.activities.find(a=>a.id==='key-design-calculation').facultyMarks,0);
 manual.value='';manual.listeners.input();assert.equal(browser.elements.saveEvaluationButton.disabled,true);assert.throws(()=>browser.buildEvaluationPayload(record),/missing/);
 manual.value='0';manual.listeners.input();c.confirm=()=>false;await browser.elements.saveEvaluationButton.click();assert.equal(saved,0);
 c.confirm=()=>true;await browser.elements.saveEvaluationButton.click();assert.equal(saved,1);
});
test('guest engine initialization retains disabled editing controls',async()=>{
 const c=env();c.DESAuth.isGuest=()=>true;c.DESAuth.hasPermission=()=>true;
 const e=new c.Engine();e.getSubmissionIdFromUrl=()=>'';e.renderHeader=()=>{};e.renderSummary=()=>{};await e.init();
 assert.equal(e.elements.saveButton.disabled,true);assert.equal(e.elements.submitButton.disabled,true);assert.equal(e.elements.acceptAllButton.disabled,true);
});
test('draft can retain missing faculty marks without turning them into final zero scores',()=>{
 const c=env(),e=engine(c);const {b,subs}=backend(c);const draft=e.buildEvaluationPayload('Draft');
 assert.equal(e.validateEvaluation(false).valid,true);assert.equal(e.validateEvaluation(true).valid,false);
 const result=b.saveEvaluation(draft);assert.equal(result.success,true,result.error);assert.equal(subs.rows[1][1],'Submitted');
 assert.equal(result.data.evaluation.activities.find(a=>a.id==='key-design-calculation').facultyMarks,null);
});


test('bulk acceptance persists verified drafts through the full backend and rejects a reused stale snapshot',async()=>{
 const c=env();vm.runInContext(read('faculty/js/services/bulk-evaluation-service.js'),c);
 const record=fixture(c);record.rawPayload={studentInformation:{facultyId:'FAC001'},submission:{submissionId:record.id},submissionData:{activityResponses:copy(record.activities)}};
 const {b,subs,evaluations}=backend(c);subs.rows[0].push('Full JSON Payload');subs.rows[1].push(JSON.stringify(record.rawPayload));
 c.DESRepository.request=async(action,payload)=>action==='evaluationCapabilities'?{success:true,data:{bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}}:copy(b.saveEvaluation(payload));
 const service={getSubmissionForEvaluation:async()=>record,getEvaluationCapabilities:()=>c.DESRepository.getEvaluationCapabilities(),saveEvaluation:p=>c.DESRepository.saveEvaluation(p)};
 const bulk=new c.DESBulkEvaluation(service);const plan=await bulk.prepare([record],{facultyId:'FAC001',name:'Faculty'},()=>true);assert.equal(plan.items[0].status,'Ready');
 await bulk.save(plan,{facultyId:'FAC001'});assert.equal(plan.items[0].status,'Saved draft');assert.equal(subs.rows[1][1],'Submitted');assert.equal(evaluations.rows.length,2);
 const stale=b.saveEvaluation(plan.items[0].payload);assert.equal(stale.success,false);assert.match(stale.error,/changed after preview/);assert.equal(evaluations.rows.length,2);
});


test('historical zero-max elevator responses become verified bulk drafts with backend answer-key reassessment',async()=>{
 const c=env();vm.runInContext(read('js/assessment-core.js'),c);vm.runInContext(read('faculty/js/services/bulk-evaluation-service.js'),c);
 const {b,subs,evaluations}=backend(c);vm.runInContext(read('Google Script/06_AssessmentCore.gs'),b);
 const policy=c.DESEvaluationPolicies.elevator;
 const raw={studentInformation:{facultyId:'FAC001',name:'Student'},challengeMetadata:{id:'EC-01',title:policy.title},submission:{submissionId:'SUB-TEST',status:'Submitted'},submissionData:{activityResponses:Object.entries(policy.activities).filter(([id])=>id!=='submit').map(([id,rule])=>({activityId:id,title:id,cceMarks:0,response:Object.fromEntries((rule.assessment.checks||[]).map(check=>[check.key,check.kind==='numeric'?check.expected:check.accepted[0]]))}))}};
 subs.rows[0].push('Full JSON Payload');subs.rows[1][2]='EC-01';subs.rows[1].push(JSON.stringify(raw));const originalJSON=subs.rows[1][4];
 const fresh=c.DESRepository.normalizeSubmission(b.attachSavedEvaluation_(b.reassessSubmissionPayload_(copy(raw)),'SUB-TEST'));
 c.DESRepository.request=async(action,payload)=>action==='evaluationCapabilities'?{success:true,data:{bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}}:copy(b.saveEvaluation(payload));
 const service={getSubmissionForEvaluation:async()=>fresh,getEvaluationCapabilities:()=>c.DESRepository.getEvaluationCapabilities(),saveEvaluation:p=>c.DESRepository.saveEvaluation(p)};
 const bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare([{id:'SUB-TEST',studentName:'Student',submissionStatus:'Submitted'}],{facultyId:'FAC001',name:'Faculty'},()=>true);
 assert.equal(plan.items[0].status,'Ready',plan.items[0].errors.join('; '));assert.equal(plan.items[0].accepted.length,3);assert.equal(plan.items[0].payload.totalMarks,0);assert.ok(plan.items[0].payload.evaluation.activities.every(a=>a.facultyMarks===null));
 await bulk.save(plan,{facultyId:'FAC001'});assert.equal(plan.items[0].status,'Saved draft');assert.equal(evaluations.rows.length,2);assert.equal(subs.rows[1][1],'Submitted');assert.equal(subs.rows[1][4],originalJSON);
});
test('fractional Failure Analysis weights validate and persist without floating-point total failures',()=>{
 const c=env(),e=engine(c,fixture(c,'failure-analysis'));const {b,subs}=backend(c);subs.rows[1][2]='EC-05';
 assert.equal(e.validateEvaluation().valid,true);const payload=e.buildEvaluationPayload('Draft');assert.equal(payload.totalMarks,12);assert.equal(payload.maxMarks,12);
 const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);
});


test('activity-wise draft cells preserve numeric zeros, pending blanks and exact scored/pending counts',()=>{
 const c=env(),record=fixture(c,'elevator');record.activities.forEach(a=>{a.facultyMarks=null;});
 record.activities.find(a=>a.id==='identify-components').facultyMarks=0;
 record.activities.find(a=>a.id==='free-body-diagram').facultyMarks=2;
 const e=engine(c,record),payload=e.buildEvaluationPayload('Draft'),{b,subs,evaluations}=backend(c);subs.rows[1][2]='EC-01';
 delete payload.rubricScores; // Derive activity columns from evaluation.activities without inventing zeros for pending work.
 const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);assert.equal(result.data.activityMarksPersisted,true);
 const h=b.getHeaderMap(evaluations.rows[0]),row=evaluations.rows[1];
 assert.equal(row[h['identify-components']],0);assert.equal(row[h['free-body-diagram']],2);assert.equal(row[h['engineering-calculations']],'');
 assert.equal(row[h['Scored Activities']],2);assert.equal(row[h['Pending Activities']],7);
 assert.equal(result.data.rubricScores['engineering-calculations'],null);assert.equal(result.data.rubricScores['identify-components'],0);
});
test('an incorrect activity cell fails persistence verification even if totals and evaluation JSON are correct',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated');
 for(const fault of ['activity-cell','rubric-json']) {
  const {b,subs,evaluations}=backend(c);const append=evaluations.appendRow.bind(evaluations);
  evaluations.appendRow=row=>{append(row);const map=b.getHeaderMap(evaluations.rows[0]);evaluations.rows[1][map[fault==='activity-cell'?'key-design-calculation':'Rubric Scores']]=fault==='activity-cell'?999:'{}';};
  const result=b.saveEvaluation(payload);assert.equal(result.success,false,fault);assert.equal(subs.rows[1][1],'Submitted');
 }
});
test('repository rejects totals-only persistence responses and mismatched activity readback',async()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated');
 c.DESRepository.request=async action=>action==='evaluationCapabilities'?{success:true,data:{bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}}:{success:true,data:{persisted:true,activityMarksPersisted:true,submissionId:payload.submissionId,status:payload.status,evaluation:payload.evaluation,rubricScores:{}}};
 await assert.rejects(()=>c.DESRepository.saveEvaluation(payload),/persistence/);
 const calls=[];c.DESRepository.request=async action=>{calls.push(action);return {success:true,data:{bulkDraftProtocol:'protected-draft-v2'}};};
 await assert.rejects(()=>c.DESRepository.saveEvaluation(payload),/backend/);assert.deepEqual(calls,['evaluationCapabilities']);
});


test('system suggestions persist in separate verified fields while new faculty awards and totals stay blank',async()=>{
 const c=env();vm.runInContext(read('faculty/js/services/bulk-evaluation-service.js'),c);
 const record=fixture(c,'elevator');record.activities.forEach(a=>{a.facultyMarks=null;});
 record.rawPayload={studentInformation:{facultyId:'FAC001'},submission:{submissionId:record.id},challengeMetadata:{id:'EC-01'},submissionData:{activityResponses:copy(record.activities)}};
 const {b,subs,evaluations}=backend(c);subs.rows[0].push('Full JSON Payload');subs.rows[1][2]='EC-01';subs.rows[1].push(JSON.stringify(record.rawPayload));
 const service={getSubmissionForEvaluation:async()=>record,getEvaluationCapabilities:async()=>({bulkDraftProtocol:'protected-draft-v2',activityMarksReadback:true,separateSystemMarks:true}),saveEvaluation:async payload=>{const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);return {...result,persisted:result.data.persisted};}};
 const bulk=new c.DESBulkEvaluation(service),plan=await bulk.prepare([record],{facultyId:'FAC001',name:'Faculty'},()=>true);
 assert.equal(plan.items[0].status,'Ready');assert.equal(plan.items[0].payload.suggestionsOnly,true);assert.ok(plan.items[0].payload.evaluation.activities.every(a=>a.facultyMarks===null));
 await bulk.save(plan,{facultyId:'FAC001'});assert.equal(plan.items[0].status,'Saved draft');
 const headers=b.getHeaderMap(evaluations.rows[0]),row=evaluations.rows[1];assert.equal(row[headers['identify-components']],'');assert.equal(row[headers['System: identify-components']],1.25);
 assert.equal(row[headers['Faculty Total']],'');assert.equal(row[headers['Total Marks']],'');assert.equal(row[headers['Marks']],'');assert.equal(row[headers['Scored Activities']],0);assert.equal(row[headers['Pending Activities']],9);
 const faculty=JSON.parse(row[headers['Faculty Marks']]),system=JSON.parse(row[headers['System Marks']]);assert.equal(faculty['identify-components'],null);assert.equal(system['identify-components'],1.25);assert.ok(row[headers['System Total']]>0);assert.equal(subs.rows[1][1],'Submitted');
 const fresh=b.attachSavedEvaluation_({},record.id);assert.equal(fresh.facultyEvaluation.systemMarks['identify-components'],1.25);assert.equal(fresh.facultyEvaluation.rubricScores['identify-components'],null);
});
test('review-only drafts can persist with both mark sets blank, without converting missing suggestions to zero',()=>{
 const c=env(),record=fixture(c,'materials-selection');record.activities.forEach(a=>{a.facultyMarks=null;});
 const e=engine(c,record),payload=e.buildEvaluationPayload('Draft'),{b,subs,evaluations}=backend(c);subs.rows[1][2]='EC-03';
 const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);assert.equal(result.data.systemTotal,null);assert.equal(result.data.facultyTotal,null);
 const h=b.getHeaderMap(evaluations.rows[0]),row=evaluations.rows[1];assert.equal(row[h['System Total']],'');assert.equal(row[h['Faculty Total']],'');assert.equal(row[h['System: drs-01-chassis']],'');assert.equal(row[h['drs-01-chassis']],'');
});
test('corrupted System Marks cells cannot pass save verification even if Faculty Marks and totals are correct',()=>{
 const c=env(),e=engine(c);e.acceptSystemMarks();const payload=e.buildEvaluationPayload('Evaluated'),{b,subs,evaluations}=backend(c),append=evaluations.appendRow.bind(evaluations);
 evaluations.appendRow=row=>{append(row);const h=b.getHeaderMap(evaluations.rows[0]);evaluations.rows[1][h['System: key-design-calculation']]=99;};
 const result=b.saveEvaluation(payload);assert.equal(result.success,false);assert.equal(subs.rows[1][1],'Submitted');
});


test('an actual system zero is stored as zero without becoming a faculty award',()=>{
 const c=env(),record=fixture(c,'elevator');record.activities.forEach(a=>{a.facultyMarks=null;a.systemSuggestedMarks=null;});record.activities.find(a=>a.id==='identify-components').systemSuggestedMarks=0;
 const e=engine(c,record),payload=e.buildEvaluationPayload('Draft'),{b,subs,evaluations}=backend(c);subs.rows[0].push('Full JSON Payload');subs.rows[1][2]='EC-01';subs.rows[1].push(JSON.stringify({challengeMetadata:{id:'EC-01'},submissionData:{activityResponses:record.activities}}));
 const result=b.saveEvaluation(payload);assert.equal(result.success,true,result.error);assert.equal(result.data.systemMarks['identify-components'],0);assert.equal(result.data.systemTotal,0);assert.equal(result.data.facultyTotal,null);
 const h=b.getHeaderMap(evaluations.rows[0]),row=evaluations.rows[1];assert.equal(row[h['System: identify-components']],0);assert.equal(row[h['identify-components']],'');assert.equal(row[h['System Total']],0);assert.equal(row[h['Faculty Total']],'');
});
