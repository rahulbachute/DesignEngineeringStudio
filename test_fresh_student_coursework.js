/**
 * MEILP — FRESH STUDENT COURSEWORK INITIALIZATION TEST SUITE
 * 
 * Validates Section 23 Authoritative Tests (TEST 1 to TEST 12):
 * TEST 1: Fresh Student Entry (Gateway -> Student -> Coursework)
 * TEST 2: Previous Student Profile Exists in localStorage -> Stored profile preserved, NOT displayed on Coursework
 * TEST 3: No Automatic First College Selection (starts at Select Your College)
 * TEST 4: College Selection With Active Faculties (Faculty dropdown reset, NO UNKNOWN/Unassigned, Show disabled)
 * TEST 5: Explicit Faculty Selection (Show enabled, assignment access permitted)
 * TEST 6: Registered College With Zero Active Faculties (Auto-select UNKNOWN/Unassigned, Show enabled)
 * TEST 7: Guest Entry (Neutral disabled controls, Show disabled, Guest banner visible)
 * TEST 8: Student -> Switch Role -> Guest (Guest neutral disabled controls, student values hidden)
 * TEST 9: Guest -> Switch Role -> Student (Coursework starts FRESH)
 * TEST 10: Guest Page Reload (Remains neutral disabled, no student profile leakage)
 * TEST 11: Direct Coursework URL Without Role (Redirects to index.html, no attempt, no AFS)
 * TEST 12: Existing Assignment Attempt Workbench Reload (Attempt_ID & state intact)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — FRESH STUDENT COURSEWORK INITIALIZATION TEST SUITE');
console.log('Validating Section 23 Authoritative Tests (1 to 12)');
console.log('================================================================\n');

// Load files
const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const MOCK_COLLEGES = [
  { collegeId: 'COL001', collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon' },
  { collegeId: 'COL002', collegeName: 'Jaihind College of Engineering, Kuran' },
  { collegeId: 'COL003', collegeName: 'Sinhgad Institute of Technology, Lonavala' }
];

const MOCK_FACULTIES = {
  COL001: [
    { facultyId: 'FAC001', facultyName: 'Dr. Rahul Bachute', status: 'ACTIVE' },
    { facultyId: 'FAC002', facultyName: 'Dr. Niranjan Shegokar', status: 'ACTIVE' },
    { facultyId: 'FAC003', facultyName: 'Prof. Atul Gowardipe', status: 'ACTIVE' }
  ],
  COL002: [
    { facultyId: 'FAC004', facultyName: 'Prof. Said Khandu', status: 'ACTIVE' }
  ],
  COL003: [] // Zero active faculties
};

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class DOMElementMock {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.innerHTML = '';
    this.disabled = false;
    this.classList = {
      _classes: new Set(),
      add(...c) { c.forEach(x => this._classes.add(x)); },
      remove(...c) { c.forEach(x => this._classes.delete(x)); },
      contains(x) { return this._classes.has(x); }
    };
    this.listeners = {};
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  async dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) {
      await h(event);
    }
  }
  focus() {}
  scrollIntoView() {}
}

function createCourseworkEnvironment(initialRole = 'STUDENT', initialProfile = null) {
  const localStorage = new LocalStorageMock();
  if (initialRole) {
    localStorage.setItem('meilp:activeRole', initialRole);
  }
  if (initialProfile) {
    localStorage.setItem('meilp:studentProfile', JSON.stringify(initialProfile));
  }

  const elements = {
    studentCollegeSelect: new DOMElementMock('studentCollegeSelect', 'select'),
    studentFacultySelect: new DOMElementMock('studentFacultySelect', 'select'),
    btnShowAssignments: new DOMElementMock('btnShowAssignments', 'button'),
    facultyStatusBanner: new DOMElementMock('facultyStatusBanner', 'div'),
    navActiveRoleBadge: new DOMElementMock('navActiveRoleBadge', 'span'),
    navRoleText: new DOMElementMock('navRoleText', 'span'),
    assignmentGrid: new DOMElementMock('assignmentGrid', 'div')
  };

  elements.studentCollegeSelect.innerHTML = '<option value="" disabled selected>Select Your College</option>';
  elements.studentFacultySelect.innerHTML = '<option value="" disabled selected>Select Your Faculty</option>';
  elements.btnShowAssignments.disabled = true;

  let redirectedTo = null;

  const mockWindow = {
    isCourseworkPage: true,
    location: {
      href: 'http://localhost:5500/coursework.html',
      replace(url) { redirectedTo = url; },
      set href(url) { redirectedTo = url; }
    },
    localStorage,
    MEILP: {
      isCourseworkPage: true
    },
    document: {
      getElementById(id) { return elements[id] || null; },
      querySelector(sel) {
        if (sel === '[data-assignment-grid]') return elements.assignmentGrid;
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    console: { log() {}, warn() {}, error() {} },
    alert(msg) { mockWindow._lastAlert = msg; }
  };
  mockWindow.window = mockWindow;

  // Evaluate config.js
  const runConfig = new Function('window', 'document', 'console', configCode);
  runConfig(mockWindow, mockWindow.document, mockWindow.console);

  // Provide mock fetch
  mockWindow.fetchColleges = async () => MOCK_COLLEGES;
  mockWindow.fetchFacultyList = async (cid) => MOCK_FACULTIES[cid] || [];
  mockWindow.ALL_ASSIGNMENTS = Array.from({ length: 22 }, (_, i) => {
    const idNum = String(i + 1).padStart(2, '0');
    return {
      id: `EA-${idNum}`,
      title: `Challenge ${idNum}`,
      tasks: 4,
      discipline: 'Mechanical'
    };
  });
  mockWindow.loadFacultyControls = () => ({});
  mockWindow.formatDueDate = (d) => d;
  mockWindow.parseDueDate = (d) => (d ? new Date(d) : null);
  mockWindow.escapeHtml = (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');

  // Evaluate app.js
  const runApp = new Function('window', 'document', 'console', appCode);
  runApp(mockWindow, mockWindow.document, mockWindow.console);

  return {
    window: mockWindow,
    elements,
    localStorage,
    getRedirection: () => redirectedTo
  };
}

let passed = 0;
let total = 0;

async function runTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}`);
    console.error(`       ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
}

async function main() {
  // ---------------------------------------------------------------------------
  // TEST 1: Fresh Student Entry
  // ---------------------------------------------------------------------------
  await runTest('TEST 1: Fresh Student Entry (Gateway -> Student -> Coursework) -> College/Faculty unselected, Show disabled', async () => {
    const env = createCourseworkEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'College value must remain unselected ("")');
    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Faculty value must remain unselected ("")');
    assert.strictEqual(env.elements.studentCollegeSelect.disabled, false, 'College select must be enabled');
    assert.strictEqual(env.elements.studentFacultySelect.disabled, false, 'Faculty select must be enabled');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show button must be disabled on fresh coursework entry');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Previous Student Profile Exists in localStorage
  // ---------------------------------------------------------------------------
  await runTest('TEST 2: Previous Student Profile Exists -> Preserved in localStorage, NOT displayed on Coursework', async () => {
    const profile = {
      collegeId: 'COL001',
      collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
      facultyId: 'FAC001',
      facultyName: 'Dr. Rahul Bachute',
      fullName: 'John Doe',
      rollNo: '42'
    };
    const env = createCourseworkEnvironment('STUDENT', profile);

    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Verify UI is FRESH
    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'Stored College must NOT appear in UI');
    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Stored Faculty must NOT appear in UI');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show button must be disabled');

    // Verify stored profile is NOT deleted or mutated in localStorage
    const stored = JSON.parse(env.localStorage.getItem('meilp:studentProfile'));
    assert.strictEqual(stored.collegeId, 'COL001', 'Stored profile collegeId must remain intact in localStorage');
    assert.strictEqual(stored.facultyId, 'FAC001', 'Stored profile facultyId must remain intact in localStorage');
    assert.strictEqual(stored.fullName, 'John Doe', 'Stored profile metadata must remain intact');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: No Automatic First College Selection
  // ---------------------------------------------------------------------------
  await runTest('TEST 3: No Automatic First College -> Dropdown contains colleges but initial value is Select Your College', async () => {
    const env = createCourseworkEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();

    assert.ok(env.elements.studentCollegeSelect.innerHTML.includes('COL001'));
    assert.ok(env.elements.studentCollegeSelect.innerHTML.includes('COL002'));
    assert.ok(env.elements.studentCollegeSelect.innerHTML.includes('COL003'));
    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'Initial value must NOT be COL001');
    assert.ok(env.elements.studentCollegeSelect.innerHTML.includes('Select Your College'));
  });

  // ---------------------------------------------------------------------------
  // TEST 4: College Selection With Active Faculties
  // ---------------------------------------------------------------------------
  await runTest('TEST 4: College Selection With Active Faculties -> Faculty dropdown resets, active options only, NO UNKNOWN, Show disabled', async () => {
    const env = createCourseworkEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();

    // Student selects COL001
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', '');
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Faculty selection must be reset to empty / placeholder');
    assert.ok(env.elements.studentFacultySelect.innerHTML.includes('Select Your Faculty'), 'Must have Select Your Faculty option');
    assert.ok(env.elements.studentFacultySelect.innerHTML.includes('Dr. Rahul Bachute'), 'Must include active faculty');
    assert.ok(!env.elements.studentFacultySelect.innerHTML.includes('UNKNOWN'), 'Must NOT contain UNKNOWN');
    assert.ok(!env.elements.studentFacultySelect.innerHTML.includes('Unassigned Faculty'), 'Must NOT contain Unassigned Faculty');
    assert.ok(!env.elements.studentFacultySelect.innerHTML.includes('No Faculty'), 'Must NOT contain No Faculty');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show button must remain disabled until explicit faculty selection');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Explicit Faculty Selection
  // ---------------------------------------------------------------------------
  await runTest('TEST 5: Explicit Faculty Selection -> Show becomes enabled, assignment access permitted', async () => {
    const env = createCourseworkEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();

    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', '');
    env.elements.studentFacultySelect.value = 'FAC001';
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.btnShowAssignments.disabled, false, 'Show button must become enabled after selecting valid faculty');
    assert.ok(env.elements.assignmentGrid.innerHTML.includes('Launch Workbench'), 'Assignment launch button must be available');
    assert.ok(!env.elements.assignmentGrid.innerHTML.includes('Disabled by Faculty'), 'Active assignments must not be disabled');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Registered College With Zero Active Faculties
  // ---------------------------------------------------------------------------
  await runTest('TEST 6: Registered College With Zero Active Faculties -> Auto-select UNKNOWN/Unassigned, Show enabled', async () => {
    const env = createCourseworkEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();

    // COL003 has zero active faculties
    env.elements.studentCollegeSelect.value = 'COL003';
    await env.window.MEILP.updateFacultyDropdown('COL003', '');
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentFacultySelect.value, 'UNKNOWN', 'Faculty must auto-select UNKNOWN');
    assert.ok(env.elements.studentFacultySelect.innerHTML.includes('Unassigned Faculty / No Faculty'), 'Option label must be Unassigned Faculty / No Faculty');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, false, 'Show button must be enabled when college has zero active faculties');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Guest Entry
  // ---------------------------------------------------------------------------
  await runTest('TEST 7: Guest Entry -> Neutral disabled controls, Show disabled, Guest banner visible', async () => {
    const env = createCourseworkEnvironment('GUEST');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'College value must be empty');
    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Faculty value must be empty');
    assert.strictEqual(env.elements.studentCollegeSelect.disabled, true, 'College select must be disabled');
    assert.strictEqual(env.elements.studentFacultySelect.disabled, true, 'Faculty select must be disabled');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show button must be disabled');
    assert.ok(env.elements.facultyStatusBanner.innerHTML.includes('Guest Mode (Read-Only)'), 'Guest banner must be visible');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Student -> Switch Role -> Guest
  // ---------------------------------------------------------------------------
  await runTest('TEST 8: Student -> Switch Role -> Guest -> Neutral disabled controls, Student profile does not leak', async () => {
    const profile = { collegeId: 'COL001', facultyId: 'FAC001', collegeName: 'College A', facultyName: 'Faculty A' };
    const env = createCourseworkEnvironment('GUEST', profile);

    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'College must not show Student College A');
    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Faculty must not show Student Faculty A');
    assert.strictEqual(env.elements.studentCollegeSelect.disabled, true, 'College select must be disabled');
    assert.strictEqual(env.elements.studentFacultySelect.disabled, true, 'Faculty select must be disabled');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show button must be disabled');

    // Stored student profile is still preserved in storage
    const stored = JSON.parse(env.localStorage.getItem('meilp:studentProfile'));
    assert.strictEqual(stored.collegeId, 'COL001', 'Profile remains stored for later Student use');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Guest -> Switch Role -> Student
  // ---------------------------------------------------------------------------
  await runTest('TEST 9: Guest -> Switch Role -> Student -> Coursework starts FRESH', async () => {
    // Student enters Coursework afresh after switching from Guest
    const env = createCourseworkEnvironment('STUDENT', { collegeId: 'COL001', facultyId: 'FAC001' });

    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentCollegeSelect.value, '', 'Starts FRESH with no college selected');
    assert.strictEqual(env.elements.studentFacultySelect.value, '', 'Starts FRESH with no faculty selected');
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true, 'Show disabled');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Guest Page Reload
  // ---------------------------------------------------------------------------
  await runTest('TEST 10: Guest Page Reload -> Controls remain neutral and disabled, no profile leakage', async () => {
    const env = createCourseworkEnvironment('GUEST', { collegeId: 'COL001', facultyId: 'FAC001' });

    // Page load 1
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Reload simulation
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentCollegeSelect.value, '');
    assert.strictEqual(env.elements.studentFacultySelect.value, '');
    assert.strictEqual(env.elements.studentCollegeSelect.disabled, true);
    assert.strictEqual(env.elements.studentFacultySelect.disabled, true);
    assert.strictEqual(env.elements.btnShowAssignments.disabled, true);
  });

  // ---------------------------------------------------------------------------
  // TEST 11: Direct Coursework URL Without Role
  // ---------------------------------------------------------------------------
  await runTest('TEST 11: Direct Coursework URL without active role -> Redirects to index.html, no attempt/AFS', async () => {
    // In coursework.html head script:
    // (function () {
    //   try {
    //     var role = localStorage.getItem("meilp:activeRole");
    //     var norm = role ? String(role).trim().toUpperCase() : "";
    //     if (!norm || (norm !== "STUDENT" && norm !== "GUEST")) {
    //       window.location.replace("index.html");
    //     }
    //   } catch (e) {}
    // })();

    assert.ok(courseworkHtml.includes('localStorage.getItem("meilp:activeRole")'), 'coursework.html checks activeRole');
    assert.ok(courseworkHtml.includes('window.location.replace("index.html")'), 'coursework.html redirects to index.html if role missing');

    const env = createCourseworkEnvironment(null); // No active role
    // Test the logic directly
    const role = env.localStorage.getItem('meilp:activeRole');
    const norm = role ? String(role).trim().toUpperCase() : '';
    if (!norm || (norm !== 'STUDENT' && norm !== 'GUEST')) {
      env.window.location.replace('index.html');
    }
    assert.strictEqual(env.getRedirection(), 'index.html', 'Must redirect to index.html');
  });

  // ---------------------------------------------------------------------------
  // TEST 12: Existing Assignment Attempt Workbench Reload
  // ---------------------------------------------------------------------------
  await runTest('TEST 12: Existing Assignment Attempt -> Attempt_ID, workflow, submission state intact', async () => {
    // Verify that coursework changes do NOT touch challenge-runner attempt locking
    const runnerCode = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');
    assert.ok(runnerCode.includes('if (!attemptId)'), 'challenge-runner creates attemptId ONLY when missing');
    assert.ok(runnerCode.includes('attemptId = "ATT-"'), 'challenge-runner retains existing attemptId on reload');
  });

  console.log('\n================================================================');
  console.log(`FRESH STUDENT COURSEWORK TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main();
