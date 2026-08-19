const assert = require('assert');
const fs = require('fs');

console.log('==================================================');
console.log('DYNAMIC GOOGLE SHEET FACULTY REGISTRY TEST SUITE');
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

// Read Apps Script Registry file
const registryCode = fs.readFileSync('Google Script/04_Registry.gs', 'utf8');

// Mock Sheet data simulating Google Sheets Faculty_Registry & College_Registry
const mockSpreadsheet = {
  College_Registry: [
    ["College_ID", "College_Name", "Status", "Created_At"],
    ["COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "ACTIVE", new Date()],
    ["COL002", "Jaihind College of Engineering", "ACTIVE", new Date()],
    ["COL003", "Inactive College", "INACTIVE", new Date()]
  ],
  Faculty_Registry: [
    ["Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email", "College_ID", "College_Name", "Department", "Role", "Status", "Created_At", "Last_Login", "Password_Updated_At"],
    ["FAC001", "prof.smith@college.edu", "saltsmith$hash", "Prof. Alice Smith", "prof.smith@college.edu", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "HOD", "ACTIVE", new Date(), null, new Date()],
    ["FAC002", "dr.patil@college.edu", "saltpatil$hash", "Dr. Rajesh Patil", "dr.patil@college.edu", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC003", "prof.joshi@college.edu", "saltjoshi$hash", "Prof. Sneha Joshi", "prof.joshi@college.edu", "COL002", "Jaihind College of Engineering", "Mechanical Engineering", "FACULTY", "ACTIVE", new Date(), null, new Date()],
    ["FAC004", "inactive@college.edu", "saltinact$hash", "Inactive Teacher", "inactive@college.edu", "COL001", "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", "Mechanical Engineering", "FACULTY", "INACTIVE", new Date(), null, new Date()]
  ],
  Assignment_Faculty_Selection: [
    ["Selection_ID", "Attempt_ID", "Student_ID", "College_ID", "Faculty_ID", "Assignment_ID", "Selected_At", "Started_At", "Submitted_At", "Status"]
  ],
  Assignment_Controls: [
    ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"]
  ]
};

const mockEnv = {
  CONFIG: {
    SHEETS: {
      FACULTY_REGISTRY: "Faculty_Registry",
      COLLEGE_REGISTRY: "College_Registry",
      ASSIGNMENT_FACULTY_SELECTION: "Assignment_Faculty_Selection",
      ASSIGNMENT_CONTROLS: "Assignment_Controls"
    },
    LOCK_TIMEOUT_MS: 30000
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      releaseLock: () => true
    })
  },
  Utilities: {
    computeDigest: (alg, str) => {
      const buf = Buffer.from(str);
      return Array.from(buf);
    },
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" }
  },
  getSheet: (sheetName) => {
    const rows = mockSpreadsheet[sheetName];
    if (!rows) return null;
    return {
      getDataRange: () => ({
        getValues: () => rows
      }),
      getLastRow: () => rows.length,
      getLastColumn: () => rows[0] ? rows[0].length : 0,
      getRange: (r, c) => ({
        setValue: (v) => {
          if (rows[r - 1]) rows[r - 1][c - 1] = v;
        },
        getValue: () => {
          return rows[r - 1] ? rows[r - 1][c - 1] : null;
        }
      }),
      appendRow: (row) => {
        rows.push(row);
      }
    };
  },
  getSheetSafe_: (sheetName) => mockEnv.getSheet(sheetName),
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
  logError: (e, ctx) => console.log('Mock error:', e && e.message ? e.message : e)
};

const scriptFunc = new Function('env', `
  with(env) {
    ${registryCode}
    return {
      getColleges,
      getFacultyList,
      getFaculty,
      facultyLogin,
      registerFaculty,
      createAssignmentFacultySelection,
      getAssignmentControls,
      saveAssignmentControl,
      normalizeKey,
      hashPassword,
      verifyPassword
    };
  }
`);

const backend = scriptFunc(mockEnv);

async function runTests() {
  await it('TEST 1: getFacultyList returns only active faculties for specific College_ID', () => {
    const resCol1 = backend.getFacultyList({ collegeId: "COL001" });
    assert.strictEqual(resCol1.success, true);
    assert.strictEqual(resCol1.data.length, 2); // FAC001 & FAC002
    assert(resCol1.data.some(f => f.facultyId === "FAC001" && f.facultyName === "Prof. Alice Smith"));
    assert(resCol1.data.some(f => f.facultyId === "FAC002" && f.facultyName === "Dr. Rajesh Patil"));
    assert(!resCol1.data.some(f => f.facultyId === "FAC004"), "Inactive faculty must not be returned");

    const resCol2 = backend.getFacultyList({ collegeId: "COL002" });
    assert.strictEqual(resCol2.success, true);
    assert.strictEqual(resCol2.data.length, 1);
    assert.strictEqual(resCol2.data[0].facultyId, "FAC003");
  });

  await it('TEST 2: getFaculty finds registered faculty by email, ID or loginId', () => {
    const res1 = backend.getFaculty({ facultyId: "FAC002" });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.data.facultyName, "Dr. Rajesh Patil");

    const res2 = backend.getFaculty({ email: "prof.joshi@college.edu" });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.data.facultyId, "FAC003");

    const resNotFound = backend.getFaculty({ facultyId: "FAC999" });
    assert.strictEqual(resNotFound.success, false);
    assert.strictEqual(resNotFound.statusCode, 404);
  });

  await it('TEST 3: registerFaculty dynamically assigns next Faculty_ID and stores in sheet', () => {
    const newPayload = {
      facultyName: "Dr. Vikram Sarabhai",
      email: "vikram.sarabhai@isro.edu",
      password: "secretPassword123",
      collegeId: "COL001",
      collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
      department: "Aerospace Engineering"
    };

    const res = backend.registerFaculty(newPayload);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.facultyId, "FAC005");
    assert.strictEqual(res.data.facultyName, "Dr. Vikram Sarabhai");
    assert.strictEqual(res.data.status, "ACTIVE");

    // Verify row added to mock Faculty_Registry
    const check = backend.getFaculty({ email: "vikram.sarabhai@isro.edu" });
    assert.strictEqual(check.success, true);
    assert.strictEqual(check.data.facultyId, "FAC005");
  });

  await it('TEST 4: createAssignmentFacultySelection validates Faculty_ID against Faculty_Registry', () => {
    // Valid registered faculty
    const validRes = backend.createAssignmentFacultySelection({
      attemptId: "ATT-DYN-01",
      studentId: "STU1001",
      collegeId: "COL001",
      facultyId: "FAC001",
      assignmentId: "EC-01"
    });
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.data.facultyId, "FAC001");

    // Invalid non-existent faculty
    const invalidRes = backend.createAssignmentFacultySelection({
      attemptId: "ATT-DYN-02",
      studentId: "STU1002",
      collegeId: "COL001",
      facultyId: "FAC999",
      assignmentId: "EC-01"
    });
    assert.strictEqual(invalidRes.success, false);
    assert.strictEqual(invalidRes.statusCode, 400);

    // Inactive faculty
    const inactiveRes = backend.createAssignmentFacultySelection({
      attemptId: "ATT-DYN-03",
      studentId: "STU1003",
      collegeId: "COL001",
      facultyId: "FAC004",
      assignmentId: "EC-01"
    });
    assert.strictEqual(inactiveRes.success, false);
    assert.strictEqual(inactiveRes.statusCode, 400);
  });

  await it('TEST 5: normalizeKey creates clean dynamic slugs without hardcoding', () => {
    assert.strictEqual(backend.normalizeKey("Dr. Vikram Sarabhai"), "dr-vikram-sarabhai");
    assert.strictEqual(backend.normalizeKey("Prof. John Doe, Ph.D."), "prof-john-doe-ph-d");
    assert.strictEqual(backend.normalizeKey(""), "");
  });

  console.log('==================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('==================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
