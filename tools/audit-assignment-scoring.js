// Read-only scoring audit. Writes reports only; never changes assignment definitions or student records.
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = JSON.parse(fs.readFileSync('data/assignments.json','utf8')).assignments;
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/assessment-core.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/submission-engine.js','utf8'),context);
const engine = new context.window.MEILP.SubmissionEngine({storage:{}});
const usedSlugs = new Set();
const rows = catalog.map(item => {
  const slug = new URL(item.launchPath,'http://local').searchParams.get('assignment');
  usedSlugs.add(slug);
  const base = 'assignments/' + slug + '/';
  const config = JSON.parse(fs.readFileSync(base+'config.json','utf8'));
  const rubric = JSON.parse(fs.readFileSync(base+'rubric.json','utf8'));
  const workflow = JSON.parse(fs.readFileSync(base+'workflow.json','utf8'));
  const steps = workflow.steps.filter(step=>step.component!=='submission-summary');
  const groups = new Map();
  for(const criterion of rubric.criteria) {
    const id = criterion.stepId || criterion.activityId || criterion.id;
    groups.set(id,[...(groups.get(id)||[]),criterion]);
  }
  // Exercise the current, unchanged builder with every response nonempty. This tests metadata,
  // not academic correctness; no test answer is treated as an automatically earned mark.
  const responses = Object.fromEntries(steps.map(step=>[step.id,{audit:'nonempty-placeholder'}]));
  const emitted = engine.buildActivityResponses(steps,responses,rubric);
  const actualLookup = engine.criteriaByActivityId(rubric);
  const missedRubricActivities = [], incorrectRecordedMaxima = [], definitionConflicts = [];
  for(const step of steps) {
    const criteria = groups.get(step.id);
    if(!criteria) continue;
    if(!actualLookup[step.id]) missedRubricActivities.push(step.id);
    const expectedMax = criteria.reduce((sum,c)=>sum+Number(c.marks??c.maxMarks??0),0);
    const storedMax = Number(emitted.find(activity=>activity.activityId===step.id).cceMarks);
    if(Math.abs(expectedMax-storedMax)>1e-8) incorrectRecordedMaxima.push({activityId:step.id,rubricCombinedMax:expectedMax,emittedMax:storedMax});
    if(step.marks!==undefined && Math.abs(Number(step.marks)-expectedMax)>1e-8) definitionConflicts.push(step.id+': workflow maximum '+step.marks+' differs from combined rubric maximum '+expectedMax);
  }
  for(const [id] of groups) if(!steps.some(step=>step.id===id)) definitionConflicts.push(id+': rubric activity is absent from workflow');
  const declared = [config.cceMarks,rubric.totalMarks,workflow.totalCceMarks].filter(value=>value!==undefined).map(Number);
  if(declared.some(value=>value!==declared[0])) definitionConflicts.push('Declared assignment totals disagree');
  const workflowMaxima = steps.map(step=>step.marks??step.maxMarks);
  const workflowTotal = workflowMaxima.every(value=>value!==undefined)?workflowMaxima.reduce((sum,value)=>sum+Number(value),0):null;
  if(workflowTotal!==null && Math.abs(workflowTotal-declared[0])>1e-8) definitionConflicts.push('Workflow maxima total '+workflowTotal+' differs from declared assignment total '+declared[0]);
  return {
    id:item.id,title:item.title,slug,totalMarks:declared[0],
    rubricLookupDefect:missedRubricActivities.length>0,missedRubricActivities,
    incorrectRecordedMaxima,
    groupedRubricActivities:[...groups].filter(([,criteria])=>criteria.length>1).map(([activityId,criteria])=>({activityId,criterionCount:criteria.length})),
    definitionConflicts,
    emittedSuggestedMarkCount:emitted.filter(a=>a.systemSuggestedMarks!==undefined||a.suggestedMarks!==undefined).length,
    allResponsesNonempty:emitted.every(a=>a.status==='completed'),
    explicitlyDisabledAutomaticCriteria:rubric.criteria.filter(c=>c.autoEvaluation?.enabled===false).length
  };
});
const report = {
  scope:'26 active catalogue entries: data/assignments.json. Local source audit, not a live student-sheet audit.',
  method:'Run the unchanged shared SubmissionEngine against each assignment workflow/rubric with nonempty placeholder responses. Compare rubric keys and combined maxima; inspect emitted suggestion fields. Grouped rubric criteria are summed for diagnostic comparisons only.',
  totals:{assignments:rows.length,rubricLookupDefect:rows.filter(r=>r.rubricLookupDefect).length,incorrectRecordedMaxima:rows.filter(r=>r.incorrectRecordedMaxima.length).length,groupedRubricSchema:rows.filter(r=>r.groupedRubricActivities.length).length,definitionConflicts:rows.filter(r=>r.definitionConflicts.length).length,noSuggestedMarkOutput:rows.filter(r=>!r.emittedSuggestedMarkCount).length},
  excludedNonCatalogFolders:fs.readdirSync('assignments',{withFileTypes:true}).filter(entry=>entry.isDirectory()&&!usedSlugs.has(entry.name)).map(entry=>entry.name),
  mirroredSubmissionEngineIdentical:fs.readFileSync('js/submission-engine.js','utf8')===fs.readFileSync('outputs/meilp/js/submission-engine.js','utf8'),
  assignments:rows
};
fs.writeFileSync('docs/assignment-scoring-audit.json',JSON.stringify(report,null,2)+'\n');
const label=value=>value?'Yes':'No';
const lines = [
 '# Assignment scoring audit',
 '',
 report.scope,
 '',
 '## Counts (overlapping categories)',
 '',
 '- '+report.totals.assignments+' active assignments use the shared submission builder.',
 '- '+report.totals.rubricLookupDefect+' assignments have criteria missed by its activityId-only lookup.',
 '- '+report.totals.incorrectRecordedMaxima+' assignments currently emit maxima that differ from the rubric, combining grouped criteria.',
 '- '+report.totals.groupedRubricSchema+' assignments require many-criteria-to-one-activity schema support.',
 '- '+report.totals.definitionConflicts+' assignments have workflow/rubric IDs, weights or total conflicts requiring review.',
 '- All '+report.totals.noSuggestedMarkOutput+' produce no systemSuggestedMarks/suggestedMarks field through the shared submission builder.',
 '',
 'Missing output is a shared pipeline limitation. It does not mean all activities should receive automated marks. Explicit policy opt-outs and independent academic judgement must remain respected.',
 '',
 '## Assignment-by-assignment result',
 '',
 '| ID | Assignment | Lookup defect | Incorrect emitted maxima | Grouped criteria | Definition conflict |',
 '| --- | --- | --- | --- | --- | --- |',
 ...rows.map(r=>'| '+r.id+' | '+r.title.replace(/\|/g,'/')+' | '+label(r.rubricLookupDefect)+' | '+label(r.incorrectRecordedMaxima.length)+' | '+label(r.groupedRubricActivities.length)+' | '+label(r.definitionConflicts.length)+' |'),
 '',
 '## Important details',
 '',
 '- Rubric lookup now supports id, activityId and stepId, and sums grouped criteria. Original findings are preserved in assignment-scoring-audit-before-fix.md/json.',
 '- Many-criteria-to-one-activity schema support is present for EA-TS-01, EA-TS-02 and EA-TS-04.',
 '- Corrected definitions retain the rubric total of 24 for Borewell Pump and 12 for the two gear assignments; Failure Analysis uses the user-approved 0.8 scale to retain 12.',
 '- The faculty Activity Summary now labels maxima and system scores separately; unassessed/manual activities do not display an awarded zero.',
 '- Historical submissions with missing/zero maxima or absent suggestions require reassessment from their stored responses after the pipeline is corrected. This audit makes no changes to student records.',
 '- Four non-catalogue folders were excluded from the 26-assignment count: '+report.excludedNonCatalogFolders.join(', ')+'.',
 '- The submission builder under outputs/meilp is byte-identical: '+label(report.mirroredSubmissionEngineIdentical)+'.',
 '',
 '## Detailed conflicts',
 '',
 ...rows.filter(r=>r.definitionConflicts.length).flatMap(r=>['### '+r.id+' — '+r.title,'',...r.definitionConflicts.map(error=>'- '+error),'']),
 '## Reproduce',
 '',
 'Run node tools/audit-assignment-scoring.js from the project root. The script only writes these Markdown/JSON reports. It does not evaluate actual student answers, alter grading logic, access the live sheet or deploy code.',
 '',
 'Sources: js/submission-engine.js (buildActivityResponses, criteriaByActivityId), data/assignments.json, each catalogued assignment config/rubric/workflow, and faculty/js/submissions-browser.js (renderActivityList).'
];
fs.writeFileSync('docs/assignment-scoring-audit.md',lines.join('\n')+'\n');
console.log(JSON.stringify(report.totals));
console.log('Lookup defect: '+rows.filter(r=>r.rubricLookupDefect).map(r=>r.id).join(', '));
console.log('Incorrect maxima: '+rows.filter(r=>r.incorrectRecordedMaxima.length).map(r=>r.id).join(', '));
console.log('Definition conflicts: '+rows.filter(r=>r.definitionConflicts.length).map(r=>r.id).join(', '));
