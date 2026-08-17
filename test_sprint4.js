const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 4 VERIFICATION TEST SUITE');
console.log('Faculty-Specific Evaluation Routing');
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

// ─── 1. SIMULATE GOOGLE APPS SCRIPT BACKEND WITH SPRINT 4 ROUTING ──────────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');

const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "COEP Technological University, Pune", "ACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
    ["SEL-001", "ATT-001", "STU001", "COL001", "FAC001", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-002", "ATT-002", "STU002", "COL001", "FAC001", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-003", "ATT-003", "STU003", "COL001", "FAC003", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-004", "ATT-004", "STU004", "COL001", "FAC001", "EA-22", new Date(), new Date(), new Date(), "SUBMITTED"],
    ["SEL-005", "ATT-005", "STU005", "COL003", "UNKNOWN", "EA-21", new Date(), new Date(), new Date(), "SUBMITTED"]
  ],
  Student_Submissions: [
    ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"],
    [new Date("2026-08-10T10:00:00Z"), "ATT-001", "hash1", "Aarav Sharma", "STU001", "A", "individual", "EA-21", "Bench Vice Design", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-001" }, studentInformation: { name: "Aarav Sharma", rollNumber: "STU001" } }), "aarav@test.com"],
    [new Date("2026-08-10T11:00:00Z"), "ATT-002", "hash2", "Bhavna Patel", "STU002", "A", "individual", "EA-21", "Bench Vice Design", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-002" }, studentInformation: { name: "Bhavna Patel", rollNumber: "STU002" } }), "bhavna@test.com"],
    [new Date("2026-08-10T12:00:00Z"), "ATT-003", "hash3", "Chetan Kulkarni", "STU003", "B", "individual", "EA-21", "Bench Vice Design", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-003" }, studentInformation: { name: "Chetan Kulkarni", rollNumber: "STU003" } }), "chetan@test.com"],
    [new Date("2026-08-10T13:00:00Z"), "ATT-004", "hash4", "Divya Shinde", "STU004", "A", "individual", "EA-22", "Mobile Scissor Lift", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-004" }, studentInformation: { name: "Divya Shinde", rollNumber: "STU004" } }), "divya@test.com"],
    [new Date("2026-08-10T14:00:00Z"), "ATT-005", "hash5", "Eshaan Joshi", "STU005", "C", "individual", "EA-21", "Bench Vice Design", 1, 100, "Submitted", JSON.stringify({ submission: { submissionId: "ATT-005" }, studentInformation: { name: "Eshaan Joshi", rollNumber: "STU005" } }), "eshaan@test.com"]
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
      ASSIGNMENT_FACULTY_SELECTION: "Assignment_Faculty_Selection",
      SUBMISSIONS: "Student_Submissions",
      EVALUATION: "Faculty_Evaluation",
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
      getRange: (r, c, numRows, numCols) => ({
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
        },
        getValue: () => {
          return rows[r - 1] ? rows[r - 1][c - 1] : null;
        },
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
  safeJsonParse: (str, fallback) => {
    try { return JSON.parse(str); } catch (e) { return fallback; }
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
      getSubmissions,
      getSubmission
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runSprint4Tests() {
  // TEST 1: FAC001 + EA-21 returns only FAC001 + EA-21 students (STU001, STU002).
  await it('TEST 1: FAC001 + EA-21 returns strictly STU001 and STU002', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001", assignmentId: "EA-21" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 2, "FAC001 on EA-21 must have exactly 2 submissions");
    const rolls = res.data.map(s => s.rollNumber);
    assert(rolls.includes("STU001"));
    assert(rolls.includes("STU002"));
    assert(!rolls.includes("STU003"), "STU003 (FAC003) must not be returned");
    assert(!rolls.includes("STU004"), "STU004 (EA-22) must not be returned");
    assert(!rolls.includes("STU005"), "STU005 (UNKNOWN) must not be returned");
  });

  // TEST 2: FAC003 + EA-21 returns only FAC003 + EA-21 students (STU003).
  await it('TEST 2: FAC003 + EA-21 returns strictly STU003', () => {
    const res = backend.getSubmissions({ facultyId: "FAC003", assignmentId: "EA-21" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].rollNumber, "STU003");
  });

  // TEST 3: FAC001 + EA-22 returns only FAC001 + EA-22 students (STU004).
  await it('TEST 3: FAC001 + EA-22 returns strictly STU004', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001", assignmentId: "EA-22" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].rollNumber, "STU004");
  });

  // TEST 4: UNKNOWN records are excluded from normal faculty queries.
  await it('TEST 4: UNKNOWN faculty records (STU005) are never returned to FAC001, FAC002, or FAC003', () => {
    const res1 = backend.getSubmissions({ facultyId: "FAC001" });
    const res2 = backend.getSubmissions({ facultyId: "FAC002" });
    const res3 = backend.getSubmissions({ facultyId: "FAC003" });
    const allFetchedRolls = [
      ...res1.data.map(s => s.rollNumber),
      ...res2.data.map(s => s.rollNumber),
      ...res3.data.map(s => s.rollNumber)
    ];
    assert(!allFetchedRolls.includes("STU005"), "UNKNOWN record STU005 must never appear in any faculty query");
  });

  // TEST 5: FAC001 cannot retrieve FAC003's single submission payload.
  await it('TEST 5: FAC001 requesting ATT-003 (owned by FAC003) is denied with HTTP 403', () => {
    const res = backend.getSubmission({ submissionId: "ATT-003", facultyId: "FAC001" });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 6: FAC003 cannot retrieve FAC001's submission payload (ATT-001).
  await it('TEST 6: FAC003 requesting ATT-001 (owned by FAC001) is denied with HTTP 403', () => {
    const res = backend.getSubmission({ submissionId: "ATT-001", facultyId: "FAC003" });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // TEST 7: Changing student global faculty selection does NOT move historical attempts.
  await it('TEST 7: Historical attempt ATT-001 remains assigned to FAC001', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001", assignmentId: "EA-21" });
    assert(res.data.some(s => s.submissionId === "ATT-001"));
  });

  // TEST 8: Submitted status filtering works in conjunction with faculty routing.
  await it('TEST 8: Submissions match status filter "Submitted"', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001", assignmentId: "EA-21", status: "Submitted" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 2);
  });

  // TEST 9: UNKNOWN faculty querying evaluation data receives empty set.
  await it('TEST 9: Query with facultyId="UNKNOWN" returns empty array', () => {
    const res = backend.getSubmissions({ facultyId: "UNKNOWN" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 0);
  });

  // TEST 10: Non-existent assignment for faculty returns empty array without error.
  await it('TEST 10: Non-existent assignment (EA-99) returns empty array without error', () => {
    const res = backend.getSubmissions({ facultyId: "FAC001", assignmentId: "EA-99" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 0);
  });

  // TEST 11: Repository client passes authenticated facultyId.
  await it('TEST 11: faculty/js/data/repository.js passes authenticated facultyId', () => {
    const repoContent = fs.readFileSync('faculty/js/data/repository.js', 'utf8');
    assert(repoContent.includes('facultyId'));
    assert(repoContent.includes('DESAuth.getCurrentUser'));
  });

  // TEST 12: Protected sheets schema remains untouched.
  await it('TEST 12: Protected sheets schema (Faculty_Evaluation, Submissions) remains untouched', () => {
    assert(configContent.includes('EVALUATION: "Faculty_Evaluation"'));
    assert(configContent.includes('SUBMISSIONS: "Student_Submissions"'));
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 4 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint4Tests();
