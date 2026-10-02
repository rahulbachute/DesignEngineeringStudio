/**
 * MEILP — IN-PAGE LAUNCH VALIDATION MODAL TEST SUITE
 * (Google Sites Embed & Direct Execution Compatible)
 * 
 * Validates:
 * 1. Student without college selection -> In-page validation modal ('Please select your College...') without native window.alert
 * 2. Student with registered college + active faculties, but no faculty -> In-page validation modal ('Please select your Faculty...') without native window.alert
 * 3. Student with registered college + valid faculty -> Permitted direct launch to assignment-workbench
 * 4. Student with registered college + zero active faculties -> Permitted direct launch with UNKNOWN
 * 5. Guest -> Permitted direct launch (read-only mode intact, no college/faculty required)
 * 6. Static fallback cards in coursework.html and mirror use handleAssignmentLaunch guard
 * 7. In-page modal markup exists in coursework.html and mirror with accessible alertdialog attributes
 * 8. Dismissing modal via OK button returns focus to target selector
 * 9. Script and stylesheet cache-busting query strings bumped
 * 10. Exact 1:1 file parity between root and outputs/meilp/ mirrors
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — IN-PAGE LAUNCH VALIDATION MODAL TEST SUITE');
console.log('(Google Sites Embed & Direct Browser Validation)');
console.log('================================================================\n');

const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
const mirrorCourseworkHtml = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'coursework.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const mirrorAppJs = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'app.js'), 'utf8');
const challengeRunnerJs = fs.readFileSync(path.join(__dirname, 'js', 'challenge-runner.js'), 'utf8');
const mirrorChallengeRunnerJs = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'challenge-runner.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, 'css', 'theme.css'), 'utf8');
const mirrorThemeCss = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'css', 'theme.css'), 'utf8');

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
    this.textContent = '';
    this.disabled = false;
    this.focused = false;
    this.scrolled = false;
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.classList = {
      _classes: new Set(),
      add: (...c) => c.forEach(x => this.classList._classes.add(x)),
      remove: (...c) => c.forEach(x => this.classList._classes.delete(x)),
      contains: (x) => this.classList._classes.has(x)
    };
  }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  removeEventListener(evt, fn) {
    if (!this.listeners[evt]) return;
    this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
  }
  click() {
    const list = (this.listeners['click'] || []).slice();
    list.forEach(fn => fn({ preventDefault() {}, stopPropagation() {} }));
  }
}

function createEnvironment(role = 'STUDENT') {
  const localStorage = new LocalStorageMock();
  if (role) localStorage.setItem('meilp:activeRole', role);

  const elements = {
    studentCollegeSelect: new DOMElementMock('studentCollegeSelect', 'select'),
    studentFacultySelect: new DOMElementMock('studentFacultySelect', 'select'),
    btnShowAssignments: new DOMElementMock('btnShowAssignments', 'button'),
    facultyStatusBanner: new DOMElementMock('facultyStatusBanner', 'div'),
    assignmentGrid: new DOMElementMock('assignmentGrid', 'div'),
    meilpLaunchValidationModal: new DOMElementMock('meilpLaunchValidationModal', 'div'),
    meilpLaunchValidationTitle: new DOMElementMock('meilpLaunchValidationTitle', 'h5'),
    meilpLaunchValidationMessage: new DOMElementMock('meilpLaunchValidationMessage', 'p'),
    meilpLaunchValidationOkBtn: new DOMElementMock('meilpLaunchValidationOkBtn', 'button'),
    meilpLaunchValidationCloseBtn: new DOMElementMock('meilpLaunchValidationCloseBtn', 'button')
  };

  elements.studentCollegeSelect.innerHTML = '<option value="" disabled selected>Select Your College</option>';
  elements.studentFacultySelect.innerHTML = '<option value="" disabled selected>Select Your Faculty</option>';
  elements.meilpLaunchValidationModal.classList.add('d-none');
  elements.meilpLaunchValidationModal.style.display = 'none';

  let redirectedTo = null;
  let nativeAlertCallCount = 0;
  let lastNativeAlert = null;

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
      createElement(tag) { return new DOMElementMock('created_' + Date.now(), tag); },
      body: {
        appendChild(el) { if (el && el.id) elements[el.id] = el; }
      },
      addEventListener() {},
      removeEventListener() {}
    },
    console: { log() {}, warn() {}, error() {} },
    alert(msg) {
      nativeAlertCallCount++;
      lastNativeAlert = msg;
    }
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
    getNativeAlertCallCount: () => nativeAlertCallCount,
    getLastNativeAlert: () => lastNativeAlert,
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
  await test('Student without college -> triggers in-page College validation modal without native alert', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Attempt direct launch of EA-01
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must return false when blocked');

    // Confirm NO native alert
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'Must NOT invoke native window.alert() in iframe');

    // Confirm in-page modal is active
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false, 'Modal backdrop must be visible');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'flex', 'Modal display must be flex');
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'College Selection Required');
    assert.strictEqual(env.elements.meilpLaunchValidationMessage.textContent, 'Please select your College before starting this assignment.');

    // Confirm target selector is scrolled
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College select must be scrolled into view');
    assert.strictEqual(env.getRedirection(), null, 'Must NOT redirect to workbench');
  });

  // Test 2: Student with registered college + active faculties, but no faculty selected
  await test('Student with college but no faculty -> triggers in-page Faculty validation modal without native alert', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', '');
    env.window.MEILP.renderAssignmentCards();

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must return false when faculty not selected');

    // Confirm NO native alert
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'Must NOT invoke native window.alert()');

    // Confirm in-page modal is active
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false, 'Modal backdrop must be visible');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'flex', 'Modal display must be flex');
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'Faculty Selection Required');
    assert.strictEqual(env.elements.meilpLaunchValidationMessage.textContent, 'Please select your Faculty before starting this assignment.');

    // Confirm target selector is scrolled
    assert.strictEqual(env.elements.studentFacultySelect.scrolled, true, 'Faculty select must be scrolled into view');
    assert.strictEqual(env.getRedirection(), null, 'Must NOT redirect to workbench');
  });

  // Test 3: Modal dismissal via OK button returns focus to target selector
  await test('Dismissing modal via OK button hides modal and focuses selector', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Trigger college validation modal
    env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false);

    // Click OK button
    env.elements.meilpLaunchValidationOkBtn.click();

    // Confirm modal is dismissed
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must be hidden after OK');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'none');

    // Confirm focus returned to College selector
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College selector must receive focus after OK');
  });

  // Test 4: Student with valid college and faculty selection -> launch permitted
  await test('Student with valid college and faculty -> launch succeeds without alert or modal', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', 'FAC001');
    env.elements.studentFacultySelect.value = 'FAC001';
    env.window.MEILP.renderAssignmentCards();

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must return true when valid');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No alert should be shown');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must remain hidden');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 5: Student with registered college having zero active faculties -> launch permitted with UNKNOWN
  await test('Student with zero-faculty registered college -> launch permitted without modal', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL003';
    await env.window.MEILP.updateFacultyDropdown('COL003', '');
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentFacultySelect.value, 'UNKNOWN');
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for zero-faculty college');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No alert should be shown');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must remain hidden');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 6: Guest role -> launch permitted (read-only mode preserved)
  await test('Guest role -> launch permitted directly without modal or alert', async () => {
    const env = createEnvironment('GUEST');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for Guest');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No alert for Guest');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must remain hidden');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 7: Static fallback cards in coursework.html and mirror use handleAssignmentLaunch guard
  await test('coursework.html and mirror static cards use handleAssignmentLaunch guard', async () => {
    assert.ok(!courseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked direct card onclicks');
    assert.ok(!courseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked direct anchor tags');
    assert.ok(courseworkHtml.includes('handleAssignmentLaunch'), 'Uses handleAssignmentLaunch guard');
    assert.ok(!mirrorCourseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked mirror direct onclicks');
    assert.ok(!mirrorCourseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked mirror direct anchor tags');
    assert.ok(mirrorCourseworkHtml.includes('handleAssignmentLaunch'), 'Mirror uses handleAssignmentLaunch guard');
  });

  // Test 8: Static modal markup in coursework.html and mirror has accessibility attributes
  await test('coursework.html and mirror contain accessible in-page validation modal markup', async () => {
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationModal"'), 'Modal id exists in coursework.html');
    assert.ok(courseworkHtml.includes('role="alertdialog"'), 'role="alertdialog" exists in coursework.html');
    assert.ok(courseworkHtml.includes('aria-modal="true"'), 'aria-modal="true" exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationTitle"'), 'Title element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationMessage"'), 'Message element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationOkBtn"'), 'OK button exists in coursework.html');

    assert.ok(mirrorCourseworkHtml.includes('id="meilpLaunchValidationModal"'), 'Modal id exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('role="alertdialog"'), 'role="alertdialog" exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('aria-modal="true"'), 'aria-modal="true" exists in mirror');
  });

  // Test 9: Script cache-busting version tags bumped
  await test('Script cache-busting version query string is bumped', async () => {
    assert.ok(courseworkHtml.includes('js/app.js?v=20261002c'), 'coursework.html has bumped app.js version');
    assert.ok(mirrorCourseworkHtml.includes('js/app.js?v=20261002c'), 'outputs/meilp/coursework.html has bumped app.js version');
    assert.ok(courseworkHtml.includes('css/theme.css?v=20261002c'), 'coursework.html has bumped theme.css version');
  });

  // Test 10: Modal styling exists in css/theme.css and mirror
  await test('css/theme.css and mirror contain meilp-launch-modal CSS rules', async () => {
    assert.ok(themeCss.includes('.meilp-launch-modal-backdrop'), 'themeCss has backdrop styles');
    assert.ok(themeCss.includes('.meilp-launch-modal-content'), 'themeCss has content styles');
    assert.ok(mirrorThemeCss.includes('.meilp-launch-modal-backdrop'), 'mirrorThemeCss has backdrop styles');
    assert.ok(mirrorThemeCss.includes('.meilp-launch-modal-content'), 'mirrorThemeCss has content styles');
  });

  // Test 11: 1:1 Mirror parity between root and outputs/meilp/
  await test('Exact 1:1 parity between root files and outputs/meilp/ mirrors', async () => {
    assert.strictEqual(courseworkHtml, mirrorCourseworkHtml, 'coursework.html matches outputs/meilp/coursework.html');
    assert.strictEqual(appJs, mirrorAppJs, 'js/app.js matches outputs/meilp/js/app.js');
    assert.strictEqual(challengeRunnerJs, mirrorChallengeRunnerJs, 'js/challenge-runner.js matches outputs/meilp/js/challenge-runner.js');
    assert.strictEqual(themeCss, mirrorThemeCss, 'css/theme.css matches outputs/meilp/css/theme.css');
  });

  console.log('\n================================================================');
  console.log(`IN-PAGE VALIDATION LAUNCH TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
