const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 7 — PRODUCTION ACCEPTANCE TESTING (PAT)');
console.log('Comprehensive Real-World Verification Suite');
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

// Load production Google Apps Script modules
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');
const facultyContent = fs.readFileSync('Google Script/03_Faculty.gs', 'utf8');

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date("2026-01-01T00:00:00Z")],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date("2026-01-01T00:00:00Z")],
    ["COL003", "COEP Technological University, Pune", "INACTIVE", new Date("2026-01-01T00:00:00Z")]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date("2026-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z")],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date("2026-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z")],
    ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date("2026-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z")],
    ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date("2026-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z")],
    ["FAC005", "inactive@dypic.in", "salt$hash", "Inactive Faculty", "inactive@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date("2026-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z")]
  ],
  Assignment_Controls: [
    ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
    ["FAC001", "EA-21", true, "", "", false, new Date()],
    ["FAC003", "EA-21", true, "", "", false, new Date()],
    ["FAC001", "EA-22", true, "", "2026-08-30T23:59:00+05:30", false, new Date()],
    ["FAC003", "EA-22", true, "", "2026-08-01T00:00:00Z", true, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
    ["SEL-PAT-001", "ATT-PAT-001", "STU-PAT-1", "COL001", "FAC001", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-PAT-002", "ATT-PAT-002", "STU-PAT-2", "COL001", "FAC003", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"]
  ],
  Student_Submissions: [
    ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"],
    [new Date(), "ATT-PAT-001", "hash-pat-1", "Student One", "STU-PAT-1", "A", "individual", "EA-21", "Bench Vice", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-PAT-001" }, studentInformation: { rollNumber: "STU-PAT-1" } }), "s1@pat.com"],
    [new Date(), "ATT-PAT-002", "hash-pat-2", "Student Two", "STU-PAT-2", "A", "individual", "EA-21", "Bench Vice", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-PAT-002" }, studentInformation: { rollNumber: "STU-PAT-2" } }), "s2@pat.com"]
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
      getRange: (r, c, numRows, numCols) => ({
        setValue: (v) => {
          if (rows[r - 1]) rows[r - 1][c - 1] = v;
        },
        getValue: () => {
          return rows[r - 1] ? rows[r - 1][c - 1] : null;
        },
        getValues: () => {
          const res = [];
          for (let i = 0; i < (numRows || 1); i++) {
            const rowIdx = (r - 1) + i;
            const rowData = rows[rowIdx] || [];
            if (numCols) {
              res.push(rowData.slice(c - 1, c - 1 + numCols));
            } else {
              res.push([rowData[c - 1]]);
            }
          }
          return res;
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
      getFaculty,
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

async function runPATTests() {
  // PAT 1: Faculty Authentication & Session
  await it('PAT 1: Faculty Login & Authentication flow retrieves authoritative Faculty_ID without Password_Hash', () => {
    const fac = backend.getFaculty({ facultyId: "FAC001" });
    assert.strictEqual(fac.success, true);
    assert.strictEqual(fac.data.facultyId, "FAC001");
    assert.strictEqual(fac.data.facultyName, "Dr. Rahul Bachute");
    assert.strictEqual(fac.data.Password_Hash, undefined);
  });

  // PAT 2: Student College Selection
  await it('PAT 2: Student College Selection returns only active colleges (COL001, COL002; excludes COL003)', () => {
    const res = backend.getColleges();
    assert.strictEqual(res.success, true);
    const ids = res.data.map(c => c.collegeId);
    assert(ids.includes("COL001"));
    assert(ids.includes("COL002"));
    assert(!ids.includes("COL003"));
  });

  // PAT 3: Dynamic Faculty Selection
  await it('PAT 3: Dynamic Faculty Selection scopes faculty strictly by College_ID (COL001)', () => {
    const res = backend.getFacultyList({ collegeId: "COL001" });
    assert.strictEqual(res.success, true);
    const facIds = res.data.map(f => f.facultyId);
    assert(facIds.includes("FAC001"));
    assert(facIds.includes("FAC002"));
    assert(facIds.includes("FAC003"));
    assert(!facIds.includes("FAC004"), "FAC004 belongs to COL002 and must not appear");
    assert(!facIds.includes("FAC005"), "FAC005 is inactive and must not appear");
  });

  // PAT 4: UNKNOWN Faculty Handling
  await it('PAT 4: UNKNOWN faculty is isolated and does not map to FAC001', () => {
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-UNKNOWN-PAT",
      studentId: "STU-UNK-1",
      collegeId: "COL001",
      facultyId: "UNKNOWN",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "UNKNOWN");
  });

  // PAT 5: Assignment Controls Modification & Persistence
  await it('PAT 5: Assignment Controls toggle (Active -> Disabled -> Active) persists in Assignment_Controls', () => {
    const resDisable = backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: false, authFacultyId: "FAC001" });
    assert.strictEqual(resDisable.success, true);
    assert.strictEqual(resDisable.data.enabled, false);

    const checkDisabled = backend.getAssignmentControls({ facultyId: "FAC001" });
    assert.strictEqual(checkDisabled.data.find(c => c.assignmentId === "EA-21").enabled, false);

    const resEnable = backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC001" });
    assert.strictEqual(resEnable.success, true);
    assert.strictEqual(resEnable.data.enabled, true);
  });

  // PAT 6: Cross-Faculty Control Isolation
  await it('PAT 6: Cross-faculty control isolation: FAC001 disabling EA-21 does not disable FAC003 on EA-21', () => {
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: false, authFacultyId: "FAC001" });
    backend.saveAssignmentControl({ facultyId: "FAC003", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC003" });

    const fac1 = backend.getAssignmentControls({ facultyId: "FAC001" });
    const fac3 = backend.getAssignmentControls({ facultyId: "FAC003" });

    assert.strictEqual(fac1.data.find(c => c.assignmentId === "EA-21").enabled, false);
    assert.strictEqual(fac3.data.find(c => c.assignmentId === "EA-21").enabled, true);

    // restore
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC001" });
  });

  // PAT 7: Disabled Assignment Access Blocking
  await it('PAT 7: Backend blocks new attempts on disabled assignment (HTTP 403)', () => {
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: false, authFacultyId: "FAC001" });
    const res = backend.createAssignmentFacultySelection({
      attemptId: "ATT-PAT-BLOCKED",
      studentId: "STU-PAT-X",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EA-21"
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
    // restore
    backend.saveAssignmentControl({ facultyId: "FAC001", assignmentId: "EA-21", enabled: true, authFacultyId: "FAC001" });
  });

  // PAT 8: Due Date & Late Submission Policy Enforcement
  await it('PAT 8: Due date enforcement: Expired deadline with Allow_Late=false blocks submission (HTTP 403)', () => {
    // FAC001 on EA-22 has expired deadline with Allow_Late=false
    backend.saveAssignmentControl({
      facultyId: "FAC001",
      assignmentId: "EA-22",
      enabled: true,
      dueDate: "2026-08-01T00:00:00Z",
      allowLate: false,
      authFacultyId: "FAC001"
    });

    const res = backend.saveStudentSubmission({
      submission: { submissionId: "ATT-PAT-EXP-SUB", submissionHash: "hash-pat-exp" },
      studentInformation: { rollNumber: "STU-PAT-LATE", facultyId: "FAC001" },
      challengeMetadata: { id: "EA-22" }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // PAT 9: Faculty-Specific Evaluation Queue Routing
  await it('PAT 9: Faculty evaluation queue: FAC001 retrieves only FAC001 submissions (ATT-PAT-001)', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].submissionId, "ATT-PAT-001");
  });

  // PAT 10: Cross-Faculty Evaluation Protection
  await it('PAT 10: Cross-faculty evaluation write protection: FAC001 evaluating ATT-PAT-002 (owned by FAC003) is denied (HTTP 403)', () => {
    const res = backend.saveEvaluation({
      submissionId: "ATT-PAT-002",
      facultyName: "Dr. Rahul Bachute",
      facultyId: "FAC001",
      evaluation: "Good report",
      totalMarks: 10,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL PRODUCTION ACCEPTANCE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPATTests();
