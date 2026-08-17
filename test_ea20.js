const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("EA-20 COMPREHENSIVE INTEGRATION & REGRESSION TEST");
console.log("==================================================");

let errors = [];

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    errors.push(message);
  }
}

// 1. Verify Catalog Registrations
const catalog1 = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
const ea20_1 = catalog1.assignments.find(a => a.id === 'EA-20');
assert(ea20_1 && ea20_1.slug === 'hydraulic-press', 'EA-20 registered in data/assignments.json');

const catalog2 = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
const ea20_2 = catalog2.assignments.find(a => a.id === 'EA-20');
assert(ea20_2 && ea20_2.slug === 'hydraulic-press', 'EA-20 registered in outputs/meilp/data/assignments.json');

// Verify all 20 assignments are in catalog
assert(catalog1.assignments.length === 20, `Catalog 1 has 20 assignments (found ${catalog1.assignments.length})`);
assert(catalog2.assignments.length === 20, `Catalog 2 has 20 assignments (found ${catalog2.assignments.length})`);

// 2. Verify EA-20 package files in both directories
const dirs = ['assignments/hydraulic-press', 'outputs/meilp/assignments/hydraulic-press'];
dirs.forEach(dir => {
  console.log(`\nChecking directory: ${dir}`);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, 'workflow.json'), 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(path.join(dir, 'rubric.json'), 'utf8'));
  const evalTmpl = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation-template.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'asset-manifest.json'), 'utf8'));
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));

  assert(config.id === 'EA-20', `${dir}: config.json has id EA-20`);
  assert(config.cceMarks === 12, `${dir}: config.json cceMarks is 12`);
  assert(workflow.totalCceMarks === 12.0, `${dir}: workflow.json totalCceMarks is 12.0`);
  assert(rubric.totalMarks === 12.0, `${dir}: rubric.json totalMarks is 12.0`);
  assert(evalTmpl.maxTotalMarks === 12.0, `${dir}: evalTmpl maxTotalMarks is 12.0`);

  // Verify workflow step marks sum
  const sumMarks = workflow.steps.reduce((acc, s) => acc + (s.marks || 0), 0);
  assert(Math.abs(sumMarks - 12.0) < 0.01, `${dir}: Workflow step marks sum to 12.0 (got ${sumMarks})`);

  // Verify steps and activities match
  assert(workflow.steps.length === 12, `${dir}: Workflow has 12 steps (11 activities + 1 submit)`);
  workflow.steps.forEach(step => {
    assert(content.activities[step.id] !== undefined, `${dir}: content.json has activity for step '${step.id}'`);
  });

  // Verify labels in component-identification
  const labels = content.activities['component-identification'].labels;
  assert(labels.length === 10, `${dir}: component-identification has 10 labels`);
  labels.forEach(l => {
    assert(typeof l.x === 'number' && typeof l.y === 'number', `${dir}: Label ${l.componentNumber} has numeric coordinates`);
    assert(l.correctAnswer && l.feedback, `${dir}: Label ${l.componentNumber} has correctAnswer and feedback`);
  });

  // Verify Image exists
  const imgPath = path.join(dir, 'images/EA-20_Power_Screw_Hydraulic_Press_v1.0.png');
  assert(fs.existsSync(imgPath), `${dir}: Image EA-20_Power_Screw_Hydraulic_Press_v1.0.png exists`);
});

// 3. Mathematical Verification
console.log("\nMathematical Formulations Verification:");
const W = 25000; // N
const d = 40; // mm
const p = 6; // mm
const l = 6; // mm
const dc = d - p; // 34 mm
const dm = d - 0.5 * p; // 37 mm
const tan_alpha = l / (Math.PI * dm);
const alpha_deg = Math.atan(tan_alpha) * (180 / Math.PI);
const mu = 0.15;
const beta_deg = 15;
const beta_rad = beta_deg * (Math.PI / 180);
const mu_prime = mu / Math.cos(beta_rad);
const phi_prime_deg = Math.atan(mu_prime) * (180 / Math.PI);

const tan_alpha_plus_phi = (tan_alpha + mu_prime) / (1 - tan_alpha * mu_prime);
const Tt = W * (dm / 2000) * tan_alpha_plus_phi; // N*m

const Di = 45; // mm
const Do = 75; // mm
const Dc = (Di + Do) / 2; // 60 mm
const Rc = Dc / 2000; // 0.03 m
const mu_c = 0.12;
const Tc = mu_c * W * Rc; // N*m

const T_total = Tt + Tc;
const Rh = 0.20; // m
const Fh = T_total / Rh; // N

const eta = (W * (l / 1000)) / (2 * Math.PI * T_total);

assert(dc === 34, `Core diameter dc = 34 mm`);
assert(dm === 37, `Mean diameter dm = 37 mm`);
assert(Math.abs(alpha_deg - 2.955) < 0.01, `Helix angle alpha = ${alpha_deg.toFixed(3)} deg (matches 2.955)`);
assert(Math.abs(mu_prime - 0.1553) < 0.001, `Virtual friction mu' = ${mu_prime.toFixed(4)} (matches 0.1553)`);
assert(Math.abs(phi_prime_deg - 8.827) < 0.01, `Virtual friction angle phi' = ${phi_prime_deg.toFixed(3)} deg (matches 8.827)`);
assert(Math.abs(Tt - 96.47) < 0.05, `Thread torque Tt = ${Tt.toFixed(2)} N-m (matches 96.47)`);
assert(Math.abs(Tc - 90.00) < 0.01, `Collar torque Tc = ${Tc.toFixed(2)} N-m (matches 90.00)`);
assert(Math.abs(T_total - 186.47) < 0.05, `Total torque Ttotal = ${T_total.toFixed(2)} N-m (matches 186.47)`);
assert(Math.abs(Fh - 932.35) < 0.2, `Handwheel force Fh = ${Fh.toFixed(2)} N (matches 932.35)`);
assert(Math.abs(eta * 100 - 12.80) < 0.05, `Efficiency eta = ${(eta * 100).toFixed(2)}% (matches 12.80%)`);
assert(phi_prime_deg > alpha_deg, `Self-locking confirmed: phi' (${phi_prime_deg.toFixed(2)} deg) > alpha (${alpha_deg.toFixed(2)} deg)`);

// 4. Regression test on EA-01 through EA-19
console.log("\nRegression Test on EA-01 to EA-19:");
catalog1.assignments.forEach(assign => {
  if (assign.id !== 'EA-20') {
    const p = assign.configPath;
    assert(fs.existsSync(p), `Existing config exists for ${assign.id} (${assign.title}) at ${p}`);
  }
});

console.log("\n==================================================");
if (errors.length === 0) {
  console.log("ALL INTEGRATION & REGRESSION TESTS PASSED (100% SUCCESS)!");
} else {
  console.error(`TESTS COMPLETED WITH ${errors.length} ERRORS!`);
  process.exit(1);
}
console.log("==================================================");
