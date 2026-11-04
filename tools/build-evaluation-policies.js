// Rebuild after assignment policy changes. Never infer a score from a maximum or template suggestion.
const fs = require('fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const context = {}; vm.createContext(context); vm.runInContext(fs.readFileSync('js/assessment-core.js','utf8'),context);
const core = context.DESAssessmentCore;
const registry = {};
const catalogue = JSON.parse(fs.readFileSync('data/assignments.json','utf8')).assignments;
const activeSlugs = catalogue.map(item=>new URL(item.launchPath,'http://local').searchParams.get('assignment'));
const activityId = criterion => criterion.stepId || criterion.activityId || criterion.id;
const maximum = criterion => criterion.marks ?? criterion.maxMarks;
const canonicalAssignmentId = id => String(id || '').replace(/^EA-/i, 'EC-');
for (const slug of activeSlugs) {
  const base = 'assignments/' + slug + '/';
  if (!['config.json','rubric.json','workflow.json'].every(file => fs.existsSync(base + file))) continue;
  const read = file => JSON.parse(fs.readFileSync(base + file,'utf8'));
  const config = read('config.json'), rubric = read('rubric.json'), workflow = read('workflow.json'), content = read('content.json');
  if (!Array.isArray(rubric.criteria) || !Array.isArray(workflow.steps)) continue;
  const errors = [], activities = {}, aliases = new Map();
  const grouped = core.groups(rubric);
  for (const criterion of rubric.criteria) if (criterion.id) aliases.set(criterion.id,activityId(criterion));
  for (const step of workflow.steps) {
    const group = grouped[step.id];
    const definition = core.compile(step,group,content.activities?.[step.id]||{});
    const marks = group ? group.marks : maximum(step);
    const procedural = definition.procedural;
    activities[step.id] = {maxMarks:marks ?? (procedural?0:null),procedural,allowAutomated:definition.allowAutomated,assessment:definition};
    if (marks !== undefined && (!Number.isFinite(Number(marks)) || Number(marks)<0)) errors.push(step.id+': invalid maximum marks');
    if (group && maximum(step)!==undefined && Math.abs(Number(group.marks)-Number(maximum(step)))>1e-8) errors.push(step.id+': workflow/rubric maximum mismatch');
  }
  for (const id of Object.keys(grouped)) if (!activities[id]) errors.push(id+': rubric activity absent from workflow');
  const totals = [config.cceMarks,rubric.totalMarks,workflow.totalCceMarks].filter(value => value !== undefined).map(Number);
  const total = totals[0];
  if (!Number.isFinite(total) || total <= 0 || totals.some(value => value !== total)) errors.push('Assignment total is missing or inconsistent');
  const sum = Object.values(activities).reduce((value, activity) => value + Number(activity.maxMarks), 0);
  if (Math.abs(sum - total) > 1e-8) errors.push('Workflow maxima sum ' + sum + ' differs from assignment total ' + total);
  if (fs.existsSync(base + 'evaluation-template.json')) {
    const template = read('evaluation-template.json');
    const map = new Map();
    const add = (id, marks, combine=false) => {
      if (combine && map.has(id)) {map.set(id,core.round(Number(map.get(id))+Number(marks)));return;}
      if (map.has(id) && Number(map.get(id)) !== Number(marks)) errors.push(id + ': conflicting evaluation-template maxima');
      map.set(id, marks);
    };
    if (template.maxMarks && typeof template.maxMarks === 'object' && !Array.isArray(template.maxMarks)) {
      for (const [id, marks] of Object.entries(template.maxMarks)) add(aliases.get(id) || id, marks);
    } else if (Array.isArray(template.sections)) {
      for (const section of template.sections) add(aliases.get(section.id) || section.id, maximum(section));
    } else if (Array.isArray(template.criteria)) {
      for (const criterion of template.criteria) {
        const explicit = criterion.activityId || criterion.stepId;
        const referenced = aliases.get(criterion.rubricRef);
        if (explicit && referenced && explicit !== referenced) errors.push(criterion.id + ': conflicting template activity reference');
        add(explicit || referenced || aliases.get(criterion.id) || criterion.id, maximum(criterion),true);
      }
    }
    for (const value of [template.maxTotalMarks,template.maxScore,template.totalMarks,typeof template.maxMarks === 'number' ? template.maxMarks : undefined].filter(value => value !== undefined)) {
      if (Number(value) !== total) errors.push('Evaluation-template total differs from assignment total');
    }
    if (map.size) {
      for (const [id, marks] of map) if (!activities[id] || Math.abs(Number(activities[id].maxMarks) - Number(marks)) > 1e-8) errors.push(id + ': evaluation-template maximum mismatch');
      for (const [id, activity] of Object.entries(activities)) if (Number(activity.maxMarks) > 0 && !map.has(id)) errors.push(id + ': missing from evaluation-template');
    }
  }
  const revision = crypto.createHash('sha256').update(JSON.stringify({version:'response-assessment-v2',activities,total})).digest('hex').slice(0,16);
  registry[slug] = {slug,id:canonicalAssignmentId(config.id || config.projectCode),title:config.title,total,revision,activities,errors:[...new Set(errors)]};
}
const json = JSON.stringify(registry,null,2);
fs.writeFileSync('faculty/js/evaluation-policies.js','// Generated by tools/build-evaluation-policies.js\nwindow.DESEvaluationPolicies = ' + json + ';\n');
fs.writeFileSync('Google Script/05_EvaluationPolicies.gs','// Generated by tools/build-evaluation-policies.js\nvar DES_EVALUATION_POLICIES = ' + json + ';\n');
fs.copyFileSync('faculty/js/evaluation-policies.js','outputs/meilp/faculty/js/evaluation-policies.js');
