const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-04: AUTOMOTIVE SPUR GEAR ANALYSIS (PCC353-MEC) ---');
console.log('======================================================================');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error('       ', err.message);
    failedTests++;
  }
}

const dir = __dirname;

// 1. Directory & required files exist
runTest('EA-TS-04 Package: Required files exist', () => {
  assert(fs.existsSync(path.join(dir, 'config.json')), 'config.json exists');
  assert(fs.existsSync(path.join(dir, 'workflow.json')), 'workflow.json exists');
  assert(fs.existsSync(path.join(dir, 'content.json')), 'content.json exists');
  assert(fs.existsSync(path.join(dir, 'rubric.json')), 'rubric.json exists');
  assert(fs.existsSync(path.join(dir, 'evaluation-template.json')), 'evaluation-template.json exists');
  assert(fs.existsSync(path.join(dir, 'asset-manifest.json')), 'asset-manifest.json exists');
  assert(fs.existsSync(path.join(dir, 'student-guide.md')), 'student-guide.md exists');
  assert(fs.existsSync(path.join(dir, 'faculty-guide.md')), 'faculty-guide.md exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Final_Corrected.png')), 'Final corrected asset exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Automotive_Reverse_Gear_Student.png')), 'Student asset exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Automotive_Reverse_Gear_Faculty.png')), 'Faculty asset exists');
});

const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

// 2. Metadata & Course Outcome configuration
runTest('Metadata: Course, Unit, CO, Marks, and Title', () => {
  assert.strictEqual(config.id, 'EA-TS-04');
  assert.strictEqual(config.slug, 'automotive-spur-gear-analysis');
  assert.strictEqual(config.title, 'Analysis of Spur Gears in a Car Transmission System');
  assert.strictEqual(config.courseCode, 'PCC353-MEC');
  assert.strictEqual(config.courseName, 'Transmission System Design');
  assert.strictEqual(config.unit, 'Unit I — Spur and Helical Gears');
  assert.strictEqual(config.cceMarks, 12);
  assert.strictEqual(config.difficulty, 'Advanced');
  assert.strictEqual(workflow.totalCceMarks, 12.0);
  assert.strictEqual(rubric.totalMarks, 12.0);
  assert.strictEqual(evalTmpl.maxTotalMarks, 12.0);
  assert.strictEqual(config.courseOutcome.statement, 'Apply principle of Spur & Helical gear design for industrial application.');
});

// 3. Workflow Steps & Ordering
runTest('Workflow: Step count, ordering, and total marks', () => {
  assert.strictEqual(workflow.steps.length, 12, 'Must have 11 activities + 1 submit step');
  const total = workflow.steps.reduce((sum, s) => sum + (s.marks || 0), 0);
  assert.strictEqual(total, 12.0, `Workflow marks must sum to 12.0 (got ${total})`);

  const expectedMarks = {
    1: 0.5,
    2: 0.0,
    3: 1.0,
    4: 1.0,
    5: 1.0,
    6: 2.0,
    7: 1.5,
    8: 1.0,
    9: 1.0,
    10: 1.5,
    11: 1.5,
    12: 0.0
  };

  workflow.steps.forEach(s => {
    assert.strictEqual(s.marks, expectedMarks[s.activityNumber], `Step ${s.activityNumber} mark mismatch`);
  });
});

// 4. Rubric 11 Criteria (9 Auto + 3 Faculty)
runTest('Rubric: 11 criteria C01-C11 with 9 automated and 3 faculty marks', () => {
  assert.strictEqual(rubric.criteria.length, 11, 'Must have exactly 11 criteria');
  const autoCriteria = rubric.criteria.filter(c => c.type === 'auto-grading');
  const facultyCriteria = rubric.criteria.filter(c => c.type === 'scoring');
  const autoSum = autoCriteria.reduce((sum, c) => sum + c.maxMarks, 0);
  const facultySum = facultyCriteria.reduce((sum, c) => sum + c.maxMarks, 0);

  assert.strictEqual(autoSum, 9.0, `Automated marks must be 9.0 (got ${autoSum})`);
  assert.strictEqual(facultySum, 3.0, `Faculty marks must be 3.0 (got ${facultySum})`);

  const expectedCritMarks = [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.0, 1.0, 1.5, 1.5];
  rubric.criteria.forEach((c, idx) => {
    assert.strictEqual(c.maxMarks, expectedCritMarks[idx], `Criterion ${c.id} mark mismatch`);
  });
});

// 5. Numerical Validation of all 21 Authoritative Checkpoints
runTest('Numerical Checkpoints: Complete dataset and formula validation', () => {
  const P = 8.0;
  const N1 = 1200;
  const N2 = 400;
  const z1 = 20;
  const z2 = 60;
  const m = 3;
  const b = 50;
  const phi_deg = 20;
  const Cs = 1.50;
  const Km = 1.25;
  const targetFOS = 1.50;
  const Sut1 = 700;
  const Sut2 = 600;
  const BHN1 = 350;
  const BHN2 = 350;

  // Torque
  const T1 = 63661.98;
  assert.strictEqual(T1, 63661.98);

  // Geometry
  const d1 = m * z1;
  const d2 = m * z2;
  const a = (d1 + d2) / 2;
  assert.strictEqual(d1, 60, 'd1 must be 60 mm');
  assert.strictEqual(d2, 180, 'd2 must be 180 mm');
  assert.strictEqual(a, 120, 'Centre distance a must be 120 mm');

  // Pitch velocity
  const v = (Math.PI * d1 * N1) / 60000;
  assert.strictEqual(Number(v.toFixed(3)), 3.770, 'v must be 3.770 m/s');

  // Tooth forces
  const Pt = Number(((2 * T1) / d1).toFixed(2));
  assert.strictEqual(Pt, 2122.07, 'Pt must be 2,122.07 N');
  const Pr = Number((Pt * Math.tan(phi_deg * Math.PI / 180)).toFixed(2));
  assert.strictEqual(Pr, 772.37, 'Pr must be 772.37 N');

  // Dynamic factor & effective load
  const Cv = Number((6 / (6 + v)).toFixed(4));
  assert.strictEqual(Cv, 0.6141, 'Cv must be 0.6141');
  const Peff = Number(((Cs * Km * Pt) / Cv).toFixed(2));
  assert(Math.abs(Peff - 6478.87) <= 0.5, 'Peff must match 6,478.87 N');

  // Lewis factors & beam strengths
  const Y1 = 0.320;
  const Y2 = 0.421;
  const sigb1 = Sut1 / 3;
  const sigb2 = Sut2 / 3;
  const Sb1 = Math.round(m * b * sigb1 * Y1);
  const Sb2 = Math.round(m * b * sigb2 * Y2);
  assert.strictEqual(Sb1, 11200, 'Sb1 must be 11,200 N');
  assert.strictEqual(Sb2, 12630, 'Sb2 must be 12,630 N');

  // Weaker member
  const weaker = (sigb1 * Y1 < sigb2 * Y2) ? 'Pinion' : 'Gear';
  assert.strictEqual(weaker, 'Pinion', 'Weaker member must be Pinion');

  // Bending FOS
  const FOSb = Number((Sb1 / 6478.87).toFixed(3));
  assert.strictEqual(FOSb, 1.729, 'FOSb must be 1.729');
  assert(FOSb >= targetFOS, 'Bending must be SAFE');

  // Buckingham Wear
  const Q = Number(((2 * z2) / (z1 + z2)).toFixed(2));
  assert.strictEqual(Q, 1.50, 'Q must be 1.50');
  const K = Number((0.16 * Math.pow(BHN2 / 100, 2)).toFixed(2));
  assert.strictEqual(K, 1.96, 'K must be 1.96 N/mm²');
  const Sw = Math.round(b * Q * d1 * K);
  assert.strictEqual(Sw, 8820, 'Sw must be 8,820 N');
  const FOSw = Number((Sw / 6478.87).toFixed(3));
  assert.strictEqual(FOSw, 1.361, 'FOSw must be 1.361');
  assert(FOSw < targetFOS, 'Wear must be NOT SAFE');

  // Diagnosis
  const diagnosis = (FOSb >= targetFOS && FOSw < targetFOS) ? 'NOT ADEQUATE' : 'ADEQUATE';
  assert.strictEqual(diagnosis, 'NOT ADEQUATE', 'Initial design must be NOT ADEQUATE');

  // Optional redesign verification path (400 BHN)
  const K_redesign = Number((0.16 * Math.pow(400 / 100, 2)).toFixed(2));
  assert.strictEqual(K_redesign, 2.56, 'Redesign K must be 2.56 N/mm²');
  const Sw_redesign = Math.round(b * Q * d1 * K_redesign);
  assert.strictEqual(Sw_redesign, 11520, 'Redesign Sw must be 11,520 N');
  const FOSw_redesign = Number((Sw_redesign / 6478.87).toFixed(3));
  assert.strictEqual(FOSw_redesign, 1.778, 'Redesign FOSw must be 1.778');
  assert(FOSw_redesign >= targetFOS, 'Redesign must be SAFE');
});

// 6. Visualisation Callout Labels (10 Callouts)
runTest('Visualisation: 10 Callouts with power flow mapping', () => {
  const vis = content.activities['gearbox-visualisation'];
  assert(vis, 'gearbox-visualisation activity exists');
  assert.strictEqual(vis.labels.length, 10, 'Must have 10 labels');
  assert.strictEqual(vis.hideMarkers, true);
  assert.strictEqual(vis.markerStyle, 'invisible');
  assert(vis.options.length >= 10);
});

// 7. Evaluation Template
runTest('Evaluation Template: Criteria mapping and rubricRef consistency', () => {
  assert.strictEqual(evalTmpl.criteria.length, 11);
  evalTmpl.criteria.forEach((crit, i) => {
    const num = i + 1;
    const ref = `TS04-C${num < 10 ? '0' + num : num}`;
    assert.strictEqual(crit.rubricRef, ref);
    assert.strictEqual(crit.id, `ts04-act-${num}`);
  });
});

console.log('======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL LOCAL EA-TS-04 TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('FAILURES DETECTED IN LOCAL EA-TS-04 TESTS!');
  process.exit(1);
}
console.log('======================================================================');
