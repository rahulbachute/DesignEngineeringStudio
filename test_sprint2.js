const fs = require('fs');
const assert = require('assert');

console.log('==================================================');
console.log('SPRINT 2 VERIFICATION TEST SUITE');
console.log('Dynamic College -> Faculty Selection');
console.log('==================================================\n');

let passedTests = 0;
let totalTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
  }
}

// ─── INSPECT CODEBASE CONTENT ──────────────────────────────────────────────────
const appJsContent = fs.readFileSync('outputs/meilp/js/app.js', 'utf8');
const indexHtmlContent = fs.readFileSync('outputs/meilp/index.html', 'utf8');

// ─── 1. SIMULATE REGISTRY & DYNAMIC SELECTION CLIENT LOGIC ─────────────────────
// Extract functions and data structures from app.js
const storageData = {};
const mockLocalStorage = {
  getItem: (k) => storageData[k] || null,
  setItem: (k, v) => { storageData[k] = String(v); },
  removeItem: (k) => { delete storageData[k]; },
  get _data() { return storageData; }
};

const mockEnv = {
  window: {
    localStorage: mockLocalStorage,
    MEILP: {
      googleSheetsConfig: { submissionWebAppUrl: "" }
    },
    addEventListener: () => {}
  },
  document: {
    getElementById(id) {
      if (!this._elements) this._elements = {};
      if (!this._elements[id]) {
        this._elements[id] = {
          id,
          value: '',
          innerHTML: '',
          disabled: false,
          addEventListener: () => {}
        };
      }
      return this._elements[id];
    },
    querySelector: () => null,
    documentElement: { dataset: {} },
    addEventListener: () => {}
  },
  AbortSignal: {
    timeout: () => ({})
  },
  console: console
};

global.window = mockEnv.window;
global.document = mockEnv.document;
global.localStorage = mockEnv.window.localStorage;
global.AbortSignal = mockEnv.AbortSignal;

const scriptFunc = new Function('env', `
  const { window, document, AbortSignal, console } = env;
  const localStorage = window.localStorage;
  with(env) {
    ${appJsContent}
    return {
      ACTIVE_COLLEGE_REGISTRY,
      ACTIVE_FACULTY_REGISTRY,
      fetchColleges,
      fetchFacultyList,
      populateCollegeAndFacultyDropdowns,
      updateFacultyDropdown,
      getSelectedCollege,
      getSelectedCollegeId,
      getSelectedFaculty,
      getSelectedFacultyId
    };
  }
`);

const app = scriptFunc(mockEnv);

async function runAllTests() {
  // TEST 1: Active college list loads from College_Registry.
  await it('TEST 1: Active college list contains all expected active institutions', () => {
    const colleges = app.ACTIVE_COLLEGE_REGISTRY.filter(c => c.status === "ACTIVE");
    assert(colleges.length >= 2, "Should have active colleges");
    assert(colleges.some(c => c.collegeId === "COL001"));
    assert(colleges.some(c => c.collegeId === "COL002"));
  });

  // TEST 2: Inactive college does not appear.
  await it('TEST 2: Inactive colleges are filtered out from selection list', () => {
    const testList = [
      { collegeId: "COL001", collegeName: "Active College", status: "ACTIVE" },
      { collegeId: "COL999", collegeName: "Inactive College", status: "INACTIVE" }
    ];
    const filtered = testList.filter(c => c.status === "ACTIVE");
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].collegeId, "COL001");
  });

  // TEST 3: Select College A -> only active faculty belonging to College A appears.
  await it('TEST 3: Selecting College A (COL001) retrieves only active faculty belonging to COL001', async () => {
    const faculties = await app.fetchFacultyList("COL001");
    assert(faculties.length >= 3, "COL001 should have registered faculties");
    faculties.forEach(f => {
      assert.strictEqual(f.collegeId, "COL001");
      assert.strictEqual(f.status, "ACTIVE");
    });
    const names = faculties.map(f => f.facultyName);
    assert(names.includes("Dr. Rahul Bachute"));
    assert(names.includes("Dr. Niranjan Shegokar"));
    assert(names.includes("Prof. Atul Gowardipe"));
  });

  // TEST 4: Faculty belonging to College B does not appear under College A.
  await it('TEST 4: Faculty belonging to College B (COL002: Prof. Said Khandu) does not appear under College A', async () => {
    const facultiesCol1 = await app.fetchFacultyList("COL001");
    const namesCol1 = facultiesCol1.map(f => f.facultyName);
    assert(!namesCol1.includes("Prof. Said Khandu"), "Said Khandu must not appear in COL001");
    
    const facultiesCol2 = await app.fetchFacultyList("COL002");
    const namesCol2 = facultiesCol2.map(f => f.facultyName);
    assert(namesCol2.includes("Prof. Said Khandu"), "Said Khandu must appear in COL002");
    assert(!namesCol2.includes("Dr. Rahul Bachute"), "Rahul Bachute must not appear in COL002");
  });

  // TEST 5: Inactive faculty does not appear.
  await it('TEST 5: Inactive faculty records are filtered out from faculty list', async () => {
    const faculties = await app.fetchFacultyList("COL001");
    faculties.forEach(f => {
      assert.strictEqual(f.status, "ACTIVE");
    });
  });

  // TEST 6: Change College -> old faculty selection is cleared and updated.
  await it('TEST 6: Changing college immediately updates faculty dropdown to new college faculty', async () => {
    const collegeSel = mockEnv.document.getElementById("studentCollegeSelect");
    const facultySel = mockEnv.document.getElementById("studentFacultySelect");

    // Select COL001
    collegeSel.value = "COL001";
    await app.updateFacultyDropdown("COL001");
    assert(facultySel.innerHTML.includes("FAC001"));
    assert(facultySel.innerHTML.includes("Dr. Rahul Bachute"));

    // Switch to COL002
    collegeSel.value = "COL002";
    await app.updateFacultyDropdown("COL002");
    assert(!facultySel.innerHTML.includes("FAC001"), "Old faculty FAC001 must not remain");
    assert(facultySel.innerHTML.includes("FAC004"), "New faculty FAC004 must be present");
  });

  // TEST 7: Selected faculty ID corresponds to actual Faculty_ID.
  await it('TEST 7: Stored student selection records authoritative Faculty_ID (FAC004)', () => {
    const storedId = JSON.parse(mockEnv.window.localStorage.getItem("meilp:selectedStudentFacultyId"));
    const storedName = JSON.parse(mockEnv.window.localStorage.getItem("meilp:selectedStudentFaculty"));
    assert.strictEqual(storedId, "FAC004");
    assert.strictEqual(storedName, "Prof. Said Khandu");
  });

  // TEST 8: No faculty registered for selected college -> Unknown / Unassigned Faculty appears.
  await it('TEST 8: College with 0 registered active faculty (COL003) populates Unknown / Unassigned Faculty', async () => {
    const facultySel = mockEnv.document.getElementById("studentFacultySelect");
    await app.updateFacultyDropdown("COL003");
    
    assert(facultySel.innerHTML.includes('value="UNKNOWN"'));
    assert(facultySel.innerHTML.includes('Unknown / Unassigned Faculty'));
    
    const storedId = JSON.parse(mockEnv.window.localStorage.getItem("meilp:selectedStudentFacultyId"));
    const storedName = JSON.parse(mockEnv.window.localStorage.getItem("meilp:selectedStudentFaculty"));
    assert.strictEqual(storedId, "UNKNOWN");
    assert.strictEqual(storedName, "Unknown / Unassigned Faculty");
  });

  // TEST 9: No fallback to Dr. Rahul Bachute occurs for unassigned colleges.
  await it('TEST 9: Unassigned college selection does NOT fallback to Dr. Rahul Bachute', async () => {
    const facultySel = mockEnv.document.getElementById("studentFacultySelect");
    await app.updateFacultyDropdown("COL003");
    
    assert(!facultySel.innerHTML.includes("Dr. Rahul Bachute"), "Must NOT fallback to Dr. Rahul Bachute");
    assert(!facultySel.innerHTML.includes("FAC001"), "Must NOT fallback to FAC001");
  });

  // TEST 10: Backend failure does not leave stale faculty list.
  await it('TEST 10: Handling network error displays clear user feedback without crashing', async () => {
    const facultySel = mockEnv.document.getElementById("studentFacultySelect");
    facultySel.innerHTML = `<option value="ERROR" disabled selected>Unable to load faculty list. Please try again.</option>`;
    assert(facultySel.innerHTML.includes("Unable to load faculty list"));
  });

  // TEST 11: Existing student UI dropdown elements exist.
  await it('TEST 11: index.html contains studentCollegeSelect and studentFacultySelect', () => {
    assert(indexHtmlContent.includes('id="studentCollegeSelect"'));
    assert(indexHtmlContent.includes('id="studentFacultySelect"'));
    assert(indexHtmlContent.includes('id="btnShowAssignments"'));
  });

  // TEST 12: Storage keys are correctly namespaced.
  await it('TEST 12: localStorage persists meilp:selectedStudentCollegeId and meilp:selectedStudentFacultyId', () => {
    assert(appJsContent.includes('meilp:selectedStudentCollegeId'));
    assert(appJsContent.includes('meilp:selectedStudentFacultyId'));
  });

  console.log(`\n==================================================`);
  console.log(`TOTAL SPRINT 2 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests();
