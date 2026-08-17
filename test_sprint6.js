const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 6 VERIFICATION TEST SUITE');
console.log('End-to-End Audit, Security Review & Hardening');
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

// ─── 1. SIMULATE GOOGLE APPS SCRIPT BACKEND WITH COMPLETE ARCHITECTURE ─────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');
const facultyContent = fs.readFileSync('Google Script/03_Faculty.gs', 'utf8');

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "COEP Technological University, Pune", "INACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC005", "inactive@dypic.in", "salt$hash", "Inactive Faculty", "inactive@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()]
  ],
  Assignment_Controls: [
    ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
    ["FAC001", "EA-21", false, "", "", false, new Date()],
    ["FAC003", "EA-21", true, "", "", false, new Date()],
    ["FAC001", "EA-22", true, "", "2026-08-01T00:00:00.000Z", false, new Date()],
    ["FAC003", "EA-22", true, "", "2026-08-01T00:00:00.000Z", true, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
    ["SEL-001", "ATT-001", "STU001", "COL001", "FAC001", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-002", "ATT-002", "STU002", "COL001", "FAC003", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"]
  ],
  Student_Submissions: [
    ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"],
    [new Date(), "ATT-001", "hash1", "Student One", "STU001", "A", "individual", "EA-21", "Bench Vice", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-001" }, studentInformation: { rollNumber: "STU001" } }), "s1@test.com"],
    [new Date(), "ATT-002", "hash2", "Student Two", "STU002", "A", "individual", "EA-21", "Bench Vice", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-002" }, studentInformation: { rollNumber: "STU002" } }), "s2@test.com"]
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
        },
        getValue: () => {
          return rows[r - 1] ? rows[r - 1][c - 1] : null;
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
  duplicateSubmissionCheck: () => false,
  duplicateEvaluationCheck: () => false,
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
  logError: (e, ctx) => console.log('Mock error:', e && e.message ? e.message : e),
  debugLog: () => {}
};

const scriptFunc = new Function('env', `
  with(env) {
    ${registryContent}
    ${submissionContent}
    ${facultyContent}
    return {
      getColleges,
      getFacultyList,
      createAssignmentFacultySelection,
      getAssignmentFacultySelection,
      getAssignmentControls,
      saveAssignmentControl,
      getSubmissions,
      getSubmission,
      saveStudentSubmission,
      saveEvaluation
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runSprint6Tests() {
  // ── AUDIT 1 & 2: Authentication & Authorization ───────────────────────────
  await it('AUDIT 1.1: Active colleges list excludes inactive colleges', () => {
    const res = backend.getColleges();
    assert.strictEqual(res.success, true);
    assert(res.data.some(c => c.collegeId === "COL001"));
    assert(!res.data.some(c => c.collegeId === "COL003"), "Inactive COL003 must be excluded");
  });

  await it('AUDIT 1.2: Faculty list for college excludes inactive faculty', () => {
    const res = backend.getFacultyList({ collegeId: "COL001" });
    assert.strictEqual(res.success, true);
    assert(res.data.some(f => f.facultyId === "FAC001"));
    assert(!res.data.some(f => f.facultyId === "FAC005"), "Inactive FAC005 must be excluded");
  });

  // ── AUDIT 3 & 4: Submissions & Cross-Faculty Direct Access ────────────────
  await it('AUDIT 2.1: FAC001 retrieves only FAC001 submissions (ATT-001)', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].submissionId, "ATT-001");
  });

  await it('AUDIT 2.2: FAC001 requesting ATT-002 (owned by FAC003) is denied with HTTP 403', () => {
    const res = backend.getSubmission({ submissionId: "ATT-002", facultyId: "FAC001" });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('AUDIT 2.3: FAC001 attempting to saveEvaluation for ATT-002 is denied with HTTP 403', () => {
    const res = backend.saveEvaluation({
      submissionId: "ATT-002",
      facultyName: "Dr. Rahul Bachute",
      facultyId: "FAC001", // Mismatched evaluator
      evaluation: "Good work",
      totalMarks: 10,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // ── AUDIT 5 & 6: Assignment Controls & Due Date Enforcement ───────────────
  await it('AUDIT 3.1: Disabled EA-21 under FAC001 blocks new attempt creation (HTTP 403)', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-NEW-BLOCK",
      studentId: "STU999",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('AUDIT 3.2: Expired EA-22 under FAC001 (Allow_Late=false) blocks submission (HTTP 403)', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-SUB-BLOCK", submissionHash: "hash-block-1" },
      studentInformation: { rollNumber: "STU999", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('AUDIT 3.3: Expired EA-22 under FAC003 (Allow_Late=true) permits submission', () => {
    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-SUB-ALLOW", submissionHash: "hash-allow-1" },
      studentInformation: { rollNumber: "STU998", facultyId: "FAC003" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, true);
  });

  // ── AUDIT 7: LocalStorage & Client Bypass Protection ───────────────────────
  await it('AUDIT 4.1: Tampering client data to bypass disabled state is denied server-side', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-TAMPER-01",
      studentId: "STU997",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21",
      clientStatus: "ACTIVE"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 6 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint6Tests();
