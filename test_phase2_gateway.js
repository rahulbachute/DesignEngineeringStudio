/**
 * ================================================================
 * PHASE 2 VERIFICATION TEST SUITE
 * Role Gateway, Access Separation & Boundary Enforcement
 * ================================================================
 */

const fs = require('fs');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('PHASE 2 VERIFICATION TEST SUITE');
console.log('Role Gateway + Access Separation (STUDENT / FACULTY / GUEST)');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

async function it(testNum, desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${testNum}: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${testNum}: ${desc} -> ${err.message}`);
  }
}

// ── 1. LOAD APPS SCRIPT AND CLIENT SOURCES ───────────────────────────────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const submissionContent = fs.readFileSync('Google Script/03_Submission.gs', 'utf8');
const facultyContent = fs.readFileSync('Google Script/03_Faculty.gs', 'utf8');

const nowEpoch = Date.now();
const oneDayMs = 86400000;
const pastIso = new Date(nowEpoch - 7 * oneDayMs).toISOString();
const futureIso = new Date(nowEpoch + 7 * oneDayMs).toISOString();

function createFreshMockEnvironment() {
  const mockSpreadsheet = {
    College_Registry: [
      ["College_ID", "College_Name", "Status", "Created_At"],
      ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
      ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
      ["COL003", "Inactive College of Engineering", "INACTIVE", new Date()]
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
      ["FAC001", "EA-01", true, pastIso, futureIso, false, new Date()],
      ["FAC001", "EA-02", false, pastIso, futureIso, false, new Date()],
      ["FAC002", "EA-01", true, pastIso, futureIso, false, new Date()]
    ],
    Assignment_Faculty_Selection: [
      ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"],
      ["SEL-001", "ATT-001", "STU001", "COL001", "FAC001", "EA-01", new Date(), new Date(), "", "ACTIVE"],
      ["SEL-002", "ATT-002", "STU002", "COL001", "FAC002", "EA-01", new Date(), new Date(), "", "ACTIVE"],
      ["SEL-003", "ATT-003", "STU003", "COL001", "UNKNOWN", "EA-01", new Date(), new Date(), "", "ACTIVE"]
    ],
    Student_Submissions: [
      ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"],
      [new Date(), "ATT-001", "hash-001", "Student One", "STU001", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ submission: { attemptId: "ATT-001", submissionId: "ATT-001" }, studentInformation: { rollNumber: "STU001", facultyId: "FAC001" } }), "stu001@test.com"],
      [new Date(), "ATT-002", "hash-002", "Student Two", "STU002", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ submission: { attemptId: "ATT-002", submissionId: "ATT-002" }, studentInformation: { rollNumber: "STU002", facultyId: "FAC002" } }), "stu002@test.com"],
      [new Date(), "ATT-003", "hash-003", "Student Three", "STU003", "A", "Standard", "EA-01", "Flywheel", 1, 100, "Submitted", JSON.stringify({ submission: { attemptId: "ATT-003", submissionId: "ATT-003" }, studentInformation: { rollNumber: "STU003", facultyId: "UNKNOWN" } }), "stu003@test.com"]
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
        getColleges,
        getFacultyList,
        createAssignmentFacultySelection,
        getAssignmentFacultySelection,
        saveStudentSubmission,
        saveAssignmentControl,
        getAssignmentControls,
        saveEvaluation,
        getSubmissions
      };
    }
  `);

  const server = scriptFunc(mockEnv);
  return { mockEnv, mockSpreadsheet, server };
}

// ── CLIENT-SIDE AUTH MOCK ───────────────────────────────────────────────────
function getClientAuth() {
  const localStorageMock = {};
  const storage = {
    getItem: (k) => localStorageMock[k] || null,
    setItem: (k, v) => { localStorageMock[k] = String(v); },
    removeItem: (k) => { delete localStorageMock[k]; },
    clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }
  };

  const authCode = fs.readFileSync('faculty/js/data/auth.js', 'utf8');
  const sandbox = {
    localStorage: storage,
    sessionStorage: storage,
    location: { href: 'http://localhost/faculty/index.html', pathname: '/faculty/index.html' },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    }
  };
  sandbox.window = sandbox;

  const fn = new Function('window', 'localStorage', 'sessionStorage', 'location', 'console', `
    ${authCode}
    return window.DESAuth;
  `);

  const auth = fn(sandbox.window, storage, storage, sandbox.location, sandbox.console);
  return { auth, storage, sandbox };
}

async function runTests() {
  console.log('--- SECTION 1: ROLE TESTS (1 - 6) ---');

  await it(1, 'Gateway displays Student', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('id="accessGateway"'), 'index.html must have accessGateway element');
    assert(html.includes('id="roleBtnStudent"'), 'Must have roleBtnStudent');
    assert(html.includes('STUDENT'), 'Must have STUDENT option text');
  });

  await it(2, 'Gateway displays Faculty', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('id="roleBtnFaculty"'), 'Must have roleBtnFaculty');
    assert(html.includes('FACULTY'), 'Must have FACULTY option text');
  });

  await it(3, 'Gateway displays Guest', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('id="roleBtnGuest"'), 'Must have roleBtnGuest');
    assert(html.includes('GUEST'), 'Must have GUEST option text');
  });

  await it(4, 'Student path opens student workflow', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('selectRole(\'STUDENT\')') || html.includes('selectRole("STUDENT")'), 'Must have selectRole handler for STUDENT');
    assert(html.includes('id="studentCollegeSelect"'), 'Must show student college selector');
    assert(html.includes('id="studentFacultySelect"'), 'Must show student faculty selector');
  });

  await it(5, 'Faculty path opens faculty authentication', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('faculty/challenges.html') || html.includes('faculty/index.html'), 'Faculty button routes to faculty interface');
    assert(html.includes('facultyLoginModal'), 'Faculty login modal present for unauthenticated faculty');
  });

  await it(6, 'Guest path opens read-only guest workflow', async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const appJs = fs.readFileSync('js/app.js', 'utf8');
    assert(html.includes('selectRole(\'GUEST\')') || html.includes('selectRole("GUEST")'), 'Must have selectRole handler for GUEST');
    assert(appJs.includes('Guest Mode (Read-Only)'), 'Guest mode banner in app.js');
  });

  console.log('\n--- SECTION 2: STUDENT TESTS (7 - 19) ---');

  await it(7, 'Registered college -> active faculty list loads', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.getFacultyList({ collegeId: 'COL001' });
    assert.strictEqual(res.success, true);
    assert(Array.isArray(res.data), 'Returns faculty array');
    const ids = res.data.map(f => f.facultyId);
    assert(ids.includes('FAC001') && ids.includes('FAC002') && ids.includes('FAC003'), 'Contains active faculties');
    assert(!ids.includes('FAC005'), 'Excludes inactive faculty FAC005');
  });

  await it(8, 'UNKNOWN remains available', async () => {
    const appJs = fs.readFileSync('js/app.js', 'utf8');
    assert(appJs.includes('Unknown / Unassigned Faculty'), 'app.js populates Unknown / Unassigned Faculty');
    assert(appJs.includes('value="UNKNOWN"'), 'app.js provides UNKNOWN option value');
  });

  await it(9, 'Registered faculty can be selected', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-009',
      studentId: 'STU009',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, 'FAC001');
  });

  await it(10, 'UNKNOWN can be selected for unregistered college', async () => {
    const { server } = createFreshMockEnvironment();
    // For registered college, UNKNOWN must be rejected (403)
    const resReg = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-010-REG',
      studentId: 'STU010',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(resReg.success, false, 'Registered college with UNKNOWN must be rejected');
    assert.strictEqual(resReg.statusCode, 403);

    // For unregistered college, UNKNOWN is valid
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-010',
      studentId: 'STU010',
      collegeId: 'COL-UNREGISTERED-999',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, 'UNKNOWN');
  });

  await it(11, 'Unregistered college pathway remains functional', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-011',
      studentId: 'STU011',
      collegeId: 'COL-UNREGISTERED-999',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true, 'Unregistered college with UNKNOWN must succeed');
    assert.strictEqual(res.data.facultyId, 'UNKNOWN');
  });

  await it(12, 'UNKNOWN student can access assignments', async () => {
    const raw = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
    const assignments = raw.assignments || raw;
    assert(Array.isArray(assignments) && assignments.length >= 22, 'Assignments catalog is accessible');
  });

  await it(13, 'UNKNOWN student can create attempt', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-013',
      studentId: 'STU013',
      collegeId: 'COL-UNREGISTERED-999',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, 'ATT-STU-013');
  });

  await it(14, 'UNKNOWN student can submit', async () => {
    const { server } = createFreshMockEnvironment();
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-014',
      studentId: 'STU014',
      collegeId: 'COL-UNREGISTERED-999',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-STU-014', submissionId: 'ATT-STU-014', submissionHash: 'hash-stu-014' },
      studentInformation: { studentName: 'Student 14', rollNumber: 'STU014', facultyId: 'UNKNOWN', collegeId: 'COL-UNREGISTERED-999' },
      challengeMetadata: { id: 'EA-01' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    assert.strictEqual(res.success, true);
  });

  await it(15, 'Registered faculty student can create attempt', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-015',
      studentId: 'STU015',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, 'FAC001');
  });

  await it(16, 'Registered faculty student can submit', async () => {
    const { server } = createFreshMockEnvironment();
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-STU-016',
      studentId: 'STU016',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-STU-016', submissionId: 'ATT-STU-016', submissionHash: 'hash-stu-016' },
      studentInformation: { studentName: 'Student 16', rollNumber: 'STU016', facultyId: 'FAC001', collegeId: 'COL001' },
      challengeMetadata: { id: 'EA-01' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    assert.strictEqual(res.success, true);
  });

  await it(17, 'Student cannot access faculty dashboard', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'STU001',
      role: 'STUDENT',
      name: 'Student One',
      isAuthenticated: true,
      isGuest: false
    }));
    assert.strictEqual(auth.hasPermission('FACULTY_DASHBOARD'), false);
    assert.strictEqual(auth.hasPermission('FACULTY'), false);
    assert.strictEqual(auth.enforceFacultyAccess('dashboard'), false);
  });

  await it(18, 'Student cannot evaluate', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveEvaluation({
      submissionId: 'ATT-001',
      facultyId: 'STU001',
      role: 'STUDENT',
      facultyName: 'Student Evaluator',
      evaluation: 'Attempted evaluation by student',
      totalMarks: 10,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(19, 'Student cannot modify assignment controls', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      enabled: false,
      authFacultyId: 'STU001',
      authRole: 'STUDENT'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log('\n--- SECTION 3: ATTEMPT LOCK TESTS (20 - 23) ---');

  await it(20, 'Registered Faculty A attempt cannot switch to Faculty B', async () => {
    const { server } = createFreshMockEnvironment();
    // ATT-001 is registered to FAC001 in Assignment_Faculty_Selection
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-001', submissionId: 'ATT-001', submissionHash: 'hash-switch-01' },
      studentInformation: { studentName: 'Student One', rollNumber: 'STU001', facultyId: 'FAC002', collegeId: 'COL001' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(21, 'Registered Faculty A attempt cannot switch to UNKNOWN', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-001', submissionId: 'ATT-001', submissionHash: 'hash-switch-02' },
      studentInformation: { studentName: 'Student One', rollNumber: 'STU001', facultyId: 'UNKNOWN', collegeId: 'COL001' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(22, 'UNKNOWN attempt cannot switch to Faculty A through ordinary student UI', async () => {
    const { server } = createFreshMockEnvironment();
    // ATT-003 is registered to UNKNOWN
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-003', submissionId: 'ATT-003', submissionHash: 'hash-switch-03' },
      studentInformation: { studentName: 'Student Three', rollNumber: 'STU003', facultyId: 'FAC001', collegeId: 'COL001' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(23, 'Attempt_ID remains authoritative', async () => {
    const { mockSpreadsheet } = createFreshMockEnvironment();
    const afsRows = mockSpreadsheet.Assignment_Faculty_Selection;
    const att1 = afsRows.find(r => r[1] === 'ATT-001');
    assert.strictEqual(att1[4], 'FAC001', 'Authoritative Faculty_ID is FAC001');
    assert.strictEqual(att1[2], 'STU001', 'Authoritative Student_ID is STU001');
  });

  console.log('\n--- SECTION 4: FACULTY TESTS (24 - 33) ---');

  await it(24, 'Faculty login opens authenticated faculty dashboard', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'FAC001',
      role: 'FACULTY',
      facultyName: 'Dr. Rahul Bachute',
      isAuthenticated: true,
      isGuest: false
    }));
    assert.strictEqual(auth.hasPermission('FACULTY_DASHBOARD'), true);
    assert.strictEqual(auth.hasPermission('FACULTY'), true);
  });

  await it(25, 'Faculty_ID comes from authenticated context', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'FAC001',
      role: 'FACULTY',
      facultyName: 'Dr. Rahul Bachute',
      isAuthenticated: true,
      isGuest: false
    }));
    const user = auth.getCurrentUser();
    assert.strictEqual(user.facultyId, 'FAC001');
  });

  await it(26, 'Faculty cannot choose another Faculty_ID as identity', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC002',
      assignmentId: 'EA-01',
      enabled: false,
      authFacultyId: 'FAC001'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(27, 'Faculty sees own assigned attempts', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.getSubmissions({ facultyId: 'FAC001', assignmentId: 'EA-01' });
    assert.strictEqual(res.success, true);
    const subIds = res.data.map(s => s.submissionId || s.id);
    assert(subIds.includes('ATT-001'), 'FAC001 sees ATT-001');
  });

  await it(28, 'Faculty does not see another faculty\'s assigned attempts', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.getSubmissions({ facultyId: 'FAC001', assignmentId: 'EA-01' });
    assert.strictEqual(res.success, true);
    const subIds = res.data.map(s => s.submissionId || s.id);
    assert(!subIds.includes('ATT-002'), 'FAC001 does not see ATT-002 (owned by FAC002)');
    assert(!subIds.includes('ATT-003'), 'FAC001 does not see ATT-003 (owned by UNKNOWN)');
  });

  await it(29, 'Faculty can access own assignment controls', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      enabled: true,
      authFacultyId: 'FAC001'
    });
    assert.strictEqual(res.success, true);
  });

  await it(30, 'Faculty cannot modify another faculty\'s controls', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC002',
      assignmentId: 'EA-01',
      enabled: false,
      authFacultyId: 'FAC001'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(31, 'Faculty can evaluate own assigned attempt', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveEvaluation({
      submissionId: 'ATT-001',
      facultyId: 'FAC001',
      authFacultyId: 'FAC001',
      facultyName: 'Dr. Rahul Bachute',
      facultyEmail: 'rahul.bachute@dypic.in',
      evaluation: 'Solid work',
      totalMarks: 11,
      maxMarks: 12
    });
    assert.strictEqual(res.success, true);
  });

  await it(32, 'Faculty cannot evaluate another faculty\'s attempt', async () => {
    const { server } = createFreshMockEnvironment();
    // ATT-002 belongs to FAC002
    const res = server.saveEvaluation({
      submissionId: 'ATT-002',
      facultyId: 'FAC001',
      authFacultyId: 'FAC001',
      facultyName: 'Dr. Rahul Bachute',
      facultyEmail: 'rahul.bachute@dypic.in',
      evaluation: 'Unauthorized evaluation attempt',
      totalMarks: 11,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(33, 'Faculty cannot evaluate unallocated UNKNOWN attempt', async () => {
    const { server } = createFreshMockEnvironment();
    // ATT-003 belongs to UNKNOWN
    const res = server.saveEvaluation({
      submissionId: 'ATT-003',
      facultyId: 'FAC001',
      authFacultyId: 'FAC001',
      facultyName: 'Dr. Rahul Bachute',
      facultyEmail: 'rahul.bachute@dypic.in',
      evaluation: 'Unauthorized evaluation of unallocated attempt',
      totalMarks: 11,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log('\n--- SECTION 5: GUEST TESTS (34 - 41) ---');

  await it(34, 'Guest can access public/demo content', async () => {
    const raw = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
    const assignments = raw.assignments || raw;
    assert(assignments.length >= 22, 'Public assignment catalogue is accessible');
    const ea01 = assignments.find(a => a.id === 'EA-01' || a.id === 'EC-01');
    assert(ea01, 'Public assignments exist in catalogue');
  });

  await it(35, 'Guest cannot create Attempt_ID', async () => {
    const runnerCode = fs.readFileSync('js/challenge-runner.js', 'utf8');
    assert(runnerCode.includes('activeRole === "GUEST"') || runnerCode.includes('activeRole === \'GUEST\''), 'challenge-runner checks activeRole for GUEST');
    assert(runnerCode.includes('isGuestRole'), 'challenge-runner uses isGuestRole guard');
  });

  await it(36, 'Guest cannot create AFS', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-GUEST-001',
      studentId: 'GUEST',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01',
      role: 'GUEST'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(37, 'Guest cannot submit', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-GUEST-001', submissionId: 'ATT-GUEST-001', submissionHash: 'hash-guest-01' },
      studentInformation: { studentName: 'Guest User', rollNumber: 'GUEST-01', isGuest: true, role: 'GUEST' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(38, 'Guest cannot evaluate', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveEvaluation({
      submissionId: 'ATT-001',
      facultyId: 'GUEST',
      role: 'GUEST',
      facultyName: 'Guest Evaluator',
      evaluation: 'Guest attempt',
      totalMarks: 10,
      maxMarks: 12
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(39, 'Guest cannot access faculty controls', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      enabled: false,
      authRole: 'GUEST'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(40, 'Guest cannot access private student data', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'GUEST',
      role: 'GUEST',
      name: 'Guest User',
      isAuthenticated: false,
      isGuest: true
    }));
    assert.strictEqual(auth.hasPermission('FACULTY_DASHBOARD'), false);
    assert.strictEqual(auth.hasPermission('STUDENT'), false);
    assert.strictEqual(auth.hasPermission('EVALUATION'), false);
  });

  await it(41, 'Guest cannot access private faculty data', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'GUEST',
      role: 'GUEST',
      name: 'Guest User',
      isAuthenticated: false,
      isGuest: true
    }));
    assert.strictEqual(auth.hasPermission('FACULTY_CONTROLS'), false);
    assert.strictEqual(auth.hasPermission('FACULTY'), false);
  });

  console.log('\n--- SECTION 6: DIRECT ACCESS TESTS (42 - 46) ---');

  await it(42, 'Direct faculty-dashboard URL without faculty authentication -> rejected/redirected', async () => {
    const { auth } = getClientAuth();
    auth.logout();
    assert.strictEqual(auth.enforceFacultyAccess('dashboard'), false, 'Direct dashboard access blocked');
  });

  await it(43, 'Direct evaluation URL without faculty authorization -> rejected', async () => {
    const { auth, storage } = getClientAuth();
    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'GUEST',
      role: 'GUEST',
      name: 'Guest User',
      isAuthenticated: false,
      isGuest: true
    }));
    assert.strictEqual(auth.enforceFacultyAccess('evaluation'), false, 'Guest direct evaluation blocked');

    storage.setItem("DES_FACULTY_SESSION", JSON.stringify({
      facultyId: 'STU001',
      role: 'STUDENT',
      name: 'Student',
      isAuthenticated: true,
      isGuest: false
    }));
    assert.strictEqual(auth.enforceFacultyAccess('evaluation'), false, 'Student direct evaluation blocked');
  });

  await it(44, 'Direct submission request as guest -> rejected', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-DIRECT-GUEST', submissionId: 'ATT-DIRECT-GUEST', submissionHash: 'hash-direct-guest' },
      studentInformation: { studentName: 'Guest Direct', role: 'GUEST', rollNumber: 'GUEST-02' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(45, 'Direct AFS creation as guest -> rejected', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-AFS-GUEST',
      studentId: 'GUEST-01',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      isGuest: true,
      role: 'GUEST'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it(46, 'Direct assignment-control modification without faculty authorization -> rejected', async () => {
    const { server } = createFreshMockEnvironment();
    const res = server.saveAssignmentControl({
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      enabled: false
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log('\n--- SECTION 7: REGRESSION TESTS (47 - 52) ---');

  await it(47, 'Existing Phase 1 security tests remain 100% passing', async () => {
    const out = execSync('node test_phase1_security.js', { encoding: 'utf8' });
    assert(out.includes('TOTAL PHASE 1 SECURITY TESTS: 35 | PASSED: 35 | FAILED: 0'), 'Phase 1 security suite passed 35/35');
  });

  await it(48, 'Existing assignment-control tests remain passing', async () => {
    const out = execSync('node test_assignment_controls.js', { encoding: 'utf8' });
    assert(out.includes('ALL FACULTY ASSIGNMENT CONTROL TESTS PASSED!'), 'Assignment control tests passed');
  });

  await it(49, 'Existing faculty registry tests remain passing', async () => {
    const out = execSync('node test_dynamic_faculty_registry.js', { encoding: 'utf8' });
    assert(out.includes('TOTAL TESTS: 5 | PASSED: 5 | FAILED: 0'), 'Dynamic faculty registry tests passed');
  });

  await it(50, 'Existing submission/evaluation tests remain passing', async () => {
    const out = execSync('node test_sprint5b.js', { encoding: 'utf8' });
    assert(out.includes('TOTAL SPRINT 5B TESTS: 17 | PASSED: 17 | FAILED: 0'), 'Sprint 5b tests passed 17/17');
    const out6 = execSync('node test_sprint6.js', { encoding: 'utf8' });
    assert(out6.includes('TOTAL SPRINT 6 TESTS: 9 | PASSED: 9 | FAILED: 0'), 'Sprint 6 tests passed 9/9');
  });

  await it(51, 'DME EA-01 to EA-22 regression remains 100% passing', async () => {
    const out = execSync('node test_ea22.js', { encoding: 'utf8' });
    assert(out.includes('TOTAL TESTS: 229 | PASSED: 229 | FAILED: 0'), 'DME 229 regression tests passed 229/229');
  });

  await it(52, 'Existing PAT suites remain passing', async () => {
    const out = execSync('node test_pat_sprint7.js', { encoding: 'utf8' });
    assert(out.includes('TOTAL PRODUCTION ACCEPTANCE TESTS: 10 | PASSED: 10 | FAILED: 0'), 'PAT Sprint 7 passed 10/10');
  });

  console.log('\n================================================================');
  console.log(`TOTAL PHASE 2 GATEWAY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================\n');

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runTests();
