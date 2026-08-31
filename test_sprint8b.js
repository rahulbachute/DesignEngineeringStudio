/**
 * Sprint 8B Test Suite: Automatic College/Faculty Context Restoration & Fallback Removal
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock browser environment for testing app.js logic
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class DOMElementMock {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.innerHTML = '';
    this.disabled = false;
    this.listeners = {};
    this.children = [];
  }
  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }
  querySelector(sel) {
    return new DOMElementMock('query');
  }
  querySelectorAll(sel) {
    return [];
  }
}

// Setup simulated window environment
const localStorage = new LocalStorageMock();
const elements = {
  studentCollegeSelect: new DOMElementMock('studentCollegeSelect', 'select'),
  studentFacultySelect: new DOMElementMock('studentFacultySelect', 'select'),
  facultyStatusBanner: new DOMElementMock('facultyStatusBanner', 'div'),
  assignmentGrid: new DOMElementMock('assignmentGrid', 'div')
};

global.window = {
  localStorage,
  MEILP: {},
  addEventListener: () => {}
};
global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector: (sel) => {
    if (sel === '[data-assignment-grid]') return elements.assignmentGrid;
    return new DOMElementMock('mock');
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};

// Mock registries
const MOCK_COLLEGES = [
  { collegeId: 'COL001', collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon' },
  { collegeId: 'COL002', collegeName: 'Jaihind College of Engineering, Kuran' },
  { collegeId: 'COL003', collegeName: 'Sinhgad Institute of Technology, Lonavala' }
];

const MOCK_FACULTIES = {
  COL001: [
    { facultyId: 'FAC001', facultyName: 'Dr. Rahul Bachute' },
    { facultyId: 'FAC002', facultyName: 'Dr. Niranjan Shegokar' },
    { facultyId: 'FAC003', facultyName: 'Prof. Atul Gowardipe' }
  ],
  COL002: [
    { facultyId: 'FAC004', facultyName: 'Prof. Said Khandu' }
  ],
  COL003: []
};

global.fetchColleges = async () => MOCK_COLLEGES;
global.fetchFacultyList = async (cid) => MOCK_FACULTIES[cid] || [];
global.ALL_ASSIGNMENTS = Array.from({ length: 22 }, (_, i) => {
  const idNum = String(i + 1).padStart(2, '0');
  return {
    id: `EA-${idNum}`,
    title: `Engineering Challenge ${idNum}`,
    tasks: 4,
    discipline: 'Mechanical'
  };
});

// Load AssignmentControlService
const controlScript = fs.readFileSync(path.join(__dirname, 'js', 'assignment-control-service.js'), 'utf8');
eval(controlScript);

const AssignmentControlService = window.MEILP.AssignmentControlService;
const acs = new AssignmentControlService();
global.window.MEILP.assignmentControlService = acs;
global.loadFacultyControls = (fid) => acs.getFacultyControlsMap(fid);
global.formatDueDate = (d) => d;
global.parseDueDate = (d) => (d ? new Date(d) : null);
global.escapeHtml = (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');

// Run through App.js functions
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const outputsAppCode = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'app.js'), 'utf8');

// Evaluate app functions in this context
eval(appCode.replace(/document\.addEventListener\("DOMContentLoaded"[\s\S]*$/, ''));

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
  }
}

async function main() {
  console.log("=== RUNNING SPRINT 8B TEST SUITE ===");

  // TEST 1: No studentProfile + no loose keys -> No automatic college/faculty selection
  await runAsyncTest("No studentProfile + no loose keys -> stays on placeholders", async () => {
    localStorage.clear();
    elements.studentCollegeSelect.value = "";
    elements.studentFacultySelect.value = "";
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "");
    assert.strictEqual(elements.studentFacultySelect.value, "");
    assert.strictEqual(getSelectedCollegeId(), "");
    assert.strictEqual(getSelectedFacultyId(), "");
  });

  // TEST 2: No studentProfile + stale loose COL001/FAC001 keys -> Loose keys ignored
  await runAsyncTest("No studentProfile + stale loose keys -> loose keys ignored", async () => {
    localStorage.clear();
    localStorage.setItem("meilp:selectedStudentCollegeId", JSON.stringify("COL001"));
    localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify("FAC001"));
    elements.studentCollegeSelect.value = "";
    elements.studentFacultySelect.value = "";
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "");
    assert.strictEqual(elements.studentFacultySelect.value, "");
    assert.strictEqual(getSelectedCollegeId(), "");
    assert.strictEqual(getSelectedFacultyId(), "");
  });

  // TEST 3: Valid profile collegeId = COL001, facultyId = FAC001 -> COL001 + FAC001 restored
  await runAsyncTest("Valid profile (COL001 + FAC001) -> restored correctly", async () => {
    localStorage.clear();
    localStorage.setItem("meilp:studentProfile", JSON.stringify({
      collegeId: "COL001",
      facultyId: "FAC001",
      registeredAt: "2026-08-21T09:00:00.000Z"
    }));
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "COL001");
    assert.strictEqual(elements.studentFacultySelect.value, "FAC001");
  });

  // TEST 4: Valid profile collegeId = COL001, facultyId = FAC003 -> COL001 + FAC003 restored
  await runAsyncTest("Valid profile (COL001 + FAC003) -> restored correctly without forcing FAC001", async () => {
    localStorage.clear();
    localStorage.setItem("meilp:studentProfile", JSON.stringify({
      collegeId: "COL001",
      facultyId: "FAC003",
      registeredAt: "2026-08-21T09:00:00.000Z"
    }));
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "COL001");
    assert.strictEqual(elements.studentFacultySelect.value, "FAC003");
  });

  // TEST 5: Valid profile collegeId = COL001, facultyId = UNKNOWN -> COL001 + UNKNOWN restored
  await runAsyncTest("Valid profile with UNKNOWN faculty -> restored as UNKNOWN", async () => {
    localStorage.clear();
    localStorage.setItem("meilp:studentProfile", JSON.stringify({
      collegeId: "COL001",
      facultyId: "UNKNOWN",
      registeredAt: "2026-08-21T09:00:00.000Z"
    }));
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "COL001");
    assert.strictEqual(elements.studentFacultySelect.value, "UNKNOWN");
  });

  // TEST 6: Invalid combination (COL002 + FAC001) -> Faculty remains unselected (no silent fallback)
  await runAsyncTest("Invalid combination (COL002 + FAC001) -> does not silently fallback to FAC004", async () => {
    localStorage.clear();
    localStorage.setItem("meilp:studentProfile", JSON.stringify({
      collegeId: "COL002",
      facultyId: "FAC001", // FAC001 does not belong to COL002
      registeredAt: "2026-08-21T09:00:00.000Z"
    }));
    await populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements.studentCollegeSelect.value, "COL002");
    assert.strictEqual(elements.studentFacultySelect.value, "");
  });

  // TEST 7: Code inspection confirms absence of currentLoadedFaculties[0].facultyId fallback
  runTest("Code inspection: no currentLoadedFaculties[0].facultyId fallback in app.js", () => {
    assert.ok(!appCode.includes("savedFacultyId = currentLoadedFaculties[0].facultyId"), "app.js must not contain first-faculty index fallback");
    assert.ok(!outputsAppCode.includes("savedFacultyId = currentLoadedFaculties[0].facultyId"), "outputs/meilp/js/app.js must not contain first-faculty index fallback");
  });

  // TEST 8: All EA-01 through EA-22 remain visible without faculty selection
  runTest("All EA-01 through EA-22 remain visible in public catalogue without faculty selection", () => {
    elements.studentFacultySelect.value = "";
    renderAssignmentCards(global.ALL_ASSIGNMENTS);
    assert.strictEqual(global.ALL_ASSIGNMENTS.length, 22);
    assert.ok(elements.assignmentGrid.innerHTML.includes("EA-01"));
    assert.ok(elements.assignmentGrid.innerHTML.includes("EA-22"));
    assert.ok(elements.facultyStatusBanner.innerHTML.includes("Showing standard coursework for students and visitors"));
  });

  // TEST 9: Faculty-specific Assignment_Controls continue working when FAC001 is selected
  runTest("Faculty-specific Assignment_Controls continue working when FAC001 is active", () => {
    acs.setControls("EA-01", "FAC001", { enabled: true, dueDate: "2026-10-15T23:59:59.000Z" });
    acs.setControls("EA-02", "FAC001", { enabled: false, dueDate: null });
    elements.studentFacultySelect.value = "FAC001";
    renderAssignmentCards(global.ALL_ASSIGNMENTS);
    assert.ok(elements.assignmentGrid.innerHTML.includes("Active"));
    assert.ok(elements.assignmentGrid.innerHTML.includes("Disabled"));
  });

  // TEST 10: Disabled assignment remains visible in DOM but disabled
  runTest("Disabled assignment remains in catalogue grid with disabled state", () => {
    elements.studentFacultySelect.value = "FAC001";
    renderAssignmentCards(global.ALL_ASSIGNMENTS);
    assert.ok(elements.assignmentGrid.innerHTML.includes("Disabled by"));
    assert.ok(elements.assignmentGrid.innerHTML.includes("Disabled by Faculty"));
  });

  // TEST 11: Due date remains displayed for the selected faculty
  runTest("Due date is rendered for active assignment with configured deadline", () => {
    elements.studentFacultySelect.value = "FAC001";
    renderAssignmentCards(global.ALL_ASSIGNMENTS);
    assert.ok(elements.assignmentGrid.innerHTML.includes("Due:") || elements.assignmentGrid.innerHTML.includes("Oct 15, 2026"));
  });

  // TEST 12: Attempt_ID faculty locking remains intact in challenge-runner.js
  runTest("Attempt_ID faculty locking in challenge-runner.js is intact", () => {
    const crCode = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');
    assert.ok(crCode.includes("state.attemptId"), "challenge-runner must maintain state.attemptId");
    assert.ok(crCode.includes("state.student"), "challenge-runner must maintain state.student");
    assert.ok(crCode.includes("facultyId"), "challenge-runner must bind facultyId into attempt state");
  });

  // TEST 13: Exact 1:1 mirroring between js/app.js and outputs/meilp/js/app.js
  runTest("1:1 Mirroring: js/app.js and outputs/meilp/js/app.js are identical", () => {
    assert.strictEqual(appCode, outputsAppCode, "Root and output app.js must match character for character");
  });

  console.log("\n========================================");
  console.log(`SPRINT 8B TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("========================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
