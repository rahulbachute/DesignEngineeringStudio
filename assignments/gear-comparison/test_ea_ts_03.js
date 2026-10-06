const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-03: GEAR COMPARISON (PACKAGE LOCAL TEST) ---');
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

const dir = path.resolve(__dirname);

runTest(`Local Package: Required files exist in ${dir}`, () => {
  assert(fs.existsSync(path.join(dir, 'config.json')), 'config.json exists');
  assert(fs.existsSync(path.join(dir, 'workflow.json')), 'workflow.json exists');
  assert(fs.existsSync(path.join(dir, 'content.json')), 'content.json exists');
  assert(fs.existsSync(path.join(dir, 'rubric.json')), 'rubric.json exists');
  assert(fs.existsSync(path.join(dir, 'evaluation-template.json')), 'evaluation-template.json exists');
  assert(fs.existsSync(path.join(dir, 'asset-manifest.json')), 'asset-manifest.json exists');
  assert(fs.existsSync(path.join(dir, 'student-guide.md')), 'student-guide.md exists');
  assert(fs.existsSync(path.join(dir, 'faculty-guide.md')), 'faculty-guide.md exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Final_Corrected.png')), 'Authoritative student image exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Gear_Comparison_Student.png')), 'Student image exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Gear_Comparison_Faculty.png')), 'Faculty image exists');
});

const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

runTest('Config & CO1 Official Statement Match', () => {
  assert.strictEqual(config.id, 'EA-TS-03');
  assert.strictEqual(config.cceMarks, 12);
  assert.strictEqual(config.courseCode, 'PCC353-MEC');
  assert.strictEqual(config.courseOutcome.statement, 'Apply principle of Spur & Helical gear design for industrial application.');
});

runTest('Marks Allocation: 12 Total, 9.0 Automated, 3.0 Faculty', () => {
  assert.strictEqual(workflow.totalCceMarks, 12.0);
  assert.strictEqual(rubric.totalMarks, 12.0);
  assert.strictEqual(evalTmpl.maxTotalMarks, 12.0);

  const autoCriteria = rubric.criteria.filter(c => c.type === 'auto-grading');
  const facultyCriteria = rubric.criteria.filter(c => c.type === 'scoring');
  const autoMarks = autoCriteria.reduce((sum, c) => sum + c.maxMarks, 0);
  const facultyMarks = facultyCriteria.reduce((sum, c) => sum + c.maxMarks, 0);

  assert.strictEqual(autoMarks, 9.0, `Automated marks sum to 9.0 (got ${autoMarks})`);
  assert.strictEqual(facultyMarks, 3.0, `Faculty marks sum to 3.0 (got ${facultyMarks})`);
});

runTest('Workflow Step Count & Mark Verification (11 activities + submit)', () => {
  assert.strictEqual(workflow.steps.length, 12, '11 activities + 1 submit step');
  const marksMap = {
    1: 0.5,
    2: 1.0,
    3: 1.0,
    4: 1.0,
    5: 1.0,
    6: 1.0,
    7: 1.0,
    8: 1.0,
    9: 1.5,
    10: 1.5,
    11: 1.5,
    12: 0.0
  };
  workflow.steps.forEach(step => {
    assert.strictEqual(step.marks, marksMap[step.activityNumber], `Activity ${step.activityNumber} marks mismatch`);
  });
});

runTest('Authoritative Visualisation Callouts 1–10 Verification', () => {
  const vis = content.activities['gear-visualisation'];
  assert(vis, 'gear-visualisation activity exists');
  assert.strictEqual(vis.labels.length, 10, 'Must have exactly 10 callouts');
  const expectedLabels = [
    { num: 1, text: 'Input shaft — Spur drive' },
    { num: 2, text: 'Driving spur pinion' },
    { num: 3, text: 'Driven spur gear' },
    { num: 4, text: 'Output shaft — Spur drive' },
    { num: 5, text: 'Support bearing — Spur shaft' },
    { num: 6, text: 'Input shaft — Helical drive' },
    { num: 7, text: 'Driving helical pinion' },
    { num: 8, text: 'Driven helical gear' },
    { num: 9, text: 'Output shaft — Helical drive' },
    { num: 10, text: 'Support bearing — Helical shaft' }
  ];
  expectedLabels.forEach(exp => {
    const label = vis.labels.find(l => l.componentNumber === exp.num);
    assert(label, `Callout ${exp.num} must exist`);
    assert.strictEqual(label.correctAnswer, exp.text, `Callout ${exp.num} answer mismatch`);
    assert.strictEqual(label.invisible, true, `Callout ${exp.num} must be invisible marker`);
  });
});

runTest('Syllabus Boundary Check: ZERO Numerical Helical Force Analysis', () => {
  const contentStr = JSON.stringify(content);
  // Ensure no numerical inputs for helical forces
  assert(!contentStr.includes('"type": "number"'), 'Zero numerical inputs for helical forces');
  assert(!contentStr.includes('Calculate Ft for helical'), 'No helical Ft numerical calculation');
  assert(!contentStr.includes('Calculate Fr for helical'), 'No helical Fr numerical calculation');
  assert(!contentStr.includes('Calculate Fa for helical'), 'No helical Fa numerical calculation');
  // Check Activity 1 charter text explicitly states no numerical force analysis
  const charter = content.activities['project-charter'];
  assert(charter.cards.some(c => c.body.includes('No numerical on force analysis of helical')));
});

console.log('======================================================================');
console.log(`TOTAL LOCAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL LOCAL EA-TS-03 TESTS PASSED!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('======================================================================');
