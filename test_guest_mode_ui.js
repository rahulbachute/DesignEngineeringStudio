/**
 * MEILP - GUEST MODE UI CORRECTION TEST SUITE
 * Implements all 8 Required Test Cases from Section 11:
 * TEST 1: Guest page initial load
 * TEST 2: Student profile exists in localStorage + Guest page
 * TEST 3: Guest → Student
 * TEST 4: Student → Guest
 * TEST 5: Guest page reload
 * TEST 6: Guest direct coursework URL
 * TEST 7: Registered college + active faculties in Student mode
 * TEST 8: Registered college + zero active faculties in Student mode
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load scripts
const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

function setupTestDOM(initialRole = 'STUDENT', initialCollege = '', initialFaculty = '') {
  const store = {
    'meilp:activeRole': initialRole
  };
  if (initialCollege) {
    store['meilp:selectedStudentCollegeId'] = JSON.stringify(initialCollege);
    store['meilp:selectedStudentCollege'] = JSON.stringify(initialCollege);
    store['meilp:studentProfile'] = JSON.stringify({
      collegeId: initialCollege,
      collegeName: initialCollege,
      facultyId: initialFaculty,
      facultyName: initialFaculty
    });
  }
  if (initialFaculty) {
    store['meilp:selectedStudentFacultyId'] = JSON.stringify(initialFaculty);
    store['meilp:selectedStudentFaculty'] = JSON.stringify(initialFaculty);
  }

  const elements = {};
  function getOrCreateElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        innerHTML: '',
        disabled: false,
        className: '',
        classList: {
          _classes: new Set(),
          add(...c) { c.forEach(x => this._classes.add(x)); },
          remove(...c) { c.forEach(x => this._classes.delete(x)); },
          contains(x) { return this._classes.has(x); }
        },
        _listeners: {},
        addEventListener(evt, fn) {
          if (!this._listeners[evt]) this._listeners[evt] = [];
          this._listeners[evt].push(fn);
        },
        dispatchEvent(evt) {
          const fns = this._listeners[evt.type] || [];
          fns.forEach(fn => fn(evt));
        },
        focus() {},
        scrollIntoView() {}
      };
    }
    return elements[id];
  }

  // Pre-seed known elements
  getOrCreateElement('studentCollegeSelect');
  getOrCreateElement('studentFacultySelect');
  getOrCreateElement('btnShowAssignments');
  getOrCreateElement('facultyStatusBanner');
  getOrCreateElement('roleBtnStudent');
  getOrCreateElement('roleBtnFaculty');
  getOrCreateElement('roleBtnGuest');
  getOrCreateElement('currentRoleBadge');
  getOrCreateElement('switchRoleBtn');
  getOrCreateElement('navActiveRoleBadge');
  getOrCreateElement('navRoleText');

  const mockWindow = {
    location: { href: 'http://localhost:5500/index.html', search: '' },
    localStorage: {
      getItem(k) { return store[k] || null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
      clear() { Object.keys(store).forEach(k => delete store[k]); }
    },
    document: {
      getElementById: (id) => getOrCreateElement(id),
      querySelector: (sel) => {
        if (sel === '[data-assignment-grid]') return getOrCreateElement('assignmentGrid');
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    alert: () => {}
  };

  mockWindow.window = mockWindow;

  // Run config.js in mockWindow
  const runConfig = new Function('window', 'document', 'console', configCode);
  runConfig(mockWindow, mockWindow.document, mockWindow.console);
  if (mockWindow.MEILP && mockWindow.MEILP.googleSheetsConfig) {
    mockWindow.MEILP.googleSheetsConfig.submissionWebAppUrl = '';
  }

  // Run app.js in mockWindow
  const runApp = new Function('window', 'document', 'console', appCode);
  runApp(mockWindow, mockWindow.document, mockWindow.console);

  return {
    window: mockWindow,
    elements,
    store
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('MEILP - GUEST MODE UI CORRECTION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Guest page initial load
  // Expected: College neutral, Faculty neutral, both disabled, no student values displayed
  // ---------------------------------------------------------------------------
  await test('TEST 1: Guest page initial load -> College neutral, Faculty neutral, both disabled, no student values displayed', async () => {
    const ctx = setupTestDOM('GUEST');
    const { window, elements } = ctx;

    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();

    const collegeSel = elements['studentCollegeSelect'];
    const facultySel = elements['studentFacultySelect'];
    const btnShow = elements['btnShowAssignments'];
    const banner = elements['facultyStatusBanner'];

    assert.strictEqual(collegeSel.value, '', 'College selector value must be neutral/empty (Select Your College)');
    assert.strictEqual(collegeSel.disabled, true, 'College selector must be disabled in Guest mode');
    assert.strictEqual(facultySel.value, '', 'Faculty selector value must be neutral/empty (Select Your Faculty)');
    assert.strictEqual(facultySel.disabled, true, 'Faculty selector must be disabled in Guest mode');
    assert.strictEqual(btnShow.disabled, true, 'Show button must be disabled in Guest mode');
    assert.ok(banner.innerHTML.includes('Guest Mode (Read-Only)'), 'Guest banner must be visible');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Student profile exists in localStorage + Guest page
  // Expected: Student profile is NOT displayed. Preserved in storage != displayed.
  // ---------------------------------------------------------------------------
  await test('TEST 2: Student profile exists in localStorage + Guest page -> Student profile is NOT displayed', async () => {
    const ctx = setupTestDOM('GUEST', 'COL001', 'FAC001');
    const { window, elements, store } = ctx;

    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();

    const collegeSel = elements['studentCollegeSelect'];
    const facultySel = elements['studentFacultySelect'];
    const btnShow = elements['btnShowAssignments'];

    assert.strictEqual(collegeSel.value, '', 'Must NOT display student college in Guest mode');
    assert.strictEqual(collegeSel.disabled, true, 'College selector must be disabled');
    assert.strictEqual(facultySel.value, '', 'Must NOT display student faculty in Guest mode');
    assert.strictEqual(facultySel.disabled, true, 'Faculty selector must be disabled');
    assert.strictEqual(btnShow.disabled, true, 'Show button must be disabled');
    assert.ok(!facultySel.innerHTML.includes('UNKNOWN'), 'Must NOT show UNKNOWN');
    assert.ok(!facultySel.innerHTML.includes('Unassigned Faculty'), 'Must NOT show Unassigned Faculty');

    // Crucial: Student profile in localStorage is preserved and NOT deleted
    const profile = JSON.parse(store['meilp:studentProfile'] || '{}');
    assert.strictEqual(profile.collegeId, 'COL001', 'Student profile collegeId must be preserved in localStorage');
    assert.strictEqual(profile.facultyId, 'FAC001', 'Student profile facultyId must be preserved in localStorage');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Guest -> Student
  // Expected: Student controls enabled, existing Student logic restored
  // ---------------------------------------------------------------------------
  await test('TEST 3: Guest -> Student -> Student controls enabled, existing Student logic restored', async () => {
    const ctx = setupTestDOM('GUEST', 'COL001', 'FAC001');
    const { window, elements } = ctx;

    // Verify Guest mode neutral initial state
    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();
    assert.strictEqual(elements['studentCollegeSelect'].value, '');
    assert.strictEqual(elements['studentCollegeSelect'].disabled, true);
    assert.strictEqual(elements['studentFacultySelect'].value, '');
    assert.strictEqual(elements['studentFacultySelect'].disabled, true);

    // Switch to STUDENT
    window.MEILP.setActiveRole('STUDENT');
    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();

    assert.strictEqual(elements['studentCollegeSelect'].disabled, false, 'College selector must be enabled in Student mode');
    assert.strictEqual(elements['studentFacultySelect'].disabled, false, 'Faculty selector must be enabled in Student mode');
    assert.strictEqual(elements['studentCollegeSelect'].value, 'COL001', 'Student college COL001 must be restored');
    assert.strictEqual(elements['studentFacultySelect'].value, 'FAC001', 'Student faculty FAC001 must be restored');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Student -> Guest
  // Expected: Previous College/Faculty disappear from UI, controls become disabled
  // ---------------------------------------------------------------------------
  await test('TEST 4: Student -> Guest -> Previous College/Faculty disappear from UI, controls become disabled', async () => {
    const ctx = setupTestDOM('STUDENT', 'COL001', 'FAC001');
    const { window, elements, store } = ctx;

    // Student mode active with selections
    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();
    assert.strictEqual(elements['studentCollegeSelect'].value, 'COL001');
    assert.strictEqual(elements['studentFacultySelect'].value, 'FAC001');

    // Switch to GUEST
    window.MEILP.setActiveRole('GUEST');
    window.MEILP.renderAssignmentCards();

    assert.strictEqual(elements['studentCollegeSelect'].value, '', 'College display must become neutral / Select Your College');
    assert.strictEqual(elements['studentFacultySelect'].value, '', 'Faculty display must become neutral / Select Your Faculty');
    assert.strictEqual(elements['studentCollegeSelect'].disabled, true, 'College selector must be disabled');
    assert.strictEqual(elements['studentFacultySelect'].disabled, true, 'Faculty selector must be disabled');
    assert.strictEqual(elements['btnShowAssignments'].disabled, true, 'Show button must be disabled');
    assert.ok(elements['facultyStatusBanner'].innerHTML.includes('Guest Mode (Read-Only)'), 'Guest banner must be visible');

    // Student profile remains preserved in storage
    const profile = JSON.parse(store['meilp:studentProfile'] || '{}');
    assert.strictEqual(profile.collegeId, 'COL001', 'Student profile must be preserved in storage');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Guest page reload
  // Expected: Previous Student College/Faculty remain hidden on reload
  // ---------------------------------------------------------------------------
  await test('TEST 5: Guest page reload -> Previous Student College/Faculty remain hidden', async () => {
    const freshAppCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
    const store = {
      'meilp:activeRole': 'GUEST',
      'meilp:studentProfile': JSON.stringify({
        collegeId: 'COL001',
        collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
        facultyId: 'FAC001',
        facultyName: 'Dr. Rahul Bachute'
      })
    };

    const elements = {};
    function getOrCreateElement(id) {
      if (!elements[id]) {
        elements[id] = {
          id, value: '', innerHTML: '', disabled: false,
          classList: { _classes: new Set(), add(...c) { c.forEach(x => this._classes.add(x)); }, remove(...c) { c.forEach(x => this._classes.delete(x)); }, contains(x) { return this._classes.has(x); } },
          addEventListener() {}, dispatchEvent() {}
        };
      }
      return elements[id];
    }
    getOrCreateElement('studentCollegeSelect');
    getOrCreateElement('studentFacultySelect');
    getOrCreateElement('btnShowAssignments');
    getOrCreateElement('facultyStatusBanner');

    const mockWin = {
      location: { href: 'http://localhost:5500/coursework.html' },
      localStorage: {
        getItem(k) { return store[k] || null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      },
      document: {
        getElementById: (id) => getOrCreateElement(id),
        querySelector: (sel) => (sel === '[data-assignment-grid]' ? getOrCreateElement('assignmentGrid') : null),
        querySelectorAll: () => [],
        addEventListener: () => {}
      },
      console: { log() {}, warn() {}, error() {} }
    };
    mockWin.window = mockWin;

    new Function('window', 'document', 'console', configCode)(mockWin, mockWin.document, mockWin.console);
    if (mockWin.MEILP && mockWin.MEILP.googleSheetsConfig) {
      mockWin.MEILP.googleSheetsConfig.submissionWebAppUrl = '';
    }
    new Function('window', 'document', 'console', freshAppCode)(mockWin, mockWin.document, mockWin.console);

    // Initial load simulation on Guest reload
    await mockWin.MEILP.populateCollegeAndFacultyDropdowns();
    mockWin.MEILP.renderAssignmentCards();

    // Verify role remains GUEST and controls remain neutral/disabled
    assert.strictEqual(mockWin.MEILP.getActiveRole(), 'GUEST');
    assert.strictEqual(elements['studentCollegeSelect'].value, '', 'College must be neutral on reload');
    assert.strictEqual(elements['studentFacultySelect'].value, '', 'Faculty must be neutral on reload');
    assert.strictEqual(elements['studentCollegeSelect'].disabled, true, 'College must be disabled');
    assert.strictEqual(elements['studentFacultySelect'].disabled, true, 'Faculty must be disabled');

    // Switch to Student later
    mockWin.MEILP.setActiveRole('STUDENT');
    await mockWin.MEILP.populateCollegeAndFacultyDropdowns();
    assert.strictEqual(elements['studentCollegeSelect'].value, 'COL001', 'Student college can be restored after switching');
    assert.strictEqual(elements['studentFacultySelect'].value, 'FAC001', 'Student faculty can be restored after switching');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Guest direct coursework URL
  // Expected: Neutral controls, no student profile leakage
  // ---------------------------------------------------------------------------
  await test('TEST 6: Guest direct coursework URL -> Neutral controls, no student profile leakage', async () => {
    const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
    const roleCheckMatches = courseworkHtml.includes('norm !== "STUDENT" && norm !== "GUEST"');
    assert.ok(roleCheckMatches, 'coursework.html must permit direct navigation when activeRole is GUEST');

    const ctx = setupTestDOM('GUEST', 'COL001', 'FAC001');
    const { window, elements } = ctx;

    // Simulate direct load
    window.MEILP.syncGatewayControls('GUEST');
    await window.MEILP.populateCollegeAndFacultyDropdowns();
    window.MEILP.renderAssignmentCards();

    assert.strictEqual(elements['studentCollegeSelect'].value, '', 'No college restored');
    assert.strictEqual(elements['studentFacultySelect'].value, '', 'No faculty restored');
    assert.strictEqual(elements['studentCollegeSelect'].disabled, true, 'College disabled');
    assert.strictEqual(elements['studentFacultySelect'].disabled, true, 'Faculty disabled');
    assert.strictEqual(elements['btnShowAssignments'].disabled, true, 'Show disabled');
    assert.ok(!elements['studentFacultySelect'].innerHTML.includes('UNKNOWN'), 'No UNKNOWN displayed');
    assert.ok(!elements['studentFacultySelect'].innerHTML.includes('Unassigned Faculty'), 'No Unassigned Faculty displayed');
    assert.strictEqual(window.MEILP.getSelectedCollege(), '', 'getSelectedCollege returns empty string in Guest');
    assert.strictEqual(window.MEILP.getSelectedFaculty(), '', 'getSelectedFaculty returns empty string in Guest');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Registered college + active faculties in Student mode
  // Expected: Existing faculty rules unchanged, NO Unassigned option
  // ---------------------------------------------------------------------------
  await test('TEST 7: Registered college + active faculties in Student mode -> Existing rules unchanged, NO Unassigned option', async () => {
    const ctx = setupTestDOM('STUDENT');
    const { window, elements } = ctx;

    window.MEILP.setActiveRole('STUDENT');
    const collegeSel = elements['studentCollegeSelect'];
    const facultySel = elements['studentFacultySelect'];
    const btnShow = elements['btnShowAssignments'];

    // Select COL001 (has active faculties: FAC001, FAC002)
    collegeSel.value = 'COL001';
    await window.MEILP.updateFacultyDropdown('COL001');
    window.MEILP.renderAssignmentCards();

    // Verify dropdown content
    assert.ok(!facultySel.innerHTML.includes('Unassigned Faculty'), 'Must NOT contain Unassigned Faculty');
    assert.ok(!facultySel.innerHTML.includes('UNKNOWN'), 'Must NOT contain UNKNOWN');
    assert.ok(facultySel.innerHTML.includes('Select Your Faculty'), 'Must contain placeholder Select Your Faculty');
    assert.ok(facultySel.innerHTML.includes('FAC001'), 'Must contain FAC001');
    assert.ok(facultySel.innerHTML.includes('FAC002'), 'Must contain FAC002');
    assert.ok(!facultySel.innerHTML.includes('FAC003'), 'Must NOT contain FAC003');

    // Without selecting faculty, student is blocked
    facultySel.value = '';
    window.MEILP.renderAssignmentCards();
    assert.strictEqual(btnShow.disabled, true, 'Show button must remain disabled until faculty is selected');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Registered college + zero active faculties in Student mode
  // Expected: Existing automatic UNKNOWN / Unassigned behaviour unchanged
  // ---------------------------------------------------------------------------
  await test('TEST 8: Registered college + zero active faculties in Student mode -> Auto-select UNKNOWN / Unassigned', async () => {
    const ctx = setupTestDOM('STUDENT');
    const { window, elements } = ctx;

    window.MEILP.setActiveRole('STUDENT');
    const collegeSel = elements['studentCollegeSelect'];
    const facultySel = elements['studentFacultySelect'];
    const btnShow = elements['btnShowAssignments'];

    // Select COL003 (registered college with 0 active faculties in ACTIVE_FACULTY_REGISTRY)
    collegeSel.value = 'COL003';
    await window.MEILP.updateFacultyDropdown('COL003');
    window.MEILP.renderAssignmentCards();

    assert.strictEqual(facultySel.value, 'UNKNOWN', 'Must auto-select UNKNOWN for college with zero active faculties');
    assert.ok(facultySel.innerHTML.includes('Unassigned Faculty / No Faculty'), 'Must display Unassigned Faculty / No Faculty');
    assert.strictEqual(btnShow.disabled, false, 'Show button must be enabled for zero-faculty college');
  });

  // ---------------------------------------------------------------------------
  // ADDITIONAL: Programmatic mutation safety
  // ---------------------------------------------------------------------------
  await test('ADDITIONAL: Attempt to change College or Faculty while Guest -> Profile remains unmutated', async () => {
    const ctx = setupTestDOM('GUEST', 'COL001', 'FAC001');
    const { window, elements, store } = ctx;

    window.MEILP.setActiveRole('GUEST');
    window.MEILP.renderAssignmentCards();

    const collegeSel = elements['studentCollegeSelect'];
    const facultySel = elements['studentFacultySelect'];

    assert.strictEqual(collegeSel.disabled, true);
    assert.strictEqual(facultySel.disabled, true);

    collegeSel.value = 'COL002';
    collegeSel.dispatchEvent({ type: 'change' });
    facultySel.value = 'FAC002';
    facultySel.dispatchEvent({ type: 'change' });

    const profile = JSON.parse(store['meilp:studentProfile'] || '{}');
    assert.strictEqual(profile.collegeId, 'COL001', 'College in profile must NOT change while in Guest mode');
    assert.strictEqual(profile.facultyId, 'FAC001', 'Faculty in profile must NOT change while in Guest mode');
  });

  console.log('\n================================================================');
  console.log(`TOTAL GUEST MODE UI TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
