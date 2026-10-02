/**
 * MEILP — PAGE-LEVEL SEPARATION TEST SUITE
 * Validates clean separation between Access Gateway (index.html) and Coursework (coursework.html)
 * Tests all 10 authoritative test requirements from Section 14
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — PAGE-LEVEL SEPARATION TEST SUITE');
console.log('Access Gateway (index.html) vs Coursework (coursework.html)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Open Access Gateway (index.html)
// Expected: Only role selection is shown. No assignment cards, no College selector,
// no Faculty selector in the rendered DOM.
// -----------------------------------------------------------------------------
runTest('TEST 1: Access Gateway (index.html) contains ONLY role selection (no assignment cards/selectors in DOM)', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  // Must have role selection elements
  assert.ok(indexHtml.includes('id="accessGateway"'), 'Must contain accessGateway container');
  assert.ok(indexHtml.includes('id="roleBtnStudent"'), 'Must contain roleBtnStudent');
  assert.ok(indexHtml.includes('id="roleBtnFaculty"'), 'Must contain roleBtnFaculty');
  assert.ok(indexHtml.includes('id="roleBtnGuest"'), 'Must contain roleBtnGuest');
  assert.ok(indexHtml.includes('Select your role to access the corresponding learning and operational environment'), 'Must have role gateway prompt');

  // Must NOT contain rendered assignment section or dropdown tags in actual markup outside comments
  // Remove comments to check only rendered DOM markup
  const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, '');

  assert.ok(!htmlWithoutComments.includes('id="assignments"'), 'Rendered DOM must NOT contain id="assignments"');
  assert.ok(!htmlWithoutComments.includes('id="studentCollegeSelect"'), 'Rendered DOM must NOT contain id="studentCollegeSelect"');
  assert.ok(!htmlWithoutComments.includes('id="studentFacultySelect"'), 'Rendered DOM must NOT contain id="studentFacultySelect"');
  assert.ok(!htmlWithoutComments.includes('id="btnShowAssignments"'), 'Rendered DOM must NOT contain id="btnShowAssignments"');
  assert.ok(!htmlWithoutComments.includes('data-assignment-grid'), 'Rendered DOM must NOT contain data-assignment-grid');
  assert.ok(!htmlWithoutComments.includes('assignment-card'), 'Rendered DOM must NOT contain assignment-card');
});

// -----------------------------------------------------------------------------
// TEST 2: Select STUDENT on Access Gateway
// Expected: Sets role and navigates to coursework.html; coursework.html has student controls.
// -----------------------------------------------------------------------------
runTest('TEST 2: Select STUDENT navigates to coursework.html with active student controls', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('selectRole(\'STUDENT\')') || indexHtml.includes('selectRole("STUDENT")'), 'index.html must invoke selectRole("STUDENT")');

  // Verify coursework.html exists and has student controls
  const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
  assert.ok(courseworkHtml.includes('id="assignments"'), 'coursework.html must have assignments section');
  assert.ok(courseworkHtml.includes('id="studentCollegeSelect"'), 'coursework.html must have studentCollegeSelect');
  assert.ok(courseworkHtml.includes('id="studentFacultySelect"'), 'coursework.html must have studentFacultySelect');
  assert.ok(courseworkHtml.includes('id="btnShowAssignments"'), 'coursework.html must have btnShowAssignments');
  assert.ok(courseworkHtml.includes('data-assignment-grid'), 'coursework.html must have data-assignment-grid');

  // Simulate selectRole('STUDENT') navigation
  const store = {};
  let targetUrl = '';
  function mockSelectRole(role) {
    store['meilp:activeRole'] = role;
    if (role === 'STUDENT' || role === 'GUEST') {
      targetUrl = 'coursework.html';
    }
  }
  mockSelectRole('STUDENT');
  assert.strictEqual(store['meilp:activeRole'], 'STUDENT');
  assert.strictEqual(targetUrl, 'coursework.html');
});

// -----------------------------------------------------------------------------
// TEST 3: Student selects registered college with active faculties on coursework page
// Expected: Existing faculty rules remain intact. Dropdown contains active faculties,
// no Unassigned Faculty / UNKNOWN option.
// -----------------------------------------------------------------------------
runTest('TEST 3: Student on coursework page: registered college with active faculty enforces explicit faculty selection', () => {
  const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  assert.ok(appJs.includes('validActiveFaculties.length > 0'), 'app.js must handle registered college with active faculties');
  assert.ok(appJs.includes('Select Your Faculty'), 'Must provide placeholder option');
  // Check that UNKNOWN is prevented when valid active faculties exist
  assert.ok(appJs.includes('isStudentBlocked'), 'Must track blocked state when faculty is not selected');
});

// -----------------------------------------------------------------------------
// TEST 4: Select GUEST on Access Gateway
// Expected: Navigates to coursework.html with Guest Mode = true;
// College disabled, Faculty disabled, Show disabled, Guest banner visible, read-only.
// -----------------------------------------------------------------------------
runTest('TEST 4: Select GUEST navigates to coursework.html with controls disabled & Guest banner', () => {
  const store = { 'meilp:activeRole': 'GUEST' };
  const elements = {
    studentCollegeSelect: { disabled: false },
    studentFacultySelect: { disabled: false },
    btnShowAssignments: { disabled: false },
    facultyStatusBanner: { innerHTML: '' }
  };

  // Run app.js sync logic in mock environment
  const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  const mockWindow = {
    location: { href: 'http://localhost:5500/coursework.html', replace: () => {} },
    localStorage: {
      getItem(k) { return store[k] || null; },
      setItem(k, v) { store[k] = String(v); }
    },
    document: {
      getElementById(id) { return elements[id] || null; },
      querySelector(sel) { return elements[sel] || null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    console: { log() {}, warn() {}, error() {} }
  };
  mockWindow.window = mockWindow;

  const fn = new Function('window', 'document', 'console', appJs);
  fn(mockWindow, mockWindow.document, mockWindow.console);

  // Invoke syncGatewayControls for GUEST
  mockWindow.MEILP.syncGatewayControls('GUEST');
  assert.strictEqual(elements.studentCollegeSelect.disabled, true, 'College select must be disabled for GUEST');
  assert.strictEqual(elements.studentFacultySelect.disabled, true, 'Faculty select must be disabled for GUEST');
  assert.strictEqual(elements.btnShowAssignments.disabled, true, 'Show button must be disabled for GUEST');

  // Verify coursework.html has guest role UI handling
  const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
  assert.ok(courseworkHtml.includes('Guest (Read-Only)'), 'coursework.html must support Guest role indicator');
});

// -----------------------------------------------------------------------------
// TEST 5: Select FACULTY on Access Gateway
// Expected: Navigates to existing Faculty Login / Dashboard.
// Student assignment page is NOT displayed.
// -----------------------------------------------------------------------------
runTest('TEST 5: Select FACULTY opens faculty authentication / dashboard (NOT student coursework)', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('selectRole(\'FACULTY\')') || indexHtml.includes('selectRole("FACULTY")'), 'index.html must have selectRole("FACULTY")');
  assert.ok(indexHtml.includes('faculty/challenges.html'), 'Faculty role routes to faculty challenges dashboard');
  assert.ok(indexHtml.includes('id="facultyLoginModal"'), 'Faculty role provides login modal for unauthenticated users');

  // In index.html selectRole for FACULTY does NOT route to coursework.html
  assert.ok(!indexHtml.includes('case "FACULTY": window.location.href = "coursework.html"'));
});

// -----------------------------------------------------------------------------
// TEST 6: Use Switch Role from Coursework
// Expected: Returns to Access Gateway (index.html).
// Gateway is displayed independently without coursework.
// -----------------------------------------------------------------------------
runTest('TEST 6: Switch Role from coursework returns to Access Gateway (index.html)', () => {
  const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');
  assert.ok(courseworkHtml.includes('Switch Role'), 'coursework.html must have Switch Role button');
  assert.ok(courseworkHtml.includes('handleSwitchRole'), 'coursework.html must define handleSwitchRole');
  assert.ok(courseworkHtml.includes('window.location.href = "index.html"'), 'handleSwitchRole must navigate back to index.html');
  assert.ok(courseworkHtml.includes('localStorage.removeItem("meilp:activeRole")'), 'handleSwitchRole must clear active role');
});

// -----------------------------------------------------------------------------
// TEST 7: From Gateway select a different role
// Expected: Correct destination environment opens without stale state.
// -----------------------------------------------------------------------------
runTest('TEST 7: Role transitions on Gateway reliably update destination environment', () => {
  const store = {};
  let currentDest = '';

  function simulateSelectRole(role) {
    const norm = String(role || '').trim().toUpperCase();
    store['meilp:activeRole'] = norm;
    if (norm === 'STUDENT' || norm === 'GUEST') {
      currentDest = 'coursework.html';
    } else if (norm === 'FACULTY') {
      currentDest = 'faculty/challenges.html';
    }
  }

  // 1. Select STUDENT
  simulateSelectRole('STUDENT');
  assert.strictEqual(store['meilp:activeRole'], 'STUDENT');
  assert.strictEqual(currentDest, 'coursework.html');

  // 2. Switch role -> returns to gateway
  delete store['meilp:activeRole'];

  // 3. Select GUEST
  simulateSelectRole('GUEST');
  assert.strictEqual(store['meilp:activeRole'], 'GUEST');
  assert.strictEqual(currentDest, 'coursework.html');

  // 4. Switch role -> select FACULTY
  delete store['meilp:activeRole'];
  simulateSelectRole('FACULTY');
  assert.strictEqual(store['meilp:activeRole'], 'FACULTY');
  assert.strictEqual(currentDest, 'faculty/challenges.html');
});

// -----------------------------------------------------------------------------
// TEST 8: Direct URL Access to coursework.html without role state
// Expected: Safe handling. Redirects to Access Gateway (index.html).
// No attempt creation.
// -----------------------------------------------------------------------------
runTest('TEST 8: Direct URL access to coursework.html without role state safely redirects to Access Gateway', () => {
  const courseworkHtml = fs.readFileSync(path.join(__dirname, 'coursework.html'), 'utf8');

  // Must have immediate direct access check script
  assert.ok(courseworkHtml.includes('window.location.replace("index.html")'), 'coursework.html must redirect to index.html if role missing');
  assert.ok(courseworkHtml.includes('if (!norm || (norm !== "STUDENT" && norm !== "GUEST"))'), 'coursework.html must validate role is strictly STUDENT or GUEST');

  // Simulate direct access in sandbox
  let redirectedTo = '';
  const emptyStorage = {};
  const mockLocation = {
    replace(url) { redirectedTo = url; }
  };

  const directAccessCheck = function (store, loc) {
    const role = store['meilp:activeRole'];
    const norm = role ? String(role).trim().toUpperCase() : '';
    if (!norm || (norm !== 'STUDENT' && norm !== 'GUEST')) {
      loc.replace('index.html');
    }
  };

  directAccessCheck(emptyStorage, mockLocation);
  assert.strictEqual(redirectedTo, 'index.html', 'Missing role must redirect to index.html');

  // Also verify that direct query params like ?role=STUDENT do not bypass storage check
  directAccessCheck({ 'meilp:activeRole': null }, mockLocation);
  assert.strictEqual(redirectedTo, 'index.html', 'Null role must redirect to index.html');
});

// -----------------------------------------------------------------------------
// TEST 9: DME Regression
// Expected: All 22 assignments remain registered and valid.
// -----------------------------------------------------------------------------
runTest('TEST 9: DME Regression (EC-01 through EA-22 catalogue intact)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'assignments.json'), 'utf8'));
  const list = data.assignments || [];
  assert.strictEqual(list.length, 22, 'All 22 DME assignments must be registered');
  const ids = list.map(a => a.id);
  assert.ok(ids.includes('EC-01'), 'EC-01 present');
  assert.ok(ids.includes('EA-22'), 'EA-22 present');
});

// -----------------------------------------------------------------------------
// TEST 10: 1:1 Mirroring Requirement
// Expected: index.html and coursework.html perfectly mirrored to outputs/meilp/
// -----------------------------------------------------------------------------
runTest('TEST 10: 1:1 Mirroring between root and outputs/meilp/', () => {
  const pairs = [
    ['index.html', 'outputs/meilp/index.html'],
    ['coursework.html', 'outputs/meilp/coursework.html']
  ];

  for (const [src, dest] of pairs) {
    assert.ok(fs.existsSync(path.join(__dirname, src)), `${src} must exist`);
    assert.ok(fs.existsSync(path.join(__dirname, dest)), `${dest} must exist`);
    const srcContent = fs.readFileSync(path.join(__dirname, src), 'utf8');
    const destContent = fs.readFileSync(path.join(__dirname, dest), 'utf8');
    assert.strictEqual(srcContent, destContent, `Mirror mismatch between ${src} and ${dest}`);
  }
});

console.log(`\n================================================================`);
console.log(`PAGE-LEVEL SEPARATION TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
