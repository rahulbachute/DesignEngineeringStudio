const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-01: HELICAL GEAR DESIGN (PACKAGE LOCAL TEST) ---');
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
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-01_Helical_Gear_Drive_Student.png')), 'Student asset image exists');
  assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-01_Helical_Gear_Drive_Faculty.png')), 'Faculty asset image exists');
});

const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

runTest('Config & CO1 Official Statement Match', () => {
  assert.strictEqual(config.id, 'EA-TS-01');
  assert.strictEqual(config.cceMarks, 12);
  assert.strictEqual(config.courseOutcome.statement, 'Apply principle of Spur & Helical gear design for industrial application.');
});

runTest('Workflow & Rubric 12-Mark Match', () => {
  assert.strictEqual(workflow.totalCceMarks, 12.0);
  assert.strictEqual(rubric.totalMarks, 12.0);
  assert.strictEqual(evalTmpl.maxTotalMarks, 12.0);
  assert.strictEqual(rubric.criteria.length, 12);
});

console.log(`TOTAL LOCAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
