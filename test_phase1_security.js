const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('PHASE 1 VERIFICATION TEST SUITE');
console.log('Server-Side Security, Assignment Controls & Attempt Integrity');
console.log('================================================================\n');

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

// ── 1. MOCK ENVIRONMENT & GOOGLE APPS SCRIPT BACKEND ───────────────────────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');
const facultyContent = fs.readFileSync('Google Script/03_Faculty.gs', 'utf8');

const nowEpoch = Date.now();
const oneDayMs = 86400000;
const pastIso = new Date(nowEpoch - 7 * oneDayMs).toISOString();
const futureIso = new Date(nowEpoch + 7 * oneDayMs).toISOString();
const farFutureIso = new Date(nowEpoch + 365 * oneDayMs).toISOString();

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "Inactive College of Engineering", "INACTIVE", new Date()],
    ["COL-UNREG-01", "Unregistered College", "ACTIVE", new Date()],
    ["COL-UNREGISTERED-99", "Unregistered College 99", "ACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC005", "inactive.teacher@dypic.in", "salt$hash", "Inactive Teacher", "inactive.teacher@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()],
    ["ADMIN001", "admin@des.local", "salt$hash", "System Administrator", "admin@des.local", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "ADMIN", "ACTIVE", new Date(), null, new Date()]
  ],
  Assignment_Controls: [
    ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
    // FAC001 controls
    ["FAC001", "EA-01", true, pastIso, futureIso, false, new Date()], // Active standard
    ["FAC001", "EA-02", false, pastIso, futureIso, false, new Date()], // Disabled
    ["FAC001", "EA-03", true, futureIso, farFutureIso, false, new Date()], // Unreleased
    ["FAC001", "EA-04", true, pastIso, pastIso, false, new Date()], // Expired no late
    ["FAC001", "EA-05", true, pastIso, pastIso, true, new Date()], // Expired allow late
    // FAC002 controls (different rules for EA-01)
    ["FAC002", "EA-01", false, pastIso, futureIso, false, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
    ["SEL-PRE-01", "ATT-PRE-FAC001", "STU001", "COL001", "FAC001", "EA-01", new Date(), new Date(), "", "ACTIVE"],
    ["SEL-PRE-02", "ATT-PRE-UNKNOWN", "STU002", "COL001", "UNKNOWN", "EA-01", new Date(), new Date(), "", "ACTIVE"],
    ["SEL-HIST-01", "ATT-HIST-UNKNOWN", "STU-UNREG-01", "COL-UNREG", "UNKNOWN", "EA-01", new Date(), new Date(), new Date(), "SUBMITTED"]
  ],
  Student_Submissions: [
    ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"],
    [new Date(), "SUB-HIST-01", "hash-hist-01", "Unreg Student", "STU-UNREG-01", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ studentInformation: { facultyId: "UNKNOWN", rollNumber: "STU-UNREG-01" } }), "unreg@student.com"],
    [new Date(), "ATT-PRE-FAC001", "hash-pre-01", "Student One", "STU001", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-PRE-FAC001" }, studentInformation: { rollNumber: "STU001", facultyId: "FAC001" } }), "stu001@test.com"],
    [new Date(), "ATT-PRE-UNKNOWN", "hash-pre-02", "Student Two", "STU002", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-PRE-UNKNOWN" }, studentInformation: { rollNumber: "STU002", facultyId: "UNKNOWN" } }), "stu002@test.com"]
  ],
  Faculty_Evaluation: [
    ["Timestamp", "Submission ID", "Challenge ID", "Student Name", "Roll Number", "Faculty Name", "Faculty Email", "Evaluation", "Marks", "Max Marks", "Percentage", "Remarks", "Rubric Scores", "project-charter", "identify-components", "working-principle", "material-selection", "engineering-calculations", "engineering-decision", "reflection", "Status"]
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
      EVALUATION: "Faculty_Evaluation",
      LOGS: "Logs"
    },
    HEADERS: {
      EVALUATION: [
        "Timestamp", "Submission ID", "Challenge ID", "Student Name", "Roll Number", "Faculty Name", "Faculty Email", "Evaluation", "Marks", "Max Marks", "Percentage", "Remarks", "Rubric Scores", "project-charter", "identify-components", "working-principle", "material-selection", "engineering-calculations", "engineering-decision", "reflection", "Status"
      ]
    },
    STATUS: {
      SUBMITTED: "Submitted",
      EVALUATED: "Evaluated"
    },
    LOCK_TIMEOUT_MS: 30000
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      releaseLock: () => true
    })
  },
  Utilities: {
    computeDigest: (alg, str) => Array.from(Buffer.from(str)),
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" }
  },
  getSheet: (sheetName) => {
    const rows = mockSpreadsheet[sheetName];
    if (!rows) return null;
    return {
      getDataRange: () => ({ getValues: () => rows }),
      getLastRow: () => rows.length,
      getLastColumn: () => rows[0] ? rows[0].length : 0,
      getRange: (r, c, numRows, numCols) => ({
        setValue: (v) => { if (rows[r - 1]) rows[r - 1][c - 1] = v; },
        getValue: () => rows[r - 1] ? rows[r - 1][c - 1] : null,
        getValues: () => [rows[0]],
        setValues: (arr) => {}
      }),
      appendRow: (row) => rows.push(row)
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
  duplicateEvaluationCheck: (data, headerMap, subId) => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][headerMap['Submission ID']] === subId) return true;
    }
    return false;
  },
  calculateAttemptNumber: () => 1,
  safeJsonStringify: (obj) => JSON.stringify(obj),
  getUserEmail: () => "student@test.com",
  updateAnalyticsSafe_: () => {},
  updateAssignmentSelectionOnSubmitSafe_: () => {},
  normalizeRubricScores_: () => ({}),
  firstDefined_: (...args) => args.find(a => a !== undefined && a !== null && a !== '') || '',
  sumFacultyMarks_: () => 10,
  sumRubricScores_: () => 10,
  sumMaxMarks_: () => 12,
  calculatePercentage_: () => 83.3,
  appendEvaluationRow: (sheet, data) => {
    mockSpreadsheet.Faculty_Evaluation.push(data);
    return true;
  },
  response: (data, success, error, statusCode) => ({
    success: success !== undefined ? success : true,
    data,
    error,
    statusCode: statusCode || 200
  }),
  logError: (e, ctx) => console.log('Mock error log:', e && e.message ? e.message : e),
  debugLog: () => {}
};

const scriptFunc = new Function('env', `
  with(env) {
    ${registryContent}
    ${submissionContent}
    ${facultyContent}
    return {
      createAssignmentFacultySelection,
      getAssignmentFacultySelection,
      saveStudentSubmission,
      getAssignmentControls,
      saveAssignmentControl,
      saveEvaluation
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runPhase1SecurityTests() {
  // ===========================================================================
  // TEST GROUP A — VALID REGISTERED FACULTY
  // ===========================================================================
  await it('TEST 1: Registered active faculty belonging to selected college is accepted', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-A-01",
      studentId: "STU-A-01",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.statusCode, 200);
  });

  await it('TEST 2: Assignment-Faculty Selection created correctly with valid AFS record', () => {
    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-A-01" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, "ATT-A-01");
    assert.strictEqual(res.data.facultyId, "FAC001");
    assert.strictEqual(res.data.collegeId, "COL001");
  });

  await it('TEST 3: Attempt retains Faculty_ID and succeeds submission under authorized faculty', () => {
    const res = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-A-01", submissionId: "SUB-A-01", submissionHash: "hash-a-01" },
      studentInformation: { rollNumber: "STU-A-01", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.statusCode, 200);
  });

  // ===========================================================================
  // TEST GROUP B — UNKNOWN / UNASSIGNED FACULTY (UNREGISTERED COLLEGE PATHWAY)
  // ===========================================================================
  await it('TEST 4: Faculty_ID = UNKNOWN is accepted as legitimate operational state for unregistered college', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-B-01",
      studentId: "STU-B-01",
      collegeId: "COL-UNREG-01",
      facultyId: "UNKNOWN",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
  });

  await it('TEST 5: UNKNOWN attempt can create AFS for an unregistered college', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-B-02",
      studentId: "STU-B-02",
      collegeId: "COL-UNREGISTERED-99",
      facultyId: "UNKNOWN",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
  });

  await it('TEST 6: UNKNOWN attempt can submit assignment successfully for unregistered college', () => {
    const res = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-B-01", submissionId: "SUB-B-01", submissionHash: "hash-b-01" },
      studentInformation: { rollNumber: "STU-B-01", facultyId: "UNKNOWN", collegeId: "COL-UNREG-01" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.statusCode, 200);
  });

  await it('TEST 7: UNKNOWN attempt is not rejected merely because there is no faculty control record', () => {
    // EA-02 is disabled for FAC001, but UNKNOWN is unassigned and not subject to FAC001 controls
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-B-03",
      studentId: "STU-B-03",
      collegeId: "COL-UNREG-01",
      facultyId: "UNKNOWN",
      assignmentId: "EA-02"
    });
    assert.strictEqual(res.success, true);

    const subRes = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-B-03", submissionId: "SUB-B-03", submissionHash: "hash-b-03" },
      studentInformation: { rollNumber: "STU-B-03", facultyId: "UNKNOWN", collegeId: "COL-UNREG-01" },
      challengeMetadata: { id: "EA-02" }
    });
    assert.strictEqual(subRes.success, true);
  });

  await it('TEST 8: UNKNOWN attempt cannot be changed to arbitrary faculty through submission payload', () => {
    // Attempt ATT-PRE-UNKNOWN was created as UNKNOWN. Client tries to submit claiming FAC001.
    const res = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-PRE-UNKNOWN", submissionId: "SUB-TAMPER-01", submissionHash: "hash-tamper-01" },
      studentInformation: { rollNumber: "STU002", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("Attempt tampering detected"));
  });

  await it('TEST 9: Historical UNKNOWN records remain intact and recoverable', () => {
    const res = backend.getAssignmentFacultySelection({ attemptId: "ATT-HIST-UNKNOWN" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
    assert.strictEqual(res.data.collegeId, "COL-UNREG");
  });

  // ===========================================================================
  // TEST GROUP C — INVALID FACULTY VALIDATION
  // ===========================================================================
  await it('TEST 10: Empty/missing faculty is rejected appropriately', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-C-01",
      studentId: "STU-C-01",
      collegeId: "COL001",
      facultyId: "",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
  });

  await it('TEST 11: Nonexistent Faculty_ID is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-C-02",
      studentId: "STU-C-02",
      collegeId: "COL001",
      facultyId: "FAC9999",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.statusCode === 400 || res.statusCode === 403);
  });

  await it('TEST 12: Inactive Faculty_ID is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-C-03",
      studentId: "STU-C-03",
      collegeId: "COL001",
      facultyId: "FAC005", // Inactive
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.statusCode === 400 || res.statusCode === 403);
  });

  await it('TEST 13: Faculty belonging to another college is rejected', () => {
    // FAC004 belongs to COL002, student selects COL001
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-C-04",
      studentId: "STU-C-04",
      collegeId: "COL001",
      facultyId: "FAC004",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.statusCode === 400 || res.statusCode === 403);
  });

  await it('TEST 14: Fabricated Faculty_ID is rejected', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-C-05",
      studentId: "STU-C-05",
      collegeId: "COL001",
      facultyId: "FAKE_PROF_HACKER",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.statusCode === 400 || res.statusCode === 403);
  });

  // ===========================================================================
  // TEST GROUP D — ATTEMPT LOCK INTEGRITY
  // ===========================================================================
  await it('TEST 15: Attempt created for Faculty A cannot be rebound to Faculty B', () => {
    // ATT-PRE-FAC001 is bound to FAC001. Calling createAssignmentFacultySelection with FAC002 fails.
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PRE-FAC001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC002",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 409);
    assert(res.error.includes("Attempt binding conflict"));
  });

  await it('TEST 16: Attempt created for Faculty A cannot be rebound to UNKNOWN', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PRE-FAC001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "UNKNOWN",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 409);
    assert(res.error.includes("Attempt binding conflict"));
  });

  await it('TEST 17: Attempt created as UNKNOWN cannot be rebound by ordinary student submission', () => {
    const res = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-PRE-UNKNOWN", submissionId: "SUB-REBIND-01", submissionHash: "hash-rebind-01" },
      studentInformation: { rollNumber: "STU002", facultyId: "FAC002", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("Attempt tampering detected"));
  });

  await it('TEST 18: Attempt assignment cannot be changed', () => {
    // ATT-PRE-FAC001 is bound to EA-01. Attempting with EA-02 is rejected.
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PRE-FAC001",
      studentId: "STU001",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-02"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 409);

    const subRes = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-PRE-FAC001", submissionId: "SUB-D-18", submissionHash: "hash-d-18" },
      studentInformation: { rollNumber: "STU001", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-02" }
    });
    assert.strictEqual(subRes.success, false);
    assert.strictEqual(subRes.statusCode, 403);
  });

  await it('TEST 19: Attempt college cannot be changed', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PRE-FAC001",
      studentId: "STU001",
      collegeId: "COL002",
      facultyId: "FAC001",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 409);

    const subRes = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-PRE-FAC001", submissionId: "SUB-D-19", submissionHash: "hash-d-19" },
      studentInformation: { rollNumber: "STU001", facultyId: "FAC001", collegeId: "COL002" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(subRes.success, false);
    assert.strictEqual(subRes.statusCode, 403);
  });

  await it('TEST 20: Attempt student identity cannot be changed', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PRE-FAC001",
      studentId: "STU_IMPOSTER",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-01"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 409);

    const subRes = backend.saveStudentSubmission({
      submission: { attemptId: "ATT-PRE-FAC001", submissionId: "SUB-D-20", submissionHash: "hash-d-20" },
      studentInformation: { rollNumber: "STU_IMPOSTER", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(subRes.success, false);
    assert.strictEqual(subRes.statusCode, 403);
  });

  // ===========================================================================
  // TEST GROUP E — ASSIGNMENT CONTROLS ENFORCEMENT
  // ===========================================================================
  await it('TEST 21: Enabled = true allows submission within release/due window', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-21", submissionHash: "hash-e-21" },
      studentInformation: { rollNumber: "STU-E-21", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, true);
  });

  await it('TEST 22: Enabled = false blocks submission server-side', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-22", submissionHash: "hash-e-22" },
      studentInformation: { rollNumber: "STU-E-22", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-02" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("disabled"));
  });

  await it('TEST 23: Before Release_Date blocks submission server-side', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-23", submissionHash: "hash-e-23" },
      studentInformation: { rollNumber: "STU-E-23", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-03" } // Future release date
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("scheduled to open"));
  });

  await it('TEST 24: After Due_Date + Allow_Late=false blocks submission server-side', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-24", submissionHash: "hash-e-24" },
      studentInformation: { rollNumber: "STU-E-24", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-04" } // Expired, Allow_Late: false
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("deadline"));
  });

  await it('TEST 25: After Due_Date + Allow_Late=true allows submission server-side', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-25", submissionHash: "hash-e-25" },
      studentInformation: { rollNumber: "STU-E-25", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-05" } // Expired, Allow_Late: true
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.statusCode, 200);
  });

  await it('TEST 26: Boundary times behave correctly (exact past/future timestamps)', () => {
    // Controls for EA-01 has futureIso (> now), so it is accepted
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-E-26", submissionHash: "hash-e-26" },
      studentInformation: { rollNumber: "STU-E-26", facultyId: "FAC001", collegeId: "COL001" },
      challengeMetadata: { id: "EA-01" }
    });
    assert.strictEqual(res.success, true);
  });

  await it('TEST 27: Server time is authoritative (client-side claiming ACTIVE does not bypass server)', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-E-27",
      studentId: "STU-E-27",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-02", // Disabled in sheet
      clientTime: new Date(nowEpoch - 365 * oneDayMs).toISOString(),
      clientStatus: "ACTIVE"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // ===========================================================================
  // TEST GROUP F — CONTROL TAMPERING & AUTHORIZATION
  // ===========================================================================
  await it('TEST 28: Faculty A cannot modify Faculty B assignment controls', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC002",
      assignmentId: "EA-01",
      enabled: true,
      authFacultyId: "FAC001" // Mismatched non-admin
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("Unauthorized"));
  });

  await it('TEST 29: Client cannot change target Faculty_ID to another faculty without matching authFacultyId', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC003",
      assignmentId: "EA-01",
      enabled: false,
      authFacultyId: "FAC002"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('TEST 30: Unauthorized control update without authFacultyId is rejected server-side', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-01",
      enabled: false
      // authFacultyId omitted
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('TEST 31: Administrator can update any faculty assignment controls', () => {
    const res = backend.saveAssignmentControl({
      facultyId: "FAC002",
      assignmentId: "EA-01",
      enabled: true,
      authFacultyId: "ADMIN001" // Legitimate Admin
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.enabled, true);
  });

  // ===========================================================================
  // TEST GROUP G — EVALUATION AUTHORIZATION
  // ===========================================================================
  await it('TEST 32: Faculty A can evaluate AFS records assigned to Faculty A', () => {
    const res = backend.saveEvaluation({
      submissionId: "ATT-PRE-FAC001",
      facultyId: "FAC001",
      authFacultyId: "FAC001",
      facultyName: "Dr. Rahul Bachute",
      facultyEmail: "rahul.bachute@dypic.in",
      evaluation: "Good work",
      totalMarks: 10,
      maxMarks: 12
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.statusCode, 200);
  });

  await it('TEST 33: Faculty A cannot evaluate Faculty B attempts', () => {
    // Attempt ATT-PRE-FAC001 is assigned to FAC001. Evaluator claims FAC002.
    const res = backend.saveEvaluation({
      submissionId: "ATT-PRE-FAC001",
      facultyId: "FAC002",
      authFacultyId: "FAC002",
      facultyName: "Dr. Niranjan Shegokar",
      facultyEmail: "niranjan.shegokar@dypic.in",
      evaluation: "Attempt cross eval",
      totalMarks: 8,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("Unauthorized"));
  });

  await it('TEST 34: Client-side Faculty_ID omission/modification cannot bypass evaluation authorization', () => {
    // Evaluator omits facultyId
    const resNoId = backend.saveEvaluation({
      submissionId: "ATT-PRE-FAC001",
      facultyName: "Anonymous Faculty",
      evaluation: "Bypass test",
      totalMarks: 8,
      maxMarks: 12
    });
    assert.strictEqual(resNoId.success, false);
    assert.strictEqual(resNoId.statusCode, 403);

    // Evaluator provides UNKNOWN
    const resUnknown = backend.saveEvaluation({
      submissionId: "ATT-PRE-FAC001",
      facultyId: "UNKNOWN",
      facultyName: "Unknown Evaluator",
      evaluation: "Bypass test",
      totalMarks: 8,
      maxMarks: 12
    });
    assert.strictEqual(resUnknown.success, false);
    assert.strictEqual(resUnknown.statusCode, 403);
  });

  await it('TEST 35: UNKNOWN attempts cannot be evaluated by arbitrary faculty before controlled allocation', () => {
    // ATT-PRE-UNKNOWN is unassigned (UNKNOWN faculty). Any faculty evaluation must be denied.
    const res = backend.saveEvaluation({
      submissionId: "ATT-PRE-UNKNOWN",
      facultyId: "FAC001",
      authFacultyId: "FAC001",
      facultyName: "Dr. Rahul Bachute",
      facultyEmail: "rahul.bachute@dypic.in",
      evaluation: "Grading unassigned attempt",
      totalMarks: 9,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    assert(res.error.includes("unassigned (UNKNOWN faculty)"));
  });

  console.log(`\n================================================================`);
  console.log(`TOTAL PHASE 1 SECURITY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`================================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase1SecurityTests();
