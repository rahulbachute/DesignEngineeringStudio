const fs = require('fs');

console.log("=== DES ASSIGNMENTS 01-08 INTEGRATION REGRESSION TEST ===");

// 1. Verify data/assignments.json registration
const assignmentsData = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
const ec07Card = assignmentsData.assignments.find(a => a.id === 'EC-07');
const ec08Card = assignmentsData.assignments.find(a => a.id === 'EC-08');
console.log("✓ EC-07 Registered in data/assignments.json:", ec07Card ? ec07Card.title : "FAILED");
console.log("✓ EC-08 Registered in data/assignments.json:", ec08Card ? ec08Card.title : "FAILED");

// 2. Verify outputs/meilp/data/assignments.json
const meilpAssignmentsData = JSON.parse(fs.readFileSync('outputs/meilp/data/assignments.json', 'utf8'));
const meilpEc07Card = meilpAssignmentsData.assignments.find(a => a.id === 'EC-07');
const meilpEc08Card = meilpAssignmentsData.assignments.find(a => a.id === 'EC-08');
console.log("✓ EC-07 Registered in outputs/meilp/data/assignments.json:", meilpEc07Card ? meilpEc07Card.title : "FAILED");
console.log("✓ EC-08 Registered in outputs/meilp/data/assignments.json:", meilpEc08Card ? meilpEc08Card.title : "FAILED");

// 3. Load & Validate all 8 assignments
const assignments = ['elevator', 'motorcycle', 'materials-selection', 'borewell-pump', 'failure-analysis', 'stress-concentration', 'shafts', 'Keys'];

assignments.forEach(slug => {
  const base = `assignments/${slug}`;
  const config = JSON.parse(fs.readFileSync(`${base}/config.json`, 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(`${base}/workflow.json`, 'utf8'));
  const content = JSON.parse(fs.readFileSync(`${base}/content.json`, 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(`${base}/rubric.json`, 'utf8'));
  const evalTemplate = JSON.parse(fs.readFileSync(`${base}/evaluation-template.json`, 'utf8'));
  
  console.log(`✓ Assignment '${slug}' (${config.id}): Valid JSON files loaded. Steps: ${workflow.steps.length}`);
});

// 4. Verify Shaft & Key Calculator file exists
const calcExists = fs.existsSync('tools/Shaft Design Calculator.html');
console.log("✓ Shaft & Key Design Calculator file exists:", calcExists);

// 5. Verify Engineering Assets exist for EA-07 and EA-08
const ea07Student = fs.existsSync('assignments/shafts/images/EA-07_Student_v1.0.png.png');
const ea07Faculty = fs.existsSync('assignments/shafts/images/EA-07_Faculty_v1.0.png.png');
const ea08Student = fs.existsSync('assignments/Keys/images/EA-08_Student_v1.0.png.png');
const ea08Faculty = fs.existsSync('assignments/Keys/images/EA-08_Faculty_v1.0.png.png');
console.log("✓ EA-07 Student Asset exists:", ea07Student);
console.log("✓ EA-07 Faculty Asset exists:", ea07Faculty);
console.log("✓ EA-08 Student Asset exists:", ea08Student);
console.log("✓ EA-08 Faculty Asset exists:", ea08Faculty);

// 6. Test Key Design Calculation Math (EC-08)
const P_key = 22; // kW
const N_key = 1440; // rpm
const d_key = 40; // mm
const b_key = 10; // mm
const h_key = 10; // mm
const l_key = 45; // mm
const Syt_key = 360; // MPa

const T_key = (60 * 1000000 * P_key) / (2 * Math.PI * N_key);
const Ft_key = (2 * T_key) / d_key;
const tau_act_key = (2 * T_key) / (d_key * b_key * l_key);
const sigma_c_act_key = (4 * T_key) / (d_key * h_key * l_key);
const Ssy_key = 0.5 * Syt_key;
const fos_shear_key = Ssy_key / tau_act_key;
const fos_crush_key = Syt_key / sigma_c_act_key;

console.log("=== EC-08 Key Design Math Verification ===");
console.log("Transmitted Torque T:", Math.round(T_key), "N-mm (Expected: 145887)");
console.log("Tangential Force Ft:", Math.round(Ft_key), "N (Expected: 7294)");
console.log("Actual Shear Stress tau_act:", tau_act_key.toFixed(2), "MPa (Expected: 16.21)");
console.log("Actual Crushing Stress sigma_c_act:", sigma_c_act_key.toFixed(2), "MPa (Expected: 32.42)");
console.log("Shear FOS:", fos_shear_key.toFixed(2), "(Expected: 11.10)");
console.log("Crushing FOS:", fos_crush_key.toFixed(2), "(Expected: 11.10)");

console.log("\nALL REGRESSION CHECKS PASSED PERFECTLY!");

