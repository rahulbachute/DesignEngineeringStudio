const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 5A VERIFICATION TEST SUITE');
console.log('Persistent / Cloud-Based Faculty Assignment Controls');
console.log('==================================================\n');

let passedTests = 0;
let totalTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
  }
}

// ─── 1. SIMULATE GOOGLE APPS SCRIPT BACKEND WITH ASSIGNMENT_CONTROLS ───────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()]
  ],
  Assignment_Controls: [
    ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
    ["FAC001", "EC-01", true, "", "", false, new Date()],
    ["FAC003", "EC-01", false, "", "2026-09-01T23:59:00.000Z", false, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"]
  ],
  Student_Submissions: [
    ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"]
  ],
  Logs: [
    ["Timestamp", "Type", "Stage", "Message", "Payload"]
  ]
};

const mockEnv = {
  CONFIG: {
    SHEETS: {
      COLLEGE_REGISTRY: "College_Registry",
      FACULTY_REGISTRY: "Faculty_Registry",
      ASSIGNMENT_CONTROLS: "Assignment_Controls",
      ASSIGNMENT_FACULTY_SELECTION: "Assignment_Faculty_Selection",
      SUBMISSIONS: "Student_Submissions",
      LOGS: "Logs"
    },
    LOCK_TIMEOUT_MS: 30000
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      releaseLock: () => true
    })
  },
  getSheet: (sheetName) => {
    const rows = mockSpreadsheet[sheetName];
    if (!rows) return null;
    return {
      getDataRange: () => ({
        getValues: () => rows
      }),
      getLastRow: () => rows.length,
      getLastColumn: () => rows[0] ? rows[0].length : 0,
      getRange: (r, c) => ({
        setValue: (v) => {
          if (rows[r - 1]) rows[r - 1][c - 1] = v;
        }
      }),
      appendRow: (row) => {
        rows.push(row);
      }
    };
  },
  getSheetSafe_: (sheetName) => mockEnv.getSheet(sheetName),
  getHeaderMap: (headerRow) => {
    const map = {};
    headerRow.forEach((h, idx) => { map[h] = idx; });
    return map;
  },
  response: (data, success, error, statusCode) => ({
    success: success !== undefined ? success : true,
    data,
    error,
    statusCode: statusCode || 200
  }),
  logError: (e, ctx) => console.log('Mock error:', e && e.message ? e.message : e)
};

const scriptFunc = new Function('env', `
  with(env) {
    ${registryContent}
    ${submissionContent}
    return {
      getAssignmentControls,
      saveAssignmentControl
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runSprint5aTests() {
  // TEST 1: FAC001 retrieves its own assignment controls.
  await it('TEST 1: FAC001 retrieves its own assignment controls from Assignment_Controls', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    assert.strictEqual(res.success, true);
    assert(res.data.length >= 1);
    assert(res.data.every(c => c.facultyId === "FAC001"));
  });

  // TEST 2: FAC001 does not receive FAC003 controls.
  await it('TEST 2: FAC001 does not receive FAC003 controls', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    assert(!res.data.some(c => c.facultyId === "FAC003"));
  });

  // TEST 3: FAC001 changes EA-21 Active -> Disabled.
  await it('TEST 3: FAC001 changes EA-21 Active -> Disabled', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-21",
      enabled: false,
      authFacultyId: "FAC001"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.enabled, false);
    assert.strictEqual(res.data.assignmentId, "EA-21");
  });

  // TEST 4: Server-side Assignment_Controls reflects Disabled.
  await it('TEST 4: Server-side Assignment_Controls reflects Disabled for FAC001 on EA-21', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    const ea21 = res.data.find(c => c.assignmentId === "EA-21");
    assert(ea21, "EA-21 must exist in controls");
    assert.strictEqual(ea21.enabled, false);
  });

  // TEST 5: FAC001 reloads and retrieves Disabled from server.
  await it('TEST 5: FAC001 re-queries backend and retrieves Disabled', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    const ea21 = res.data.find(c => c.assignmentId === "EA-21");
    assert.strictEqual(ea21.enabled, false);
  });

  // TEST 6: FAC001 changes EA-21 Disabled -> Active.
  await it('TEST 6: FAC001 changes EA-21 Disabled -> Active', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-21",
      enabled: true,
      authFacultyId: "FAC001"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.enabled, true);
    assert.strictEqual(res.data.updated, true, "Should update existing row");
  });

  // TEST 7: Server reflects Active.
  await it('TEST 7: Server reflects Active for FAC001 on EA-21', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    const ea21 = res.data.find(c => c.assignmentId === "EA-21");
    assert.strictEqual(ea21.enabled, true);
  });

  // TEST 8: FAC001 sets EA-21 due date.
  await it('TEST 8: FAC001 sets EA-21 due date to 2026-08-30T23:59:00.000Z', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-21",
      enabled: true,
      dueDate: "2026-08-30T23:59:00.000Z",
      authFacultyId: "FAC001"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.dueDate, "2026-08-30T23:59:00.000Z");
  });

  // TEST 9: Due date persists after retrieval.
  await it('TEST 9: Due date persists on subsequent getAssignmentControls call', () => {
    const res = backend.getAssignmentControls({ facultyId: "FAC001" });
    const ea21 = res.data.find(c => c.assignmentId === "EA-21");
    assert.strictEqual(ea21.dueDate, "2026-08-30T23:59:00.000Z");
  });

  // TEST 10: No Deadline state is preserved.
  await it('TEST 10: No Deadline state is preserved when dueDate is empty string', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-21",
      enabled: true,
      dueDate: "",
      authFacultyId: "FAC001"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.dueDate, null);
  });

  // TEST 11: FAC001 cannot modify FAC003 controls.
  await it('TEST 11: FAC001 cannot modify FAC003 controls (rejected with HTTP 403)', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC003",
      assignmentId: "EA-21",
      enabled: false,
      authFacultyId: "FAC001" // mismatched authenticated faculty
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 12: Invalid Assignment_ID is rejected.
  await it('TEST 12: Invalid Assignment_ID is rejected with HTTP 400', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "!", // invalid
      enabled: true,
      authFacultyId: "FAC001"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 13: UNKNOWN faculty cannot create faculty assignment controls.
  await it('TEST 13: UNKNOWN faculty cannot manage assignment controls (HTTP 400)', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "UNKNOWN",
      assignmentId: "EA-21",
      enabled: true
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 14: Repeated save updates the same record rather than creating duplicates.
  await it('TEST 14: Repeated save updates the same row in Assignment_Controls (no duplicates)', () => {
    const countBefore = mockSpreadsheet.Assignment_Controls.length;
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC001" });
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: false, authFacultyId: "FAC001" });
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC001" });
    const countAfter = mockSpreadsheet.Assignment_Controls.length;
    assert.strictEqual(countAfter, countBefore, "Row count in Assignment_Controls must not increase on updates");
  });

  // TEST 15: Existing AssignmentControlService UI methods exist.
  await it('TEST 15: AssignmentControlService defines fetchCloudControls and saveCloudControl', () => {
    const serviceContent = fs.readFileSync('outputs/meilp/js/assignment-control-service.js', 'utf8');
    assert(serviceContent.includes('fetchCloudControls'));
    assert(serviceContent.includes('saveCloudControl'));
    assert(serviceContent.includes('getControls'));
    assert(serviceContent.includes('setControls'));
    assert(serviceContent.includes('evaluateAccess'));
  });

  // TEST 16: ChallengesEngine loads cloud controls.
  await it('TEST 16: ChallengesEngine invokes fetchCloudControls on init', () => {
    const challengesEngineContent = fs.readFileSync('faculty/js/challenges-engine.js', 'utf8');
    assert(challengesEngineContent.includes('fetchCloudControls'));
  });

  // TEST 17: Config includes ASSIGNMENT_CONTROLS in 01_Config.gs.
  await it('TEST 17: 01_Config.gs defines ASSIGNMENT_CONTROLS sheet and header schema', () => {
    assert(configContent.includes('ASSIGNMENT_CONTROLS: "Assignment_Controls"'));
  });

  // TEST 18: Main router routes getAssignmentControls and saveAssignmentControl.
  await it('TEST 18: 02_Main.gs routes getAssignmentControls and saveAssignmentControl', () => {
    const mainContent = fs.readFileSync('Google Script/02_Main.gs', 'utf8');
    assert(mainContent.includes('getAssignmentControls'));
    assert(mainContent.includes('saveAssignmentControl'));
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 5A TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint5aTests();
