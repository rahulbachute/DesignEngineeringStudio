const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
function env(){const c={window:{addEventListener(){}},console};vm.createContext(c);for(const file of ['js/base-component.js','js/state-manager.js','js/assessment-core.js','js/submission-engine.js','components/guided-workflow/guided-workflow.js','js/challenge-runner.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);vm.runInContext('this.Runner=ChallengeRunner;',c);return c;}
function setup(c,state,active){const storage={get:(key,fallback)=>copy(state||fallback),set(){}};const manager=new c.window.MEILP.StateManager(storage);const runner=Object.create(c.Runner.prototype);runner.currentIndex=0;runner.workflow={steps:[{id:'engineering-calculations',component:'guided-workflow'}]};runner.services={stateManager:manager};runner.completed=new Set();runner.host=()=>({querySelectorAll:()=>[]});for(const name of ['persistProgress','autosaveAttempt','renderTaskNav','renderWidgets','updateProgress'])runner[name]=()=>{};runner.activeComponent=active?active(manager):new c.window.MEILP.GuidedWorkflowComponent({config:{id:'engineering-calculations',steps:[]},stateManager:manager});return {runner,manager};}
test('Save Draft preserves actual guided component state through the submission payload and grading',()=>{
 const c=env(),content=JSON.parse(fs.readFileSync('assignments/elevator/content.json')),rubric=JSON.parse(fs.readFileSync('assignments/elevator/rubric.json')),activity=content.activities['engineering-calculations'];
 const saved=Object.fromEntries(activity.steps.filter(s=>s.type==='numeric').map(s=>[s.id,{value:String(s.expected)}]));
 const {runner,manager}=setup(c,{responses:{'engineering-calculations':saved,unrelated:{text:'Keep'}}});
 runner.saveCurrent();runner.saveCurrent();assert.deepEqual(copy(manager.getState().responses['engineering-calculations']),saved);assert.equal(manager.getState().responses.unrelated.text,'Keep');
 assert.equal(runner.completed.has('engineering-calculations'),true);
 const engine=new c.window.MEILP.SubmissionEngine({storage:{}}),rows=engine.buildActivityResponses(runner.workflow.steps,manager.getState().responses,rubric,content);
 assert.equal(rows[0].systemSuggestedMarks,9);assert.deepEqual(copy(rows[0].response),saved);
});
test('zero-valued guided answers survive saving and rendering',()=>{
 const c=env(),{runner,manager}=setup(c,{responses:{'engineering-calculations':{zero:{value:0},zeroString:{value:'0'}}}});runner.saveCurrent();assert.equal(manager.getState().responses['engineering-calculations'].zero.value,0);assert.equal(manager.getState().responses['engineering-calculations'].zeroString.value,'0');
 const rendered=[];const container={innerHTML:'',appendChild:e=>rendered.push(e),querySelectorAll:()=>[]};c.document={createElement:()=>({})};runner.activeComponent.element={querySelector:()=>container};runner.activeComponent.steps=[{id:'zero',type:'numeric'}];runner.activeComponent.renderSteps();assert.ok(rendered[0].innerHTML.includes('value="0"'));
});
test('empty guided responses are not marked complete merely by clicking Save Draft',()=>{
 const c=env(),{runner,manager}=setup(c,{responses:{'engineering-calculations':{}}});runner.saveCurrent();assert.equal(runner.completed.has('engineering-calculations'),false);assert.deepEqual(copy(manager.getState().responses['engineering-calculations']),{});
});
test('image-label and decision-canvas response schemas use their component collectors',()=>{
 const c=env();
 for(const value of [{answers:{component1:'Motor'},componentResponses:[{studentAnswer:'Motor'}]}, {selection:'Steel',justification:'Independent reasoning'}]){
  const {runner,manager}=setup(c,{responses:{}},()=>({config:{id:'engineering-calculations'},collect:()=>copy(value)}));runner.saveCurrent();assert.deepEqual(copy(manager.getState().responses['engineering-calculations']),value);
 }
});
test('ordinary form inputs keep using the generic save path and stale components cannot supply answers',()=>{
 const c=env(),{runner,manager}=setup(c,{responses:{}},()=>({config:{id:'another-activity'},collect:()=>({wrong:'Do not copy'})}));
 runner.workflow.steps[0].component='text-mcq';runner.host=()=>({querySelectorAll:selector=>selector==='[data-response]'?[{dataset:{response:'text'},value:' Student explanation '}]:[]});runner.saveCurrent();assert.deepEqual(copy(manager.getState().responses['engineering-calculations']),{text:'Student explanation'});
});
test('student response-capture source and published-source mirror are identical',()=>{
 for(const file of ['js/challenge-runner.js','components/guided-workflow/guided-workflow.js'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('outputs/meilp/'+file,'utf8'));
});
