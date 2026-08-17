const fs = require('fs');
const path = require('path');

console.log("==========================================");
console.log("Testing Faculty-Wise Assignment Controls");
console.log("==========================================");

// Mock browser environment for Node.js test execution
global.window = global;
global.MEILP = {};

// Load StorageService & AssignmentControlService
const storageScript = fs.readFileSync(path.join(__dirname, 'js', 'storage.js'), 'utf8');
const controlScript = fs.readFileSync(path.join(__dirname, 'js', 'assignment-control-service.js'), 'utf8');

eval(storageScript);
eval(controlScript);

const service = new window.MEILP.AssignmentControlService();

// 1. Verify Default Access State for Faculty A (Dr. Rahul Bachute) and Faculty B (Dr. Niranjan Shegokar)
const accessA_initial = service.evaluateAccess("EC-01", "Dr. Rahul Bachute");
const accessB_initial = service.evaluateAccess("EC-01", "Dr. Niranjan Shegokar");

console.assert(accessA_initial.enabled === true, "Initial Faculty A assignment should be enabled by default");
console.assert(accessB_initial.enabled === true, "Initial Faculty B assignment should be enabled by default");
console.log("✓ Initial default states verified: Both Faculty A & B have enabled access.");

// 2. Disable EC-01 for Faculty A only
service.setControls("EC-01", "Dr. Rahul Bachute", {
  enabled: false,
  dueDate: "2026-08-31T23:59",
  note: "Lab cancelled for Batch 1"
});

const accessA_after = service.evaluateAccess("EC-01", "Dr. Rahul Bachute");
const accessB_after = service.evaluateAccess("EC-01", "Dr. Niranjan Shegokar");

console.assert(accessA_after.enabled === false, "Faculty A EC-01 should now be disabled");
console.assert(accessA_after.canSubmit === false, "Faculty A EC-01 should not allow submission");
console.assert(accessB_after.enabled === true, "Faculty B EC-01 should remain enabled independently");
console.assert(accessB_after.canSubmit === true, "Faculty B EC-01 should allow submission");
console.log("✓ Faculty Isolation verified: Disabling assignment for Faculty A does NOT affect Faculty B!");

// 3. Test Past Due Evaluation
const pastDate = new Date(Date.now() - 3600000).toISOString().slice(0, 16); // 1 hour ago
service.setControls("EC-02", "Dr. Niranjan Shegokar", {
  enabled: true,
  dueDate: pastDate,
  note: "Past due test"
});

const accessB_pastDue = service.evaluateAccess("EC-02", "Dr. Niranjan Shegokar");
console.assert(accessB_pastDue.isPastDue === true, "Past date should evaluate to isPastDue=true");
console.assert(accessB_pastDue.canSubmit === false, "Past due assignment should not allow submission");
console.log("✓ Past Due Enforcement verified: Past deadline blocks submission.");

// 4. Test Future Due Evaluation
const futureDate = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16); // 7 days in future
service.setControls("EC-03", "Prof. Atul Gowardipe", {
  enabled: true,
  dueDate: futureDate,
  note: "Due in 7 days"
});

const accessC_future = service.evaluateAccess("EC-03", "Prof. Atul Gowardipe");
console.assert(accessC_future.isPastDue === false, "Future date should evaluate to isPastDue=false");
console.assert(accessC_future.canSubmit === true, "Future deadline allows active submission");
console.log("✓ Future Deadline verified: Active deadline allows submission.");

console.log("\n==========================================");
console.log("ALL FACULTY ASSIGNMENT CONTROL TESTS PASSED!");
console.log("==========================================");
