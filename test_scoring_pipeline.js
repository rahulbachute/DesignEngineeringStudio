const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
const catalog=JSON.parse(fs.readFileSync('data/assignments.json','utf8')).assignments;
function context(){const c={window:{},console};vm.createContext(c);for(const file of ['js/assessment-core.js','js/submission-engine.js','faculty/js/evaluation-policies.js','Google Script/03_Faculty.gs'])vm.runInContext(fs.readFileSync(file,'utf8'),c);c.DES_EVALUATION_POLICIES=c.window.DESEvaluationPolicies;c.safeJsonStringify=JSON.stringify;return c;}
function load(item){const slug=new URL(item.launchPath,'http://local').searchParams.get('assignment'),base='assignments/'+slug+'/';return {slug,config:JSON.parse(fs.readFileSync(base+'config.json')),rubric:JSON.parse(fs.readFileSync(base+'rubric.json')),workflow:JSON.parse(fs.readFileSync(base+'workflow.json')),content:JSON.parse(fs.readFileSync(base+'content.json'))};}
function answers(definition){return Object.fromEntries((definition.checks||[]).map(check=>[check.key,check.kind==='numeric'?check.expected:check.accepted[0]]));}
for(const item of catalog)test(item.id+': correct maxima, keyed scoring, explicit manual status and faculty opt-outs',()=>{
 const c=context(),data=load(item),core=c.DESAssessmentCore,engine=new c.window.MEILP.SubmissionEngine({storage:{}}),policy=c.window.DESEvaluationPolicies[data.slug];
 assert.equal(policy.errors.length,0,policy.errors.join('; '));
 const groups=core.groups(data.rubric),steps=data.workflow.steps.filter(s=>s.component!=='submission-summary'),responses={};
 for(const step of steps){const definition=core.compile(step,groups[step.id],data.content.activities?.[step.id]||{});responses[step.id]=answers(definition);if(definition.allowAutomated)assert.ok(definition.checks.length,step.id+' lacks an explicit answer key');}
 const built=engine.buildActivityResponses(steps,responses,data.rubric,data.content);
 let maxTotal=0;
 for(const row of built){const rule=policy.activities[row.activityId];assert.equal(row.cceMarks,rule.maxMarks);maxTotal+=row.cceMarks;
  assert.ok(Object.hasOwn(row,'systemSuggestedMarks'));
  if(rule.allowAutomated){assert.equal(row.systemSuggestedMarks,row.cceMarks,row.activityId);assert.equal(row.systemAssessment.status,'assessed');}
  else {assert.equal(row.systemSuggestedMarks,null,row.activityId+' must remain independent');assert.equal(row.systemAssessment.status,'faculty-review');}
 }
 assert.ok(Math.abs(maxTotal-policy.total)<1e-8);
});
test('attempting all activities never guarantees full marks; empty checks stay unassessed',()=>{
 const c=context(),d=load(catalog[0]),core=c.DESAssessmentCore,def=core.compile(d.workflow.steps.find(s=>s.id==='identify-components'),core.groups(d.rubric)['identify-components'],d.content.activities['identify-components']);
 const wrong=Object.fromEntries(def.checks.map(ch=>[ch.key,'wrong']));assert.equal(core.assess(def,wrong).marks,0);assert.equal(core.assess(def,{}).marks,null);
 const half=answers(def);def.checks.slice(0,10).forEach(ch=>{half[ch.key]='wrong';});assert.equal(core.assess(def,half).marks,1);
 const forged={answers:wrong,componentResponses:def.checks.map(()=>({correct:true,correctAnswer:'forged'})),systemSuggestedMarks:2};assert.equal(core.assess(def,forged).marks,0);
});
test('numeric answer keys use declared tolerances, including zero, and ignore completion flags',()=>{
 const c=context(),def={allowAutomated:true,maxMarks:2,checks:[{kind:'numeric',key:'x',expected:0,tolerance:.1}]};
 assert.equal(c.DESAssessmentCore.assess(def,{x:0}).marks,2);assert.equal(c.DESAssessmentCore.assess(def,{x:.1}).marks,2);assert.equal(c.DESAssessmentCore.assess(def,{x:.101}).marks,0);assert.equal(c.DESAssessmentCore.assess(def,{x:'bad',completed:true}).marks,0);assert.equal(c.DESAssessmentCore.assess(def,{completed:true}).marks,null);
});
test('trusted MCQ keys support id/value/label, questions, and answer aliases',()=>{
 const c=context(),core=c.DESAssessmentCore,step={id:'q',component:'text-mcq',marks:1};
 const def=core.compile(step,null,{mcq:{options:[{id:'a',label:'Correct answer',value:'correct'},{id:'b',value:'incorrect'}]}});
 for(const value of ['a','correct','Correct answer'])assert.equal(core.assess(def,{mcq:value}).marks,1);
 assert.equal(core.assess(def,{mcq:'b'}).marks,0);
 const declared=core.compile(step,null,{mcq:{answer:'b',options:[{id:'a',label:'Wrong'},{id:'b',label:'Right'}]}});assert.equal(core.assess(declared,{mcq:'Right'}).marks,1);
 const multiple=core.compile(step,null,{questions:[{id:'one',options:[{id:'a',correct:true}]},{id:'two',options:[{id:'b',correct:true}]}]});assert.equal(core.assess(multiple,{one:'a',two:'wrong'}).marks,.5);
});
test('historical elevator maxima and scores are reassessed without changing faculty marks or raw input',()=>{
 const c=context(),d=load(catalog[0]),groups=c.DESAssessmentCore.groups(d.rubric);
 const original={challengeMetadata:{id:'EC-01'},submissionData:{activityResponses:d.workflow.steps.filter(s=>s.component!=='submission-summary').map(step=>({activityId:step.id,cceMarks:0,facultyMarks:step.id==='identify-components'?0:null,response:answers(c.DESAssessmentCore.compile(step,groups[step.id],d.content.activities[step.id]))}))}};
 const snapshot=JSON.stringify(original),result=c.reassessSubmissionPayload_(copy(original));assert.equal(JSON.stringify(original),snapshot);
 assert.equal(result.assessmentSummary.maximumCorrections.length,9);assert.equal(result.assessmentSummary.persisted,false);
 const identify=result.submissionData.activityResponses.find(a=>a.activityId==='identify-components');assert.equal(identify.cceMarks,2);assert.equal(identify.systemSuggestedMarks,2);assert.equal(identify.facultyMarks,0);
 assert.equal(result.submissionData.activityResponses.find(a=>a.activityId==='engineering-calculations').systemSuggestedMarks,9);
});
test('grouped rubric weights and user-approved Failure Analysis scaling preserve exact assignment totals',()=>{
 const c=context();for(const slug of ['borewell-pump','failure-analysis','helical-gear-design','spur-gear-design','automotive-spur-gear-analysis']){
  const data=load(catalog.find(item=>new URL(item.launchPath,'http://local').searchParams.get('assignment')===slug));const groups=c.DESAssessmentCore.groups(data.rubric),total=Object.values(groups).reduce((sum,g)=>sum+g.marks,0);assert.ok(Math.abs(total-(slug==='borewell-pump'?24:12))<1e-8);
 }
 const failure=c.DES_EVALUATION_POLICIES['failure-analysis'];assert.equal(failure.activities['component-identification'].maxMarks,.8);assert.equal(failure.activities['engineering-assumptions'].maxMarks,.4);assert.equal(failure.activities['engineering-calculations'].maxMarks,3.6);
});
test('numeric reference keys are computed independently and placeholder-only values cannot be graded',()=>{
 const c=context(),core=c.DESAssessmentCore,keys=load(catalog.find(i=>i.id==='EC-08')).content.activities['key-design-calculation'].fields;
 assert.ok(Math.abs(keys.find(f=>f.id==='transmittedTorque').expected-(60e6*22/(2*Math.PI*1440)))<1e-7);
 const step={id:'x',component:'calculation-inputs',statusGroup:'calculation',marks:2};const def=core.compile(step,null,{fields:[{id:'x',placeholder:'100',hint:'100'}]});assert.equal(core.assess(def,{x:100}).marks,null);
});
test('new scorer, mirrors, answer definitions and student script imports are consistent',()=>{
 assert.equal(fs.readFileSync('js/assessment-core.js','utf8'),fs.readFileSync('Google Script/06_AssessmentCore.gs','utf8'));
 for(const file of ['js/assessment-core.js','js/submission-engine.js','assignment-workbench.html'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('outputs/meilp/'+file,'utf8'));
 for(const item of catalog){const d=load(item);for(const file of ['config.json','workflow.json','rubric.json','content.json','evaluation-template.json'])assert.equal(fs.readFileSync('assignments/'+d.slug+'/'+file,'utf8'),fs.readFileSync('outputs/meilp/assignments/'+d.slug+'/'+file,'utf8'));}
 const html=fs.readFileSync('assignment-workbench.html','utf8');assert.ok(html.indexOf('js/assessment-core.js')<html.indexOf('js/submission-engine.js'));
});


test('historical forged or stale scores are cleared when no graded answers exist',()=>{
 const c=context();const raw={challengeMetadata:{id:'EC-01'},submissionData:{activityResponses:[{activityId:'identify-components',cceMarks:0,response:{},systemSuggestedMarks:2}]}};
 const result=c.reassessSubmissionPayload_(raw);assert.equal(result.submissionData.activityResponses[0].systemSuggestedMarks,null);assert.equal(result.submissionData.activityResponses[0].systemAssessment.status,'not-assessed');
});
