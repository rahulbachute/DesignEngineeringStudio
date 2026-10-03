/**
 * MEILP — IN-FLOW FACULTY LOGIN PANEL TEST SUITE
 * (Google Sites Embed & Direct Execution Compatible)
 * 
 * Validates:
 * 1. Faculty role button opens the in-flow login panel
 * 2. Panel is visible in normal document flow (no position: fixed or sticky)
 * 3. Panel contains all required controls (username, password, error, login button, registration link, close control)
 * 4. Clicking Close hides the panel and restores gateway state
 * 5. Clicking Faculty repeatedly reuses the same panel and does not create duplicate panels
 * 6. Username field receives focus when panel opens
 * 7. Faculty authentication logic remains the existing handleFacultyLoginAction
 * 8. Successful authentication routes to Faculty Workspace (faculty/challenges.html)
 * 9. Invalid authentication displays existing error message
 * 10. No .modal-backdrop or Bootstrap modal is created/used for Faculty Login
 * 11. CSS rules in css/theme.css and mirror use position: relative, no position: fixed or sticky
 * 12. Google Sites iframe-safe: no window.parent, window.top, postMessage, or parent DOM access
 * 13. Exact 1:1 parity between root files and outputs/meilp/ mirrors
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — IN-FLOW FACULTY LOGIN PANEL TEST SUITE');
console.log('(Google Sites Embed & Direct Browser Validation)');
console.log('================================================================\n');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const mirrorIndexHtml = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'index.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, 'css', 'theme.css'), 'utf8');
const mirrorThemeCss = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'css', 'theme.css'), 'utf8');

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
}

function createEnvironment() {
  const elements = {
    facultyLoginPanel: new DOMElementMock('facultyLoginPanel', 'div'),
    facultyLoginCloseBtn: new DOMElementMock('facultyLoginCloseBtn', 'button'),
    facultyLoginForm: new DOMElementMock('facultyLoginForm', 'form'),
    facultyUsername: new DOMElementMock('facultyUsername', 'input'),
    facultyPassword: new DOMElementMock('facultyPassword', 'input'),
    loginError: new DOMElementMock('loginError', 'div'),
    btnGoToChallengeControls: new DOMElementMock('btnGoToChallengeControls', 'button'),
    roleBtnFaculty: new DOMElementMock('roleBtnFaculty', 'button'),
    facultyAccessBtn: new DOMElementMock('facultyAccessBtn', 'button')
  };

  elements.facultyLoginPanel.classList.add('d-none');
  elements.facultyLoginPanel.style.display = 'none';
  elements.loginError.classList.add('d-none');

  let redirectedTo = null;
  const localStorageStore = {};

  const localStorageMock = {
    getItem: (k) => Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null,
    setItem: (k, v) => { localStorageStore[k] = String(v); },
    removeItem: (k) => { delete localStorageStore[k]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
  };

  const documentListeners = {};
  const mockWindow = {
    location: {
      href: 'http://localhost:5500/index.html',
      set href(u) { redirectedTo = u; }
    },
    localStorage: localStorageMock,
    document: {
      getElementById(id) { return elements[id] || null; },
      querySelector(sel) {
        if (sel === '#facultyLoginPanel') return elements.facultyLoginPanel;
        if (sel === '#roleBtnFaculty') return elements.roleBtnFaculty;
        if (sel === '#facultyAccessBtn') return elements.facultyAccessBtn;
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener(evt, fn) {
        if (!documentListeners[evt]) documentListeners[evt] = [];
        documentListeners[evt].push(fn);
      },
      dispatchEvent(evt) {
        const list = (documentListeners[evt.type] || []).slice();
        list.forEach(fn => fn(evt));
      }
    },
    DESAuth: {
      getCurrentUser: () => null,
      authenticate: async (u, p) => {
        if (u === 'valid.faculty@dypic.in' && p === 'correctPass') {
          return { success: true, user: { role: 'FACULTY', facultyId: 'FAC001' } };
        }
        return { success: false, error: 'Incorrect username or password.' };
      }
    }
  };
  mockWindow.window = mockWindow;

  // Extract <script> content from index.html
  const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (scriptMatch) {
    const scriptBody = scriptMatch[1];
    const runScript = new Function('window', 'document', 'localStorage', scriptBody);
    runScript(mockWindow, mockWindow.document, localStorageMock);
  }

  // Simulate DOMContentLoaded
  const domLoadedFns = documentListeners['DOMContentLoaded'] || [];
  domLoadedFns.forEach(fn => fn());

  return {
    window: mockWindow,
    elements,
    localStorage: localStorageMock,
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
  // Test 1: Faculty role button opens in-flow login panel
  await test('Test 1: Faculty role button opens the in-flow login panel', async () => {
    const env = createEnvironment();
    assert.strictEqual(env.elements.facultyLoginPanel.classList.contains('d-none'), true);

    env.window.selectRole('FACULTY');

    assert.strictEqual(env.elements.facultyLoginPanel.classList.contains('d-none'), false, 'Panel must not have d-none');
    assert.strictEqual(env.elements.facultyLoginPanel.style.display, 'block', 'Panel display must be block');
    assert.strictEqual(env.elements.facultyLoginPanel.scrolled, true, 'Panel must scroll into view');
  });

  // Test 2: Panel is in-flow and visible without fixed positioning
  await test('Test 2: Panel is visible without relying on fixed or sticky positioning', async () => {
    assert.ok(indexHtml.includes('id="facultyLoginPanel"'), 'index.html contains facultyLoginPanel');
    assert.ok(!indexHtml.includes('data-bs-target="#facultyLoginModal"'), 'No Bootstrap data-bs-target modal toggle');
    assert.ok(!themeCss.includes('.faculty-login-panel { position: fixed'), 'CSS does not use position: fixed');
    assert.ok(!themeCss.includes('.faculty-login-panel { position: sticky'), 'CSS does not use position: sticky');
    assert.ok(themeCss.includes('position: relative'), 'CSS uses position: relative (normal flow)');
  });

  // Test 3: Panel contains all required inputs, errors, buttons, links, and close control
  await test('Test 3: Panel contains username, password, error, submit button, registration link, close control', async () => {
    assert.ok(indexHtml.includes('id="facultyUsername"'), 'Username input exists');
    assert.ok(indexHtml.includes('id="facultyPassword"'), 'Password input exists');
    assert.ok(indexHtml.includes('id="loginError"'), 'loginError element exists');
    assert.ok(indexHtml.includes('id="btnGoToChallengeControls"'), 'Submit button exists');
    assert.ok(indexHtml.includes('href="faculty/register.html"'), 'Register profile link exists');
    assert.ok(indexHtml.includes('id="facultyLoginCloseBtn"'), 'Close button exists');
  });

  // Test 4: Clicking Close hides the panel and restores gateway state
  await test('Test 4: Clicking Close hides the panel and returns gateway to normal state', async () => {
    const env = createEnvironment();
    env.window.selectRole('FACULTY');
    assert.strictEqual(env.elements.facultyLoginPanel.classList.contains('d-none'), false);

    env.elements.facultyLoginCloseBtn.click();
    assert.strictEqual(env.elements.facultyLoginPanel.classList.contains('d-none'), true, 'Panel must be hidden after close');
    assert.strictEqual(env.elements.facultyLoginPanel.style.display, 'none');
    assert.strictEqual(env.elements.roleBtnFaculty.focused, true, 'Focus must return to Faculty button');
  });

  // Test 5: Reopening Faculty Login reuses the same panel (no duplicates)
  await test('Test 5: Repeated clicks reuse the same panel without creating duplicates', async () => {
    const env = createEnvironment();
    env.window.selectRole('FACULTY');
    env.window.selectRole('FACULTY');
    env.window.showFacultyLoginPanel();

    assert.strictEqual(env.elements.facultyLoginPanel.classList.contains('d-none'), false);
    assert.strictEqual(env.elements.facultyLoginPanel.style.display, 'block');
  });

  // Test 6: Username receives focus when panel opens
  await test('Test 6: Username field receives focus when panel opens', async () => {
    const env = createEnvironment();
    env.window.showFacultyLoginPanel();

    assert.strictEqual(env.elements.facultyUsername.focused, true, 'Username field must be focused');
    assert.deepStrictEqual(env.elements.facultyUsername.focusOptions, { preventScroll: true });
  });

  // Test 7: Faculty authentication function remains existing function
  await test('Test 7: Faculty authentication function remains existing handleFacultyLoginAction', async () => {
    assert.ok(indexHtml.includes('function handleFacultyLoginAction'), 'handleFacultyLoginAction defined in index.html');
    assert.ok(indexHtml.includes('onsubmit="event.preventDefault(); handleFacultyLoginAction(event); return false;"'));
  });

  // Test 8: Successful authentication routes to Faculty Workspace
  await test('Test 8: Successful authentication redirects to faculty/challenges.html', async () => {
    const env = createEnvironment();
    env.window.showFacultyLoginPanel();

    env.elements.facultyUsername.value = 'valid.faculty@dypic.in';
    env.elements.facultyPassword.value = 'correctPass';

    await env.window.handleFacultyLoginAction();
    assert.strictEqual(env.getRedirection(), 'faculty/challenges.html', 'Must redirect to faculty workspace');
  });

  // Test 9: Invalid authentication displays existing error behavior
  await test('Test 9: Invalid authentication displays error message', async () => {
    const env = createEnvironment();
    env.window.showFacultyLoginPanel();

    env.elements.facultyUsername.value = 'valid.faculty@dypic.in';
    env.elements.facultyPassword.value = 'wrongPass';

    await env.window.handleFacultyLoginAction();
    assert.strictEqual(env.elements.loginError.classList.contains('d-none'), false, 'Error must be shown');
    assert.strictEqual(env.elements.loginError.textContent, 'Incorrect username or password.');
    assert.strictEqual(env.getRedirection(), null, 'Must not redirect on failure');
  });

  // Test 10: No .modal-backdrop or Bootstrap modal is created for Faculty Login
  await test('Test 10: No .modal-backdrop or Bootstrap modal is used for Faculty Login', async () => {
    assert.ok(!indexHtml.includes('class="modal-backdrop'), 'No static modal-backdrop');
    assert.ok(!indexHtml.includes('new bootstrap.Modal'), 'No new bootstrap.Modal call');
    assert.ok(!indexHtml.includes('bootstrap.Modal.getInstance'), 'No bootstrap.Modal.getInstance call');
    assert.ok(!mirrorIndexHtml.includes('new bootstrap.Modal'), 'Mirror has no new bootstrap.Modal call');
  });

  // Test 11: CSS rules use position: relative, no position: fixed or sticky
  await test('Test 11: CSS rules in theme.css and mirror use position: relative, not fixed or sticky', async () => {
    assert.ok(themeCss.includes('.faculty-login-panel'), 'themeCss has .faculty-login-panel');
    assert.ok(themeCss.includes('position: relative'), 'themeCss uses position: relative');
    assert.ok(!themeCss.includes('.faculty-login-panel { position: fixed'), 'themeCss does not use fixed');
    assert.ok(!themeCss.includes('.faculty-login-panel { position: sticky'), 'themeCss does not use sticky');

    assert.ok(mirrorThemeCss.includes('.faculty-login-panel'), 'mirrorThemeCss has .faculty-login-panel');
    assert.ok(mirrorThemeCss.includes('position: relative'), 'mirrorThemeCss uses position: relative');
    assert.ok(!mirrorThemeCss.includes('.faculty-login-panel { position: fixed'), 'mirrorThemeCss does not use fixed');
    assert.ok(!mirrorThemeCss.includes('.faculty-login-panel { position: sticky'), 'mirrorThemeCss does not use sticky');
  });

  // Test 12: Google Sites iframe-safe (no parent-window access)
  await test('Test 12: Google Sites iframe-safe: no window.parent, window.top, postMessage', async () => {
    assert.ok(!indexHtml.includes('window.parent'), 'index.html does not use window.parent');
    assert.ok(!indexHtml.includes('window.top'), 'index.html does not use window.top');
    assert.ok(!indexHtml.includes('postMessage'), 'index.html does not use postMessage');

    assert.ok(!mirrorIndexHtml.includes('window.parent'), 'outputs/meilp/index.html does not use window.parent');
    assert.ok(!mirrorIndexHtml.includes('window.top'), 'outputs/meilp/index.html does not use window.top');
    assert.ok(!mirrorIndexHtml.includes('postMessage'), 'outputs/meilp/index.html does not use postMessage');
  });

  // Test 13: Exact 1:1 parity between root and mirror files
  await test('Test 13: Exact 1:1 parity between root index.html, css/theme.css and outputs/meilp/ mirrors', async () => {
    assert.strictEqual(indexHtml, mirrorIndexHtml, 'index.html matches outputs/meilp/index.html');
    assert.strictEqual(themeCss, mirrorThemeCss, 'css/theme.css matches outputs/meilp/css/theme.css');
  });

  console.log('\n================================================================');
  console.log(`FACULTY LOGIN IN-FLOW TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
