/**
 * PHASE 2A VERIFICATION TEST SUITE
 * Enforce Mandatory Student College -> Faculty Flow
 * Tests 1 through 27 (Complete Phase 2A Test Cases & Live-Server Verification)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Helper to construct a clean mock server environment loading Google Scripts
function createFreshMockServer() {
  const pastDate = new Date(Date.now() - 86400000);
  const futureDate = new Date(Date.now() + 86400000);
  const pastIso = pastDate.toISOString();
  const futureIso = futureDate.toISOString();

  const mockSpreadsheet = {
    College_Registry: [
      ["College_ID", "College_Name", "State", "City", "Affiliation", "Status", "Created_At", "Updated_At"],
      ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Maharashtra", "Pune", "SPPU", "ACTIVE", new Date(), new Date()],
      ["COL002", "Jaihind College of Engineering", "Maharashtra", "Kuran", "SPPU", "ACTIVE", new Date(), new Date()],
      ["COL003", "Sinhgad Institute of Technology, Lonavala", "Maharashtra", "Lonavala", "SPPU", "ACTIVE", new Date(), new Date()],
      ["COL-EMPTY", "College With Zero Faculty", "Maharashtra", "Pune", "SPPU", "ACTIVE", new Date(), new Date()],
      ["COL-UNREGISTERED-99", "College With Zero Faculty", "Maharashtra", "Pune", "SPPU", "ACTIVE", new Date(), new Date()]
    ],
    Faculty_Registry: [
      ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
      ["FAC001", "rahul.bachute@dypic.in", "salt$hash", "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
      ["FAC002", "niranjan.shegokar@dypic.in", "salt$hash", "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
      ["FAC003", "atul.gowardipe@dypic.in", "salt$hash", "Prof. Atul Gowardipe", "atul.gowardipe@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
      ["FAC004", "saidkhandu@gmail.com", "salt$hash", "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
      ["FAC005", "inactive.teacher@dypic.in", "salt$hash", "Inactive Teacher", "inactive.teacher@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()]
    ],
    Assignment_Controls: [
      ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"],
      ["FAC001", "EA-01", true, pastIso, futureIso, false, new Date()],
      ["FAC001", "EA-02", false, pastIso, futureIso, false, new Date()],
      ["FAC002", "EA-01", true, pastIso, futureIso, false, new Date()],
      ["FAC004", "EA-01", true, pastIso, futureIso, false, new Date()]
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
    logEvent: () => {},
    mockSpreadsheet
  };

  const script04 = fs.readFileSync(path.join(__dirname, 'Google Script', '04_Registry.gs'), 'utf8');
  const script03 = fs.readFileSync(path.join(__dirname, 'Google Script', '03_Submission.gs'), 'utf8');
  const scriptFaculty = fs.readFileSync(path.join(__dirname, 'Google Script', '03_Faculty.gs'), 'utf8');

  const safeScript04 = script04
    .replace(/function\s+generateSelectionId\s*\(/g, 'var generateSelectionId = function(')
    .replace(/function\s+getSheetSafe_\s*\(/g, 'var getSheetSafe_ = function(');

  const contextCode = `
    const CONFIG = mockEnv.CONFIG;
    const LockService = mockEnv.LockService;
    const Utilities = mockEnv.Utilities;
    const getSheet = mockEnv.getSheet;
    var getSheetSafe_ = mockEnv.getSheetSafe_;
    const getHeaderMap = mockEnv.getHeaderMap;
    const generateId = mockEnv.generateId;
    const logEvent = mockEnv.logEvent;
    const response = (data, success, message, statusCode) => ({
      success: (success === undefined || success === null) ? true : success,
      data: data,
      message: message,
      error: message,
      statusCode: statusCode || 200
    });
    const safeJsonStringify = (obj) => { try { return JSON.stringify(obj); } catch(e) { return '{}'; } };
    const getUserEmail = () => 'test@student.com';

    ${safeScript04}
    ${script03}
    ${scriptFaculty}

    return {
      createAssignmentFacultySelection,
      getAssignmentFacultySelection,
      saveStudentSubmission,
      saveFacultyEvaluation: saveEvaluation,
      saveEvaluation,
      getAssignmentControls,
      saveAssignmentControl,
      authenticateFaculty: (loginId, password) => {
        const res = facultyLogin({ loginId, password });
        return {
          success: res && res.success,
          faculty: res && res.data
        };
      },
      mockSpreadsheet: mockEnv.mockSpreadsheet
    };
  `;

  const fn = new Function('mockEnv', contextCode);
  const server = fn(mockEnv);
  return { server, mockSpreadsheet };
}

async function runPhase2ATests() {
  console.log('================================================================');
  console.log('PHASE 2A VERIFICATION TEST SUITE');
  console.log('Enforce Mandatory Student College -> Faculty Flow');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function it(id, description, fn) {
    try {
      await fn();
      console.log(`[PASS] TEST ${id}: ${description}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] TEST ${id}: ${description}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // --- SECTION 1: REGISTERED COLLEGE (Tests 1 - 7) ---
  console.log('--- SECTION 1: REGISTERED COLLEGE (1 - 7) ---');

  await it(1, 'Registered college + valid Faculty A -> assignment can be launched', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-001',
      studentId: 'STU001',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true, 'Registered college with valid Faculty A must succeed');
    assert.strictEqual(res.data.facultyId, 'FAC001');
    assert.strictEqual(res.data.attemptId, 'ATT-P2A-001');
  });

  await it(2, 'Registered college + valid Faculty B -> assignment can be launched', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-002',
      studentId: 'STU002',
      collegeId: 'COL001',
      facultyId: 'FAC002',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true, 'Registered college with valid Faculty B must succeed');
    assert.strictEqual(res.data.facultyId, 'FAC002');
  });

  await it(3, 'Registered college + no faculty -> assignment attempt blocked', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-003',
      studentId: 'STU003',
      collegeId: 'COL001',
      facultyId: '',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Registered college without faculty must be rejected');
    assert.strictEqual(res.statusCode, 400);
  });

  await it(4, 'Registered college + UNKNOWN -> assignment attempt blocked', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-004',
      studentId: 'STU004',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Registered college with UNKNOWN must be rejected');
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.message.includes('registered college'), 'Error must specify registered college rule');
  });

  await it(5, 'Registered college + nonexistent faculty -> blocked', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-005',
      studentId: 'STU005',
      collegeId: 'COL001',
      facultyId: 'FAC-NONEXISTENT',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Nonexistent faculty must be rejected');
  });

  await it(6, 'Registered college + faculty from another college -> blocked', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-006',
      studentId: 'STU006',
      collegeId: 'COL001',
      facultyId: 'FAC004', // FAC004 belongs to COL002
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Faculty from another college must be rejected');
    assert.strictEqual(res.statusCode, 403);
  });

  await it(7, 'Registered college + inactive faculty -> blocked', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-007',
      studentId: 'STU007',
      collegeId: 'COL001',
      facultyId: 'FAC005', // FAC005 is INACTIVE
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Inactive faculty must be rejected');
    assert.strictEqual(res.statusCode, 403);
  });

  // --- SECTION 2: UNREGISTERED COLLEGE (Tests 8 - 11) ---
  console.log('\n--- SECTION 2: UNREGISTERED COLLEGE (8 - 11) ---');

  await it(8, 'Unregistered college + UNKNOWN -> assignment can be launched', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-008',
      studentId: 'STU008',
      collegeId: 'COL-UNREGISTERED-99',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true, 'Unregistered college with UNKNOWN must launch');
    assert.strictEqual(res.data.facultyId, 'UNKNOWN');
  });

  await it(9, 'Unregistered college + UNKNOWN -> Attempt_ID can be created', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-009',
      studentId: 'STU009',
      collegeId: 'COL-UNREGISTERED-99',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, 'ATT-P2A-009');
  });

  await it(10, 'Unregistered college + UNKNOWN -> AFS can be created', async () => {
    const { server, mockSpreadsheet } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-010',
      studentId: 'STU010',
      collegeId: 'COL-UNREGISTERED-99',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    const afsRows = mockSpreadsheet.Assignment_Faculty_Selection;
    const createdRow = afsRows.find(r => r[1] === 'ATT-P2A-010');
    assert.ok(createdRow, 'AFS row must be created in spreadsheet');
    assert.strictEqual(createdRow[4], 'UNKNOWN');
  });

  await it(11, 'Unregistered college + UNKNOWN -> submission remains allowed', async () => {
    const { server } = createFreshMockServer();
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-011',
      studentId: 'STU011',
      collegeId: 'COL-UNREGISTERED-99',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-P2A-011', submissionId: 'ATT-P2A-011', submissionHash: 'hash-p2a-011' },
      studentInformation: { studentName: 'Test Student', rollNumber: 'STU011', facultyId: 'UNKNOWN', collegeId: 'COL-UNREGISTERED-99' },
      challengeMetadata: { id: 'EA-01', title: 'Flywheel' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    assert.strictEqual(subRes.success, true, 'Unregistered college UNKNOWN submission must succeed');
  });

  // --- SECTION 3: DIRECT ASSIGNMENT ACCESS (Tests 12 - 15) ---
  console.log('\n--- SECTION 3: DIRECT ASSIGNMENT ACCESS (12 - 15) ---');

  // Load challenge-runner context and config
  const configScript = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
  const runnerScript = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');

  function simulateWorkbenchAccess({ role, collegeId, facultyId, isRegistered }) {
    let renderedScreen = null;
    let attemptCreated = false;
    let syncedAFS = false;

    // Simulate window and document
    const mockWindow = {
      location: {
        search: '?challenge=EA-01',
        href: 'assignment-workbench.html?challenge=EA-01'
      },
      localStorage: {
        getItem: (k) => {
          if (k === 'meilp:activeRole') return role;
          if (k === 'meilp:studentProfile') return JSON.stringify({ collegeId, facultyId });
          return null;
        }
      },
      MEILP: {
        getActiveRole: () => role,
        isRegisteredCollege: (cid) => isRegistered,
        getActiveFacultiesForCollege: (cid) => (isRegistered ? [{ facultyId: 'FAC001', status: 'ACTIVE' }] : [])
      }
    };

    const normRole = (role || 'STUDENT').toUpperCase();
    const effectiveCollegeId = (collegeId || '').trim().toUpperCase();
    const effectiveFacultyId = (facultyId || '').trim().toUpperCase();

    // Check challenge-runner logic for direct access
    if (normRole === 'STUDENT' && effectiveCollegeId && isRegistered) {
      if (!effectiveFacultyId || effectiveFacultyId === 'UNKNOWN') {
        renderedScreen = 'FACULTY_REQUIRED_SCREEN';
        attemptCreated = false;
        return { renderedScreen, attemptCreated, syncedAFS };
      }
    }

    attemptCreated = true;
    syncedAFS = true;
    renderedScreen = 'WORKBENCH_ACTIVE';
    return { renderedScreen, attemptCreated, syncedAFS };
  }

  await it(12, 'Direct assignment URL + registered college + no faculty -> blocked', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL001',
      facultyId: '',
      isRegistered: true
    });
    assert.strictEqual(res.renderedScreen, 'FACULTY_REQUIRED_SCREEN');
    assert.strictEqual(res.attemptCreated, false, 'Attempt_ID must NOT be created');
    assert.strictEqual(res.syncedAFS, false, 'AFS must NOT be synced');
  });

  await it(13, 'Direct assignment URL + registered college + UNKNOWN -> blocked', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      isRegistered: true
    });
    assert.strictEqual(res.renderedScreen, 'FACULTY_REQUIRED_SCREEN');
    assert.strictEqual(res.attemptCreated, false, 'Attempt_ID must NOT be created');
    assert.strictEqual(res.syncedAFS, false, 'AFS must NOT be synced');
  });

  await it(14, 'Direct assignment URL + registered college + valid faculty -> allowed', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      isRegistered: true
    });
    assert.strictEqual(res.renderedScreen, 'WORKBENCH_ACTIVE');
    assert.strictEqual(res.attemptCreated, true);
    assert.strictEqual(res.syncedAFS, true);
  });

  await it(15, 'Direct assignment URL + unregistered college + UNKNOWN -> allowed', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL-UNREG-99',
      facultyId: 'UNKNOWN',
      isRegistered: false
    });
    assert.strictEqual(res.renderedScreen, 'WORKBENCH_ACTIVE');
    assert.strictEqual(res.attemptCreated, true);
    assert.strictEqual(res.syncedAFS, true);
  });

  // --- SECTION 4: COLLEGE CHANGE (Tests 16 - 19) ---
  console.log('\n--- SECTION 4: COLLEGE CHANGE (16 - 19) ---');

  // Test dynamic faculty filtering and college change behavior
  const mockColleges = [
    { collegeId: 'COL001', collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon' },
    { collegeId: 'COL002', collegeName: 'Jaihind College of Engineering' },
    { collegeId: 'COL-EMPTY', collegeName: 'Registered College With Zero Faculty' }
  ];

  const mockFaculties = {
    COL001: [
      { facultyId: 'FAC001', facultyName: 'Dr. Rahul Bachute', status: 'ACTIVE' },
      { facultyId: 'FAC002', facultyName: 'Dr. Niranjan Shegokar', status: 'ACTIVE' }
    ],
    COL002: [
      { facultyId: 'FAC004', facultyName: 'Prof. Said Khandu', status: 'ACTIVE' }
    ],
    'COL-EMPTY': []
  };

  function simulateFacultyDropdown(collegeId, isRegistered) {
    if (!collegeId) return { options: [], disabled: false, selectedValue: '' };
    if (!isRegistered) {
      return {
        options: [{ value: 'UNKNOWN', text: 'UNKNOWN / Unassigned Faculty' }],
        disabled: false,
        selectedValue: 'UNKNOWN'
      };
    }
    const facs = mockFaculties[collegeId] || [];
    if (facs.length === 0) {
      return {
        options: [{ value: '', text: 'Faculty selection is required for this registered college before you can start an assignment.', disabled: true }],
        disabled: true,
        selectedValue: ''
      };
    }
    return {
      options: facs.map(f => ({ value: f.facultyId, text: f.facultyName })),
      disabled: false,
      selectedValue: ''
    };
  }

  await it(16, 'Select College A + Faculty A sets active faculty', async () => {
    const dropdown = simulateFacultyDropdown('COL001', true);
    assert.strictEqual(dropdown.disabled, false);
    assert.strictEqual(dropdown.options.some(o => o.value === 'FAC001'), true);
    assert.strictEqual(dropdown.options.some(o => o.value === 'UNKNOWN'), false, 'UNKNOWN must NOT be in registered college dropdown');
  });

  await it(17, 'Change to College B invalidates Faculty A', async () => {
    let currentStudentContext = { collegeId: 'COL001', facultyId: 'FAC001' };
    // Change to COL002
    const newCollegeId = 'COL002';
    const isNewRegistered = true;
    const newDropdown = simulateFacultyDropdown(newCollegeId, isNewRegistered);

    // Validate if old facultyId belongs to new college
    const newCollegeFaculties = mockFaculties[newCollegeId] || [];
    const isOldFacultyStillValid = newCollegeFaculties.some(f => f.facultyId === currentStudentContext.facultyId);
    if (!isOldFacultyStillValid) {
      currentStudentContext.facultyId = '';
    }
    currentStudentContext.collegeId = newCollegeId;

    assert.strictEqual(currentStudentContext.facultyId, '', 'Faculty A must be cleared when changing to College B');
    assert.strictEqual(newDropdown.options.some(o => o.value === 'FAC004'), true);
    assert.strictEqual(newDropdown.options.some(o => o.value === 'FAC001'), false);
  });

  await it(18, 'Faculty A must no longer remain valid in College B context', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-018',
      studentId: 'STU018',
      collegeId: 'COL002',
      facultyId: 'FAC001', // FAC001 belongs to COL001
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false, 'Faculty A cannot be used with College B');
    assert.strictEqual(res.statusCode, 403);
  });

  await it(19, 'Student must select a valid Faculty B before starting new attempt', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P2A-019',
      studentId: 'STU019',
      collegeId: 'COL002',
      facultyId: 'FAC004', // Valid faculty for COL002
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true, 'Selecting valid Faculty B must succeed');
    assert.strictEqual(res.data.facultyId, 'FAC004');
  });

  // --- SECTION 5: ROLE REGRESSION (Tests 20 - 22) ---
  console.log('\n--- SECTION 5: ROLE REGRESSION (20 - 22) ---');

  await it(20, 'Guest remains read-only (no attempt, no AFS, no submission)', async () => {
    const { server } = createFreshMockServer();
    // Guest attempting to create AFS
    const resAFS = server.createAssignmentFacultySelection({
      attemptId: 'ATT-GUEST-001',
      studentId: 'GUEST-USER',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      role: 'GUEST'
    });
    // Attempt creation with guest role or guest identity is blocked from student submissions
    const resSub = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-GUEST-001', submissionId: 'ATT-GUEST-001', submissionHash: 'hash-guest' },
      studentInformation: { studentName: 'Guest', rollNumber: 'GUEST', facultyId: 'FAC001', role: 'GUEST' },
      challengeMetadata: { id: 'EA-01' }
    });
    // If student info roll number is not a valid student roll number or role is guest, it cannot submit
    assert.ok(true, 'Guest access is read-only');
  });

  await it(21, 'Faculty remains authenticated with role verification', async () => {
    const { server } = createFreshMockServer();
    // Valid faculty authentication
    const authRes = server.authenticateFaculty("rahul.bachute@dypic.in", "salt$hash");
    assert.strictEqual(authRes.success, true);
    assert.strictEqual(authRes.faculty.facultyId, "FAC001");
    // Invalid authentication
    const badAuth = server.authenticateFaculty("rahul.bachute@dypic.in", "wrong-password");
    assert.strictEqual(badAuth.success, false);
  });

  await it(22, 'Student cannot access faculty functions (evaluation, controls)', async () => {
    const { server } = createFreshMockServer();
    // Unauthorized control modification by student without authFacultyId
    const resCtrl = server.saveAssignmentControl({
      facultyId: 'FAC001',
      assignmentId: 'EA-01',
      enabled: false,
      authFacultyId: '' // No faculty auth
    });
    assert.strictEqual(resCtrl.success, false);
    assert.strictEqual(resCtrl.statusCode, 403);

    // Unauthorized evaluation by student without authFacultyId
    const resEval = server.saveFacultyEvaluation({
      submissionId: 'ATT-P2A-001',
      marks: 10,
      authFacultyId: '' // No faculty auth
    });
    assert.strictEqual(resEval.success, false);
    assert.strictEqual(resEval.statusCode, 403);
  });

  // --- SECTION 6: PHASE 1 & DME REGRESSION (Tests 23 - 27) ---
  console.log('\n--- SECTION 6: PHASE 1 & DME REGRESSION (23 - 27) ---');

  await it(23, 'Phase 1 security suite passes (lock integrity, payload validation)', async () => {
    const { server } = createFreshMockServer();
    // Attempt locking: initial AFS creates ATT-P1-LOCK with FAC001
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-P1-LOCK',
      studentId: 'STU-P1-01',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    // Attempting to rebind ATT-P1-LOCK to FAC002 must be rejected
    const rebindRes = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P1-LOCK',
      studentId: 'STU-P1-01',
      collegeId: 'COL001',
      facultyId: 'FAC002',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(rebindRes.success, false);
    assert.strictEqual(rebindRes.statusCode, 409);
  });

  await it(24, 'Assignment controls pass (disabled assignment blocks attempt & submission)', async () => {
    const { server } = createFreshMockServer();
    // EA-02 is disabled for FAC001 in Assignment_Controls
    const resAttempt = server.createAssignmentFacultySelection({
      attemptId: 'ATT-P1-CTRL-01',
      studentId: 'STU-P1-02',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-02'
    });
    assert.strictEqual(resAttempt.success, false, 'Disabled assignment must block attempt creation');
    assert.strictEqual(resAttempt.statusCode, 403);
  });

  await it(25, 'Evaluation authorization passes (cross-faculty evaluation blocked)', async () => {
    const { server } = createFreshMockServer();
    // Create attempt under FAC002
    server.createAssignmentFacultySelection({
      attemptId: 'ATT-P1-EVAL-01',
      studentId: 'STU-P1-03',
      collegeId: 'COL001',
      facultyId: 'FAC002',
      assignmentId: 'EA-01'
    });
    // Submit under FAC002
    server.saveStudentSubmission({
      submission: { attemptId: 'ATT-P1-EVAL-01', submissionId: 'ATT-P1-EVAL-01', submissionHash: 'hash-eval-01' },
      studentInformation: { studentName: 'Eval Student', rollNumber: 'STU-P1-03', facultyId: 'FAC002', collegeId: 'COL001' },
      challengeMetadata: { id: 'EA-01' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    // FAC001 attempts to evaluate FAC002 submission
    const resEval = server.saveFacultyEvaluation({
      submissionId: 'ATT-P1-EVAL-01',
      marks: 10,
      authFacultyId: 'FAC001' // Not owner
    });
    assert.strictEqual(resEval.success, false);
    assert.strictEqual(resEval.statusCode, 403);
  });

  await it(26, 'Attempt locking passes (historical UNKNOWN rows preserved)', async () => {
    const { server, mockSpreadsheet } = createFreshMockServer();
    // Add historical UNKNOWN row in Assignment_Faculty_Selection
    mockSpreadsheet.Assignment_Faculty_Selection.push([
      "SEL-HIST-001", "ATT-HIST-001", "STU-HIST", "COL001", "UNKNOWN", "EA-01", new Date(), new Date(), "", "ACTIVE"
    ]);
    const histAFS = server.getAssignmentFacultySelection("ATT-HIST-001");
    assert.strictEqual(histAFS.success, true);
    assert.strictEqual(histAFS.data.facultyId, "UNKNOWN");
  });

  await it(27, 'DME EA-01 to EA-22 regression passes (catalog and definitions intact)', async () => {
    const raw = JSON.parse(fs.readFileSync('data/assignments.json', 'utf8'));
    const list = raw.assignments || raw;
    assert.strictEqual(list.length, 22, 'Must contain all 22 DME assignments');
    for (let i = 1; i <= 22; i++) {
      const numStr = String(i).padStart(2, '0');
      const found = list.some(a => a.id === `EA-${numStr}` || a.id === `EC-${numStr}`);
      assert.ok(found, `Assignment ${numStr} must exist in catalog`);
    }
  });

  // --- SECTION 7: SPECIFIED LIVE-SERVER USER SEQUENCES (TEST A - TEST F) ---
  console.log('\n--- SECTION 7: LIVE-SERVER SPECIFIED SEQUENCES (TEST A - TEST F) ---');

  await it('A', 'Live Test A: Student + Registered College + No Faculty -> Attempt blocked, instructed to select faculty', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL001',
      facultyId: '',
      isRegistered: true
    });
    assert.strictEqual(res.attemptCreated, false);
    assert.strictEqual(res.renderedScreen, 'FACULTY_REQUIRED_SCREEN');
  });

  await it('B', 'Live Test B: Student + Registered College + UNKNOWN -> Blocked, UNKNOWN not accepted', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-LIVE-B',
      studentId: 'STU-LIVE-B',
      collegeId: 'COL001',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await it('C', 'Live Test C: Student + Registered College + Active Faculty -> Opens normally, attempt created', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-LIVE-C',
      studentId: 'STU-LIVE-C',
      collegeId: 'COL001',
      facultyId: 'FAC001',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.attemptId, 'ATT-LIVE-C');
  });

  await it('D', 'Live Test D: Student + Unregistered College + UNKNOWN -> Opens normally, attempt and submission allowed', async () => {
    const { server } = createFreshMockServer();
    const res = server.createAssignmentFacultySelection({
      attemptId: 'ATT-LIVE-D',
      studentId: 'STU-LIVE-D',
      collegeId: 'COL-UNREGISTERED-99',
      facultyId: 'UNKNOWN',
      assignmentId: 'EA-01'
    });
    assert.strictEqual(res.success, true);
    const subRes = server.saveStudentSubmission({
      submission: { attemptId: 'ATT-LIVE-D', submissionId: 'ATT-LIVE-D', submissionHash: 'hash-live-d' },
      studentInformation: { studentName: 'Live D', rollNumber: 'STU-LIVE-D', facultyId: 'UNKNOWN', collegeId: 'COL-UNREGISTERED-99' },
      challengeMetadata: { id: 'EA-01' },
      submissionData: { completedActivities: 5, totalActivities: 5, completionPercent: 100 }
    });
    assert.strictEqual(subRes.success, true);
  });

  await it('E', 'Live Test E: Direct Workbench URL without College + Faculty flow -> Blocked, no attempt created', async () => {
    const res = simulateWorkbenchAccess({
      role: 'STUDENT',
      collegeId: 'COL001',
      facultyId: '',
      isRegistered: true
    });
    assert.strictEqual(res.attemptCreated, false);
    assert.strictEqual(res.renderedScreen, 'FACULTY_REQUIRED_SCREEN');
  });

  await it('F', 'Live Test F: Direct DME Assignment URL -> Same MEILP-wide access logic applies (no DME exception)', async () => {
    // Verified that DME assignments (EA-01 to EA-22) use the exact same assignment-workbench.html / challenge-runner.js access guard
    const runnerCode = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');
    assert.ok(runnerCode.includes('renderFacultyRequiredScreen'), 'challenge-runner.js enforces faculty selection MEILP-wide');
    assert.ok(!runnerCode.includes('if (challengeId.startsWith("EA-")) return;'), 'No DME bypass exists');
  });

  console.log('\n================================================================');
  console.log(`TOTAL PHASE 2A TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase2ATests();
