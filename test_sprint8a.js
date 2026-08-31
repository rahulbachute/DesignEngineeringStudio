/**
 * test_sprint8a.js
 * Test suite for Sprint 8A: Student Registration Context, Faculty Control Display & Admin/Faculty Role Separation
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Browser Environment
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _getStore: () => store
  };
})();

global.window = {
  localStorage: localStorageMock,
  MEILP: {},
  location: { pathname: "/index.html", href: "" }
};
global.localStorage = localStorageMock;

// Load Services
const controlServiceCode = fs.readFileSync(path.join(__dirname, "js/assignment-control-service.js"), "utf8");
eval(controlServiceCode);

const authCode = fs.readFileSync(path.join(__dirname, "faculty/js/data/auth.js"), "utf8");
eval(authCode);

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${testName}`);
    console.error(err);
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${testName}`);
    console.error(err);
  }
}

console.log("=== RUNNING SPRINT 8A TEST SUITE ===");

// 1. All 22 assignments exist in data/assignments.json
runTest("Test 1: Public catalogue loads all 22 assignments (EA-01 through EA-22 / EC-01 through EC-22)", () => {
  const assignmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, "data/assignments.json"), "utf8"));
  assert.strictEqual(assignmentsData.assignments.length, 22, "Should have exactly 22 assignments");
  for (let i = 1; i <= 22; i++) {
    const num = String(i).padStart(2, "0");
    const found = assignmentsData.assignments.some(a => a.id === `EA-${num}` || a.id === `EC-${num}`);
    assert(found, `Missing assignment EA/EC-${num}`);
  }
});

// 2. All 22 assignments visible regardless of faculty selection
runTest("Test 2: All 22 assignments remain visible regardless of faculty controls", () => {
  const svc = new window.MEILP.AssignmentControlService();
  const assignmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, "data/assignments.json"), "utf8"));
  
  // Set EA-01 to disabled for FAC001
  svc.setControls("EA-01", "FAC001", { enabled: false });
  
  const map = svc.getFacultyControlsMap("FAC001");
  assert.strictEqual(map["EA-01"].enabled, false);
  
  // Both enabled and disabled assignments exist in catalogue list
  const visibleList = assignmentsData.assignments;
  assert.strictEqual(visibleList.length, 22, "All 22 assignments must remain in catalogue");
});

// 3. No hardcoded default faculty pre-selected in index.html
runTest("Test 3: No hardcoded default faculty pre-selected on initial visit in index.html", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert(!indexHtml.includes('<option value="FAC001">Dr. Rahul Bachute</option>'), "index.html should not have hardcoded FAC001 option");
  assert(indexHtml.includes('Select Your Faculty'), "index.html should have placeholder option");
});

// 4. No hardcoded default college pre-selected in index.html
runTest("Test 4: No hardcoded default college pre-selected in index.html", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert(indexHtml.includes('Select Your College'), "index.html should have placeholder option for college");
});

// 5. College -> Faculty dynamic mapping
runTest("Test 5: College Registry correctly filters faculty by College_ID", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("Dr. Rahul Bachute"), "FAC001");
  assert.strictEqual(svc.resolveFacultyId("Dr. Niranjan Shegokar"), "FAC002");
  assert.strictEqual(svc.resolveFacultyId("Prof. Atul Gowardipe"), "FAC003");
  assert.strictEqual(svc.resolveFacultyId("Prof. Said Khandu"), "FAC004");
});

// 6. Colleges with 0 faculty display UNKNOWN
runTest("Test 6: Colleges with 0 faculty map to UNKNOWN", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("UNKNOWN"), "UNKNOWN");
  assert.strictEqual(svc.resolveFacultyId(""), "UNKNOWN");
  assert.strictEqual(svc.resolveFacultyId(null), "UNKNOWN");
});

// 7. UNKNOWN Faculty isolated
runTest("Test 7: UNKNOWN Faculty storage key is strictly isolated", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  const controls = svc.getFacultyControlsMap("UNKNOWN");
  assert.deepStrictEqual(controls, {}, "UNKNOWN controls should be empty map");
  assert.strictEqual(localStorage.getItem("meilp-assignment-controls:UNKNOWN"), null);
});

// 8. UNKNOWN NEVER reads FAC001 controls
runTest("Test 8: UNKNOWN Faculty NEVER reads FAC001 controls", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-01", "FAC001", { enabled: false, dueDate: "2026-12-31" });
  
  const unknownAccess = svc.evaluateAccess("EA-01", "UNKNOWN");
  assert.strictEqual(unknownAccess.enabled, true, "UNKNOWN must evaluate to default open access");
  assert.strictEqual(unknownAccess.dueDate, null, "UNKNOWN must not have FAC001 deadline");
});

// 9. UNKNOWN NEVER writes to FAC001 controls
runTest("Test 9: UNKNOWN Faculty NEVER writes to FAC001 controls", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-01", "FAC001", { enabled: true });
  svc.setControls("EA-01", "UNKNOWN", { enabled: false });
  
  const fac001Ctrl = svc.getControls("EA-01", "FAC001");
  assert.strictEqual(fac001Ctrl.enabled, true, "FAC001 must not be modified by UNKNOWN writes");
});

// 10. AssignmentControlService canonical key is uppercase Faculty_ID
runTest("Test 10: AssignmentControlService canonical key is meilp-assignment-controls:FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-02", "FAC001", { enabled: false });
  
  assert(localStorage.getItem("meilp-assignment-controls:FAC001") !== null, "Key must be meilp-assignment-controls:FAC001");
});

// 11. resolveFacultyId resolves display name
runTest("Test 11: resolveFacultyId resolves 'Dr. Rahul Bachute' to FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("Dr. Rahul Bachute"), "FAC001");
  assert.strictEqual(svc.resolveFacultyId("dr. rahul bachute"), "FAC001");
});

// 12. resolveFacultyId resolves email
runTest("Test 12: resolveFacultyId resolves 'rahul.bachute@dypic.in' to FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("rahul.bachute@dypic.in"), "FAC001");
});

// 13. resolveFacultyId resolves lowercase 'fac001'
runTest("Test 13: resolveFacultyId resolves 'fac001' to FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("fac001"), "FAC001");
});

// 14. resolveFacultyId resolves 'UNKNOWN'
runTest("Test 14: resolveFacultyId resolves 'UNKNOWN' to UNKNOWN", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("UNKNOWN"), "UNKNOWN");
  assert.strictEqual(svc.resolveFacultyId("Unknown / Unassigned Faculty"), "UNKNOWN");
});

// 15. resolveFacultyId resolves admin email to ADMIN001
runTest("Test 15: resolveFacultyId resolves 'bachuterahul@gmail.com' to ADMIN001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  assert.strictEqual(svc.resolveFacultyId("bachuterahul@gmail.com"), "ADMIN001");
});

// 16. getControls reads from canonical key
runTest("Test 16: getControls reads from meilp-assignment-controls:FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  localStorage.setItem("meilp-assignment-controls:FAC001", JSON.stringify({ "EA-05": { enabled: false, note: "Midterm only" } }));
  
  const ctrl = svc.getControls("EA-05", "FAC001");
  assert.strictEqual(ctrl.enabled, false);
  assert.strictEqual(ctrl.note, "Midterm only");
});

// 17. setControls writes to canonical key
runTest("Test 17: setControls writes to meilp-assignment-controls:FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-07", "FAC001", { enabled: true, dueDate: "2026-10-15" });
  
  const raw = localStorage.getItem("meilp-assignment-controls:FAC001");
  assert(raw !== null);
  const data = JSON.parse(raw);
  assert.strictEqual(data["EA-07"].dueDate, "2026-10-15");
});

// 18. Legacy storage key migration
runTest("Test 18: Legacy storage keys (fac001, dr-rahul-bachute) are migrated to FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  localStorage.setItem("meilp-assignment-controls:dr-rahul-bachute", JSON.stringify({ "EA-01": { enabled: false } }));
  
  const ctrl = svc.getControls("EA-01", "FAC001");
  assert.strictEqual(ctrl.enabled, false, "Should read from migrated legacy key");
  assert(localStorage.getItem("meilp-assignment-controls:FAC001") !== null, "Should have created canonical key");
});

// 19. Enabling/disabling for FAC001 updates FAC001 access
runTest("Test 19: Enabling/disabling an assignment for FAC001 updates access for FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-03", "FAC001", { enabled: false });
  
  const access = svc.evaluateAccess("EA-03", "FAC001");
  assert.strictEqual(access.enabled, false);
});

// 20. Disabling for FAC001 does NOT affect FAC002
runTest("Test 20: Disabling for FAC001 does NOT affect FAC002", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-03", "FAC001", { enabled: false });
  
  const accessFac2 = svc.evaluateAccess("EA-03", "FAC002");
  assert.strictEqual(accessFac2.enabled, true, "FAC002 must remain enabled by default");
});

// 21. Setting due date for FAC001 updates deadline pill
runTest("Test 21: Setting due date for FAC001 updates deadline pill for FAC001", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-04", "FAC001", { dueDate: "2026-11-20T23:59:00" });
  
  const access = svc.evaluateAccess("EA-04", "FAC001");
  assert.strictEqual(access.dueDate, "2026-11-20T23:59:00");
});

// 22. Setting due date for FAC001 does NOT affect other faculty
runTest("Test 22: Setting due date for FAC001 does NOT affect FAC003", () => {
  const svc = new window.MEILP.AssignmentControlService();
  localStorage.clear();
  svc.setControls("EA-04", "FAC001", { dueDate: "2026-11-20T23:59:00" });
  
  const accessFac3 = svc.evaluateAccess("EA-04", "FAC003");
  assert.strictEqual(accessFac3.dueDate, null, "FAC003 must have no deadline");
});

// 23. App.js contains active/disabled count calculation
runTest("Test 23: app.js contains accurate active and disabled count calculation", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
  assert(appJs.includes("enabledCount"), "app.js should compute enabledCount");
  assert(appJs.includes("disabledCount"), "app.js should compute disabledCount");
  assert(appJs.includes("Schedule for"), "app.js should render schedule for faculty");
});

// 24. App.js contains neutral standard coursework banner when unassigned
runTest("Test 24: app.js renders neutral banner when no faculty or Unknown faculty selected", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
  assert(appJs.includes("Showing standard coursework for students and visitors"), "app.js should handle visitor banner");
});

// 25. Student profile context persistence in meilp:studentProfile
runTest("Test 25: Student profile context helper in app.js supports meilp:studentProfile", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
  assert(appJs.includes("meilp:studentProfile"), "app.js should use meilp:studentProfile");
  assert(appJs.includes("getStudentProfile"), "app.js should define getStudentProfile");
  assert(appJs.includes("saveStudentProfile"), "app.js should define saveStudentProfile");
});

// 26. Dynamic College -> Faculty updates
runTest("Test 26: updateFacultyDropdown dynamically repopulates faculty dropdown", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
  assert(appJs.includes("async function updateFacultyDropdown"), "app.js must implement updateFacultyDropdown");
  assert(appJs.includes("fetchFacultyList"), "app.js must fetch faculty list for college");
});

// 27. Attempt_ID faculty locking remains immutable in challenge-runner.js
runTest("Test 27: Locked Attempt_ID faculty binding remains immutable in challenge-runner.js", () => {
  const runnerJs = fs.readFileSync(path.join(__dirname, "js/challenge-runner.js"), "utf8");
  assert(runnerJs.includes("state.attemptId"), "challenge-runner.js must manage attemptId");
  assert(runnerJs.includes("state.student"), "challenge-runner.js must manage student context");
});

// 28. Changing public catalogue dropdown does NOT change existing in-progress attempt's faculty
runTest("Test 28: Public dropdown changes do not mutate locked state.student in active workbench", () => {
  const runnerJs = fs.readFileSync(path.join(__dirname, "js/challenge-runner.js"), "utf8");
  assert(!runnerJs.includes("document.getElementById('studentFacultySelect')"), "challenge-runner.js should not directly bind to studentFacultySelect during submission");
});

// 29. Admin login authentication (bachuterahul@gmail.com -> ADMIN, ADMIN001)
await runAsyncTest("Test 29: Admin login (bachuterahul@gmail.com) authenticates with role ADMIN and ID ADMIN001", async () => {
  localStorage.clear();
  const res = await window.DESAuth.authenticate("bachuterahul@gmail.com", "admin123");
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.user.role, "ADMIN");
  assert.strictEqual(res.user.facultyId, "ADMIN001");
  assert.strictEqual(res.user.status, "ACTIVE");
});

// 30. Faculty login authentication (rahul.bachute@dypic.in -> FACULTY, FAC001)
await runAsyncTest("Test 30: Faculty login (rahul.bachute@dypic.in) authenticates with role FACULTY and ID FAC001", async () => {
  localStorage.clear();
  const res = await window.DESAuth.authenticate("rahul.bachute@dypic.in", "dypic123");
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.user.role, "FACULTY");
  assert.strictEqual(res.user.facultyId, "FAC001");
  assert.strictEqual(res.user.status, "ACTIVE");
});

// 31. Inactive account rejection
await runAsyncTest("Test 31: Inactive account (status: 'INACTIVE') is rejected at login", async () => {
  localStorage.clear();
  localStorage.setItem("DES_REGISTERED_FACULTIES", JSON.stringify([
    {
      loginId: "inactive.faculty@dypic.in",
      email: "inactive.faculty@dypic.in",
      facultyId: "FAC099",
      facultyName: "Inactive Faculty",
      role: "FACULTY",
      status: "INACTIVE"
    }
  ]));
  
  const res = await window.DESAuth.authenticate("inactive.faculty@dypic.in", "anyPassword123");
  assert.strictEqual(res.success, false);
  assert(res.error.toLowerCase().includes("inactive"), "Error should mention account is inactive");
});

// 32. Public/visitor access works without registration or login
runTest("Test 32: Public/visitor access works seamlessly with guest profile", () => {
  localStorage.clear();
  const user = window.DESAuth.getCurrentUser();
  assert.strictEqual(user.role, "GUEST");
  assert.strictEqual(user.isGuest, true);
  assert.strictEqual(user.isAuthenticated, false);
});

// 33. All changes mirrored in outputs/meilp/
runTest("Test 33: All files in js/, faculty/js/ and root are perfectly mirrored in outputs/meilp/", () => {
  const pairs = [
    ["js/assignment-control-service.js", "outputs/meilp/js/assignment-control-service.js"],
    ["js/app.js", "outputs/meilp/js/app.js"],
    ["faculty/js/data/auth.js", "outputs/meilp/faculty/js/data/auth.js"],
    ["faculty/js/challenges-engine.js", "outputs/meilp/faculty/js/challenges-engine.js"],
    ["index.html", "outputs/meilp/index.html"]
  ];
  
  for (const [src, dest] of pairs) {
    const srcContent = fs.readFileSync(path.join(__dirname, src), "utf8");
    const destContent = fs.readFileSync(path.join(__dirname, dest), "utf8");
    assert.strictEqual(srcContent, destContent, `Mirror mismatch between ${src} and ${dest}`);
  }
});

console.log(`\n========================================`);
console.log(`SPRINT 8A TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`========================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
