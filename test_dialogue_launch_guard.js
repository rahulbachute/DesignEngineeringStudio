/**
 * MEILP — DIALOGUE-BOX BEHAVIOR AT DIRECT ASSIGNMENT LAUNCH POINT TEST SUITE
 * 
 * Validates:
 * 1. Student without college selection -> Dialogue alert ('Please select your College before starting this assignment.') + focus
 * 2. Student with registered college + active faculties, but no faculty -> Dialogue alert ('Please select your Faculty before starting this assignment.') + focus
 * 3. Student with registered college + valid faculty -> Permitted direct launch to assignment-workbench
 * 4. Student with registered college + zero active faculties -> Permitted direct launch with UNKNOWN
 * 5. Guest -> Permitted direct launch (read-only mode intact, no college/faculty required)
 * 6. Static fallback cards in coursework.html and outputs/meilp/coursework.html enforce launch check
 * 7. 1:1 file parity between root and outputs/meilp/
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — DIRECT ASSIGNMENT LAUNCH DIALOGUE-BOX TEST SUITE');
console.log('================================================================\n');

const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
const mirrorCourseworkHtml = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'coursework.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const mirrorAppJs = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'app.js'), 'utf8');
const challengeRunnerJs = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');
const mirrorChallengeRunnerJs = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'challenge-runner.js'), 'utf8');

const MOCK_COLLEGES = [
  { collegeId: 'COL001', collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon' },
  { collegeId: 'COL002', collegeName: 'Jaihind College of Engineering, Kuran' },
  { collegeId: 'COL003', collegeName: 'Sinhgad Institute of Technology, Lonavala' }
];

const MOCK_FACULTIES = {
  COL001: [
    { facultyId: 'FAC001', facultyName: 'Dr. Rahul Bachute', status: 'ACTIVE' },
    { facultyId: 'FAC002', facultyName: 'Dr. Niranjan Shegokar', status: 'ACTIVE' }
  ],
  COL002: [
    { facultyId: 'FAC004', facultyName: 'Prof. Said Khandu', status: 'ACTIVE' }
  ],
  COL003: [] // Zero active faculties
};

class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

class DOMElementMock {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.innerHTML = '';
    this.disabled = false;
    this.focused = false;
    this.scrolled = false;
  }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

function createEnvironment(role = 'STUDENT') {
  const localStorage = new LocalStorageMock();
  if (role) localStorage.setItem('meilp:activeRole', role);

  const elements = {
    studentCollegeSelect: new DOMElementMock('studentCollegeSelect', 'select'),
    studentFacultySelect: new DOMElementMock('studentFacultySelect', 'select'),
    btnShowAssignments: new DOMElementMock('btnShowAssignments', 'button'),
    facultyStatusBanner: new DOMElementMock('facultyStatusBanner', 'div'),
    assignmentGrid: new DOMElementMock('assignmentGrid', 'div')
  };

  elements.studentCollegeSelect.innerHTML = '<option value="" disabled selected>Select Your College</option>';
  elements.studentFacultySelect.innerHTML = '<option value="" disabled selected>Select Your Faculty</option>';

  let redirectedTo = null;
  let lastAlert = null;

  const mockWindow = {
    isCourseworkPage: true,
    location: {
      href: 'http://localhost:5500/coursework.html',
      set href(u) { redirectedTo = u; }
    },
    localStorage,
    MEILP: { isCourseworkPage: true },
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
    alert(msg) { lastAlert = msg; }
  };
  mockWindow.window = mockWindow;

  // Run config
  const runConfig = new Function('window', 'document', 'console', configCode);
  runConfig(mockWindow, mockWindow.document, mockWindow.console);

  mockWindow.fetchColleges = async () => MOCK_COLLEGES;
  mockWindow.fetchFacultyList = async (cid) => MOCK_FACULTIES[cid] || [];
  mockWindow.ALL_ASSIGNMENTS = [
    { id: 'EA-01', title: 'Challenge 01', tasks: 4, discipline: 'Mechanical' },
    { id: 'EA-02', title: 'Challenge 02', tasks: 4, discipline: 'Mechanical' }
  ];
  mockWindow.loadFacultyControls = () => ({});
  mockWindow.formatDueDate = (d) => d;
  mockWindow.parseDueDate = (d) => (d ? new Date(d) : null);
  mockWindow.escapeHtml = (s) => (s ? String(s) : '');

  // Run app.js
  const runApp = new Function('window', 'document', 'console', appCode);
  runApp(mockWindow, mockWindow.document, mockWindow.console);

  return {
    window: mockWindow,
    elements,
    localStorage,
    getLastAlert: () => lastAlert,
    clearAlert: () => { lastAlert = null; },
    getRedirection: () => redirectedTo
  };
}

let passed = 0;
let total = 0;

async function test(name, fn) {
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

async function runTests() {
  // Test 1: Student with no college selected
  await test('Student without college -> triggers dialogue alert and focuses college select', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Attempt direct launch of EA-01
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must return false when blocked');
    assert.strictEqual(env.getLastAlert(), 'Please select your College before starting this assignment.');
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College select must be focused');
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College select must be scrolled into view');
    assert.strictEqual(env.getRedirection(), null, 'Must NOT redirect to workbench');
  });

  // Test 2: Student with registered college + active faculties, but no faculty selected
  await test('Student with college but no faculty -> triggers dialogue alert and focuses faculty select', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', '');
    env.window.MEILP.renderAssignmentCards();

    env.clearAlert();
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must return false when faculty not selected');
    assert.strictEqual(env.getLastAlert(), 'Please select your Faculty before starting this assignment.');
    assert.strictEqual(env.elements.studentFacultySelect.focused, true, 'Faculty select must be focused');
    assert.strictEqual(env.elements.studentFacultySelect.scrolled, true, 'Faculty select must be scrolled into view');
    assert.strictEqual(env.getRedirection(), null, 'Must NOT redirect to workbench');
  });

  // Test 3: Student with valid college and faculty selection -> launch permitted
  await test('Student with valid college and faculty -> launch succeeds without alert', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', 'FAC001');
    env.elements.studentFacultySelect.value = 'FAC001';
    env.window.MEILP.renderAssignmentCards();

    env.clearAlert();
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must return true when valid');
    assert.strictEqual(env.getLastAlert(), null, 'No alert should be shown');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 4: Student with registered college having zero active faculties -> launch permitted with UNKNOWN
  await test('Student with zero-faculty registered college -> launch permitted without alert', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL003';
    await env.window.MEILP.updateFacultyDropdown('COL003', '');
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentFacultySelect.value, 'UNKNOWN');
    env.clearAlert();
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for zero-faculty college');
    assert.strictEqual(env.getLastAlert(), null, 'No alert should be shown');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 5: Guest role -> launch permitted (read-only mode preserved)
  await test('Guest role -> launch permitted directly without alert', async () => {
    const env = createEnvironment('GUEST');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.clearAlert();
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for Guest');
    assert.strictEqual(env.getLastAlert(), null, 'No alert for Guest');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 6: Static fallback cards in coursework.html do NOT contain direct unblocked window.location links
  await test('coursework.html static cards use handleAssignmentLaunch guard', async () => {
    assert.ok(!courseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked direct card onclicks');
    assert.ok(!courseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked direct anchor tags');
    assert.ok(courseworkHtml.includes('handleAssignmentLaunch'), 'Uses handleAssignmentLaunch guard');
  });

  // Test 7: Static fallback cards in outputs/meilp/coursework.html mirror the guard
  await test('outputs/meilp/coursework.html static cards use handleAssignmentLaunch guard', async () => {
    assert.ok(!mirrorCourseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked direct mirror onclicks');
    assert.ok(!mirrorCourseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked direct mirror anchor tags');
    assert.ok(mirrorCourseworkHtml.includes('handleAssignmentLaunch'), 'Mirror uses handleAssignmentLaunch guard');
  });

  // Test 8: Script cache-busting version tags bumped
  await test('Script cache-busting version query string is bumped', async () => {
    assert.ok(courseworkHtml.includes('js/app.js?v=20261002b'), 'coursework.html has bumped app.js version');
    assert.ok(mirrorCourseworkHtml.includes('js/app.js?v=20261002b'), 'outputs/meilp/coursework.html has bumped app.js version');
  });

  // Test 9: 1:1 Mirror parity between root and outputs/meilp/
  await test('Exact 1:1 parity between root files and outputs/meilp/ mirrors', async () => {
    assert.strictEqual(courseworkHtml, mirrorCourseworkHtml, 'coursework.html matches outputs/meilp/coursework.html');
    assert.strictEqual(appJs, mirrorAppJs, 'js/app.js matches outputs/meilp/js/app.js');
    assert.strictEqual(challengeRunnerJs, mirrorChallengeRunnerJs, 'js/challenge-runner.js matches outputs/meilp/js/challenge-runner.js');
  });

  console.log('\n================================================================');
  console.log(`DIALOGUE-BOX LAUNCH TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
