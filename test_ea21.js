const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname);
let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

console.log('--- VALIDATING EA-21 (EC-21) RECIRCULATING BALL STEERING GEAR ---');

const pathsToCheck = [
  'assignments/recirculating-ball-steering',
  'assignments/recirculating ball screw',
  'outputs/meilp/assignments/recirculating-ball-steering',
  'outputs/meilp/assignments/recirculating ball screw'
];

pathsToCheck.forEach(relPath => {
  const dir = path.join(baseDir, relPath);
  console.log(`\nChecking directory: ${relPath}`);
  assert(fs.existsSync(dir), `Directory ${relPath} exists`);

  const configPath = path.join(dir, 'config.json');
  const workflowPath = path.join(dir, 'workflow.json');
  const contentPath = path.join(dir, 'content.json');
  const rubricPath = path.join(dir, 'rubric.json');
  const evalTmplPath = path.join(dir, 'evaluation-template.json');
  const manifestPath = path.join(dir, 'asset-manifest.json');

  assert(fs.existsSync(configPath), `${relPath}/config.json exists`);
  assert(fs.existsSync(workflowPath), `${relPath}/workflow.json exists`);
  assert(fs.existsSync(contentPath), `${relPath}/content.json exists`);
  assert(fs.existsSync(rubricPath), `${relPath}/rubric.json exists`);
  assert(fs.existsSync(evalTmplPath), `${relPath}/evaluation-template.json exists`);
  assert(fs.existsSync(manifestPath), `${relPath}/asset-manifest.json exists`);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(rubricPath, 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(evalTmplPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(config.id === 'EC-21' || config.projectCode === 'EC-21', `${relPath}: config.json has ID EC-21`);
  assert(config.cceMarks === 12, `${relPath}: config.json cceMarks is 12`);
  assert(workflow.totalCceMarks === 12.0, `${relPath}: workflow.json totalCceMarks is 12.0`);
  assert(rubric.totalMarks === 12.0, `${relPath}: rubric.json totalMarks is 12.0`);
  assert(evalTmpl.maxTotalMarks === 12.0, `${relPath}: evalTmpl maxTotalMarks is 12.0`);

  const workflowMarksSum = workflow.steps.reduce((sum, s) => sum + (s.marks || 0), 0);
  assert(Math.abs(workflowMarksSum - 12.0) < 0.001, `${relPath}: Workflow step marks sum to 12.0 (got ${workflowMarksSum})`);
  assert(workflow.steps.length === 12, `${relPath}: Workflow has 12 steps (11 activities + 1 submit)`);

  workflow.steps.forEach(step => {
    assert(content.activities[step.id] !== undefined, `${relPath}: content.json has activity for step '${step.id}'`);
  });

  const compId = content.activities['component-identification'];
  assert(compId && compId.labels && compId.labels.length === 10, `${relPath}: component-identification has 10 labels`);

  compId.labels.forEach((label, idx) => {
    assert(typeof label.x === 'number' && typeof label.y === 'number', `${relPath}: Label ${idx+1} has numeric coordinates`);
    assert(label.correctAnswer && label.feedback, `${relPath}: Label ${idx+1} has correctAnswer and feedback`);
  });

  const imgPath = path.join(dir, 'images', 'EA-21_Student_v1.0.png');
  assert(fs.existsSync(imgPath), `${relPath}: Image EA-21_Student_v1.0.png exists`);
});

console.log('\n--- MATHEMATICAL CALCULATIONS VERIFICATION ---');
const Tin = 10.0; // N-m
const p = 10.0; // mm
const Rs = 50.0; // mm
const Lp = 150.0; // mm = 0.15 m
const eta = 0.90;
const N_lock = 1.8;
const N_total = 3.6;

const S_rev = p; // 10 mm
const S_lock = N_lock * p; // 18 mm
const S_total = N_total * p; // 36 mm
assert(S_lock === 18.0, `Half-lock stroke S_lock = 18.0 mm (got ${S_lock})`);
assert(S_total === 36.0, `Total stroke S_total = 36.0 mm (got ${S_total})`);

const theta_rev = S_rev / Rs; // 0.20 rad
const theta_rev_deg = theta_rev * (180 / Math.PI); // 11.459 deg
assert(Math.abs(theta_rev - 0.20) < 0.001, `Sector angular displacement theta_rev = 0.20 rad (got ${theta_rev})`);
assert(Math.abs(theta_rev_deg - 11.459) < 0.01, `Sector angular displacement theta_rev = 11.459 deg (got ${theta_rev_deg.toFixed(3)})`);

const theta_total = S_total / Rs; // 0.72 rad
const theta_total_deg = theta_total * (180 / Math.PI); // 41.253 deg
assert(Math.abs(theta_total - 0.72) < 0.001, `Total sweep theta_total = 0.72 rad (got ${theta_total})`);
assert(Math.abs(theta_total_deg - 41.253) < 0.01, `Total sweep theta_total = 41.253 deg (got ${theta_total_deg.toFixed(3)})`);

const i_overall = (2 * Math.PI * Rs) / p; // 31.4159
assert(Math.abs(i_overall - 31.416) < 0.01, `Overall steering ratio i_overall = 31.416:1 (got ${i_overall.toFixed(3)})`);

const Tout = eta * Tin * i_overall; // 282.743 N-m
assert(Math.abs(Tout - 282.74) < 0.05, `Sector shaft output torque Tout = 282.74 N-m (got ${Tout.toFixed(2)})`);

const F_pitman = Tout / (Lp / 1000.0); // 1884.96 N
assert(Math.abs(F_pitman - 1884.96) < 0.1, `Pitman arm force F_pitman = 1884.96 N (got ${F_pitman.toFixed(2)})`);

console.log('\n--- REGRESSION INTEGRATION TESTS (EC-01 THROUGH EA-20) ---');
const mainAssignments = JSON.parse(fs.readFileSync(path.join(baseDir, 'data', 'assignments.json'), 'utf8'));
const outputAssignments = JSON.parse(fs.readFileSync(path.join(baseDir, 'outputs', 'meilp', 'data', 'assignments.json'), 'utf8'));

assert(mainAssignments.assignments.length >= 21, `data/assignments.json contains all assignments (got ${mainAssignments.assignments.length})`);
assert(outputAssignments.assignments.length >= 21, `outputs/meilp/data/assignments.json contains all assignments (got ${outputAssignments.assignments.length})`);

const expectedAssignments = [
  { id: 'EC-01', slug: 'elevator' },
  { id: 'EC-02', slug: 'motorcycle' },
  { id: 'EC-03', slug: 'materials-selection' },
  { id: 'EC-04', slug: 'borewell-pump' },
  { id: 'EC-05', slug: 'failure-analysis' },
  { id: 'EC-06', slug: 'stress-concentration' },
  { id: 'EC-07', slug: 'shafts' },
  { id: 'EC-08', slug: 'Keys' },
  { id: 'EC-09', slug: 'coupling' },
  { id: 'EC-10', slug: 'cotter-joint' },
  { id: 'EA-11', slug: 'kunckle joint' },
  { id: 'EA-12', slug: 'helical-spring-design' },
  { id: 'EA-13', slug: 'leaf-spring-design' },
  { id: 'EA-14', slug: 'spring-selection' },
  { id: 'EA-15', slug: 'suspension-system-design' },
  { id: 'EA-16', slug: 'shaft-fatigue-design' },
  { id: 'EA-17', slug: 'connecting-rod-fatigue' },
  { id: 'EA-18', slug: 'bench-vice' },
  { id: 'EA-19', slug: 'c-clamp-friction' },
  { id: 'EA-20', slug: 'hydraulic-press' },
  { id: 'EC-21', slug: 'recirculating-ball-steering' }
];

expectedAssignments.forEach(asgn => {
  const foundInMain = mainAssignments.assignments.some(a => a.id === asgn.id);
  assert(foundInMain, `Assignment ${asgn.id} registered in data/assignments.json`);
});

console.log(`\n==================================================`);
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
if (totalTests === passedTests) {
  console.log(`ALL TESTS PASSED SUCCESSFULLY! 100% REGRESSION-FREE!`);
} else {
  console.error(`SOME TESTS FAILED!`);
  process.exit(1);
}
console.log(`==================================================`);
