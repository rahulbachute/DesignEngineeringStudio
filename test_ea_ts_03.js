const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-03: GEAR COMPARISON (SPPU 2024 / PCC353-MEC) ---');
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

const directories = [
  'assignments/gear-comparison',
  'outputs/meilp/assignments/gear-comparison'
];

// 1. Check file existence & valid JSON schemas
directories.forEach(dir => {
  runTest(`${dir}: Directory and required files exist`, () => {
    assert(fs.existsSync(dir), `Directory ${dir} must exist`);
    assert(fs.existsSync(path.join(dir, 'config.json')), 'config.json exists');
    assert(fs.existsSync(path.join(dir, 'workflow.json')), 'workflow.json exists');
    assert(fs.existsSync(path.join(dir, 'content.json')), 'content.json exists');
    assert(fs.existsSync(path.join(dir, 'rubric.json')), 'rubric.json exists');
    assert(fs.existsSync(path.join(dir, 'evaluation-template.json')), 'evaluation-template.json exists');
    assert(fs.existsSync(path.join(dir, 'asset-manifest.json')), 'asset-manifest.json exists');
    assert(fs.existsSync(path.join(dir, 'student-guide.md')), 'student-guide.md exists');
    assert(fs.existsSync(path.join(dir, 'faculty-guide.md')), 'faculty-guide.md exists');
    assert(fs.existsSync(path.join(dir, 'test_ea_ts_03.js')), 'test_ea_ts_03.js exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Final_Corrected.png')), 'Authoritative student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Gear_Comparison_Student.png')), 'Student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-03_Gear_Comparison_Faculty.png')), 'Faculty asset image exists');
  });

  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

  runTest(`${dir}: Metadata & Course Outcome configuration`, () => {
    assert.strictEqual(config.id, 'EA-TS-03');
    assert.strictEqual(config.courseCode, 'PCC353-MEC');
    assert.strictEqual(config.title, 'Comparison of Spur and Helical Gears in Industrial Power Transmission');
    assert.strictEqual(config.cceMarks, 12);
    assert.strictEqual(workflow.totalCceMarks, 12.0);
    assert.strictEqual(rubric.totalMarks, 12.0);
    assert.strictEqual(evalTmpl.maxTotalMarks, 12.0);
    assert.strictEqual(config.courseOutcome.statement, 'Apply principle of Spur & Helical gear design for industrial application.', 'Must use exact official CO1 wording');
  });

  runTest(`${dir}: Initial screen & direct Student Details setup`, () => {
    assert.strictEqual(config.settings.initialScreen, 'student-details');
    assert.strictEqual(config.settings.directStudentForm, true);
    assert.strictEqual(config.settings.defaultAttemptMode, 'individual');
    assert(Array.isArray(content.attemptMode.individual), 'individual fields array exists');
    assert.strictEqual(content.attemptMode.individual[0].name, 'fullName', 'fullName must be first input');
  });

  runTest(`${dir}: Workflow step structure & 12-mark sum`, () => {
    assert(Array.isArray(workflow.steps), 'workflow steps array exists');
    assert.strictEqual(workflow.steps.length, 12, 'Should have 11 activities + 1 submit step');
    const totalMarks = workflow.steps.reduce((acc, step) => acc + (step.marks || 0), 0);
    assert.strictEqual(totalMarks, 12.0, `Workflow step marks sum to 12.0 (got ${totalMarks})`);
  });

  runTest(`${dir}: Step mark distribution matches frozen specification`, () => {
    const expectedMarks = {
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
      assert.strictEqual(step.marks, expectedMarks[step.activityNumber], `Step ${step.activityNumber} marks mismatch`);
    });
  });

  runTest(`${dir}: Rubric 11-Criterion Architecture (9 Auto + 3 Faculty)`, () => {
    assert.strictEqual(rubric.criteria.length, 11, 'Must contain 11 CCE criteria TS03-C01 through TS03-C11');
    const autoCriteria = rubric.criteria.filter(c => c.type === 'auto-grading');
    const facultyCriteria = rubric.criteria.filter(c => c.type === 'scoring');
    const autoMarks = autoCriteria.reduce((s, c) => s + c.maxMarks, 0);
    const facultyMarks = facultyCriteria.reduce((s, c) => s + c.maxMarks, 0);
    assert.strictEqual(autoMarks, 9.0, `Automated criteria sum to 9.0 marks (got ${autoMarks})`);
    assert.strictEqual(facultyMarks, 3.0, `Faculty criteria sum to 3.0 marks (got ${facultyMarks})`);
  });

  runTest(`${dir}: Evaluation Template criteria match rubric criteria`, () => {
    assert.strictEqual(evalTmpl.criteria.length, 11, 'Evaluation template must contain 11 tasks');
    for (let i = 1; i <= 11; i++) {
      const code = `TS03-C${i < 10 ? '0' + i : i}`;
      const crit = evalTmpl.criteria.find(c => c.rubricRef === code);
      assert(crit, `Evaluation template criterion for ${code} must exist`);
    }
  });

  runTest(`${dir}: Visualisation callout mapping & invisible markers (Authoritative 10)`, () => {
    const act = content.activities['gear-visualisation'];
    assert(act, 'gear-visualisation activity exists');
    assert.strictEqual(act.hideMarkers, true, 'hideMarkers must be true');
    assert.strictEqual(act.markerStyle, 'invisible', 'markerStyle must be invisible');
    assert.strictEqual(act.labels.length, 10, 'Must have exactly 10 callout labels');
    
    const expected = [
      { num: 1, ans: 'Input shaft — Spur drive' },
      { num: 2, ans: 'Driving spur pinion' },
      { num: 3, ans: 'Driven spur gear' },
      { num: 4, ans: 'Output shaft — Spur drive' },
      { num: 5, ans: 'Support bearing — Spur shaft' },
      { num: 6, ans: 'Input shaft — Helical drive' },
      { num: 7, ans: 'Driving helical pinion' },
      { num: 8, ans: 'Driven helical gear' },
      { num: 9, ans: 'Output shaft — Helical drive' },
      { num: 10, ans: 'Support bearing — Helical shaft' }
    ];

    expected.forEach(exp => {
      const label = act.labels.find(l => l.componentNumber === exp.num);
      assert(label, `Label for callout ${exp.num} must exist`);
      assert.strictEqual(label.correctAnswer, exp.ans, `Callout ${exp.num} correct answer mismatch`);
      assert.strictEqual(label.invisible, true, `Callout ${exp.num} must have invisible=true`);
      assert(act.options.includes(exp.ans), `Options must include ${exp.ans}`);
    });
  });

  runTest(`${dir}: Activity 3 (Geometric Architecture) nomenclature & notation`, () => {
    const act = content.activities['gear-type-identification'];
    assert(act, 'gear-type-identification activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('mt = mn / cos(beta)')));
    assert(act.questions.some(q => q.correctAnswer.includes('tan(alpha_t) = tan(alpha_n) / cos(beta)')));
    assert(act.questions.some(q => q.correctAnswer.includes("z' = z / cos^3(beta)")));
  });

  runTest(`${dir}: Activity 4 (Kinematics) contact line progression`, () => {
    const act = content.activities['tooth-engagement-kinematics'];
    assert(act, 'tooth-engagement-kinematics activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('entire active face width simultaneously')));
    assert(act.questions.some(q => q.correctAnswer.includes('extends diagonally across the face width')));
  });

  runTest(`${dir}: Activity 5 (Force Characteristics) conceptual 3D forces & zero numerical calculation`, () => {
    const act = content.activities['force-characteristics'];
    assert(act, 'force-characteristics activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('Fa = 0')));
    assert(act.questions.some(q => q.correctAnswer.includes('Axial thrust force (Fa)')));
    assert(act.questions.some(q => q.correctAnswer.includes('Fa = Ft * tan(beta)')));
  });

  runTest(`${dir}: Activity 6 (Bearing Consequences) bearing arrangements`, () => {
    const act = content.activities['bearing-consequences'];
    assert(act, 'bearing-consequences activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('Standard Deep-Groove Ball Bearings')));
    assert(act.questions.some(q => q.correctAnswer.includes('Tapered Roller Bearings')));
  });

  runTest(`${dir}: Activity 7 (Dynamic Behaviour & Noise) contact ratio & velocity`, () => {
    const act = content.activities['dynamic-transmission-behaviour'];
    assert(act, 'dynamic-transmission-behaviour activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('epsilon_gamma = epsilon_alpha + epsilon_beta')));
    assert(act.questions.some(q => q.correctAnswer.includes('v < 8–10 m/s')));
  });

  runTest(`${dir}: Activity 8 (Manufacturing & Maintenance) tooling & alignment`, () => {
    const act = content.activities['manufacturing-and-maintenance'];
    assert(act, 'manufacturing-and-maintenance activity exists');
    assert.strictEqual(act.questions.length, 4);
    assert(act.questions.some(q => q.correctAnswer.includes('straight-axis hobbing or shaping')));
    assert(act.questions.some(q => q.correctAnswer.includes('Spur gears are relatively forgiving of slight axial displacement')));
  });

  runTest(`${dir}: Activity 9 (Selection Matrix) 6 deterministic profiles (6 x 0.25 = 1.5 M)`, () => {
    const act = content.activities['application-requirement-matrix'];
    assert(act, 'application-requirement-matrix activity exists');
    assert.strictEqual(act.questions.length, 6, 'Must have exactly 6 application profiles');
    const q1 = act.questions[0].correctAnswer;
    const q2 = act.questions[1].correctAnswer;
    const q3 = act.questions[2].correctAnswer;
    const q4 = act.questions[3].correctAnswer;
    const q5 = act.questions[4].correctAnswer;
    const q6 = act.questions[5].correctAnswer;
    assert(q1.startsWith('Spur Gear'), 'Profile 1 must be Spur Gear');
    assert(q2.startsWith('Helical Gear'), 'Profile 2 must be Helical Gear');
    assert(q3.startsWith('Spur Gear'), 'Profile 3 must be Spur Gear');
    assert(q4.startsWith('Helical Gear'), 'Profile 4 must be Helical Gear');
    assert(q5.startsWith('Spur Gear'), 'Profile 5 must be Spur Gear');
    assert(q6.startsWith('Helical Gear'), 'Profile 6 must be Helical Gear');
  });

  runTest(`${dir}: Activity 10 & 11 (Faculty Canvas & Reflection)`, () => {
    const act10 = content.activities['engineering-decision-canvas'];
    const act11 = content.activities['reflection-synthesis'];
    assert(act10, 'engineering-decision-canvas activity exists');
    assert(act11, 'reflection-synthesis activity exists');
    assert(act10.fields.some(f => f.name === 'selectedApplication'));
    assert(act10.fields.some(f => f.name === 'selectedGearType'));
    assert.strictEqual(act11.prompts.length, 3, 'Reflection must have 3 prompts');
  });

  runTest(`${dir}: Syllabus compliance check: ZERO Numerical Helical Force Calculations`, () => {
    const str = JSON.stringify(content);
    assert(!str.includes('"type": "number"'), 'Zero numerical number inputs');
    assert(!str.includes('Calculate Ft for helical'), 'No helical Ft numerical calculation');
    assert(!str.includes('Calculate Fr for helical'), 'No helical Fr numerical calculation');
    assert(!str.includes('Calculate Fa for helical'), 'No helical Fa numerical calculation');
    assert(!str.includes('Calculate the helical axial force'), 'No helical axial force calculation prompt');
    assert(!str.includes('double-helical thrust cancellation numerical'), 'No double helical calculation');
    // Verify charter explicitly documents the SPPU boundary
    const charter = content.activities['project-charter'];
    assert(charter.cards.some(c => c.body.includes('No numerical on force analysis of helical')), 'Charter must cite SPPU boundary');
  });
});

console.log('\n--- REGISTRATION & ARCHITECTURE INTEGRATION CHECKS ---');

runTest('data/assignments.json contains registered EA-TS-03', () => {
  const data = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-03');
  assert(found !== undefined, 'EA-TS-03 must be in data/assignments.json');
  assert.strictEqual(found.slug, 'gear-comparison');
  assert.strictEqual(found.co, 'CO1');
  assert.strictEqual(found.weightage, '12 Marks');
  assert.strictEqual(found.discipline, 'Transmission System Design');
});

runTest('outputs/meilp/data/assignments.json contains registered EA-TS-03', () => {
  const data = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-03');
  assert(found !== undefined, 'EA-TS-03 must be in outputs/meilp/data/assignments.json');
  assert.strictEqual(found.slug, 'gear-comparison');
  assert.strictEqual(found.co, 'CO1');
  assert.strictEqual(found.weightage, '12 Marks');
  assert.strictEqual(found.discipline, 'Transmission System Design');
});

runTest('ALL_ASSIGNMENTS in js/app.js contains EA-TS-03', () => {
  const content = fs.readFileSync('js/app.js', 'utf8');
  assert(content.includes('EA-TS-03'), 'EA-TS-03 must be present in js/app.js');
  assert(content.includes('gear-comparison'), 'gear-comparison must be present in js/app.js');
});

runTest('outputs/meilp/js/app.js matches js/app.js', () => {
  const c1 = fs.readFileSync('js/app.js', 'utf8');
  const c2 = fs.readFileSync('outputs/meilp/js/app.js', 'utf8');
  assert.strictEqual(c1, c2, 'js/app.js and outputs/meilp/js/app.js must be identical');
});

runTest('outputs/meilp/js/challenge-runner.js matches js/challenge-runner.js', () => {
  const c1 = fs.readFileSync('js/challenge-runner.js', 'utf8');
  const c2 = fs.readFileSync('outputs/meilp/js/challenge-runner.js', 'utf8');
  assert.strictEqual(c1, c2, 'js/challenge-runner.js and outputs/meilp/js/challenge-runner.js must be identical');
});

runTest('faculty/reports.html and outputs/meilp/faculty/reports.html contain EA-TS-03', () => {
  const r1 = fs.readFileSync('faculty/reports.html', 'utf8');
  const r2 = fs.readFileSync('outputs/meilp/faculty/reports.html', 'utf8');
  assert(r1.includes('EA-TS-03'), 'faculty/reports.html must contain EA-TS-03');
  assert(r2.includes('EA-TS-03'), 'outputs/meilp/faculty/reports.html must contain EA-TS-03');
});

runTest('faculty/js/evaluation-engine.js and mirror contain EA-TS-03 stepwise rubric', () => {
  const e1 = fs.readFileSync('faculty/js/evaluation-engine.js', 'utf8');
  const e2 = fs.readFileSync('outputs/meilp/faculty/js/evaluation-engine.js', 'utf8');
  assert(e1.includes('ts03-act-1'), 'faculty evaluation engine must have ts03-act-1');
  assert(e2.includes('ts03-act-1'), 'outputs evaluation engine must have ts03-act-1');
});

runTest('coursework.html and mirror contain EA-TS-03 in transmissionAssignmentGrid', () => {
  const c1 = fs.readFileSync('coursework.html', 'utf8');
  const c2 = fs.readFileSync('outputs/meilp/coursework.html', 'utf8');
  assert(c1.includes('EA-TS-03'), 'coursework.html must contain EA-TS-03');
  assert(c2.includes('EA-TS-03'), 'outputs/meilp/coursework.html must contain EA-TS-03');
  assert(c1.includes('gear-comparison'), 'coursework.html must link to gear-comparison');
  assert(c2.includes('gear-comparison'), 'outputs/meilp/coursework.html must link to gear-comparison');
});

console.log('======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL EA-TS-03 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('======================================================================');
