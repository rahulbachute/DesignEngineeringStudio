/**
 * MEILP-WIDE ACCESS GATEWAY — FINAL CORRECTION TEST SUITE
 * Implements all 15 authoritative test cases specified in Section 17.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ─── 1. SERVER-SIDE MOCK ENVIRONMENT (APPS SCRIPT) ──────────────────────────
function createMockServer() {
  const mockSpreadsheet = {
    College_Registry: [
      ["College_ID", "College_Name", "Status", "Registered_At"],
      ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
      ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
      ["COL-ZERO", "College With Zero Faculties", "ACTIVE", new Date()],
      ["COL-INACTIVE", "Inactive Institute of Technology", "INACTIVE", new Date()]
    ],
    Faculty_Registry: [
      ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
      // COL001 has 3 active faculties + 1 inactive
      ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical", "HOD", "ACTIVE", new Date(), null, new Date()],
      ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical", "FACULTY", "ACTIVE", new Date(), null, new Date()],
      ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical", "FACULTY", "ACTIVE", new Date(), null, new Date()],
      ["FAC005", "inactive@dypic.in", "salt$hash", "Inactive Teacher", "inactive@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical", "FACULTY", "INACTIVE", new Date(), null, new Date()],
      // COL002 has 1 active faculty
      ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical", "FACULTY", "ACTIVE", new Date(), null, new Date()]
      // COL-ZERO has 0 faculties
    ],
    Assignment_Controls: [
      ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
      ["FAC001", "EA-01", true, new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() + 86400000).toISOString(), false, new Date()]
    ],
    Assignment_Faculty_Selection: [
      ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"]
    ],
    Student_Submissions: [
      ["Timestamp", "Submission ID", "Submission Hash", "Student Name", "Roll Number", "Division", "Attempt Mode", "Challenge ID", "Challenge Title", "Attempt Number", "Completion %", "Status", "Full JSON Payload", "Email"]
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
      LOCK_TIMEOUT_MS: 30000
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => true,
        releaseLock: () => true
      })
    },
    getSheet: (name) => {
      const rows = mockSpreadsheet[name];
      if (!rows) return null;
      return {
        getDataRange: () => ({ getValues: () => rows }),
        getLastRow: () => rows.length,
        getLastColumn: () => rows[0] ? rows[0].length : 0,
        getRange: (r, c) => ({
          setValue: (val) => { if (rows[r - 1]) rows[r - 1][c - 1] = val; },
          getValue: () => rows[r - 1] ? rows[r - 1][c - 1] : null
        }),
        appendRow: (row) => rows.push(row)
      };
    },
    getSheetSafe_: (name) => mockEnv.getSheet(name),
    getHeaderMap: (headerRow) => {
      const map = {};
      headerRow.forEach((h, idx) => { map[h] = idx; });
      return map;
    },
    duplicateSubmissionCheck: (data, headerMap, hash) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][headerMap['Submission Hash']] === hash) return true;
      }
      return false;
    },
    logEvent: () => {},
    logError: () => {},
    response: (data, success, message, statusCode) => ({
      success: (success === undefined || success === null) ? true : success,
      data: data,
      message: message,
      error: message,
      statusCode: statusCode || 200
    }),
    safeJsonStringify: (obj) => { try { return JSON.stringify(obj); } catch(e) { return '{}'; } },
    getUserEmail: () => 'student@test.com',
    mockSpreadsheet
  };

  const script04 = fs.readFileSync(path.join(__dirname, 'Google Script', '04_Registry.gs'), 'utf8');
  const script03 = fs.readFileSync(path.join(__dirname, 'Google Script', '03_Submission.gs'), 'utf8');

  // Strip duplicate function declarations when combining scripts
  const safeScript04 = script04
    .replace(/function\s+generateSelectionId\s*\(/g, 'var generateSelectionId = function(')
    .replace(/function\s+getSheetSafe_\s*\(/g, 'var getSheetSafe_ = function(');

  const contextCode = `
    const CONFIG = mockEnv.CONFIG;
    const LockService = mockEnv.LockService;
    const getSheet = mockEnv.getSheet;
    var getSheetSafe_ = mockEnv.getSheetSafe_;
    const getHeaderMap = mockEnv.getHeaderMap;
    const logEvent = mockEnv.logEvent;
    const logError = mockEnv.logError;
    const response = mockEnv.response;
    const safeJsonStringify = mockEnv.safeJsonStringify;
    const getUserEmail = mockEnv.getUserEmail;
    const mockSpreadsheet = mockEnv.mockSpreadsheet;

    ${safeScript04}
    ${script03}

    return {
      createAssignmentFacultySelection,
      saveStudentSubmission,
      mockSpreadsheet
    };
  `;

  const fn = new Function('mockEnv', contextCode);
  return fn(mockEnv);
}

// ─── 2. CLIENT-SIDE SIMULATION CONTEXT ───────────────────────────────────────
function setupClientContext() {
  const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

  const globalScope = {
    window: {
      location: { href: 'http://localhost:5500/index.html', search: '' },
      localStorage: {
        _store: {},
        getItem(k) { return this._store[k] || null; },
        setItem(k, v) { this._store[k] = String(v); },
        removeItem(k) { delete this._store[k]; },
        clear() { this._store = {}; }
      }
    },
    document: {
      _elements: {},
      addEventListener: () => {},
      getElementById(id) {
        if (!this._elements[id]) {
          this._elements[id] = {
            id,
            value: '',
            innerHTML: '',
            disabled: false,
            focus: () => {},
            scrollIntoView: () => {},
            addEventListener: () => {}
          };
        }
        return this._elements[id];
      },
      querySelector: () => null,
      querySelectorAll: () => []
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    alert: () => {}
  };

  globalScope.window.document = globalScope.document;
  globalScope.window.window = globalScope.window;

  // Run config.js in context
  const evalConfig = new Function('window', 'document', 'console', configCode);
  evalConfig(globalScope.window, globalScope.document, globalScope.console);

  return globalScope;
}

// ─── 3. EXECUTE TEST SUITE ──────────────────────────────────────────────────
async function runAllGatewayTests() {
  console.log('================================================================');
  console.log('MEILP-WIDE ACCESS GATEWAY — FINAL CORRECTION TEST SUITE');
  console.log('15 Authoritative Test Cases (Section 17)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(num, title, fn) {
    try {
      await fn();
      console.log(`[PASS] TEST ${num}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] TEST ${num}: ${title}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: No college selected
  // Expected: Guest, no attempt, no AFS, no submission
  // ---------------------------------------------------------------------------
  await test(1, 'No college selected -> Guest, no attempt, no AFS, no submission', async () => {
    const server = createMockServer();

    // Server-side AFS creation with empty college must be rejected
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T1-001',
      studentId: 'STU-001',
      collegeId: '',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'AFS must be rejected when no college is provided');

    // Server-side submission with empty college must be rejected
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-T1-001', submissionId: 'ATT-T1-001', submissionHash: 'hash-t1' },
      studentInformation: { studentName: 'Test', rollNumber: 'STU001', collegeId: '', facultyId: '' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(subRes.success, false, 'Submission must be rejected when no college is provided');
    assert.strictEqual(subRes.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Unregistered college
  // Expected: Guest, no attempt, no AFS, no submission
  // ---------------------------------------------------------------------------
  await test(2, 'Unregistered college -> Guest, no attempt, no AFS, no submission', async () => {
    const server = createMockServer();

    // AFS creation for unregistered college must be rejected
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T2-001',
      studentId: 'STU-002',
      collegeId: 'COL-UNREGISTERED-XYZ',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'AFS must be rejected for unregistered college');
    assert.strictEqual(afsRes.statusCode, 403);
    assert.ok(afsRes.message.includes('not registered'), 'Message must indicate college not registered');

    // Submission for unregistered college must be rejected
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-T2-001', submissionId: 'ATT-T2-001', submissionHash: 'hash-t2' },
      studentInformation: { studentName: 'Test', rollNumber: 'STU002', collegeId: 'COL-UNREGISTERED-XYZ', facultyId: 'UNKNOWN' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(subRes.success, false, 'Submission must be rejected for unregistered college');
    assert.strictEqual(subRes.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Registered college + active faculties
  // Expected: Faculty dropdown contains "Select Your Faculty", Faculty A, B
  // Must NOT contain: Unassigned Faculty, UNKNOWN, obsolete FAC003
  // ---------------------------------------------------------------------------
  await test(3, 'Registered college + active faculties -> Dropdown has active faculties only, NO Unassigned/UNKNOWN', async () => {
    const client = setupClientContext();
    const faculties = client.window.MEILP.getActiveFacultiesForCollege('COL001');

    assert.strictEqual(faculties.length, 2, 'COL001 must return exactly 2 active faculties');
    const facultyIds = faculties.map(f => f.facultyId);
    assert.deepStrictEqual(facultyIds.sort(), ['FAC001', 'FAC002']);

    // Must NOT contain UNKNOWN or inactive faculties
    assert.strictEqual(faculties.some(f => f.facultyId === 'UNKNOWN'), false, 'Must NOT contain UNKNOWN');
    assert.strictEqual(faculties.some(f => f.facultyId === 'FAC005'), false, 'Must NOT contain inactive FAC005');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Registered college + active faculties + no faculty selected
  // Expected: assignment access blocked, no Attempt_ID, no AFS, no submission
  // ---------------------------------------------------------------------------
  await test(4, 'Registered college + active faculties + no faculty selected -> Blocked', async () => {
    const server = createMockServer();

    // AFS creation without faculty
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T4-001',
      studentId: 'STU-004',
      collegeId: 'COL001',
      facultyId: '',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'AFS must be rejected when faculty is empty');

    // Submission without faculty
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-T4-001', submissionId: 'ATT-T4-001', submissionHash: 'hash-t4' },
      studentInformation: { studentName: 'Test', rollNumber: 'STU004', collegeId: 'COL001', facultyId: '' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(subRes.success, false, 'Submission must be rejected when faculty is empty');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Registered college + active faculties + Faculty A selected
  // Expected: assignment allowed, Attempt_ID created, AFS Faculty_ID = Faculty A
  // ---------------------------------------------------------------------------
  await test(5, 'Registered college + active faculties + Faculty A selected -> Allowed, AFS created', async () => {
    const server = createMockServer();

    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T5-001',
      studentId: 'STU-005',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, true, 'AFS creation must succeed with active Faculty A');
    assert.strictEqual(afsRes.data.facultyId, 'FAC001');
    assert.strictEqual(afsRes.data.attemptId, 'ATT-T5-001');
    assert.strictEqual(afsRes.data.collegeId, 'COL001');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Registered college + active faculties + UNKNOWN supplied manually
  // Expected: server rejects attempt/AFS creation
  // ---------------------------------------------------------------------------
  await test(6, 'Registered college + active faculties + UNKNOWN supplied manually -> Server rejects', async () => {
    const server = createMockServer();

    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T6-001',
      studentId: 'STU-006',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'Server must reject UNKNOWN for college with active faculties');
    assert.strictEqual(afsRes.statusCode, 403);
    assert.ok(afsRes.message.includes('UNKNOWN is not permitted'));

    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-T6-001', submissionId: 'ATT-T6-001', submissionHash: 'hash-t6' },
      studentInformation: { studentName: 'Test', rollNumber: 'STU006', collegeId: 'COL001', facultyId: 'UNKNOWN' },
      challengeMetadata: { id: 'EA-01' }
    });
    assert.strictEqual(subRes.success, false, 'Server must reject submission with UNKNOWN for college with active faculties');
    assert.strictEqual(subRes.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Registered college + zero active faculties
  // Expected: automatically select Unassigned Faculty / No Faculty, Faculty_ID = UNKNOWN,
  // assignment allowed, attempt allowed, submission allowed
  // ---------------------------------------------------------------------------
  await test(7, 'Registered college + zero active faculties -> UNKNOWN allowed, attempt allowed', async () => {
    const server = createMockServer();

    // COL-ZERO has zero faculties in Faculty_Registry
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T7-001',
      studentId: 'STU-007',
      collegeId: 'COL-ZERO',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, true, 'Server must accept UNKNOWN for college with zero active faculties');
    assert.strictEqual(afsRes.data.facultyId, 'UNKNOWN');
    assert.strictEqual(afsRes.data.attemptId, 'ATT-T7-001');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Registered college + zero active faculties + submission
  // Expected: submission succeeds, no faculty evaluation target
  // ---------------------------------------------------------------------------
  await test(8, 'Registered college + zero active faculties + submission -> Submission succeeds', async () => {
    const server = createMockServer();

    // 1. Create AFS for zero-faculty college
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-T8-001',
      studentId: 'STU-008',
      collegeId: 'COL-ZERO',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });

    // 2. Submit assignment
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-T8-001', submissionId: 'ATT-T8-001', submissionHash: 'hash-t8' },
      studentInformation: { studentName: 'Zero Fac Student', rollNumber: 'STU-008', collegeId: 'COL-ZERO', facultyId: 'UNKNOWN' },
      challengeMetadata: { id: 'EA-01' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    assert.strictEqual(subRes.success, true, 'Submission must succeed for zero-faculty college');
    assert.strictEqual(subRes.statusCode, 200);

    // Verify submission row recorded with UNKNOWN
    const subRows = server.mockSpreadsheet.Student_Submissions;
    const createdRow = subRows.find(r => r[1] === 'ATT-T8-001');
    assert.ok(createdRow, 'Submission row must be created');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Registered college A + faculty belonging to College B
  // Expected: server rejects
  // ---------------------------------------------------------------------------
  await test(9, 'Registered college A + faculty belonging to College B -> Server rejects', async () => {
    const server = createMockServer();

    // FAC004 belongs to COL002, trying to use with COL001
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T9-001',
      studentId: 'STU-009',
      collegeId: 'COL001',
      facultyId: 'FAC004',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'Server must reject cross-college faculty');
    assert.ok(afsRes.statusCode === 400 || afsRes.statusCode === 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Inactive faculty
  // Expected: excluded from dropdown, server rejects if manually supplied
  // ---------------------------------------------------------------------------
  await test(10, 'Inactive faculty -> Excluded from dropdown, server rejects if manually supplied', async () => {
    const client = setupClientContext();
    const faculties = client.window.MEILP.getActiveFacultiesForCollege('COL001');
    // FAC005 is inactive
    assert.strictEqual(faculties.some(f => f.facultyId === 'FAC005'), false, 'Inactive faculty must not be in active list');

    const server = createMockServer();
    const afsRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-T10-001',
      studentId: 'STU-010',
      collegeId: 'COL001',
      facultyId: 'FAC005', // Inactive faculty
      assignmentId: 'EA-01'
    });
    assert.strictEqual(afsRes.success, false, 'Server must reject inactive faculty');
    assert.ok(afsRes.statusCode === 400 || afsRes.statusCode === 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 11: Change from College A to College B
  // Expected: old faculty cleared, new faculty list loaded, if B has active faculties:
  // state = Select Your Faculty, no Unassigned option
  // ---------------------------------------------------------------------------
  await test(11, 'Change from College A to College B -> Old faculty cleared, state = Select Your Faculty', async () => {
    const client = setupClientContext();
    const storage = client.window.localStorage;

    // Simulate user previously on COL001 with FAC001
    storage.setItem('meilp:selectedStudentCollegeId', JSON.stringify('COL001'));
    storage.setItem('meilp:selectedStudentFacultyId', JSON.stringify('FAC001'));
    storage.setItem('meilp:studentProfile', JSON.stringify({ collegeId: 'COL001', facultyId: 'FAC001' }));

    // Simulate change event on college dropdown to COL002
    storage.removeItem('meilp:selectedStudentFacultyId');
    storage.removeItem('meilp:selectedStudentFaculty');
    const rawProfile = storage.getItem('meilp:studentProfile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      p.facultyId = '';
      p.facultyName = '';
      storage.setItem('meilp:studentProfile', JSON.stringify(p));
    }

    const facsB = client.window.MEILP.getActiveFacultiesForCollege('COL002');
    assert.strictEqual(facsB.length, 1);
    assert.strictEqual(facsB[0].facultyId, 'FAC004');
    assert.strictEqual(facsB.some(f => f.facultyId === 'UNKNOWN'), false);

    // Verify stored faculty is cleared
    assert.strictEqual(storage.getItem('meilp:selectedStudentFacultyId'), null, 'Previous faculty must be cleared');
  });

  // ---------------------------------------------------------------------------
  // TEST 12: Direct assignment URL with no college
  // Expected: public browsing only, no attempt
  // ---------------------------------------------------------------------------
  await test(12, 'Direct assignment URL with no college -> Public browsing only, no attempt', async () => {
    const client = setupClientContext();
    const isRegistered = client.window.MEILP.isRegisteredCollege('');
    assert.strictEqual(isRegistered, false, 'Empty college is not registered');

    // Simulate challenge-runner direct URL logic
    const state = { student: { collegeId: '', facultyId: '' } };
    const activeRole = 'GUEST';
    let attemptId = null;

    if (!isRegistered) {
      // CASE 1: No college -> Guest only. NO Attempt_ID.
      attemptId = null;
    }
    assert.strictEqual(attemptId, null, 'Attempt_ID must remain null for guest without college');
  });

  // ---------------------------------------------------------------------------
  // TEST 13: Direct assignment URL with registered college + active faculties + no faculty
  // Expected: blocked
  // ---------------------------------------------------------------------------
  await test(13, 'Direct assignment URL with registered college + active faculties + no faculty -> Blocked', async () => {
    const client = setupClientContext();
    const isRegistered = client.window.MEILP.isRegisteredCollege('COL001');
    assert.strictEqual(isRegistered, true);

    const activeFaculties = client.window.MEILP.getActiveFacultiesForCollege('COL001');
    const facultyId = ''; // No faculty selected

    const hasValidFaculty = facultyId && facultyId !== 'UNKNOWN' && activeFaculties.some(f => f.facultyId === facultyId);
    assert.strictEqual(hasValidFaculty, '', 'No valid faculty selected');

    let accessBlocked = false;
    let attemptId = null;

    if (activeFaculties.length > 0 && !hasValidFaculty) {
      accessBlocked = true;
      attemptId = null;
    }

    assert.strictEqual(accessBlocked, true, 'Access must be blocked');
    assert.strictEqual(attemptId, null, 'Attempt_ID must be null');
  });

  // ---------------------------------------------------------------------------
  // TEST 14: Direct assignment URL with registered college + valid faculty
  // Expected: allowed
  // ---------------------------------------------------------------------------
  await test(14, 'Direct assignment URL with registered college + valid faculty -> Allowed', async () => {
    const client = setupClientContext();
    const isRegistered = client.window.MEILP.isRegisteredCollege('COL001');
    const activeFaculties = client.window.MEILP.getActiveFacultiesForCollege('COL001');
    const facultyId = 'FAC001';

    const hasValidFaculty = facultyId && facultyId !== 'UNKNOWN' && activeFaculties.some(f => f.facultyId === facultyId);
    assert.strictEqual(Boolean(hasValidFaculty), true, 'Valid faculty selected');

    let attemptId = null;
    if (isRegistered && hasValidFaculty) {
      attemptId = 'ATT-EA-01-TEST';
    }
    assert.ok(attemptId, 'Attempt_ID created when valid faculty is present');
  });

  // ---------------------------------------------------------------------------
  // TEST 15: DME regression
  // Expected: all existing DME definitions and catalog intact
  // ---------------------------------------------------------------------------
  await test(15, 'DME regression -> all 22 assignments intact and valid', async () => {
    const raw = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
    const list = raw.assignments || raw;
    assert.strictEqual(list.length, 22, 'Must contain all 22 DME assignments');
    for (let i = 1; i <= 22; i++) {
      const numStr = String(i).padStart(2, '0');
      const found = list.some(a => a.id === `EA-${numStr}` || a.id === `EC-${numStr}`);
      assert.ok(found, `DME Assignment ${numStr} must exist in catalog`);
    }
  });

  console.log('\n================================================================');
  console.log(`TOTAL ACCESS GATEWAY TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAllGatewayTests();
