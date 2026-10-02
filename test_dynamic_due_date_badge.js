/**
 * MEILP — DYNAMIC DUE-DATE BADGE TEST SUITE
 * 
 * Validates Section 17 minimum required tests:
 * TEST 1: Due date > 7 days -> safe
 * TEST 2: Due date within 3–7 days -> approaching
 * TEST 3: Due date within 24–72 hours -> soon
 * TEST 4: Due date within 0–24 hours -> urgent
 * TEST 5: Due date already passed -> overdue
 * TEST 6: No Due_Date -> no dynamic state
 * TEST 7: Invalid Due_Date -> no dynamic state
 * TEST 8: Different faculties can resolve different Due_Date values for the same assignment
 * TEST 9: State transitions correctly when time crosses (7 days, 72 hours, 24 hours, due time)
 * TEST 10: Only the Due Date badge state changes; assignment-card structure remains intact
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('MEILP — DYNAMIC DUE-DATE BADGE TEST SUITE');
console.log('================================================================\n');

// Load App.js
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

// Helper mock DOM elements
class MockClassList {
  constructor(initial = []) {
    this._classes = new Set(initial);
  }
  add(...c) { c.forEach(x => this._classes.add(x)); }
  remove(...c) { c.forEach(x => this._classes.delete(x)); }
  contains(x) { return this._classes.has(x); }
  get value() { return Array.from(this._classes).join(' '); }
}

class MockElement {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attributes = Object.assign({}, attrs);
    this.classList = new MockClassList(attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : []);
    this.innerHTML = '';
    this.dataset = {};
  }
  getAttribute(name) {
    if (name === 'class') return this.classList.value;
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }
  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'class') {
      this.classList = new MockClassList(String(val).split(/\s+/).filter(Boolean));
    }
  }
  querySelector(sel) {
    if (sel === 'i.bi' && this.innerHTML.includes('<i class="bi ')) {
      const match = this.innerHTML.match(/<i class="bi ([^"]+)"/);
      if (match) {
        return {
          set className(val) {
            // minimal mock
          }
        };
      }
    }
    return null;
  }
}

function createTestEnv() {
  const store = {};
  const mockWindow = {
    location: { href: 'http://localhost:5500/coursework.html' },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
      clear() { Object.keys(store).forEach(k => delete store[k]); }
    },
    addEventListener() {},
    removeEventListener() {}
  };
  mockWindow.window = mockWindow;

  const mockDocument = {
    getElementById(id) {
      return { value: '', innerHTML: '', disabled: false };
    },
    querySelector(sel) {
      if (sel === '[data-assignment-grid]') {
        return { innerHTML: '' };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };

  const run = new Function('window', 'document', 'console', appCode);
  run(mockWindow, mockDocument, console);

  return { window: mockWindow, document: mockDocument, store };
}

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
}

const env = createTestEnv();
const { getDueDateState, updateDueDateBadges, DUE_DATE_THRESHOLDS, DUE_STATE_CLASSES } = env.window.MEILP;

const NOW = Date.now();
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

// -----------------------------------------------------------------------------
// TEST 1: Due date > 7 days -> safe
// -----------------------------------------------------------------------------
runTest('TEST 1: Due date > 7 days -> safe', () => {
  const dueFarFuture = new Date(NOW + 10 * MS_DAY);
  const dueJustAbove7Days = new Date(NOW + 7 * MS_DAY + 1000);

  assert.strictEqual(getDueDateState(dueFarFuture, NOW), 'safe');
  assert.strictEqual(getDueDateState(dueJustAbove7Days, NOW), 'safe');
  assert.strictEqual(getDueDateState(dueFarFuture.toISOString(), NOW), 'safe');
});

// -----------------------------------------------------------------------------
// TEST 2: Due date within 3–7 days -> approaching
// -----------------------------------------------------------------------------
runTest('TEST 2: Due date within 3–7 days -> approaching', () => {
  const dueExactly7Days = new Date(NOW + 7 * MS_DAY);
  const due5Days = new Date(NOW + 5 * MS_DAY);
  const dueJustAbove72Hours = new Date(NOW + 72 * MS_HOUR + 1000);

  assert.strictEqual(getDueDateState(dueExactly7Days, NOW), 'approaching');
  assert.strictEqual(getDueDateState(due5Days, NOW), 'approaching');
  assert.strictEqual(getDueDateState(dueJustAbove72Hours, NOW), 'approaching');
});

// -----------------------------------------------------------------------------
// TEST 3: Due date within 24–72 hours -> soon
// -----------------------------------------------------------------------------
runTest('TEST 3: Due date within 24–72 hours -> soon', () => {
  const dueExactly72Hours = new Date(NOW + 72 * MS_HOUR);
  const due48Hours = new Date(NOW + 48 * MS_HOUR);
  const dueJustAbove24Hours = new Date(NOW + 24 * MS_HOUR + 1000);

  assert.strictEqual(getDueDateState(dueExactly72Hours, NOW), 'soon');
  assert.strictEqual(getDueDateState(due48Hours, NOW), 'soon');
  assert.strictEqual(getDueDateState(dueJustAbove24Hours, NOW), 'soon');
});

// -----------------------------------------------------------------------------
// TEST 4: Due date within 0–24 hours -> urgent
// -----------------------------------------------------------------------------
runTest('TEST 4: Due date within 0–24 hours -> urgent', () => {
  const dueExactly24Hours = new Date(NOW + 24 * MS_HOUR);
  const due12Hours = new Date(NOW + 12 * MS_HOUR);
  const due1Minute = new Date(NOW + 60 * 1000);

  assert.strictEqual(getDueDateState(dueExactly24Hours, NOW), 'urgent');
  assert.strictEqual(getDueDateState(due12Hours, NOW), 'urgent');
  assert.strictEqual(getDueDateState(due1Minute, NOW), 'urgent');
});

// -----------------------------------------------------------------------------
// TEST 5: Due date already passed -> overdue
// -----------------------------------------------------------------------------
runTest('TEST 5: Due date already passed -> overdue', () => {
  const dueNow = new Date(NOW);
  const duePast1Min = new Date(NOW - 60 * 1000);
  const duePast10Days = new Date(NOW - 10 * MS_DAY);

  assert.strictEqual(getDueDateState(dueNow, NOW), 'overdue');
  assert.strictEqual(getDueDateState(duePast1Min, NOW), 'overdue');
  assert.strictEqual(getDueDateState(duePast10Days, NOW), 'overdue');
});

// -----------------------------------------------------------------------------
// TEST 6: No Due_Date -> no dynamic state
// -----------------------------------------------------------------------------
runTest('TEST 6: No Due_Date -> no dynamic state', () => {
  assert.strictEqual(getDueDateState(null, NOW), null);
  assert.strictEqual(getDueDateState(undefined, NOW), null);
  assert.strictEqual(getDueDateState('', NOW), null);
});

// -----------------------------------------------------------------------------
// TEST 7: Invalid Due_Date -> no dynamic state
// -----------------------------------------------------------------------------
runTest('TEST 7: Invalid Due_Date -> no dynamic state', () => {
  assert.strictEqual(getDueDateState('not-a-valid-date', NOW), null);
  assert.strictEqual(getDueDateState(new Date('invalid'), NOW), null);
  assert.strictEqual(getDueDateState('2026-99-99T99:99:99', NOW), null);
});

// -----------------------------------------------------------------------------
// TEST 8: Different faculties can resolve different Due_Date values for the same assignment
// -----------------------------------------------------------------------------
runTest('TEST 8: Different faculties can resolve different Due_Date values for the same assignment', () => {
  const facultyA_Controls = {
    'EC-01': {
      assignmentId: 'EC-01',
      enabled: true,
      dueDate: new Date(NOW + 10 * MS_DAY).toISOString() // 10 days remaining -> safe
    }
  };

  const facultyB_Controls = {
    'EC-01': {
      assignmentId: 'EC-01',
      enabled: true,
      dueDate: new Date(NOW + 2 * MS_DAY).toISOString() // 48h remaining -> soon
    }
  };

  // Seed localStorage for Faculty A and Faculty B controls
  env.store['meilp-assignment-controls:FAC001'] = JSON.stringify(facultyA_Controls);
  env.store['meilp-assignment-controls:FAC002'] = JSON.stringify(facultyB_Controls);

  const controlsA = env.window.MEILP.loadFacultyControls('FAC001');
  const controlsB = env.window.MEILP.loadFacultyControls('FAC002');

  const dueA = controlsA['EC-01'].dueDate;
  const dueB = controlsB['EC-01'].dueDate;

  assert.notStrictEqual(dueA, dueB, 'Due dates must be distinct between faculties');
  assert.strictEqual(getDueDateState(dueA, NOW), 'safe');
  assert.strictEqual(getDueDateState(dueB, NOW), 'soon');
});

// -----------------------------------------------------------------------------
// TEST 9: State transitions correctly when time crosses (7 days, 72h, 24h, due time)
// -----------------------------------------------------------------------------
runTest('TEST 9: State transitions correctly when time crosses (7 days, 72h, 24h, due time)', () => {
  const targetDueDate = new Date('2026-10-15T12:00:00.000Z');
  const targetMs = targetDueDate.getTime();

  // Test across boundaries
  // 1. > 7 days
  const tSafe = targetMs - (7 * MS_DAY + 5000);
  assert.strictEqual(getDueDateState(targetDueDate, tSafe), 'safe');

  // Cross 7 days -> approaching
  const tApproaching = targetMs - (7 * MS_DAY - 5000);
  assert.strictEqual(getDueDateState(targetDueDate, tApproaching), 'approaching');

  // Cross 72 hours -> soon
  const tSoon = targetMs - (72 * MS_HOUR - 5000);
  assert.strictEqual(getDueDateState(targetDueDate, tSoon), 'soon');

  // Cross 24 hours -> urgent
  const tUrgent = targetMs - (24 * MS_HOUR - 5000);
  assert.strictEqual(getDueDateState(targetDueDate, tUrgent), 'urgent');

  // Cross deadline -> overdue
  const tOverdue = targetMs + 1000;
  assert.strictEqual(getDueDateState(targetDueDate, tOverdue), 'overdue');

  // Live badge update simulation
  const mockBadge = new MockElement('span', {
    class: 'badge border due-date-badge due-safe',
    'data-due-date': targetDueDate.toISOString(),
    'data-formatted-date': 'Oct 15, 2026, 12:00 PM'
  });
  mockBadge.innerHTML = '<i class="bi bi-calendar-event me-1"></i>Due: Oct 15, 2026, 12:00 PM';

  // Override document.querySelectorAll for this test
  env.document.querySelectorAll = (sel) => {
    if (sel.includes('.due-date-badge')) return [mockBadge];
    return [];
  };

  // Run updateDueDateBadges at tUrgent
  updateDueDateBadges(tUrgent);
  assert.strictEqual(mockBadge.classList.contains('due-urgent'), true, 'Must transition to due-urgent');
  assert.strictEqual(mockBadge.classList.contains('due-safe'), false, 'Must remove due-safe');

  // Run updateDueDateBadges at tOverdue
  updateDueDateBadges(tOverdue);
  assert.strictEqual(mockBadge.classList.contains('due-overdue'), true, 'Must transition to due-overdue');
  assert.strictEqual(mockBadge.classList.contains('due-urgent'), false, 'Must remove due-urgent');
  assert.strictEqual(mockBadge.innerHTML.includes('Deadline Passed:'), true, 'Must update text to Deadline Passed');
});

// -----------------------------------------------------------------------------
// TEST 10: Only the Due Date badge state changes; assignment-card structure remains intact
// -----------------------------------------------------------------------------
runTest('TEST 10: Only the Due Date badge state changes; assignment-card structure remains intact', () => {
  let renderedHtml = '';
  const gridMock = {
    set innerHTML(val) { renderedHtml = val; },
    get innerHTML() { return renderedHtml; }
  };

  env.document.querySelector = (sel) => {
    if (sel === '[data-assignment-grid]') return gridMock;
    return null;
  };
  env.document.getElementById = (id) => {
    if (id === 'studentCollegeSelect') return { value: 'COL001', disabled: false };
    if (id === 'studentFacultySelect') return { value: 'FAC001', disabled: false };
    if (id === 'btnShowAssignments') return { disabled: false };
    if (id === 'facultyStatusBanner') return { innerHTML: '' };
    return null;
  };

  // Set student profile & controls
  env.store['meilp:activeRole'] = 'STUDENT';
  env.store['meilp:selectedCollege'] = 'COL001';
  env.store['meilp:selectedFaculty'] = 'FAC001';
  env.store['meilp-assignment-controls:FAC001'] = JSON.stringify({
    'EC-01': {
      assignmentId: 'EC-01',
      enabled: true,
      dueDate: new Date(Date.now() + 2 * MS_DAY).toISOString()
    }
  });

  env.window.MEILP.renderAssignmentCards([
    {
      id: 'EC-01',
      title: 'Safety Verification of Elevator Suspension Cables',
      discipline: 'Design of Machine Elements',
      summary: 'Configuration-driven engineering challenge',
      tasks: 9,
      icon: 'bi-building-gear'
    }
  ]);

  // Verify assignment card outer structure
  assert.ok(renderedHtml.includes('class="assignment-card h-100 d-flex flex-column'), 'Card structure intact');
  assert.ok(renderedHtml.includes('Safety Verification of Elevator Suspension Cables'), 'Title intact');
  assert.ok(renderedHtml.includes('Launch Workbench'), 'Launch button intact');
  assert.ok(renderedHtml.includes('Active'), 'Active badge intact');

  // Verify that the card container itself does NOT have due-* classes
  const cardMatch = renderedHtml.match(/<article class="([^"]+)"/);
  assert.ok(cardMatch, 'Card article element found');
  assert.strictEqual(cardMatch[1].includes('due-'), false, 'Assignment card element itself must NOT have due- classes');

  // Verify that only the due-date-badge has the dynamic class
  assert.ok(renderedHtml.includes('due-date-badge due-soon'), 'Due date badge has dynamic class due-soon');
  assert.ok(renderedHtml.includes('data-due-date='), 'Machine readable data-due-date attribute is present');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
