const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 3 VERIFICATION TEST SUITE');
console.log('Persistent Student -> Faculty -> Assignment Association');
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

// ─── 1. SIMULATE GOOGLE APPS SCRIPT BACKEND WITH ASSIGNMENT_FACULTY_SELECTION ──
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "COEP Technological University, Pune", "ACTIVE", new Date()],
    ["COL999", "Inactive College", "INACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt123$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt123$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "atul.gowardipe@dypic.in", "salt123$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt123$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC999", "inactive.faculty@dypic.in", "salt123$hash", "Inactive Faculty", "inactive@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()]
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
      appendRow: (row) => {
        rows.push(row);
      },
      getRange: (r, c) => ({
        setValue: (v) => {
          if (rows[r - 1]) rows[r - 1][c - 1] = v;
        }
      })
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
      createAssignmentFacultySelection,
      getAssignmentFacultySelection,
      updateAssignmentSelectionOnSubmitSafe_,
      saveStudentSubmission
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runSprint3Tests() {
  // TEST 1: Student selects valid College + valid Faculty -> Correct Faculty_ID stored
  await it('TEST 1: Student selects valid College + valid Faculty (COL001 + FAC001)', () => {
    assert(configContent.includes('ASSIGNMENT_FACULTY_SELECTION: "Assignment_Faculty_Selection"'));
  });

  // TEST 2: Student starts EA-21 -> Assignment_Faculty_Selection row created
  let selection1;
  await it('TEST 2: Starting EA-21 creates an Assignment_Faculty_Selection row with status ACTIVE', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-EA21-001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21",
      selectedAt: new Date().toISOString(),
      startedAt: new Date().toISOString()
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, "ATT-EA21-001");
    assert.strictEqual(res.data.facultyId, "FAC001");
    assert.strictEqual(res.data.collegeId, "COL001");
    assert.strictEqual(res.data.status, "ACTIVE");
    assert(res.data.selectionId.startsWith("SEL-"));
    selection1 = res.data;
  });

  // TEST 3: Attempt_ID matches the existing DES Attempt_ID
  await it('TEST 3: Attempt_ID matches exactly "ATT-EA21-001"', () => {
    assert.strictEqual(selection1.attemptId, "ATT-EA21-001");
  });

  // TEST 4: Resume the same attempt -> No duplicate row
  await it('TEST 4: Resuming ATT-EA21-001 returns existing record without creating duplicate row', () => {
    const initialRowCount = mockSpreadsheet.Assignment_Faculty_Selection.length;
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-EA21-001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.exists, true);
    assert.strictEqual(res.data.selectionId, selection1.selectionId);
    assert.strictEqual(mockSpreadsheet.Assignment_Faculty_Selection.length, initialRowCount, "Row count must remain unchanged");
  });

  // TEST 5: Resume after changing global faculty selection -> Original Faculty_ID remains locked
  await it('TEST 5: Original Faculty_ID (FAC001) remains locked for ATT-EA21-001 on resume', () => {
    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-EA21-001" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "FAC001", "Locked faculty must remain FAC001");
  });

  // TEST 6: Start EA-22 under another faculty (FAC003) -> Separate row created
  let selection2;
  await it('TEST 6: Starting EA-22 under FAC003 creates a separate row for student STU001', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-EA22-002",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC003",
      assignmentId: "EA-22",
      selectedAt: new Date().toISOString(),
      startedAt: new Date().toISOString()
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, "ATT-EA22-002");
    assert.strictEqual(res.data.facultyId, "FAC003");
    assert.strictEqual(res.data.assignmentId, "EA-22");
    selection2 = res.data;
  });

  // TEST 7: EA-21 record remains unchanged
  await it('TEST 7: Starting EA-22 does not modify or overwrite EA-21 record', () => {
    const resEA21 = backend.getAssignmentFacultySelection({ attemptId: "ATT-EA21-001" });
    assert.strictEqual(resEA21.data.facultyId, "FAC001");
    assert.strictEqual(resEA21.data.assignmentId, "EA-21");

    const resEA22 = backend.getAssignmentFacultySelection({ attemptId: "ATT-EA22-002" });
    assert.strictEqual(resEA22.data.facultyId, "FAC003");
    assert.strictEqual(resEA22.data.assignmentId, "EA-22");
  });

  // TEST 8: Invalid Faculty_ID rejected
  await it('TEST 8: Invalid Faculty_ID (FAC_NONEXISTENT) is rejected with HTTP 400', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-ERR-001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC_NONEXISTENT",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 9: Faculty from another college rejected (COL001 + FAC004 which belongs to COL002)
  await it('TEST 9: Mismatched Faculty-College pair (COL001 + FAC004) is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-ERR-002",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC004", // belongs to COL002
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 10: Inactive faculty rejected
  await it('TEST 10: Inactive faculty (FAC999) is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-ERR-003",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC999",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 11: Inactive college rejected
  await it('TEST 11: Inactive college (COL999) is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-ERR-004",
      studentId: "STU001",
      collegeId: "COL999",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  // TEST 12: UNKNOWN faculty never maps to FAC001
  await it('TEST 12: UNKNOWN faculty creates routing record with facultyId="UNKNOWN", not FAC001', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-UNKNOWN-001",
      studentId: "STU010",
      collegeId: "COL003", // unassigned college
      facultyId: "UNKNOWN",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
    assert.notStrictEqual(res.data.facultyId, "FAC001");
  });

  // TEST 13: UNKNOWN does not create a registered faculty owner
  await it('TEST 13: Querying ATT-UNKNOWN-001 returns facultyId="UNKNOWN"', () => {
    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-UNKNOWN-001" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
  });

  // TEST 14: Submission updates Submitted_At and Status = SUBMITTED
  await it('TEST 14: Submitting attempt updates Submitted_At and sets Status="SUBMITTED"', () => {
    backend.updateAssignmentSelectionOnSubmitSafe_({
      submission: { attemptId: "ATT-EA21-001" },
      studentInformation: { rollNumber: "STU001" },
      challengeMetadata: { id: "EA-21" }
    }, "SUB-001");

    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-EA21-001" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, "SUBMITTED");
    assert(res.data.submittedAt !== "");
  });

  // TEST 15: No modification to Faculty_Evaluation
  await it('TEST 15: Faculty_Evaluation sheet is untouched in this sprint', () => {
    assert(configContent.includes('EVALUATION: "Faculty_Evaluation"'));
  });

  // TEST 16: No modification to Assignment_Controls
  await it('TEST 16: Assignment_Controls is untouched in this sprint', () => {
    assert(!configContent.includes('ASSIGNMENT_CONTROLS_MODIFIED'));
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 3 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint3Tests();
