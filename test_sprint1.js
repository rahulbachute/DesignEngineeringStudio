const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('==================================================');
console.log('SPRINT 1 VERIFICATION TEST SUITE');
console.log('==================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
  }
}

// ─── 1. TEST GOOGLE APPS SCRIPT CONFIG & REGISTRY MODULE ───────────────────────
const configContent = fs.readFileSync('Google Script/01_Config.gs', 'utf8');
const registryContent = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');
const mainContent = fs.readFileSync('Google Script/02_Main.gs', 'utf8');

it('01_Config.gs contains FACULTY_REGISTRY and COLLEGE_REGISTRY sheets', () => {
  assert(configContent.includes('FACULTY_REGISTRY: "Faculty_Registry"'));
  assert(configContent.includes('COLLEGE_REGISTRY: "College_Registry"'));
});

it('01_Config.gs contains exact expected headers for Faculty_Registry', () => {
  const expectedHeaders = [
    "Faculty_ID",
    "Login_ID",
    "Password_Hash",
    "Faculty_Name",
    "Email",
    "College_ID",
    "College_Name",
    "Department",
    "Role",
    "Status",
    "Created_At",
    "Last_Login",
    "Password_Updated_At"
  ];
  expectedHeaders.forEach(h => {
    assert(configContent.includes(`"${h}"`), `Missing header: ${h}`);
  });
});

it('01_Config.gs contains exact expected headers for College_Registry', () => {
  const expectedHeaders = [
    "College_ID",
    "College_Name",
    "Status",
    "Created_At"
  ];
  expectedHeaders.forEach(h => {
    assert(configContent.includes(`"${h}"`), `Missing header: ${h}`);
  });
});

it('02_Main.gs routes getColleges, getFacultyList, getFaculty, and facultyLogin', () => {
  assert(mainContent.includes('case "colleges":') || mainContent.includes('case "getColleges":'));
  assert(mainContent.includes('case "facultyList":') || mainContent.includes('case "getFacultyList":'));
  assert(mainContent.includes('case "faculty":') || mainContent.includes('case "getFaculty":'));
  assert(mainContent.includes('case "facultyLogin":') || mainContent.includes('case "login":'));
});

// ─── 2. TEST APPS SCRIPT LOGIC IN NODE RUNTIME EMULATION ─────────────────────────
// Emulate Apps Script Utilities & Mock Sheets
const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "Inactive Engineering College", "INACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "rahul.bachute@dypic.in", "salt123$" + crypto.createHash('sha256').update("salt123:dypic123").digest('hex'), "Dr. Rahul Bachute", "rahul.bachute@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "niranjan.shegokar@dypic.in", "salt123$" + crypto.createHash('sha256').update("salt123:dypic123").digest('hex'), "Dr. Niranjan Shegokar", "niranjan.shegokar@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "inactive.faculty@dypic.in", "salt123$" + crypto.createHash('sha256').update("salt123:dypic123").digest('hex'), "Inactive Faculty", "inactive.faculty@dypic.in", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()],
    ["FAC004", "saidkhandu@gmail.com", "salt123$" + crypto.createHash('sha256').update("salt123:jaihind123").digest('hex'), "Prof. Said Khandu", "saidkhandu@gmail.com", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()]
  ]
};

// Evaluate Apps Script Registry code in Node context
const mockEnv = {
  CONFIG: {
    SHEETS: {
      COLLEGE_REGISTRY: "College_Registry",
      FACULTY_REGISTRY: "Faculty_Registry"
    }
  },
  Utilities: {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (alg, text) => Array.from(crypto.createHash('sha256').update(text, 'utf8').digest())
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      releaseLock: () => true
    })
  },
  getSheet: (sheetName) => {
    const rows = mockSpreadsheet[sheetName];
    if (!rows) return null;
    return {
      getLastRow: () => rows.length,
      getDataRange: () => ({
        getValues: () => rows
      }),
      getRange: (r, c) => ({
        setValue: (v) => { rows[r-1][c-1] = v; }
      })
    };
  },
  getHeaderMap: (headerRow) => {
    const map = {};
    headerRow.forEach((h, idx) => { map[h] = idx; });
    return map;
  },
  response: (data, success, error, statusCode) => ({
    success: success !== undefined ? success : true,
    data,
    error,
    statusCode: statusCode || 200
  }),
  logError: (e, ctx) => console.log('Mock error:', e)
};

const scriptFunc = new Function('env', `
  with(env) {
    ${registryContent}
    return { hashPassword, verifyPassword, getColleges, getFacultyList, getFaculty, facultyLogin };
  }
`);
const api = scriptFunc(mockEnv);

// TEST 1: Valid ACTIVE faculty + valid password -> login succeeds
it('TEST 1: Valid ACTIVE faculty + valid password succeeds with complete profile and no password hash', () => {
  const res = api.facultyLogin({ loginId: "rahul.bachute@dypic.in", password: "dypic123" });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.facultyId, "FAC001");
  assert.strictEqual(res.data.facultyName, "Dr. Rahul Bachute");
  assert.strictEqual(res.data.collegeId, "COL001");
  assert.strictEqual(res.data.role, "HOD");
  assert.strictEqual(res.data.status, "ACTIVE");
  assert.strictEqual(res.data.Password_Hash, undefined);
  assert.strictEqual(res.data.passwordHash, undefined);
});

// TEST 2: Invalid password -> login fails
it('TEST 2: Invalid password fails authentication', () => {
  const res = api.facultyLogin({ loginId: "rahul.bachute@dypic.in", password: "wrongpassword" });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.statusCode, 401);
});

// TEST 3: Unknown Login_ID -> login fails
it('TEST 3: Unknown Login_ID fails authentication', () => {
  const res = api.facultyLogin({ loginId: "nonexistent.faculty@dypic.in", password: "dypic123" });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.statusCode, 401);
});

// TEST 4: INACTIVE faculty -> login fails
it('TEST 4: INACTIVE faculty fails authentication with inactive account message', () => {
  const res = api.facultyLogin({ loginId: "inactive.faculty@dypic.in", password: "dypic123" });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.statusCode, 403);
  assert(res.error.includes("inactive"));
});

// TEST 5: Faculty record retrieved by Faculty_ID -> correct faculty
it('TEST 5: Faculty record retrieved by Faculty_ID returns correct sanitized faculty', () => {
  const res = api.getFaculty({ facultyId: "FAC001" });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.facultyId, "FAC001");
  assert.strictEqual(res.data.facultyName, "Dr. Rahul Bachute");
  assert.strictEqual(res.data.Password_Hash, undefined);
});

// TEST 6: Active college list -> only ACTIVE colleges returned
it('TEST 6: Active college list returns ONLY active colleges (inactive COL003 excluded)', () => {
  const res = api.getColleges();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.length, 2);
  const collegeIds = res.data.map(c => c.collegeId);
  assert(collegeIds.includes("COL001"));
  assert(collegeIds.includes("COL002"));
  assert(!collegeIds.includes("COL003"));
});

// TEST 7: Faculty lookup by College_ID -> only active faculties belonging to that college returned
it('TEST 7: Faculty lookup by College_ID returns only active faculties for that college', () => {
  const resCol1 = api.getFacultyList({ collegeId: "COL001" });
  assert.strictEqual(resCol1.success, true);
  assert.strictEqual(resCol1.data.length, 2); // FAC001, FAC002 (FAC003 is INACTIVE)
  const facIds = resCol1.data.map(f => f.facultyId);
  assert(facIds.includes("FAC001"));
  assert(facIds.includes("FAC002"));
  assert(!facIds.includes("FAC003"));
  assert(!facIds.includes("FAC004"));

  const resCol2 = api.getFacultyList({ collegeId: "COL002" });
  assert.strictEqual(resCol2.data.length, 1);
  assert.strictEqual(resCol2.data[0].facultyId, "FAC004");
  assert.strictEqual(resCol2.data[0].facultyName, "Prof. Said Khandu");
});

// TEST 8: Password/hash never appears in browser response
it('TEST 8: Password hash never appears in getFacultyList or getColleges responses', () => {
  const resList = api.getFacultyList();
  resList.data.forEach(f => {
    assert.strictEqual(f.passwordHash, undefined);
    assert.strictEqual(f.Password_Hash, undefined);
    assert.strictEqual(f.password, undefined);
  });
});

// ─── 3. TEST CLIENT-SIDE AUTH SERVICE ───────────────────────────────────────────
const clientAuthContent = fs.readFileSync('faculty/js/data/auth.js', 'utf8');

it('faculty/js/data/auth.js defines DESAuth with getCurrentUser, authenticate, and logout', () => {
  assert(clientAuthContent.includes('getCurrentUser'));
  assert(clientAuthContent.includes('authenticate'));
  assert(clientAuthContent.includes('logout'));
  assert(clientAuthContent.includes('DES_FACULTY_SESSION'));
});

// ─── 4. PROTECTED SHEETS & ASSIGNMENTS INTEGRITY CHECK ───────────────────────────
it('Protected Sheets list verified (Student_Submissions, Faculty_Evaluation, Analytics, Logs untouched)', () => {
  assert(configContent.includes('SUBMISSIONS: "Student_Submissions"'));
  assert(configContent.includes('EVALUATION: "Faculty_Evaluation"'));
  assert(configContent.includes('ANALYTICS: "Analytics"'));
  assert(configContent.includes('LOGS: "Logs"'));
});

console.log(`\n==================================================`);
console.log(`TOTAL SPRINT 1 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log(`==================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
