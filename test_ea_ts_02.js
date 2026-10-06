const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-02: SPUR GEAR DESIGN (SPPU 2024 / PCC353-MEC) ---');
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
  'assignments/spur-gear-design',
  'outputs/meilp/assignments/spur-gear-design'
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
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-02_Spur_Gear_Drive_Student.png')), 'Student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-02_Spur_Gear_Drive_Faculty.png')), 'Faculty asset image exists');
  });

  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

  runTest(`${dir}: Metadata & Course Outcome configuration`, () => {
    assert.strictEqual(config.id, 'EA-TS-02');
    assert.strictEqual(config.courseCode, 'PCC353-MEC');
    assert.strictEqual(config.title, 'Design Parameters of Spur Gears for Industrial Conveyor Systems');
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
    assert.strictEqual(content.attemptMode.individual[0].name, 'fullName', 'fullName must be first input to receive direct focus');
  });

  runTest(`${dir}: Workflow step structure & 12-mark sum`, () => {
    assert(Array.isArray(workflow.steps), 'workflow steps array exists');
    assert.strictEqual(workflow.steps.length, 13, 'Should have 12 activities + 1 submit step');
    const totalMarks = workflow.steps.reduce((acc, step) => acc + (step.marks || 0), 0);
    assert.strictEqual(totalMarks, 12.0, `Workflow step marks sum to 12.0 (got ${totalMarks})`);
  });

  runTest(`${dir}: Rubric 12-Criterion Architecture (9 Auto + 3 Faculty)`, () => {
    assert.strictEqual(rubric.criteria.length, 12, 'Must contain 12 CCE criteria TS02-C01 through TS02-C12');
    const autoCriteria = rubric.criteria.filter(c => c.type === 'auto-grading');
    const facultyCriteria = rubric.criteria.filter(c => c.type === 'scoring');
    const autoMarks = autoCriteria.reduce((s, c) => s + c.maxMarks, 0);
    const facultyMarks = facultyCriteria.reduce((s, c) => s + c.maxMarks, 0);
    assert.strictEqual(autoMarks, 9.0, `Automated criteria sum to 9.0 marks (got ${autoMarks})`);
    assert.strictEqual(facultyMarks, 3.0, `Faculty criteria sum to 3.0 marks (got ${facultyMarks})`);
  });

  runTest(`${dir}: Conveyor Visualisation callout mapping & invisible markers`, () => {
    const act = content.activities['conveyor-visualisation'];
    assert(act, 'conveyor-visualisation activity exists');
    assert.strictEqual(act.hideMarkers, true, 'hideMarkers must be true');
    assert.strictEqual(act.markerStyle, 'invisible', 'markerStyle must be invisible');
    assert.strictEqual(act.labels.length, 10, 'Must have exactly 10 callout labels');
    
    const expected = [
      { num: 1, ans: 'Electric Drive Motor (11 kW, 960 rpm)' },
      { num: 2, ans: 'High-Speed Input Shaft (960 rpm)' },
      { num: 3, ans: 'Pinion Shaft Drive Key (Parallel Sunk Key)' },
      { num: 4, ans: 'Driving Spur Pinion (20 Teeth, 40Ni2Cr1Mo28 Alloy Steel)' },
      { num: 5, ans: 'Driven Spur Gear Teeth / Meshing Zone' },
      { num: 6, ans: 'Driven Spur Gear Wheel (60 Teeth, 55C8 Plain Carbon Steel)' },
      { num: 7, ans: 'Gear Hub / Shaft Drive Key (Output Hub Key)' },
      { num: 8, ans: 'Low-Speed Output Conveyor Shaft (320 rpm)' },
      { num: 9, ans: 'Conveyor Head Pulley Drum (Drive Pulley)' },
      { num: 10, ans: 'Continuous Conveyor Belt & Bulk Material' }
    ];

    expected.forEach(exp => {
      const label = act.labels.find(l => l.componentNumber === exp.num);
      assert(label, `Label for callout ${exp.num} must exist`);
      assert.strictEqual(label.correctAnswer, exp.ans, `Callout ${exp.num} correct answer mismatch`);
      assert.strictEqual(label.invisible, true, `Callout ${exp.num} must have invisible=true`);
      assert.strictEqual(label.x, undefined, `Callout ${exp.num} must not have x coordinate`);
      assert.strictEqual(label.y, undefined, `Callout ${exp.num} must not have y coordinate`);
      assert(act.options.includes(exp.ans), `Options must include ${exp.ans}`);
    });
  });
});

console.log('\n--- MATHEMATICAL & 38 INTERNAL CHECKPOINTS VERIFICATION ---');

const P = 11.0; // kW
const N1 = 960.0; // rpm
const N2 = 320.0; // rpm
const z1 = 20;
const z2 = 60;
const m_mod = 4.0; // mm
const b_width = 40.0; // mm
const Sut1 = 800.0; // MPa
const Sut2 = 600.0; // MPa
const BHN2 = 250.0;
const Ka = 1.50;
const Km = 1.25;

// CP01: Pinion torque
const T1 = (60.0 * 1e6 * P) / (2.0 * Math.PI * N1);
runTest(`CP01: Pinion Torque T1 = ${T1.toFixed(2)} N·mm (Expected: 109419.02, ±1%)`, () => {
  assert(Math.abs(T1 - 109419.024) / 109419.024 < 0.01);
});

// CP02: Transmission ratio
const i_ratio = N1 / N2;
runTest(`CP02: Transmission ratio i = ${i_ratio.toFixed(2)} (Expected: 3.00, ±0.5%)`, () => {
  assert(Math.abs(i_ratio - 3.0) < 0.015);
});

// CP03: Output gear torque
const T2 = T1 * i_ratio;
runTest(`CP03: Output Gear Torque T2 = ${T2.toFixed(2)} N·mm (Expected: 328257.06, ±1%)`, () => {
  assert(Math.abs(T2 - 328257.07) / 328257.07 < 0.01);
});

// CP04 & CP05: Pitch diameters
const d1 = m_mod * z1;
const d2 = m_mod * z2;
runTest(`CP04: Pinion Pitch Diameter d1 = ${d1.toFixed(2)} mm (Expected: 80.00, ±0.5%)`, () => {
  assert(Math.abs(d1 - 80.0) < 0.01);
});
runTest(`CP05: Gear Pitch Diameter d2 = ${d2.toFixed(2)} mm (Expected: 240.00, ±0.5%)`, () => {
  assert(Math.abs(d2 - 240.0) < 0.01);
});

// CP06: Centre distance
const a_dist = (d1 + d2) / 2.0;
runTest(`CP06: Centre Distance a = ${a_dist.toFixed(2)} mm (Expected: 160.00, ±0.5%)`, () => {
  assert(Math.abs(a_dist - 160.0) < 0.01);
});

// CP07 & CP08: Permissible bending stresses
const sigma_b1 = Sut1 / 3.0;
const sigma_b2 = Sut2 / 3.0;
runTest(`CP07: Pinion Permissible Bending Stress = ${sigma_b1.toFixed(2)} MPa (Expected: 266.67, ±1%)`, () => {
  assert(Math.abs(sigma_b1 - 266.6667) / 266.6667 < 0.01);
});
runTest(`CP08: Gear Permissible Bending Stress = ${sigma_b2.toFixed(2)} MPa (Expected: 200.00, ±0.5%)`, () => {
  assert(Math.abs(sigma_b2 - 200.0) < 0.01);
});

// CP09 & CP10: Lewis form factors
const Y1 = 0.484 - (2.87 / z1);
const Y2 = 0.484 - (2.87 / z2);
runTest(`CP09: Lewis Form Factor Y1 = ${Y1.toFixed(4)} (Expected: 0.3405, ±1.5%)`, () => {
  assert(Math.abs(Y1 - 0.3405) / 0.3405 < 0.015);
});
runTest(`CP10: Lewis Form Factor Y2 = ${Y2.toFixed(4)} (Expected: 0.4362, ±1.5%)`, () => {
  assert(Math.abs(Y2 - 0.4361667) / 0.4361667 < 0.015);
});

// CP11 & CP12: Strength products & weaker element
const strength1 = sigma_b1 * Y1;
const strength2 = sigma_b2 * Y2;
runTest(`CP11: Pinion Strength Product = ${strength1.toFixed(2)} MPa (Expected: 90.80, ±2%)`, () => {
  assert(Math.abs(strength1 - 90.80) / 90.80 < 0.02);
});
runTest(`CP12: Gear Strength Product = ${strength2.toFixed(2)} MPa (Expected: 87.23, ±2%)`, () => {
  assert(Math.abs(strength2 - 87.2333) / 87.2333 < 0.02);
});
runTest('CP13: Weaker Element in Bending = Gear (55C8 plain carbon steel)', () => {
  assert(strength2 < strength1, 'Gear must be the weaker element in bending');
});

// CP14 & CP15: Pitch-line velocity & Barth velocity factor
const v = (Math.PI * d1 * N1) / (60.0 * 1e3);
const Cv = 5.6 / (5.6 + Math.sqrt(v));
runTest(`CP14: Pitch Velocity v = ${v.toFixed(4)} m/s (Expected: 4.0212, ±1.5%)`, () => {
  assert(Math.abs(v - 4.021238) / 4.021238 < 0.015);
});
runTest(`CP15: Barth Velocity Factor Cv = ${Cv.toFixed(4)} (Expected: 0.7363, ±1.5%)`, () => {
  assert(Math.abs(Cv - 0.73633) / 0.73633 < 0.015);
});

// CP16 & CP17: Tangential force & Effective dynamic load
const Pt = (2.0 * T1) / d1;
const Peff = (Ka * Km * Pt) / Cv;
runTest(`CP16: Tangential Load Pt = ${Pt.toFixed(2)} N (Expected: 2735.48, ±1.5%)`, () => {
  assert(Math.abs(Pt - 2735.4756) / 2735.4756 < 0.015);
});
runTest(`CP17: Effective Dynamic Load Peff = ${Peff.toFixed(2)} N (Expected: 6965.67, ±2%)`, () => {
  assert(Math.abs(Peff - 6965.674) / 6965.674 < 0.02);
});

// CP18, CP19, CP20: Lewis beam strength & Bending FOS
const Sb = m_mod * b_width * sigma_b2 * Y2;
const FOSb = Sb / Peff;
runTest(`CP18: Lewis Beam Strength Sb = ${Sb.toFixed(2)} N (Expected: 13957.33, ±2%)`, () => {
  assert(Math.abs(Sb - 13957.333) / 13957.333 < 0.02);
});
runTest(`CP19: Initial Bending FOS = ${FOSb.toFixed(2)} (Expected: 2.00, ±2%)`, () => {
  assert(Math.abs(FOSb - 2.0037) / 2.0037 < 0.02);
});
runTest('CP20: Initial Bending Status = SAFE (FOSb = 2.00 >= 1.50)', () => {
  assert(FOSb >= 1.50);
});

// CP21, CP22, CP23, CP24, CP25: Buckingham wear strength & Wear FOS
const Q = (2.0 * z2) / (z1 + z2);
const K = 0.16 * Math.pow(BHN2 / 100.0, 2);
const Sw = b_width * Q * d1 * K;
const FOSw = Sw / Peff;
runTest(`CP21: Ratio Factor Q = ${Q.toFixed(2)} (Expected: 1.50, ±0.5%)`, () => {
  assert(Math.abs(Q - 1.50) < 0.0075);
});
runTest(`CP22: Load-Stress Factor K = ${K.toFixed(2)} N/mm² (Expected: 1.00, ±1%)`, () => {
  assert(Math.abs(K - 1.00) < 0.01);
});
runTest(`CP23: Buckingham Wear Strength Sw = ${Sw.toFixed(2)} N (Expected: 4800.00, ±2%)`, () => {
  assert(Math.abs(Sw - 4800.0) < 0.01);
});
runTest(`CP24: Initial Wear FOS = ${FOSw.toFixed(3)} (Expected: 0.689, ±2%)`, () => {
  assert(Math.abs(FOSw - 0.68909) / 0.68909 < 0.02);
});
runTest('CP25: Initial Wear Status = UNSAFE (FOSw = 0.689 < 1.50)', () => {
  assert(FOSw < 1.50);
});

// CP26: Governing failure defect
runTest('CP26: Governing Failure Deficiency = Wear / Pitting (Contact Fatigue)', () => {
  assert(FOSb >= 1.50 && FOSw < 1.50);
});

// CP27, CP28, CP29: Redesign Option A (b = 60 mm)
const b_A = 60.0;
const Sw_A = b_A * Q * d1 * K;
const FOSw_A = Sw_A / Peff;
runTest(`CP27: Option A Wear Strength (b=60) = ${Sw_A.toFixed(2)} N (Expected: 7200.00, ±2%)`, () => {
  assert(Math.abs(Sw_A - 7200.0) < 0.01);
});
runTest(`CP28: Option A Wear FOS = ${FOSw_A.toFixed(3)} (Expected: 1.034, ±2%)`, () => {
  assert(Math.abs(FOSw_A - 1.03364) / 1.03364 < 0.02);
});
runTest('CP29: Option A Status = INSUFFICIENT (FOSw = 1.034 < 1.50)', () => {
  assert(FOSw_A < 1.50);
});

// CP30, CP31, CP32, CP33: Redesign Option B (Gear BHN = 400)
const BHN_B = 400.0;
const K_B = 0.16 * Math.pow(BHN_B / 100.0, 2);
const Sw_B = b_width * Q * d1 * K_B;
const FOSw_B = Sw_B / Peff;
runTest(`CP30: Option B Load-Stress Factor = ${K_B.toFixed(2)} N/mm² (Expected: 2.56, ±1%)`, () => {
  assert(Math.abs(K_B - 2.56) < 0.01);
});
runTest(`CP31: Option B Wear Strength = ${Sw_B.toFixed(2)} N (Expected: 12288.00, ±2%)`, () => {
  assert(Math.abs(Sw_B - 12288.0) < 0.01);
});
runTest(`CP32: Option B Wear FOS = ${FOSw_B.toFixed(3)} (Expected: 1.764, ±2%)`, () => {
  assert(Math.abs(FOSw_B - 1.76408) / 1.76408 < 0.02);
});
runTest('CP33: Option B Status = SATISFIES TARGET (FOSw = 1.764 >= 1.50)', () => {
  assert(FOSw_B >= 1.50);
});

// CP34, CP35, CP36, CP37, CP38, CP39: Redesign Option C (m = 5 mm, b = 60 mm)
const m_C = 5.0;
const b_C = 60.0;
const d1_C = m_C * z1;
const v_C = (Math.PI * d1_C * N1) / (60.0 * 1e3);
const Pt_C = (2.0 * T1) / d1_C;
const Cv_C = 5.6 / (5.6 + Math.sqrt(v_C));
const Peff_C = (Ka * Km * Pt_C) / Cv_C;
const Sw_C = b_C * Q * d1_C * K;
const FOSw_C = Sw_C / Peff_C;
runTest(`CP34: Option C Pitch Diameter = ${d1_C.toFixed(2)} mm (Expected: 100.00, ±0.5%)`, () => {
  assert(Math.abs(d1_C - 100.0) < 0.01);
});
runTest(`CP35: Option C Pitch Velocity = ${v_C.toFixed(4)} m/s, Cv = ${Cv_C.toFixed(4)}`, () => {
  assert(Math.abs(v_C - 5.026548) / 5.026548 < 0.015);
  assert(Math.abs(Cv_C - 0.7141) / 0.7141 < 0.015);
});
runTest(`CP36: Option C Effective Dynamic Load = ${Peff_C.toFixed(2)} N (Expected: 5745.89, ±2.5%)`, () => {
  assert(Math.abs(Peff_C - 5745.89) / 5745.89 < 0.025);
});
runTest(`CP37: Option C Wear Strength = ${Sw_C.toFixed(2)} N (Expected: 9000.00, ±2%)`, () => {
  assert(Math.abs(Sw_C - 9000.0) < 0.01);
});
runTest(`CP38: Option C Wear FOS = ${FOSw_C.toFixed(3)} (Expected: 1.566, ±2.5%)`, () => {
  assert(Math.abs(FOSw_C - 1.5663) / 1.5663 < 0.025);
});
runTest('CP39: Option C Status = SATISFIES TARGET (FOSw = 1.566 >= 1.50)', () => {
  assert(FOSw_C >= 1.50);
});

console.log('\n--- REGISTRATION & ARCHITECTURE CHECKS ---');

runTest('data/assignments.json contains registered EA-TS-02', () => {
  const data = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-02');
  assert(found !== undefined, 'EA-TS-02 must be in data/assignments.json');
  assert.strictEqual(found.slug, 'spur-gear-design');
});

runTest('outputs/meilp/data/assignments.json contains registered EA-TS-02', () => {
  const data = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-02');
  assert(found !== undefined, 'EA-TS-02 must be in outputs/meilp/data/assignments.json');
  assert.strictEqual(found.slug, 'spur-gear-design');
});

runTest('ALL_ASSIGNMENTS in js/app.js contains EA-TS-02', () => {
  const content = fs.readFileSync('js/app.js', 'utf8');
  assert(content.includes('EA-TS-02'), 'EA-TS-02 must be present in js/app.js');
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

runTest('faculty/reports.html and outputs/meilp/faculty/reports.html contain EA-TS-02', () => {
  const r1 = fs.readFileSync('faculty/reports.html', 'utf8');
  const r2 = fs.readFileSync('outputs/meilp/faculty/reports.html', 'utf8');
  assert(r1.includes('EA-TS-02'), 'faculty/reports.html must contain EA-TS-02');
  assert(r2.includes('EA-TS-02'), 'outputs/meilp/faculty/reports.html must contain EA-TS-02');
});

runTest('faculty/js/evaluation-engine.js and mirror contain EA-TS-02 stepwise rubric', () => {
  const e1 = fs.readFileSync('faculty/js/evaluation-engine.js', 'utf8');
  const e2 = fs.readFileSync('outputs/meilp/faculty/js/evaluation-engine.js', 'utf8');
  assert(e1.includes('ts02-act-1'), 'faculty evaluation engine must have ts02-act-1');
  assert(e2.includes('ts02-act-1'), 'outputs evaluation engine must have ts02-act-1');
});

runTest('coursework.html and mirror contain EA-TS-02 in transmissionAssignmentGrid', () => {
  const c1 = fs.readFileSync('coursework.html', 'utf8');
  const c2 = fs.readFileSync('outputs/meilp/coursework.html', 'utf8');
  assert(c1.includes('EA-TS-02'), 'coursework.html must contain EA-TS-02');
  assert(c2.includes('EA-TS-02'), 'outputs/meilp/coursework.html must contain EA-TS-02');
  assert(c1.includes('spur-gear-design'), 'coursework.html must link to spur-gear-design');
  assert(c2.includes('spur-gear-design'), 'outputs/meilp/coursework.html must link to spur-gear-design');
});

console.log('======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL EA-TS-02 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('======================================================================');
