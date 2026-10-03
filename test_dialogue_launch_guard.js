/**
 * MEILP — IN-PAGE LAUNCH VALIDATION MODAL & SCROLL-SAFE TEST SUITE
 * (Google Sites Embed & Direct Execution Compatible)
 * 
 * Validates:
 * 1. Test A: Initial coursework position starts at top (scroll position = 0), manual scroll restoration set, does not force to top after user scroll
 * 2. Test B: Modal while scrolled down: blocked launch, modal visible in viewport, scroll position preserved (no forced reset to top)
 * 3. Test C: Escape key dismisses modal while scrolled, focuses selector, unblocks page
 * 4. Test D: OK button dismisses modal, scrolls selector into view, and focuses selector
 * 5. Test E: Faculty validation while scrolled behaves identically for registered college with active faculties
 * 6. Test F: Valid student launch succeeds directly without modal or alert
 * 7. Student with zero-faculty registered college -> launch permitted with UNKNOWN
 * 8. Guest -> Permitted direct launch (read-only mode intact, no college/faculty required)
 * 9. Static fallback cards in coursework.html and mirror use handleAssignmentLaunch guard
 * 10. Static modal markup in coursework.html and mirror has accessibility attributes
 * 11. Script cache-busting version tags bumped to 20261003a
 * 12. Modal styling exists in css/theme.css and mirror with fixed inset and high z-index
 * 13. Exact 1:1 file parity between root and outputs/meilp/ mirrors
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — IN-PAGE LAUNCH VALIDATION MODAL & SCROLL-SAFE TEST SUITE');
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
    this.focusOptions = null;
    this.scrolled = false;
    this.parentElement = null;
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
  focus(opts) {
    this.focused = true;
    this.focusOptions = opts || null;
  }
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
    list.forEach(fn => fn({
      target: this,
      preventDefault() {},
      stopPropagation() {}
    }));
  }
  getBoundingClientRect() {
    if (this.id === 'meilpLaunchValidationModal') {
      return { top: 0, bottom: 700, left: 0, right: 1000, width: 1000, height: 700 };
    }
    return { top: 240, bottom: 460, left: 280, right: 720, width: 440, height: 220 };
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
  let currentScrollY = 0;

  const windowListeners = {};
  const documentListeners = {};

  const historyMock = {
    scrollRestoration: 'auto'
  };

  const bodyMock = {
    scrollTop: 0,
    appendChild(el) {
      if (el) {
        el.parentElement = bodyMock;
        if (el.id) elements[el.id] = el;
      }
    }
  };

  elements.meilpLaunchValidationModal.parentElement = bodyMock;

  const docElMock = {
    scrollTop: 0
  };

  const mockWindow = {
    isCourseworkPage: true,
    innerHeight: 700,
    innerWidth: 1000,
    history: historyMock,
    get scrollY() { return currentScrollY; },
    set scrollY(v) { currentScrollY = v; },
    scrollTo(x, y) {
      if (typeof x === 'object' && x !== null) {
        currentScrollY = x.top !== undefined ? x.top : currentScrollY;
      } else {
        currentScrollY = y !== undefined ? y : 0;
      }
    },
    location: {
      href: 'http://localhost:5500/coursework.html',
      set href(u) { redirectedTo = u; }
    },
    localStorage,
    MEILP: { isCourseworkPage: true },
    document: {
      documentElement: docElMock,
      body: bodyMock,
      getElementById(id) { return elements[id] || null; },
      querySelector(sel) {
        if (sel === '[data-assignment-grid]') return elements.assignmentGrid;
        if (sel === '.meilp-launch-modal-dialog') return new DOMElementMock('dialog', 'div');
        return null;
      },
      querySelectorAll() { return []; },
      createElement(tag) {
        const el = new DOMElementMock('created_' + Date.now(), tag);
        return el;
      },
      addEventListener(evt, fn, capture) {
        if (!documentListeners[evt]) documentListeners[evt] = [];
        documentListeners[evt].push({ fn, capture: !!capture });
      },
      removeEventListener(evt, fn) {
        if (!documentListeners[evt]) return;
        documentListeners[evt] = documentListeners[evt].filter(item => item.fn !== fn);
      },
      dispatchEvent(evt) {
        const list = (documentListeners[evt.type] || []).slice();
        list.forEach(item => item.fn(evt));
      }
    },
    addEventListener(evt, fn, capture) {
      if (!windowListeners[evt]) windowListeners[evt] = [];
      windowListeners[evt].push({ fn, capture: !!capture });
    },
    removeEventListener(evt, fn) {
      if (!windowListeners[evt]) return;
      windowListeners[evt] = windowListeners[evt].filter(item => item.fn !== fn);
    },
    dispatchEvent(evt) {
      const list = (windowListeners[evt.type] || []).slice();
      list.forEach(item => item.fn(evt));
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
    docEl: docElMock,
    body: bodyMock,
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
  // TEST A: Initial Coursework Position
  await test('TEST A — Initial coursework position starts at 0, sets manual restoration, and does not force scroll on user scroll', async () => {
    const env = createEnvironment('STUDENT');
    // Simulate initial page load
    env.window.initCourseworkScroll();
    assert.strictEqual(env.window.history.scrollRestoration, 'manual', 'history.scrollRestoration must be manual');
    assert.strictEqual(env.window.scrollY, 0, 'window.scrollY must start at 0');
    assert.strictEqual(env.docEl.scrollTop, 0, 'docEl.scrollTop must be 0');
    assert.strictEqual(env.body.scrollTop, 0, 'body.scrollTop must be 0');

    // User scrolls down substantially
    env.window.scrollY = 850;
    env.docEl.scrollTop = 850;

    // Simulate subsequent operations: card render, dropdown change
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Verify scroll position was NOT continuously forced to 0
    assert.strictEqual(env.window.scrollY, 850, 'User scroll position must be preserved after card render');
    assert.strictEqual(env.docEl.scrollTop, 850, 'docEl scroll position must be preserved');
  });

  // TEST B: Modal while scrolled
  await test('TEST B — Modal while scrolled: launch blocked, modal visible, scroll position not reset to top', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // User scrolls down to card 10
    env.window.scrollY = 1200;

    // Click assignment launch without selecting college
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must be blocked without college');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No native alert');

    // Confirm modal is visible
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false, 'Modal backdrop must be visible');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'flex', 'Modal display must be flex');
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'College Selection Required');

    // Confirm page scroll position was NOT reset to top to show modal
    assert.strictEqual(env.window.scrollY, 1200, 'Page must not be scrolled to top merely to show modal');
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, false, 'Target selector must not be scrolled prior to dismissal');

    // Confirm OK button received focus with preventScroll: true
    assert.strictEqual(env.elements.meilpLaunchValidationOkBtn.focused, true, 'OK button must receive focus');
    assert.deepStrictEqual(env.elements.meilpLaunchValidationOkBtn.focusOptions, { preventScroll: true }, 'Focus must prevent scrolling');
  });

  // TEST C: Escape while scrolled
  await test('TEST C — Escape key while scrolled closes modal, focuses selector, does not remain blocked', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 900;
    env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false);

    // Simulate pressing Escape key
    const escEvent = {
      type: 'keydown',
      key: 'Escape',
      keyCode: 27,
      preventDefault() {},
      stopPropagation() {}
    };
    env.window.dispatchEvent(escEvent);

    // Confirm modal closes
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must be hidden after Escape');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'none');

    // Confirm selector is scrolled into view and focused AFTER dismissal
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College selector must be scrolled into view after Escape');
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College selector must receive focus after Escape');
  });

  // TEST D: OK while scrolled
  await test('TEST D — OK button while scrolled closes modal, scrolls selector into view, and focuses it', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 950;
    env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false);

    // Click OK button
    env.elements.meilpLaunchValidationOkBtn.click();

    // Confirm modal closes
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal must be hidden after OK');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.style.display, 'none');

    // Confirm selector is scrolled into view and focused
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College selector must be scrolled into view after OK');
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College selector must receive focus after OK');
  });

  // TEST E: Faculty validation while scrolled
  await test('TEST E — Faculty validation while scrolled: launch blocked, modal visible, OK dismissal brings faculty into view', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', '');
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 1100;
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch blocked without faculty');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No alert');

    // Modal visible
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), false);
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'Faculty Selection Required');
    assert.strictEqual(env.elements.meilpLaunchValidationMessage.textContent, 'Please select your Faculty before starting this assignment.');
    assert.strictEqual(env.elements.studentFacultySelect.scrolled, false, 'Faculty select must NOT be scrolled before dismissal');

    // Dismiss with OK
    env.elements.meilpLaunchValidationOkBtn.click();
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true);
    assert.strictEqual(env.elements.studentFacultySelect.scrolled, true, 'Faculty select scrolled into view after OK');
    assert.strictEqual(env.elements.studentFacultySelect.focused, true, 'Faculty select focused after OK');
  });

  // TEST F: Valid User Launch
  await test('TEST F — Valid student with College + Faculty launches workbench normally', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL001';
    await env.window.MEILP.updateFacultyDropdown('COL001', 'FAC001');
    env.elements.studentFacultySelect.value = 'FAC001';
    env.window.MEILP.renderAssignmentCards();

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for valid student');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No alert');
    assert.strictEqual(env.elements.meilpLaunchValidationModal.classList.contains('d-none'), true, 'Modal remains hidden');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 7: Student with registered college having zero active faculties -> launch permitted with UNKNOWN
  await test('Test 7: Zero-faculty registered college permits direct launch with UNKNOWN', async () => {
    const env = createEnvironment('STUDENT');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.elements.studentCollegeSelect.value = 'COL003';
    await env.window.MEILP.updateFacultyDropdown('COL003', '');
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.elements.studentFacultySelect.value, 'UNKNOWN');
    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for zero-faculty college');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 8: Guest role -> launch permitted (read-only mode preserved)
  await test('Test 8: Guest role permits direct launch without college or faculty prerequisite', async () => {
    const env = createEnvironment('GUEST');
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, true, 'Launch must succeed for Guest');
    assert.strictEqual(env.getRedirection(), 'assignment-workbench.html?assignment=EA-01');
  });

  // Test 9: Static fallback cards in coursework.html and mirror use handleAssignmentLaunch guard
  await test('Test 9: coursework.html and mirror static cards use handleAssignmentLaunch guard', async () => {
    assert.ok(!courseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked direct card onclicks');
    assert.ok(!courseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked direct anchor tags');
    assert.ok(courseworkHtml.includes('handleAssignmentLaunch'), 'Uses handleAssignmentLaunch guard');
    assert.ok(!mirrorCourseworkHtml.includes('onclick="window.location.href=\'assignment-workbench.html'), 'No unblocked mirror direct onclicks');
    assert.ok(!mirrorCourseworkHtml.includes('<a href="assignment-workbench.html'), 'No unblocked mirror direct anchor tags');
    assert.ok(mirrorCourseworkHtml.includes('handleAssignmentLaunch'), 'Mirror uses handleAssignmentLaunch guard');
  });

  // Test 10: Static modal markup in coursework.html and mirror has accessibility attributes
  await test('Test 10: coursework.html and mirror contain accessible in-page validation modal markup', async () => {
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationModal"'), 'Modal id exists in coursework.html');
    assert.ok(courseworkHtml.includes('role="alertdialog"'), 'role="alertdialog" exists in coursework.html');
    assert.ok(courseworkHtml.includes('aria-modal="true"'), 'aria-modal="true" exists in coursework.html');
    assert.ok(courseworkHtml.includes('tabindex="-1"'), 'tabindex="-1" exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationTitle"'), 'Title element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationMessage"'), 'Message element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationOkBtn"'), 'OK button exists in coursework.html');

    assert.ok(mirrorCourseworkHtml.includes('id="meilpLaunchValidationModal"'), 'Modal id exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('role="alertdialog"'), 'role="alertdialog" exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('aria-modal="true"'), 'aria-modal="true" exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('tabindex="-1"'), 'tabindex="-1" exists in mirror');
  });

  // Test 11: Script cache-busting version tags bumped
  await test('Test 11: Script cache-busting version query string bumped to 20261003a', async () => {
    assert.ok(courseworkHtml.includes('js/app.js?v=20261003a'), 'coursework.html has bumped app.js version');
    assert.ok(mirrorCourseworkHtml.includes('js/app.js?v=20261003a'), 'outputs/meilp/coursework.html has bumped app.js version');
    assert.ok(courseworkHtml.includes('css/theme.css?v=20261003a'), 'coursework.html has bumped theme.css version');
    assert.ok(mirrorCourseworkHtml.includes('css/theme.css?v=20261003a'), 'outputs/meilp/coursework.html has bumped theme.css version');
  });

  // Test 12: Modal styling exists in css/theme.css and mirror
  await test('Test 12: css/theme.css and mirror contain fixed viewport modal rules', async () => {
    assert.ok(themeCss.includes('.meilp-launch-modal-backdrop'), 'themeCss has backdrop styles');
    assert.ok(themeCss.includes('position: fixed'), 'themeCss backdrop has position: fixed');
    assert.ok(themeCss.includes('z-index: 99999'), 'themeCss backdrop has high z-index');
    assert.ok(themeCss.includes('.meilp-launch-modal-content'), 'themeCss has content styles');
    assert.ok(mirrorThemeCss.includes('.meilp-launch-modal-backdrop'), 'mirrorThemeCss has backdrop styles');
    assert.ok(mirrorThemeCss.includes('position: fixed'), 'mirrorThemeCss backdrop has position: fixed');
    assert.ok(mirrorThemeCss.includes('z-index: 99999'), 'mirrorThemeCss backdrop has high z-index');
    assert.ok(mirrorThemeCss.includes('.meilp-launch-modal-content'), 'mirrorThemeCss has content styles');
  });

  // Test 13: 1:1 Mirror parity between root and outputs/meilp/
  await test('Test 13: Exact 1:1 parity between root files and outputs/meilp/ mirrors', async () => {
    assert.strictEqual(courseworkHtml, mirrorCourseworkHtml, 'coursework.html matches outputs/meilp/coursework.html');
    assert.strictEqual(appJs, mirrorAppJs, 'js/app.js matches outputs/meilp/js/app.js');
    assert.strictEqual(challengeRunnerJs, mirrorChallengeRunnerJs, 'js/challenge-runner.js matches outputs/meilp/js/challenge-runner.js');
    assert.strictEqual(themeCss, mirrorThemeCss, 'css/theme.css matches outputs/meilp/css/theme.css');
  });

  console.log('\n================================================================');
  console.log(`IN-PAGE VALIDATION LAUNCH & SCROLL TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
