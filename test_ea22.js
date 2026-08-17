const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

console.log('--- VALIDATING EA-22 MOBILE SCISSOR LIFT POWER SCREW ---');

const dirsToCheck = [
  'assignments/mobile-scissor-lift',
  'assignments/2-ton mobile scissor lift',
  'outputs/meilp/assignments/mobile-scissor-lift',
  'outputs/meilp/assignments/2-ton mobile scissor lift'
];

dirsToCheck.forEach(dir => {
  console.log(`\nChecking directory: ${dir}`);
  assert(fs.existsSync(dir), `Directory ${dir} exists`);
  
  const files = ['config.json', 'workflow.json', 'content.json', 'rubric.json', 'evaluation-template.json', 'asset-manifest.json'];
  files.forEach(f => {
    const p = path.join(dir, f);
    assert(fs.existsSync(p), `${p} exists`);
  });

  // Verify JSON parsing and integrity
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));

  assert(config.id === 'EA-22', `${dir}: config.json has ID EA-22`);
  assert(config.cceMarks === 12, `${dir}: config.json cceMarks is 12`);
  assert(workflow.totalCceMarks === 12.0, `${dir}: workflow.json totalCceMarks is 12.0`);
  assert(rubric.totalMarks === 12.0, `${dir}: rubric.json totalMarks is 12.0`);
  assert(evalTmpl.maxTotalMarks === 12.0, `${dir}: evalTmpl maxTotalMarks is 12.0`);

  let markSum = 0;
  workflow.steps.forEach(step => {
    markSum += step.marks || 0;
  });
  assert(Math.abs(markSum - 12.0) < 1e-4, `${dir}: Workflow step marks sum to 12.0 (got ${markSum})`);
  assert(workflow.steps.length === 12, `${dir}: Workflow has 12 steps (11 activities + 1 submit)`);

  workflow.steps.forEach(step => {
    assert(content.activities[step.id] !== undefined, `${dir}: content.json has activity for step '${step.id}'`);
  });

  const compIdAct = content.activities['component-identification'];
  assert(compIdAct.labels && compIdAct.labels.length === 10, `${dir}: component-identification has 10 labels`);
  
  compIdAct.labels.forEach(lbl => {
    assert(typeof lbl.x === 'number' && typeof lbl.y === 'number', `${dir}: Label ${lbl.componentNumber} has numeric coordinates`);
    assert(lbl.correctAnswer && lbl.feedback, `${dir}: Label ${lbl.componentNumber} has correctAnswer and feedback`);
  });

  const imgPathLabeled = path.join(dir, 'images', 'EA-22_Student_Labeled_v1.0.png');
  assert(fs.existsSync(imgPathLabeled), `${dir}: Image EA-22_Student_Labeled_v1.0.png exists`);
});

console.log('\n--- MATHEMATICAL CALCULATIONS VERIFICATION ---');
const W = 20000; // 20 kN
const theta_deg = 15.0;
const theta_rad = theta_deg * Math.PI / 180;
const F_screw = W / Math.tan(theta_rad);
assert(Math.abs(F_screw - 74641.01) < 1.0, `Peak horizontal thrust F_screw = 74.64 kN (got ${F_screw.toFixed(2)})`);

const d = 50.0;
const p = 8.0;
const L = 8.0;
const d_c = d - p;
const d_m = d - 0.5 * p;
assert(d_c === 42.0, `Core diameter d_c = 42.0 mm (got ${d_c})`);
assert(d_m === 46.0, `Mean diameter d_m = 46.0 mm (got ${d_m})`);

const tan_alpha = L / (Math.PI * d_m);
const alpha_rad = Math.atan(tan_alpha);
const alpha_deg = alpha_rad * 180 / Math.PI;
assert(Math.abs(alpha_deg - 3.169) < 0.01, `Helix angle alpha = 3.169 deg (got ${alpha_deg.toFixed(3)})`);

const mu = 0.15;
const beta_deg = 15.0;
const beta_rad = beta_deg * Math.PI / 180;
const mu_prime = mu / Math.cos(beta_rad);
const phi_prime_rad = Math.atan(mu_prime);
const phi_prime_deg = phi_prime_rad * 180 / Math.PI;
assert(Math.abs(mu_prime - 0.15529) < 0.001, `Virtual friction mu' = 0.1553 (got ${mu_prime.toFixed(4)})`);
assert(Math.abs(phi_prime_deg - 8.827) < 0.01, `Virtual friction angle phi' = 8.827 deg (got ${phi_prime_deg.toFixed(3)})`);

const r_m = d_m / 2 / 1000; // in meters
const T_t = F_screw * r_m * Math.tan(alpha_rad + phi_prime_rad);
assert(Math.abs(T_t - 364.76) < 1.0, `Thread friction torque T_t = 364.76 N-m (got ${T_t.toFixed(2)})`);

const D_i = 55.0, D_o = 85.0;
const D_c = (D_i + D_o) / 2;
const R_c_m = (D_c / 2) / 1000;
const mu_c = 0.10;
const T_c = mu_c * F_screw * R_c_m;
assert(Math.abs(T_c - 261.24) < 1.0, `Collar friction torque T_c = 261.24 N-m (got ${T_c.toFixed(2)})`);

const T_total = T_t + T_c;
assert(Math.abs(T_total - 626.00) < 1.0, `Total operating torque T_total = 626.00 N-m (got ${T_total.toFixed(2)})`);

// Stress calculations on core
const A_c = (Math.PI / 4) * Math.pow(d_c, 2);
const sigma_c = F_screw / A_c;
assert(Math.abs(sigma_c - 53.88) < 0.5, `Direct compressive stress sigma_c = 53.88 MPa (got ${sigma_c.toFixed(2)})`);

const Z_p = (Math.PI / 16) * Math.pow(d_c, 3);
const tau = (T_t * 1000) / Z_p;
assert(Math.abs(tau - 25.04) < 0.5, `Torsional shear stress tau = 25.04 MPa (got ${tau.toFixed(2)})`);

const sigma_max = (sigma_c / 2) + Math.sqrt(Math.pow(sigma_c / 2, 2) + Math.pow(tau, 2));
assert(Math.abs(sigma_max - 63.72) < 0.5, `Maximum combined principal stress sigma_max = 63.72 MPa (got ${sigma_max.toFixed(2)})`);

const S_yt = 380.0;
const FOS = S_yt / sigma_max;
assert(Math.abs(FOS - 5.96) < 0.1, `Factor of Safety FOS = 5.96 (got ${FOS.toFixed(2)})`);

console.log('\n--- REGRESSION INTEGRATION TESTS (EC-01 THROUGH EA-22) ---');
const dataJson = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
const outputJson = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));

const dataList = dataJson.assignments || dataJson;
const outputList = outputJson.assignments || outputJson;

assert(dataList.length === 22, `data/assignments.json contains all assignments (got ${dataList.length})`);
assert(outputList.length === 22, `outputs/meilp/data/assignments.json contains all assignments (got ${outputList.length})`);

const expectedIds = [
  'EC-01', 'EC-02', 'EC-03', 'EC-04', 'EC-05', 'EC-06', 'EC-07', 'EC-08', 'EC-09', 'EC-10',
  'EA-11', 'EA-12', 'EA-13', 'EA-14', 'EA-15', 'EA-16', 'EA-17', 'EA-18', 'EA-19', 'EA-20',
  'EC-21', 'EA-22'
];

expectedIds.forEach(id => {
  const match = dataList.find(a => a.id === id);
  assert(match !== undefined, `Assignment ${id} registered in data/assignments.json`);
});

console.log('\n==================================================');
console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
if (failCount === 0) {
  console.log('ALL TESTS PASSED SUCCESSFULLY! 100% REGRESSION-FREE!');
} else {
  console.error('TEST FAILURES DETECTED!');
  process.exit(1);
}
console.log('==================================================\n');
