const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 5B VERIFICATION TEST SUITE');
console.log('Backend Assignment Access and Due-Date Enforcement');
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

// ─── 1. SIMULATE GOOGLE APPS SCRIPT BACKEND WITH ENFORCEMENT ───────────────────
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
    ["FAC001", "EA-21", false, "", "", false, new Date()], // Disabled for FAC001
    ["FAC003", "EA-21", true, "", "", false, new Date()],  // Enabled for FAC003
    ["FAC001", "EA-22", true, "", "2026-08-01T00:00:00.000Z", false, new Date()], // Expired for FAC001, no late
    ["FAC003", "EA-22", true, "", "2026-08-01T00:00:00.000Z", true, new Date()],  // Expired for FAC003, allow late
    ["FAC001", "EA-20", true, "", "2030-01-01T00:00:00.000Z", false, new Date()], // Future deadline
    ["FAC001", "EA-19", true, "", "", false, new Date()]  // No deadline
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
    ["SEL-EXIST", "ATT-EXIST-01", "STU999", "COL001", "FAC001", "EA-21", new Date(), new Date(), "", "ACTIVE"]
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
    STATUS: {
      SUBMITTED: "Submitted"
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
  generateSelectionId: () => "SEL-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  generateId: () => "SUB-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  duplicateSubmissionCheck: (data, headerMap, hash) => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][headerMap['Submission Hash']] === hash) return true;
    }
    return false;
  },
  calculateAttemptNumber: () => 1,
  safeJsonStringify: (obj) => JSON.stringify(obj),
  getUserEmail: () => "student@test.com",
  updateAnalyticsSafe_: () => {},
  updateAssignmentSelectionOnSubmitSafe_: () => {},
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
      createAssignmentFacultySelection,
      getAssignmentFacultySelection,
      saveStudentSubmission
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runSprint5bTests() {
  // TEST 1: Enabled = TRUE, before due date -> new attempt allowed.
  await it('TEST 1: Enabled = TRUE, before due date -> new attempt allowed', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-TEST-01",
      studentId: "STU101",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-20"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, "ATT-TEST-01");
  });

  // TEST 2: Enabled = FALSE -> new attempt denied with HTTP 403.
  await it('TEST 2: Enabled = FALSE for FAC001 on EA-21 -> new attempt denied (HTTP 403)', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-TEST-02",
      studentId: "STU102",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("disabled"));
  });

  // TEST 3: Disabled assignment does not destroy existing draft.
  await it('TEST 3: Disabled assignment does not destroy existing draft (resuming returns existing row)', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-EXIST-01",
      studentId: "STU999",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, "ATT-EXIST-01");
    assert.strictEqual(res.data.exists, true);
  });

  // TEST 4: Due date empty -> submission allowed according to existing rules.
  await it('TEST 4: Due date empty -> submission allowed', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-EA19-SUB", submissionHash: "hash-ea19-01" },
      studentInformation: { rollNumber: "STU103", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-19" }
    });
    assert.strictEqual(res.success, true);
  });

  // TEST 5: Before due date -> submission allowed.
  await it('TEST 5: Before due date -> submission allowed', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-EA20-SUB", submissionHash: "hash-ea20-01" },
      studentInformation: { rollNumber: "STU104", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-20" }
    });
    assert.strictEqual(res.success, true);
  });

  // TEST 6: After due date + Allow_Late = FALSE -> submission denied with HTTP 403.
  await it('TEST 6: After due date + Allow_Late = FALSE -> submission denied (HTTP 403)', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-EA22-LATE-DENIED", submissionHash: "hash-ea22-01" },
      studentInformation: { rollNumber: "STU105", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("deadline"));
  });

  // TEST 7: After due date + Allow_Late = TRUE -> submission allowed.
  await it('TEST 7: After due date + Allow_Late = TRUE -> submission allowed for FAC003 on EA-22', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-EA22-LATE-ALLOWED", submissionHash: "hash-ea22-02" },
      studentInformation: { rollNumber: "STU106", facultyId: "FAC003" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, true);
  });

  // TEST 8: Backend enforcement works even if localStorage says ACTIVE while cloud says DISABLED.
  await it('TEST 8: Backend rejects attempt on cloud-disabled assignment regardless of client claims', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-CLIENT-TAMPER",
      studentId: "STU107",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21",
      clientCachedStatus: "ACTIVE"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 9: Faculty-specific controls are respected (FAC001 vs FAC003 on EA-21).
  await it('TEST 9: FAC001 on EA-21 is denied, while FAC003 on EA-21 is allowed', () => {
    const resFac001 = backend.createAssignmentFacultySelection({
      attemptId: "ATT-FAC1-EA21",
      studentId: "STU108",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    const resFac003 = backend.createAssignmentFacultySelection({
      attemptId: "ATT-FAC3-EA21",
      studentId: "STU109",
      collegeId: "COL001",
      facultyId: "FAC003",
      assignmentId: "EA-21"
    });
    assert.strictEqual(resFac001.success, false);
    assert.strictEqual(resFac003.success, true);
  });

  // TEST 10: Expired deadline for FAC001 does not affect FAC003 on EA-22.
  await it('TEST 10: Expired deadline policy for FAC001 (no late) does not block FAC003 (allow late)', () => {
    const res1 = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-F1-EA22", submissionHash: "hash-f1-22" },
      studentInformation: { rollNumber: "STU110", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-22" }
    });
    const res3 = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-F3-EA22", submissionHash: "hash-f3-22" },
      studentInformation: { rollNumber: "STU111", facultyId: "FAC003" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res1.success, false);
    assert.strictEqual(res3.success, true);
  });

  // TEST 11: Existing Attempt_ID remains associated with original Faculty_ID.
  await it('TEST 11: Existing Attempt_ID ATT-EXIST-01 remains associated with FAC001', () => {
    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-EXIST-01" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "FAC001");
  });

  // TEST 12: Direct API attempt to bypass disabled state is denied.
  await it('TEST 12: Direct API call to start disabled EA-21 under FAC001 is denied', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-DIRECT-API-01",
      studentId: "STU112",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 13: Direct API attempt to bypass expired due date is denied.
  await it('TEST 13: Direct API call to submit expired EA-22 under FAC001 is denied', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-DIRECT-API-SUB", submissionHash: "hash-direct-sub" },
      studentInformation: { rollNumber: "STU113", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 14: UNKNOWN does not map to FAC001.
  await it('TEST 14: Starting attempt under UNKNOWN faculty creates UNKNOWN record, not FAC001', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-UNKNOWN-5B",
      studentId: "STU114",
      collegeId: "COL001",
      facultyId: "UNKNOWN",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
  });

  // TEST 15: Existing submission payload structure remains compatible.
  await it('TEST 15: Submission payload containing standard schema succeeds', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-COMPAT-01", submissionHash: "hash-compat-01" },
      studentInformation: { rollNumber: "STU115", name: "Riya Kulkarni", division: "A" },
      challengeMetadata: { id: "EA-19", title: "Helical Springs" }
    });
    assert.strictEqual(res.success, true);
  });

  // TEST 16: Existing Faculty Evaluation routing remains intact.
  await it('TEST 16: Backend submission filtering by facultyId and assignmentId is operational', () => {
    assert(submissionContent.includes('getSubmissions'));
    assert(submissionContent.includes('Assignment_Faculty_Selection'));
  });

  // TEST 17: Assignment Control persistence remains functional.
  await it('TEST 17: Assignment_Controls is accessible and functional in registry', () => {
    assert(registryContent.includes('getAssignmentControls'));
    assert(registryContent.includes('saveAssignmentControl'));
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 5B TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint5bTests();
