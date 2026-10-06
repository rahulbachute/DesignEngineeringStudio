const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-01: HELICAL GEAR DESIGN (SPPU 2024 / PCC353-MEC) ---');
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
  'assignments/helical-gear-design',
  'outputs/meilp/assignments/helical-gear-design'
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
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-01_Helical_Gear_Drive_Student.png')), 'Student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-01_Helical_Gear_Drive_Faculty.png')), 'Faculty asset image exists');
  });

  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

  runTest(`${dir}: Metadata & Course Outcome configuration`, () => {
    assert.strictEqual(config.id, 'EA-TS-01');
    assert.strictEqual(config.courseCode, 'PCC353-MEC');
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
    assert.strictEqual(workflow.steps.length, 9, 'Should have 8 activities + 1 submit step');
    const totalMarks = workflow.steps.reduce((acc, step) => acc + (step.marks || 0), 0);
    assert.strictEqual(totalMarks, 12.0, `Workflow step marks sum to 12.0 (got ${totalMarks})`);
  });

  runTest(`${dir}: Rubric 12-Criterion Architecture (9 Auto + 3 Faculty)`, () => {
    assert.strictEqual(rubric.criteria.length, 12, 'Must contain 12 CCE criteria TS01-C01 through TS01-C12');
    const autoCriteria = rubric.criteria.filter(c => c.type === 'auto-grading');
    const facultyCriteria = rubric.criteria.filter(c => c.type === 'scoring');
    const autoMarks = autoCriteria.reduce((s, c) => s + c.maxMarks, 0);
    const facultyMarks = facultyCriteria.reduce((s, c) => s + c.maxMarks, 0);
    assert.strictEqual(autoMarks, 9.0, `Automated criteria sum to 9.0 marks (got ${autoMarks})`);
    assert.strictEqual(facultyMarks, 3.0, `Faculty criteria sum to 3.0 marks (got ${facultyMarks})`);
  });

  runTest(`${dir}: Engineering Visualisation callout mapping & invisible markers`, () => {
    const act = content.activities['engineering-visualisation'];
    assert(act, 'engineering-visualisation activity exists');
    assert.strictEqual(act.hideMarkers, true, 'hideMarkers must be true');
    assert.strictEqual(act.markerStyle, 'invisible', 'markerStyle must be invisible');
    assert.strictEqual(act.labels.length, 10, 'Must have exactly 10 callout labels');
    
    const expected = [
      { num: 1, ans: 'Pinion (18 Teeth, 40Ni2Cr1Mo28 Alloy Steel)' },
      { num: 2, ans: 'Driven Gear (54 Teeth, 55C8 Plain Carbon Steel)' },
      { num: 3, ans: 'High-Speed Pinion Shaft & Coupling (Input)' },
      { num: 4, ans: 'Low-Speed Output Shaft & Bearings' },
      { num: 5, ans: 'High-Speed Input Pinion Bearings' },
      { num: 6, ans: 'Input Shaft Bearing Pedestal (Right)' },
      { num: 7, ans: 'Parallel Key (Pinion Shaft)' },
      { num: 8, ans: 'Low-Speed Output Shaft Bearings' },
      { num: 9, ans: 'Parallel Key (Gear Shaft)' },
      { num: 10, ans: 'Rigid Cast Iron Gearbox Casing / Bed Plate' }
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

const P = 15.0; // kW
const N1 = 1440.0; // rpm
const N2 = 480.0; // rpm
const z1 = 18;
const z2 = 54;
const psi_deg = 20.0;
const psi_rad = psi_deg * (Math.PI / 180.0);
const mn = 4.0; // mm
const b = 40.0; // mm
const Sut1 = 800.0; // MPa
const Sut2 = 600.0; // MPa
const BHN2 = 250.0;
const Ka = 1.25;
const Km = 1.30;

// CP01: Pinion torque
const T1 = (60.0 * 1e6 * P) / (2.0 * Math.PI * N1);
runTest(`CP01: Pinion Torque T1 = ${T1.toFixed(2)} N·mm (Expected: 99471.84, ±1%)`, () => {
  assert(Math.abs(T1 - 99471.8394) / 99471.8394 < 0.01);
});

// CP02: Transmission ratio
const i_ratio = N1 / N2;
runTest(`CP02: Transmission ratio i = ${i_ratio.toFixed(2)} (Expected: 3.00, ±0.5%)`, () => {
  assert(Math.abs(i_ratio - 3.0) < 0.015);
});

// CP03 & CP04: Virtual teeth
const cos_psi = Math.cos(psi_rad);
const z1_prime = z1 / Math.pow(cos_psi, 3);
const z2_prime = z2 / Math.pow(cos_psi, 3);
runTest(`CP03: Virtual Pinion Teeth z1' = ${z1_prime.toFixed(2)} (Expected: 21.69, ±1%)`, () => {
  assert(Math.abs(z1_prime - 21.6928) / 21.6928 < 0.01);
});
runTest(`CP04: Virtual Gear Teeth z2' = ${z2_prime.toFixed(2)} (Expected: 65.08, ±1%)`, () => {
  assert(Math.abs(z2_prime - 65.0783) / 65.0783 < 0.01);
});

// CP05 & CP06: Lewis Form Factors
const Yv1 = 0.484 - (2.87 / z1_prime);
const Yv2 = 0.484 - (2.87 / z2_prime);
runTest(`CP05: Lewis Form Factor Yv1 = ${Yv1.toFixed(4)} (Expected: 0.3517, ±1.5%)`, () => {
  assert(Math.abs(Yv1 - 0.351698) / 0.351698 < 0.015);
});
runTest(`CP06: Lewis Form Factor Yv2 = ${Yv2.toFixed(4)} (Expected: 0.4399, ±1.5%)`, () => {
  assert(Math.abs(Yv2 - 0.439899) / 0.439899 < 0.015);
});

// CP07, CP08, CP09, CP10, CP11: Bending stress & weaker element
const sigma_b1 = Sut1 / 3.0;
const sigma_b2 = Sut2 / 3.0;
const strength1 = sigma_b1 * Yv1;
const strength2 = sigma_b2 * Yv2;
runTest(`CP07: Pinion Permissible Bending Stress = ${sigma_b1.toFixed(2)} MPa`, () => {
  assert(Math.abs(sigma_b1 - 266.6667) / 266.6667 < 0.01);
});
runTest(`CP08: Gear Permissible Bending Stress = ${sigma_b2.toFixed(2)} MPa`, () => {
  assert(Math.abs(sigma_b2 - 200.0) < 0.01);
});
runTest(`CP09: Pinion Strength Product = ${strength1.toFixed(2)} MPa (Expected: 93.79, ±2%)`, () => {
  assert(Math.abs(strength1 - 93.7861) / 93.7861 < 0.02);
});
runTest(`CP10: Gear Strength Product = ${strength2.toFixed(2)} MPa (Expected: 87.98, ±2%)`, () => {
  assert(Math.abs(strength2 - 87.9799) / 87.9799 < 0.02);
});
runTest('CP11: Weaker Element in Bending = Gear (55C8 plain carbon steel)', () => {
  assert(strength2 < strength1, 'Gear must have lower strength product than pinion');
});

// CP12, CP13, CP14: Pitch geometry & Centre distance
const d1 = (z1 * mn) / cos_psi;
const d2 = (z2 * mn) / cos_psi;
const a_dist = (d1 + d2) / 2.0;
runTest(`CP12: Pinion Pitch Diameter d1 = ${d1.toFixed(2)} mm (Expected: 76.62, ±1%)`, () => {
  assert(Math.abs(d1 - 76.6208) / 76.6208 < 0.01);
});
runTest(`CP13: Gear Pitch Diameter d2 = ${d2.toFixed(2)} mm (Expected: 229.86, ±1%)`, () => {
  assert(Math.abs(d2 - 229.8624) / 229.8624 < 0.01);
});
runTest(`CP14: Centre Distance a = ${a_dist.toFixed(2)} mm (Expected: 153.24, ±1%)`, () => {
  assert(Math.abs(a_dist - 153.2416) / 153.2416 < 0.01);
});

// CP15 & CP16: Pitch-line velocity & Barth velocity factor
const v = (Math.PI * d1 * N1) / (60.0 * 1e3);
const Cv = 5.6 / (5.6 + Math.sqrt(v));
runTest(`CP15: Pitch Velocity v = ${v.toFixed(2)} m/s (Expected: 5.78, ±1.5%)`, () => {
  assert(Math.abs(v - 5.7771) / 5.7771 < 0.015);
});
runTest(`CP16: Barth Velocity Factor Cv = ${Cv.toFixed(4)} (Expected: 0.700 / 0.6997, ±1.5%)`, () => {
  assert(Math.abs(Cv - 0.699689) / 0.699689 < 0.015);
});

// CP17 & CP18: Tangential force & Effective load
const Pt = (2.0 * T1) / d1;
const Peff = (Ka * Km * Pt) / Cv;
runTest(`CP17: Tangential Load Pt = ${Pt.toFixed(2)} N (Expected: 2596.47, ±1.5%)`, () => {
  assert(Math.abs(Pt - 2596.4709) / 2596.4709 < 0.015);
});
runTest(`CP18: Effective Load Peff = ${Peff.toFixed(2)} N (Expected: 6030.20, ±2%)`, () => {
  assert(Math.abs(Peff - 6030.1996) / 6030.1996 < 0.02);
});

// CP19, CP20, CP21: Lewis beam strength & FOSb
const Sb = mn * b * sigma_b2 * Yv2;
const FOSb = Sb / Peff;
runTest(`CP19: Lewis Beam Strength Sb = ${Sb.toFixed(2)} N (Expected: 14076.78, ±2%)`, () => {
  assert(Math.abs(Sb - 14076.7773) / 14076.7773 < 0.02);
});
runTest(`CP20: Initial Bending FOS = ${FOSb.toFixed(2)} (Expected: 2.33, ±2%)`, () => {
  assert(Math.abs(FOSb - 2.3344) / 2.3344 < 0.02);
});
runTest('CP21: Initial Bending Status = SAFE (FOSb = 2.33 >= 1.50)', () => {
  assert(FOSb >= 1.50);
});

// CP22, CP23, CP24, CP25, CP26: Buckingham wear strength & FOSw
const Q = (2.0 * z2) / (z1 + z2);
const K = 0.16 * Math.pow(BHN2 / 100.0, 2);
const Sw = (b * Q * d1 * K) / Math.pow(cos_psi, 2);
const FOSw = Sw / Peff;
runTest(`CP22: Ratio Factor Q = ${Q.toFixed(2)} (Expected: 1.50, ±0.5%)`, () => {
  assert(Math.abs(Q - 1.50) < 0.0075);
});
runTest(`CP23: Load-Stress Factor K = ${K.toFixed(2)} N/mm² (Expected: 1.00, ±1%)`, () => {
  assert(Math.abs(K - 1.00) < 0.01);
});
runTest(`CP24: Buckingham Wear Strength Sw = ${Sw.toFixed(2)} N (Expected: 5206.27, ±2%)`, () => {
  assert(Math.abs(Sw - 5206.2653) / 5206.2653 < 0.02);
});
runTest(`CP25: Initial Wear FOS = ${FOSw.toFixed(2)} (Expected: 0.86, ±2%)`, () => {
  assert(Math.abs(FOSw - 0.8634) / 0.8634 < 0.02);
});
runTest('CP26: Initial Wear Status = UNSAFE (FOSw = 0.86 < 1.50)', () => {
  assert(FOSw < 1.50);
});

// CP27: Governing failure defect
runTest('CP27: Governing Failure Deficiency = Wear / Pitting (Contact Fatigue)', () => {
  assert(FOSb >= 1.50 && FOSw < 1.50);
});

// CP28, CP29, CP30: Redesign Option A (b = 55 mm)
const b_A = 55.0;
const Sw_A = (b_A * Q * d1 * K) / Math.pow(cos_psi, 2);
const FOSw_A = Sw_A / Peff;
runTest(`CP28: Option A Wear Strength (b=55) = ${Sw_A.toFixed(2)} N (Expected: 7158.61, ±2%)`, () => {
  assert(Math.abs(Sw_A - 7158.6148) / 7158.6148 < 0.02);
});
runTest(`CP29: Option A Wear FOS = ${FOSw_A.toFixed(2)} (Expected: 1.19, ±2%)`, () => {
  assert(Math.abs(FOSw_A - 1.1871) / 1.1871 < 0.02);
});
runTest('CP30: Option A Status = INSUFFICIENT (FOSw = 1.19 < 1.50)', () => {
  assert(FOSw_A < 1.50);
});

// CP31, CP32, CP33, CP34: Redesign Option B1 (350 BHN)
const BHN_B1 = 350.0;
const K_B1 = 0.16 * Math.pow(BHN_B1 / 100.0, 2);
const Sw_B1 = (b * Q * d1 * K_B1) / Math.pow(cos_psi, 2);
const FOSw_B1 = Sw_B1 / Peff;
runTest(`CP31: Option B1 Load-Stress Factor = ${K_B1.toFixed(2)} N/mm² (Expected: 1.96, ±1%)`, () => {
  assert(Math.abs(K_B1 - 1.96) < 0.02);
});
runTest(`CP32: Option B1 Wear Strength = ${Sw_B1.toFixed(2)} N (Expected: 10204.28, ±2%)`, () => {
  assert(Math.abs(Sw_B1 - 10204.28) / 10204.28 < 0.02);
});
runTest(`CP33: Option B1 Wear FOS = ${FOSw_B1.toFixed(2)} (Expected: 1.69, ±2%)`, () => {
  assert(Math.abs(FOSw_B1 - 1.6922) / 1.6922 < 0.02);
});
runTest('CP34: Option B1 Status = SATISFIES TARGET (FOSw = 1.69 >= 1.50)', () => {
  assert(FOSw_B1 >= 1.50);
});

// CP35, CP36, CP37, CP38: Redesign Option C (mn = 5 mm, b = 50 mm)
const mn_C = 5.0;
const b_C = 50.0;
const d1_C = (z1 * mn_C) / cos_psi;
const v_C = (Math.PI * d1_C * N1) / (60.0 * 1e3);
const Pt_C = (2.0 * T1) / d1_C;
const Cv_C = 5.6 / (5.6 + Math.sqrt(v_C));
const Peff_C = (Ka * Km * Pt_C) / Cv_C;
const Sw_C = (b_C * Q * d1_C * K) / Math.pow(cos_psi, 2);
const FOSw_C = Sw_C / Peff_C;
runTest(`CP35: Option C Pitch Diameter = ${d1_C.toFixed(2)} mm (Expected: 95.78, ±1%)`, () => {
  assert(Math.abs(d1_C - 95.776) / 95.776 < 0.01);
});
runTest(`CP36: Option C Effective Load = ${Peff_C.toFixed(2)} N (Expected: 4995.16, ±2.5%)`, () => {
  assert(Math.abs(Peff_C - 4995.1611) / 4995.1611 < 0.025);
});
runTest(`CP37: Option C Wear Strength = ${Sw_C.toFixed(2)} N (Expected: 8134.79, ±2%)`, () => {
  assert(Math.abs(Sw_C - 8134.7896) / 8134.7896 < 0.02);
});
runTest(`CP38: Option C Wear FOS = ${FOSw_C.toFixed(2)} (Expected: 1.63, ±2.5%)`, () => {
  assert(Math.abs(FOSw_C - 1.6285) / 1.6285 < 0.025);
});

console.log('\n--- REGISTRATION & ARCHITECTURE CHECKS ---');

runTest('data/assignments.json contains registered EA-TS-01', () => {
  const data = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-01');
  assert(found !== undefined, 'EA-TS-01 must be in data/assignments.json');
  assert.strictEqual(found.slug, 'helical-gear-design');
});

runTest('outputs/meilp/data/assignments.json contains registered EA-TS-01', () => {
  const data = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-01');
  assert(found !== undefined, 'EA-TS-01 must be in outputs/meilp/data/assignments.json');
  assert.strictEqual(found.slug, 'helical-gear-design');
});

runTest('ALL_ASSIGNMENTS in js/app.js contains EA-TS-01', () => {
  const content = fs.readFileSync('js/app.js', 'utf8');
  assert(content.includes('EA-TS-01'), 'EA-TS-01 must be present in js/app.js');
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

console.log('======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL EA-TS-01 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('======================================================================');
