const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('======================================================================');
console.log('--- VALIDATING EA-TS-04: AUTOMOTIVE SPUR GEAR (SPPU 2024 / PCC353) ---');
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
  'assignments/automotive-spur-gear-analysis',
  'outputs/meilp/assignments/automotive-spur-gear-analysis'
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
    assert(fs.existsSync(path.join(dir, 'test_ea_ts_04.js')), 'test_ea_ts_04.js exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Final_Corrected.png')), 'Authoritative student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Automotive_Reverse_Gear_Student.png')), 'Student asset image exists');
    assert(fs.existsSync(path.join(dir, 'images', 'EA-TS-04_Automotive_Reverse_Gear_Faculty.png')), 'Faculty asset image exists');
  });

  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

  runTest(`${dir}: Metadata & Course Outcome configuration`, () => {
    assert.strictEqual(config.id, 'EA-TS-04');
    assert.strictEqual(config.courseCode, 'PCC353-MEC');
    assert.strictEqual(config.title, 'Analysis of Spur Gears in a Car Transmission System');
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
    workflow.steps.forEach(step => {
      assert.strictEqual(step.marks, expectedMarks[step.activityNumber], `Step ${step.activityNumber} marks mismatch`);
    });
  });

  runTest(`${dir}: Rubric 11-Criterion Architecture (9 Auto + 3 Faculty)`, () => {
    assert.strictEqual(rubric.criteria.length, 11, 'Must contain 11 CCE criteria TS04-C01 through TS04-C11');
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
      const code = `TS04-C${i < 10 ? '0' + i : i}`;
      const crit = evalTmpl.criteria.find(c => c.rubricRef === code);
      assert(crit, `Evaluation template criterion for ${code} must exist`);
    }
  });

  runTest(`${dir}: Visualisation callout mapping & invisible markers (10 Callouts)`, () => {
    const act = content.activities['gearbox-visualisation'];
    assert(act, 'gearbox-visualisation activity exists');
    assert.strictEqual(act.hideMarkers, true, 'hideMarkers must be true');
    assert.strictEqual(act.markerStyle, 'invisible', 'markerStyle must be invisible');
    assert.strictEqual(act.labels.length, 10, 'Must have exactly 10 callout labels');
    
    const expected = [
      { num: 1, ans: 'Engine Flywheel & Friction Clutch Assembly' },
      { num: 2, ans: 'Transmission Input Shaft (1200 rpm)' },
      { num: 3, ans: 'Reverse Driving Spur Pinion (z1 = 20 teeth)' },
      { num: 4, ans: 'Reverse Idler Spur Gear (Direction Inverter)' },
      { num: 5, ans: 'Idler Stub Shaft & Needle Roller Bearings' },
      { num: 6, ans: 'Reverse Driven Spur Gear (z2 = 60 teeth)' },
      { num: 7, ans: 'Transmission Output Shaft (400 rpm)' },
      { num: 8, ans: 'Transmission Housing & Deep-Groove Ball Bearings' },
      { num: 9, ans: 'Reverse Power Flow Path (Input → Idler → Driven Gear)' },
      { num: 10, ans: 'Spur Tooth Meshing Pitch Point (20° Pressure Angle)' }
    ];

    expected.forEach(exp => {
      const label = act.labels.find(l => l.componentNumber === exp.num);
      assert(label, `Label for callout ${exp.num} must exist`);
      assert.strictEqual(label.correctAnswer, exp.ans, `Callout ${exp.num} correct answer mismatch`);
      assert.strictEqual(label.invisible, true, `Callout ${exp.num} must have invisible=true`);
      assert(act.options.includes(exp.ans), `Options must include ${exp.ans}`);
    });
  });

  runTest(`${dir}: Activity 3 (Kinematics) checkpoints`, () => {
    const act = content.activities['transmission-kinematics'];
    assert(act, 'transmission-kinematics activity exists');
    assert(act.fields.some(f => f.id === 'gear_ratio' && f.placeholder === '3.00'));
    assert(act.fields.some(f => f.id === 'input_torque_T1' && f.placeholder === '63661.98'));
    assert(act.fields.some(f => f.id === 'pitch_diameter_d1' && f.placeholder === '60.00'));
    assert(act.fields.some(f => f.id === 'pitch_diameter_d2' && f.placeholder === '180.00'));
    assert(act.fields.some(f => f.id === 'centre_distance_a' && f.placeholder === '120.00'));
  });

  runTest(`${dir}: Activity 4 (Forces) checkpoints`, () => {
    const act = content.activities['spur-gear-forces'];
    assert(act, 'spur-gear-forces activity exists');
    assert(act.fields.some(f => f.id === 'tangential_force_Pt' && f.placeholder === '2122.07'));
    assert(act.fields.some(f => f.id === 'radial_force_Pr' && f.placeholder === '772.37'));
  });

  runTest(`${dir}: Activity 5 (Dynamic Loading) checkpoints`, () => {
    const act = content.activities['dynamic-loading'];
    assert(act, 'dynamic-loading activity exists');
    assert(act.fields.some(f => f.id === 'pitch_line_velocity_v' && f.placeholder === '3.770'));
    assert(act.fields.some(f => f.id === 'velocity_factor_Cv' && f.placeholder === '0.6141'));
    assert(act.fields.some(f => f.id === 'effective_load_Peff' && f.placeholder === '6478.87'));
  });

  runTest(`${dir}: Activity 6 (Lewis Beam Strength) checkpoints`, () => {
    const act = content.activities['lewis-beam-strength'];
    assert(act, 'lewis-beam-strength activity exists');
    assert(act.fields.some(f => f.id === 'lewis_form_factor_Y1' && f.placeholder === '0.320'));
    assert(act.fields.some(f => f.id === 'lewis_form_factor_Y2' && f.placeholder === '0.421'));
    assert(act.fields.some(f => f.id === 'permissible_stress_sigma_b1' && f.placeholder === '233.33'));
    assert(act.fields.some(f => f.id === 'permissible_stress_sigma_b2' && f.placeholder === '200.00'));
    assert(act.fields.some(f => f.id === 'beam_strength_Sb1' && f.placeholder === '11200.00'));
    assert(act.fields.some(f => f.id === 'beam_strength_Sb2' && f.placeholder === '12630.00'));
    assert(act.fields.some(f => f.id === 'bending_FOS' && f.placeholder === '1.729'));
    assert(act.fields.some(f => f.id === 'weaker_member' && f.options.includes('Pinion')));
  });

  runTest(`${dir}: Activity 7 (Buckingham Wear Analysis) checkpoints`, () => {
    const act = content.activities['buckingham-wear-analysis'];
    assert(act, 'buckingham-wear-analysis activity exists');
    assert(act.fields.some(f => f.id === 'ratio_factor_Q' && f.placeholder === '1.50'));
    assert(act.fields.some(f => f.id === 'load_stress_factor_K' && f.placeholder === '1.96'));
    assert(act.fields.some(f => f.id === 'wear_strength_Sw' && f.placeholder === '8820.00'));
    assert(act.fields.some(f => f.id === 'wear_FOS' && f.placeholder === '1.361'));
  });

  runTest(`${dir}: Activity 8 & 9 (Diagnosis & Adequacy Decisions)`, () => {
    const act8 = content.activities['failure-diagnosis'];
    const act9 = content.activities['gear-adequacy-assessment'];
    assert(act8, 'failure-diagnosis activity exists');
    assert(act9, 'gear-adequacy-assessment activity exists');
    assert(act8.mcq.options[0].label.includes('Bending strength is safe (FOSb = 1.729 >= 1.50), but wear durability is not safe (FOSw = 1.361 < 1.50)'));
    assert(act9.mcq.options[0].label.includes('The overall initial design is NOT ADEQUATE because the wear factor of safety (FOSw = 1.361) falls below the target factor of safety (1.50)'));
  });

  runTest(`${dir}: Activity 10 & 11 (Faculty Canvas & Reflection)`, () => {
    const act10 = content.activities['engineering-recommendation'];
    const act11 = content.activities['reflection-synthesis'];
    assert(act10, 'engineering-recommendation activity exists');
    assert(act11, 'reflection-synthesis activity exists');
    assert(act10.fields.some(f => f.id === 'redesign_wear_FOS' && f.placeholder === '1.778'));
    assert.strictEqual(act11.questions.length, 3, 'Reflection must have 3 prompts');
  });

  runTest(`${dir}: Syllabus compliance check: ZERO Numerical Helical Force Calculations`, () => {
    const str = JSON.stringify(content);
    assert(!str.includes('Calculate Ft for helical'), 'No helical Ft numerical calculation');
    assert(!str.includes('Calculate Fr for helical'), 'No helical Fr numerical calculation');
    assert(!str.includes('Calculate Fa for helical'), 'No helical Fa numerical calculation');
    assert(!str.includes('Calculate the helical axial force'), 'No helical axial force calculation prompt');
    assert(!str.includes('helical force analysis numerical'), 'No helical force numerical');
    const charter = content.activities['project-charter'];
    assert(charter.cards.some(c => c.body.includes('No numerical on force analysis of helical')), 'Charter must cite SPPU boundary');
  });
});

console.log('\n--- REGISTRATION & ARCHITECTURE INTEGRATION CHECKS ---');

runTest('data/assignments.json contains registered EA-TS-04', () => {
  const data = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-04');
  assert(found !== undefined, 'EA-TS-04 must be in data/assignments.json');
  assert.strictEqual(found.slug, 'automotive-spur-gear-analysis');
  assert.strictEqual(found.co, 'CO1');
  assert.strictEqual(found.weightage, '12 Marks');
  assert.strictEqual(found.discipline, 'Transmission System Design');
});

runTest('outputs/meilp/data/assignments.json contains registered EA-TS-04', () => {
  const data = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
  const found = data.assignments.find(a => a.id === 'EA-TS-04');
  assert(found !== undefined, 'EA-TS-04 must be in outputs/meilp/data/assignments.json');
  assert.strictEqual(found.slug, 'automotive-spur-gear-analysis');
  assert.strictEqual(found.co, 'CO1');
  assert.strictEqual(found.weightage, '12 Marks');
  assert.strictEqual(found.discipline, 'Transmission System Design');
});

runTest('ALL_ASSIGNMENTS in js/app.js contains EA-TS-04', () => {
  const content = fs.readFileSync('js/app.js', 'utf8');
  assert(content.includes('EA-TS-04'), 'EA-TS-04 must be present in js/app.js');
  assert(content.includes('automotive-spur-gear-analysis'), 'automotive-spur-gear-analysis must be present in js/app.js');
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

runTest('faculty/reports.html and outputs/meilp/faculty/reports.html contain EA-TS-04', () => {
  const r1 = fs.readFileSync('faculty/reports.html', 'utf8');
  const r2 = fs.readFileSync('outputs/meilp/faculty/reports.html', 'utf8');
  assert(r1.includes('EA-TS-04'), 'faculty/reports.html must contain EA-TS-04');
  assert(r2.includes('EA-TS-04'), 'outputs/meilp/faculty/reports.html must contain EA-TS-04');
});

runTest('faculty/js/evaluation-engine.js and mirror contain EA-TS-04 stepwise rubric', () => {
  const e1 = fs.readFileSync('faculty/js/evaluation-engine.js', 'utf8');
  const e2 = fs.readFileSync('outputs/meilp/faculty/js/evaluation-engine.js', 'utf8');
  assert(e1.includes('ts04-act-1'), 'faculty evaluation engine must have ts04-act-1');
  assert(e2.includes('ts04-act-1'), 'outputs evaluation engine must have ts04-act-1');
  assert(e1.includes('ts04-act-11'), 'faculty evaluation engine must have ts04-act-11');
  assert(e2.includes('ts04-act-11'), 'outputs evaluation engine must have ts04-act-11');
});

runTest('coursework.html and mirror contain EA-TS-04 in transmissionAssignmentGrid', () => {
  const c1 = fs.readFileSync('coursework.html', 'utf8');
  const c2 = fs.readFileSync('outputs/meilp/coursework.html', 'utf8');
  assert(c1.includes('EA-TS-04'), 'coursework.html must contain EA-TS-04');
  assert(c2.includes('EA-TS-04'), 'outputs/meilp/coursework.html must contain EA-TS-04');
  assert(c1.includes('automotive-spur-gear-analysis'), 'coursework.html must link to automotive-spur-gear-analysis');
  assert(c2.includes('automotive-spur-gear-analysis'), 'outputs/meilp/coursework.html must link to automotive-spur-gear-analysis');
});

runTest('Bit-for-bit SHA-256 hash match between source and mirror packages', () => {
  const src = 'assignments/automotive-spur-gear-analysis';
  const dst = 'outputs/meilp/assignments/automotive-spur-gear-analysis';

  function hash(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  }

  function compareRecursive(dir1, dir2) {
    const list = fs.readdirSync(dir1);
    for (const item of list) {
      const p1 = path.join(dir1, item);
      const p2 = path.join(dir2, item);
      assert(fs.existsSync(p2), `Mirrored file ${p2} must exist`);
      if (fs.statSync(p1).isDirectory()) {
        compareRecursive(p1, p2);
      } else {
        assert.strictEqual(hash(p1), hash(p2), `File hash mismatch on ${item}`);
      }
    }
  }

  compareRecursive(src, dst);
});

console.log('======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL EA-TS-04 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('======================================================================');
