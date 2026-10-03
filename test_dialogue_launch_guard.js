/**
 * MEILP — IN-FLOW LAUNCH VALIDATION BANNER & SCROLL-SAFE TEST SUITE
 * (Google Sites Embed & Direct Execution Compatible)
 * 
 * Validates:
 * 1. Test A: Initial coursework position starts at top (scroll position = 0), manual scroll restoration set, does not force to top after user scroll
 * 2. Test B: In-flow banner appears when College missing while scrolled: blocked launch, banner visible in-flow, scroll position preserved
 * 3. Test C: Escape key dismisses banner while scrolled, focuses selector, unblocks page
 * 4. Test D: OK button dismisses banner, scrolls selector into view, and focuses selector
 * 5. Test E: Faculty validation while scrolled: in-flow banner with exact Faculty message, OK dismissal brings faculty into view
 * 6. Test F: Valid student launch succeeds directly without banner or alert
 * 7. Student with zero-faculty registered college -> launch permitted with UNKNOWN
 * 8. Guest -> Permitted direct launch (read-only mode intact, no college/faculty required)
 * 9. Static fallback cards in coursework.html and mirror use handleAssignmentLaunch guard
 * 10. Static banner markup in coursework.html and mirror has accessibility attributes (role="alert", aria-live="assertive", no fixed modal)
 * 11. Script cache-busting version tags bumped to 20261003b
 * 12. In-flow banner styling in css/theme.css and mirror with position: relative, no position: fixed
 * 13. Repeated invalid assignment clicks do not create duplicate banners
 * 14. Google Sites embed safety: banner in normal document flow, no parent-window code (no window.parent, window.top, postMessage)
 * 15. Exact 1:1 file parity between root and outputs/meilp/ mirrors
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — IN-FLOW LAUNCH VALIDATION BANNER TEST SUITE');
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
    this.children = [];
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
  closest(sel) {
    if (sel === '.assignment-card' && (this.classList.contains('assignment-card') || this.id.includes('Card'))) return this;
    if (sel === '.col-12' && this.classList.contains('col-12')) return this;
    if (this.parentElement && typeof this.parentElement.closest === 'function') {
      return this.parentElement.closest(sel);
    }
    return null;
  }
  insertBefore(newChild, refChild) {
    if (newChild) {
      if (newChild.parentElement && newChild.parentElement.children) {
        newChild.parentElement.children = newChild.parentElement.children.filter(c => c !== newChild);
      }
      newChild.parentElement = this;
      if (!this.children) this.children = [];
      const idx = this.children.indexOf(refChild);
      if (idx !== -1) {
        this.children.splice(idx, 0, newChild);
      } else {
        this.children.push(newChild);
      }
    }
    return newChild;
  }
  appendChild(child) {
    if (child) {
      if (child.parentElement && child.parentElement.children) {
        child.parentElement.children = child.parentElement.children.filter(c => c !== child);
      }
      child.parentElement = this;
      if (!this.children) this.children = [];
      this.children.push(child);
    }
    return child;
  }
  querySelector(sel) {
    for (const c of this.children) {
      if (sel.includes(c.id)) return c;
      if (typeof c.querySelector === 'function') {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    return null;
  }
  getBoundingClientRect() {
    return { top: 240, bottom: 460, left: 280, right: 720, width: 440, height: 220 };
  }
}

function createEnvironment(role = 'STUDENT') {
  const localStorage = new LocalStorageMock();
  if (role) localStorage.setItem('meilp:activeRole', role);

  const mainContainer = new DOMElementMock('mainContainer', 'div');
  const assignmentGrid = new DOMElementMock('assignmentGrid', 'div');
  assignmentGrid.parentElement = mainContainer;
  mainContainer.children.push(assignmentGrid);

  const elements = {
    studentCollegeSelect: new DOMElementMock('studentCollegeSelect', 'select'),
    studentFacultySelect: new DOMElementMock('studentFacultySelect', 'select'),
    btnShowAssignments: new DOMElementMock('btnShowAssignments', 'button'),
    facultyStatusBanner: new DOMElementMock('facultyStatusBanner', 'div'),
    assignmentGrid: assignmentGrid,
    meilpLaunchValidationBanner: new DOMElementMock('meilpLaunchValidationBanner', 'div'),
    meilpLaunchValidationTitle: new DOMElementMock('meilpLaunchValidationTitle', 'h5'),
    meilpLaunchValidationMessage: new DOMElementMock('meilpLaunchValidationMessage', 'p'),
    meilpLaunchValidationOkBtn: new DOMElementMock('meilpLaunchValidationOkBtn', 'button'),
    meilpLaunchValidationCloseBtn: new DOMElementMock('meilpLaunchValidationCloseBtn', 'button')
  };

  elements.studentCollegeSelect.innerHTML = '<option value="" disabled selected>Select Your College</option>';
  elements.studentFacultySelect.innerHTML = '<option value="" disabled selected>Select Your Faculty</option>';
  elements.meilpLaunchValidationBanner.classList.add('d-none');
  elements.meilpLaunchValidationBanner.style.display = 'none';

  // Attach banner children
  elements.meilpLaunchValidationBanner.children.push(
    elements.meilpLaunchValidationTitle,
    elements.meilpLaunchValidationMessage,
    elements.meilpLaunchValidationOkBtn,
    elements.meilpLaunchValidationCloseBtn
  );
  elements.meilpLaunchValidationTitle.parentElement = elements.meilpLaunchValidationBanner;
  elements.meilpLaunchValidationMessage.parentElement = elements.meilpLaunchValidationBanner;
  elements.meilpLaunchValidationOkBtn.parentElement = elements.meilpLaunchValidationBanner;
  elements.meilpLaunchValidationCloseBtn.parentElement = elements.meilpLaunchValidationBanner;

  elements.meilpLaunchValidationBanner.parentElement = mainContainer;
  mainContainer.children.unshift(elements.meilpLaunchValidationBanner);

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
    children: [mainContainer],
    appendChild(el) {
      if (el) {
        el.parentElement = bodyMock;
        if (el.id) elements[el.id] = el;
      }
    }
  };

  mainContainer.parentElement = bodyMock;

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
        if (sel === '#meilpLaunchValidationBanner') return elements.meilpLaunchValidationBanner;
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
    mainContainer,
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
    env.window.initCourseworkScroll();
    assert.strictEqual(env.window.history.scrollRestoration, 'manual', 'history.scrollRestoration must be manual');
    assert.strictEqual(env.window.scrollY, 0, 'window.scrollY must start at 0');
    assert.strictEqual(env.docEl.scrollTop, 0, 'docEl.scrollTop must be 0');
    assert.strictEqual(env.body.scrollTop, 0, 'body.scrollTop must be 0');

    env.window.scrollY = 850;
    env.docEl.scrollTop = 850;

    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    assert.strictEqual(env.window.scrollY, 850, 'User scroll position must be preserved after card render');
    assert.strictEqual(env.docEl.scrollTop, 850, 'docEl scroll position must be preserved');
  });

  // TEST B: Missing College while scrolled -> in-flow banner appears
  await test('TEST B — Missing College while scrolled: launch blocked, in-flow banner appears, exact message appears, scroll position preserved', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 1200;

    const res = env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(res, false, 'Launch must be blocked without college');
    assert.strictEqual(env.getNativeAlertCallCount(), 0, 'No native alert');

    // Confirm banner is visible
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), false, 'Banner must be visible');
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.style.display, 'block', 'Banner display must be block');
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'College Required');
    assert.strictEqual(env.elements.meilpLaunchValidationMessage.textContent, 'Please select your College before starting this assignment.');

    // Confirm page scroll position was NOT reset to top to show banner
    assert.strictEqual(env.window.scrollY, 1200, 'Page must not be scrolled to top merely to show banner');
    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, false, 'Target selector must not be scrolled prior to dismissal');

    // Confirm OK button received focus with preventScroll: true
    assert.strictEqual(env.elements.meilpLaunchValidationOkBtn.focused, true, 'OK button must receive focus');
    assert.deepStrictEqual(env.elements.meilpLaunchValidationOkBtn.focusOptions, { preventScroll: true }, 'Focus must prevent scrolling');
  });

  // TEST C: Escape while scrolled
  await test('TEST C — Escape key while scrolled closes banner, focuses selector, does not remain blocked', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 900;
    env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), false);

    const escEvent = {
      type: 'keydown',
      key: 'Escape',
      keyCode: 27,
      preventDefault() {},
      stopPropagation() {}
    };
    env.window.dispatchEvent(escEvent);

    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), true, 'Banner must be hidden after Escape');
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.style.display, 'none');

    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College selector must be scrolled into view after Escape');
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College selector must receive focus after Escape');
  });

  // TEST D: OK while scrolled
  await test('TEST D — OK button while scrolled closes banner, scrolls selector into view, and focuses it', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    env.window.scrollY = 950;
    env.window.MEILP.launchAssignment('EA-01');
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), false);

    env.elements.meilpLaunchValidationOkBtn.click();

    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), true, 'Banner must be hidden after OK');
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.style.display, 'none');

    assert.strictEqual(env.elements.studentCollegeSelect.scrolled, true, 'College selector must be scrolled into view after OK');
    assert.strictEqual(env.elements.studentCollegeSelect.focused, true, 'College selector must receive focus after OK');
  });

  // TEST E: Missing Faculty validation while scrolled
  await test('TEST E — Missing Faculty validation while scrolled: launch blocked, banner visible, OK dismissal brings faculty into view', async () => {
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

    // Banner visible
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), false);
    assert.strictEqual(env.elements.meilpLaunchValidationTitle.textContent, 'Faculty Required');
    assert.strictEqual(env.elements.meilpLaunchValidationMessage.textContent, 'Please select your Faculty before starting this assignment.');
    assert.strictEqual(env.elements.studentFacultySelect.scrolled, false, 'Faculty select must NOT be scrolled before dismissal');

    // Dismiss with OK
    env.elements.meilpLaunchValidationOkBtn.click();
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), true);
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
    assert.strictEqual(env.elements.meilpLaunchValidationBanner.classList.contains('d-none'), true, 'Banner remains hidden');
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

  // Test 10: Static banner markup in coursework.html and mirror has accessibility attributes
  await test('Test 10: coursework.html and mirror contain accessible in-flow validation banner markup', async () => {
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationBanner"'), 'Banner id exists in coursework.html');
    assert.ok(courseworkHtml.includes('role="alert"'), 'role="alert" exists in coursework.html');
    assert.ok(courseworkHtml.includes('aria-live="assertive"'), 'aria-live="assertive" exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationTitle"'), 'Title element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationMessage"'), 'Message element exists in coursework.html');
    assert.ok(courseworkHtml.includes('id="meilpLaunchValidationOkBtn"'), 'OK button exists in coursework.html');
    assert.ok(!courseworkHtml.includes('meilpLaunchValidationModal'), 'Old modal ID does not exist in coursework.html');

    assert.ok(mirrorCourseworkHtml.includes('id="meilpLaunchValidationBanner"'), 'Banner id exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('role="alert"'), 'role="alert" exists in mirror');
    assert.ok(mirrorCourseworkHtml.includes('aria-live="assertive"'), 'aria-live="assertive" exists in mirror');
    assert.ok(!mirrorCourseworkHtml.includes('meilpLaunchValidationModal'), 'Old modal ID does not exist in mirror');
  });

  // Test 11: Script cache-busting version tags bumped
  await test('Test 11: Script cache-busting version query string bumped to 20261003b', async () => {
    assert.ok(courseworkHtml.includes('js/app.js?v=20261003b'), 'coursework.html has bumped app.js version');
    assert.ok(mirrorCourseworkHtml.includes('js/app.js?v=20261003b'), 'outputs/meilp/coursework.html has bumped app.js version');
    assert.ok(courseworkHtml.includes('css/theme.css?v=20261003b'), 'coursework.html has bumped theme.css version');
    assert.ok(mirrorCourseworkHtml.includes('css/theme.css?v=20261003b'), 'outputs/meilp/coursework.html has bumped theme.css version');
  });

  // Test 12: In-flow banner styling exists in css/theme.css and mirror
  await test('Test 12: css/theme.css and mirror contain in-flow banner rules with position: relative', async () => {
    assert.ok(themeCss.includes('.meilp-launch-validation-banner'), 'themeCss has banner styles');
    assert.ok(themeCss.includes('position: relative'), 'themeCss banner has position: relative');
    assert.ok(!themeCss.includes('.meilp-launch-modal-backdrop'), 'themeCss does not have old modal backdrop');
    assert.ok(mirrorThemeCss.includes('.meilp-launch-validation-banner'), 'mirrorThemeCss has banner styles');
    assert.ok(mirrorThemeCss.includes('position: relative'), 'mirrorThemeCss banner has position: relative');
    assert.ok(!mirrorThemeCss.includes('.meilp-launch-modal-backdrop'), 'mirrorThemeCss does not have old modal backdrop');
  });

  // Test 13: Repeated invalid assignment clicks do not create duplicate banners
  await test('Test 13: Repeated invalid assignment clicks do not create duplicate banners', async () => {
    const env = createEnvironment('STUDENT');
    env.window.initCourseworkScroll();
    await env.window.MEILP.populateCollegeAndFacultyDropdowns();
    env.window.MEILP.renderAssignmentCards();

    // Click assignment launch multiple times
    env.window.MEILP.launchAssignment('EA-01');
    env.window.MEILP.launchAssignment('EA-02');
    env.window.MEILP.launchAssignment('EA-01');

    // Only one banner exists with id meilpLaunchValidationBanner
    const banner = env.elements.meilpLaunchValidationBanner;
    assert.strictEqual(banner.classList.contains('d-none'), false, 'Banner remains visible');
    assert.strictEqual(env.mainContainer.children.filter(c => c.id === 'meilpLaunchValidationBanner' || (c.children && c.children.some(sub => sub.id === 'meilpLaunchValidationBanner'))).length, 1, 'Only one validation banner exists');
  });

  // Test 14: No fixed-position modal or parent-window code
  await test('Test 14: No fixed-position modal or parent-window code (Google Sites embed safety)', async () => {
    assert.ok(!appJs.includes('window.parent'), 'app.js does not use window.parent');
    assert.ok(!appJs.includes('window.top'), 'app.js does not use window.top');
    assert.ok(!appJs.includes('postMessage'), 'app.js does not use postMessage');
    assert.ok(!courseworkHtml.includes('window.parent'), 'coursework.html does not use window.parent');
    assert.ok(!courseworkHtml.includes('window.top'), 'coursework.html does not use window.top');
    assert.ok(!courseworkHtml.includes('postMessage'), 'coursework.html does not use postMessage');
    assert.ok(!themeCss.includes('.meilp-launch-validation-banner { position: fixed'), 'theme.css banner is not fixed');
    assert.ok(!themeCss.includes('.meilp-launch-validation-banner { position: sticky'), 'theme.css banner is not sticky');
  });

  // Test 15: 1:1 Mirror parity between root and outputs/meilp/
  await test('Test 15: Exact 1:1 parity between root files and outputs/meilp/ mirrors', async () => {
    assert.strictEqual(courseworkHtml, mirrorCourseworkHtml, 'coursework.html matches outputs/meilp/coursework.html');
    assert.strictEqual(appJs, mirrorAppJs, 'js/app.js matches outputs/meilp/js/app.js');
    assert.strictEqual(challengeRunnerJs, mirrorChallengeRunnerJs, 'js/challenge-runner.js matches outputs/meilp/js/challenge-runner.js');
    assert.strictEqual(themeCss, mirrorThemeCss, 'css/theme.css matches outputs/meilp/css/theme.css');
  });

  console.log('\n================================================================');
  console.log(`IN-FLOW VALIDATION BANNER TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
