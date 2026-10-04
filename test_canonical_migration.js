/**
 * Comprehensive Canonical Migration Test Suite
 * Verifies canonical Faculty_ID identity architecture across:
 * - Google Script / Apps Script logic (04_Registry.gs)
 * - Frontend authentication & fallback registries (auth.js, config.js, app.js)
 * - Assignment Control Service & backward-compatibility resolver
 * - Student faculty selection & active registries (exclusion of FAC003 / Atul)
 * - Historical data protection
 * - Root vs outputs/meilp parity
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runCanonicalMigrationTests() {
  console.log("================================================================");
  console.log("CANONICAL FACULTY IDENTITY MIGRATION TEST SUITE");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
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
  // A. Rahul faculty login returns FAC001
  // ---------------------------------------------------------------------------
  await testAsync("Test A: Rahul faculty login returns FAC001 (auth.js)", async () => {
    const authCode = fs.readFileSync(path.join(__dirname, 'faculty', 'js', 'data', 'auth.js'), 'utf8');
    const store = {};
    const mockWindow = {
      localStorage: {
        getItem(k) { return store[k] || null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      }
    };
    global.localStorage = mockWindow.localStorage;
    new Function('window', authCode)(mockWindow);

    assert(mockWindow.DESAuth, "DESAuth must exist");
    const res = await mockWindow.DESAuth.authenticate("rahul.bachute@dypic.in", "dypic123");
    assert(res.success, "Rahul authentication must succeed");
    assert.strictEqual(res.user.facultyId, "FAC001", "Rahul must have facultyId FAC001");
    assert.strictEqual(res.user.name || res.user.facultyName, "Rahul Bachute", "Rahul name must match");
    assert.strictEqual(res.user.role, "FACULTY", "Role must be FACULTY");
  });

  // ---------------------------------------------------------------------------
  // B. Niranjan faculty login returns FAC002
  // ---------------------------------------------------------------------------
  await testAsync("Test B: Niranjan login returns FAC002 (auth.js)", async () => {
    const authCode = fs.readFileSync(path.join(__dirname, 'faculty', 'js', 'data', 'auth.js'), 'utf8');
    const store = {};
    const mockWindow = {
      localStorage: {
        getItem(k) { return store[k] || null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      }
    };
    global.localStorage = mockWindow.localStorage;
    new Function('window', authCode)(mockWindow);

    const res = await mockWindow.DESAuth.authenticate("niranjan.shegokar@dypic.in", "dypic123");
    assert(res.success, "Niranjan authentication must succeed");
    assert.strictEqual(res.user.facultyId, "FAC002", "Niranjan must have facultyId FAC002");
    assert.strictEqual(res.user.name || res.user.facultyName, "Dr Niranjan Shegokar", "Name must match");
    assert.strictEqual(res.user.role, "FACULTY", "Role must be FACULTY");
  });

  // ---------------------------------------------------------------------------
  // C. Khandu faculty login returns FAC004
  // ---------------------------------------------------------------------------
  await testAsync("Test C: Khandu login returns FAC004 (auth.js)", async () => {
    const authCode = fs.readFileSync(path.join(__dirname, 'faculty', 'js', 'data', 'auth.js'), 'utf8');
    const store = {};
    const mockWindow = {
      localStorage: {
        getItem(k) { return store[k] || null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      }
    };
    global.localStorage = mockWindow.localStorage;
    new Function('window', authCode)(mockWindow);

    const res = await mockWindow.DESAuth.authenticate("saidkhandu@gmail.com", "Jaihind@123");
    assert(res.success, "Khandu authentication must succeed");
    assert.strictEqual(res.user.facultyId, "FAC004", "Khandu must have facultyId FAC004");
    assert.strictEqual(res.user.name || res.user.facultyName, "Prof Khandu Said", "Name must match");
    assert.strictEqual(res.user.role, "FACULTY", "Role must be FACULTY");
  });

  // ---------------------------------------------------------------------------
  // D. Admin login returns ADMIN001
  // ---------------------------------------------------------------------------
  await testAsync("Test D: Admin login returns ADMIN001 (auth.js)", async () => {
    const authCode = fs.readFileSync(path.join(__dirname, 'faculty', 'js', 'data', 'auth.js'), 'utf8');
    const store = {};
    const mockWindow = {
      localStorage: {
        getItem(k) { return store[k] || null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      }
    };
    global.localStorage = mockWindow.localStorage;
    new Function('window', authCode)(mockWindow);

    const res = await mockWindow.DESAuth.authenticate("bachuterahul@gmail.com", "admin123");
    assert(res.success, "Admin authentication must succeed");
    assert.strictEqual(res.user.facultyId, "ADMIN001", "Admin must have facultyId ADMIN001");
    assert.strictEqual(res.user.name || res.user.facultyName, "Dr Rahul P Bachute", "Name must match");
    assert.strictEqual(res.user.role, "ADMIN", "Role must be ADMIN");
  });

  // ---------------------------------------------------------------------------
  // E. Apps Script 04_Registry.gs Faculty Login & Migration
  // ---------------------------------------------------------------------------
  test("Test E: Apps Script facultyLogin & getAssignmentControls with canonical ID", () => {
    const registryCode = fs.readFileSync(path.join(__dirname, 'Google Script', '04_Registry.gs'), 'utf8');
    
    // Create mock spreadsheet with legacy rows
    const mockRegistryData = [
      ["Faculty_ID", "Faculty_Name", "Login_ID", "Email", "Password_Hash", "College_ID", "College_Name", "Department", "Role", "Status", "Last_Login"],
      ["FAC0001", "Dr Rahul P Bachute", "bachuterahul@gmail.com", "bachuterahul@gmail.com", "mock_hash", "COL001", "DY Patil", "Mechanical", "ADMIN", "ACTIVE", ""],
      ["FAC002", "rahul bachute", "rahul.bachute@dypic.in", "rahul.bachute@dypic.in", "mock_hash", "COL001", "DY Patil", "Mechanical", "FACULTY", "ACTIVE", ""],
      ["FAC003", "Dr Niranjan Shegokar", "niranjan.shegokar@dypic.in", "niranjan.shegokar@dypic.in", "mock_hash", "COL001", "DY Patil", "Mechanical", "FACULTY", "ACTIVE", ""],
      ["FAC004", "Prof Khandu Said", "saidkhandu@gmail.com", "saidkhandu@gmail.com", "mock_hash", "COL002", "Jaihind", "Mechanical", "FACULTY", "ACTIVE", ""]
    ];

    const mockControlsData = [
      ["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"]
    ];
    // Add 22 legacy control records for Dr. Rahul Bachute
    for (let i = 1; i <= 22; i++) {
      const id = (i <= 10 ? `EC-${String(i).padStart(2, '0')}` : (i === 21 ? 'EC-21' : `EA-${String(i).padStart(2, '0')}`));
      mockControlsData.push(["Dr. Rahul Bachute", id, "TRUE", "", "2026-08-22T19:18:00.000Z", "TRUE", "2026-08-20T10:00:00Z"]);
    }

    const mockSpreadsheet = {
      getSheetByName: (name) => {
        if (name === "Faculty_Registry") {
          return {
            getDataRange: () => ({ getValues: () => mockRegistryData }),
            getLastRow: () => mockRegistryData.length,
            getLastColumn: () => mockRegistryData[0].length,
            getRange: (r, c, nr, nc) => ({
              setValue: (val) => { mockRegistryData[r - 1][c - 1] = val; },
              setValues: (vals) => {
                for (let i = 0; i < vals.length; i++) {
                  for (let j = 0; j < vals[i].length; j++) {
                    mockRegistryData[r - 1 + i][c - 1 + j] = vals[i][j];
                  }
                }
              }
            })
          };
        }
        if (name === "Assignment_Controls") {
          return {
            getDataRange: () => ({ getValues: () => mockControlsData }),
            getLastRow: () => mockControlsData.length,
            getLastColumn: () => mockControlsData[0].length,
            getRange: (r, c, nr, nc) => ({
              setValue: (val) => { mockControlsData[r - 1][c - 1] = val; },
              setValues: (vals) => {
                for (let i = 0; i < vals.length; i++) {
                  for (let j = 0; j < vals[i].length; j++) {
                    mockControlsData[r - 1 + i][c - 1 + j] = vals[i][j];
                  }
                }
              }
            })
          };
        }
        return null;
      }
    };

    const mockEnv = {
      CONFIG: {
        SHEETS: {
          FACULTY_REGISTRY: "Faculty_Registry",
          ASSIGNMENT_CONTROLS: "Assignment_Controls"
        },
        DEFAULT_ADMIN_EMAIL: "bachuterahul@gmail.com",
        SUPER_ADMIN_EMAILS: ["bachuterahul@gmail.com"]
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          waitLock: () => true,
          releaseLock: () => {}
        })
      },
      SpreadsheetApp: {
        getActiveSpreadsheet: () => mockSpreadsheet
      },
      getHeaderMap: (headers) => {
        const map = {};
        for (let i = 0; i < headers.length; i++) map[headers[i]] = i;
        return map;
      },
      verifyPassword: () => true,
      getSheetSafe_: (name) => mockSpreadsheet.getSheetByName(name),
      response: (data, success, message, statusCode) => ({ data, success: (success !== false), message, statusCode: statusCode || 200 }),
      logEvent: () => {},
      logError: (err, fn) => { console.error(`APPS SCRIPT ERROR in ${fn}:`, err); }
    };

    const safeCode = registryCode
      .replace(/function\s+verifyPassword\s*\([^)]*\)\s*\{[\s\S]*?\n\}/, 'var verifyPassword = function() { return true; };')
      .replace(/function\s+getSheetSafe_\s*\(/g, 'var getSheetSafe_ = function(');

    const fn = new Function('mockEnv', `
      const CONFIG = mockEnv.CONFIG;
      const LockService = mockEnv.LockService;
      const SpreadsheetApp = mockEnv.SpreadsheetApp;
      const getHeaderMap = mockEnv.getHeaderMap;
      var getSheetSafe_ = mockEnv.getSheetSafe_;
      const response = mockEnv.response;
      const logEvent = mockEnv.logEvent;
      const logError = mockEnv.logError;
      ${safeCode}
      return {
        facultyLogin,
        getAssignmentControls,
        getFacultyList,
        migrateFacultyCanonicalIdentity
      };
    `);

    const backend = fn(mockEnv);

    // 1. Test facultyLogin for Rahul returns FAC001
    const loginRahul = backend.facultyLogin({ email: "rahul.bachute@dypic.in", password: "pwd" });
    assert(loginRahul.success, "Rahul login must succeed");
    assert.strictEqual(loginRahul.data.facultyId, "FAC001", "Rahul login must return canonical FAC001");
    assert.strictEqual(loginRahul.data.facultyName || loginRahul.data.name, "Rahul Bachute");

    // 2. Test facultyLogin for Niranjan returns FAC002
    const loginNiranjan = backend.facultyLogin({ email: "niranjan.shegokar@dypic.in", password: "pwd" });
    assert(loginNiranjan.success, "Niranjan login must succeed");
    assert.strictEqual(loginNiranjan.data.facultyId, "FAC002", "Niranjan login must return canonical FAC002");

    // 3. Test facultyLogin for Khandu returns FAC004
    const loginKhandu = backend.facultyLogin({ email: "saidkhandu@gmail.com", password: "pwd" });
    assert(loginKhandu.success, "Khandu login must succeed");
    assert.strictEqual(loginKhandu.data.facultyId, "FAC004", "Khandu login must return canonical FAC004");

    // 4. Test facultyLogin for Admin returns ADMIN001
    const loginAdmin = backend.facultyLogin({ email: "bachuterahul@gmail.com", password: "pwd" });
    assert(loginAdmin.success, "Admin login must succeed");
    assert.strictEqual(loginAdmin.data.facultyId, "ADMIN001", "Admin login must return canonical ADMIN001");

    // 5. Test getAssignmentControls("FAC001") returns the 22 records and self-migrates
    const ctrlRes = backend.getAssignmentControls("FAC001");
    assert(ctrlRes.success, "getAssignmentControls must succeed");
    assert.strictEqual(ctrlRes.data.length, 22, "Must return all 22 assignment controls for Rahul");
    assert.strictEqual(ctrlRes.data[0].facultyId, "FAC001", "Returned records must have canonical facultyId FAC001");

    // 6. Verify mockControlsData was updated to FAC001
    assert.strictEqual(mockControlsData[1][0], "FAC001", "Sheet row must be migrated to FAC001");

    // 7. Test migrateFacultyCanonicalIdentity()
    const migRes = backend.migrateFacultyCanonicalIdentity();
    assert(migRes.success, "Migration function must succeed");
  });

  // ---------------------------------------------------------------------------
  // F. No active faculty registry contains FAC003
  // ---------------------------------------------------------------------------
  test("Test F: No active faculty registry contains FAC003 or Atul Gowardipe", () => {
    const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
    const mockWinConfig = { MEILP: {} };
    new Function('window', configCode)(mockWinConfig);

    const activeFaculties = mockWinConfig.MEILP.ACTIVE_FACULTY_REGISTRY;
    assert(Array.isArray(activeFaculties), "ACTIVE_FACULTY_REGISTRY must be an array");
    const hasFAC003 = activeFaculties.some(f => f.facultyId === "FAC003");
    const hasAtul = activeFaculties.some(f => (f.facultyName || "").toLowerCase().includes("atul"));
    assert(!hasFAC003, "ACTIVE_FACULTY_REGISTRY must NOT contain FAC003");
    assert(!hasAtul, "ACTIVE_FACULTY_REGISTRY must NOT contain Atul Gowardipe");

    // Check auth.js DEFAULT_USERS
    const authCode = fs.readFileSync(path.join(__dirname, 'faculty', 'js', 'data', 'auth.js'), 'utf8');
    assert(!authCode.includes("FAC003"), "faculty/js/data/auth.js must NOT contain FAC003");
    assert(!authCode.toLowerCase().includes("gowardipe"), "faculty/js/data/auth.js must NOT contain Gowardipe");

    // Check faculty/challenges.html selector
    const challengesHtml = fs.readFileSync(path.join(__dirname, 'faculty', 'challenges.html'), 'utf8');
    assert(!challengesHtml.includes('value="FAC003"'), "challenges.html must NOT contain FAC003 option");
    assert(!challengesHtml.toLowerCase().includes("gowardipe"), "challenges.html must NOT contain Gowardipe");
  });

  // ---------------------------------------------------------------------------
  // G. Student faculty dropdown contains canonical mappings
  // ---------------------------------------------------------------------------
  test("Test G: Student faculty dropdown contains Rahul (FAC001), Niranjan (FAC002), Khandu (FAC004)", () => {
    const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
    const mockWinConfig = { MEILP: {} };
    new Function('window', configCode)(mockWinConfig);

    const active = mockWinConfig.MEILP.ACTIVE_FACULTY_REGISTRY;
    const rahul = active.find(f => f.facultyId === "FAC001");
    const niranjan = active.find(f => f.facultyId === "FAC002");
    const khandu = active.find(f => f.facultyId === "FAC004");

    assert(rahul, "Must contain FAC001");
    assert.strictEqual(rahul.facultyName, "Rahul Bachute");
    assert.strictEqual(rahul.collegeId, "COL001");

    assert(niranjan, "Must contain FAC002");
    assert.strictEqual(niranjan.facultyName, "Dr Niranjan Shegokar");
    assert.strictEqual(niranjan.collegeId, "COL001");

    assert(khandu, "Must contain FAC004");
    assert.strictEqual(khandu.facultyName, "Prof Khandu Said");
    assert.strictEqual(khandu.collegeId, "COL002");
  });

  // ---------------------------------------------------------------------------
  // H. AssignmentControlService backward compatibility and resolution
  // ---------------------------------------------------------------------------
  test("Test H: AssignmentControlService resolves legacy and canonical IDs correctly", () => {
    const serviceCode = fs.readFileSync(path.join(__dirname, 'js', 'assignment-control-service.js'), 'utf8');
    const mockWin = { MEILP: {}, localStorage: { getItem() { return null; }, setItem() {} } };
    new Function('window', serviceCode)(mockWin);

    const acs = new mockWin.MEILP.AssignmentControlService();
    assert.strictEqual(acs.resolveFacultyId("FAC001"), "FAC001");
    assert.strictEqual(acs.resolveFacultyId("FAC002"), "FAC002");
    assert.strictEqual(acs.resolveFacultyId("FAC004"), "FAC004");
    assert.strictEqual(acs.resolveFacultyId("ADMIN001"), "ADMIN001");
    assert.strictEqual(acs.resolveFacultyId("Dr. Rahul Bachute"), "FAC001");
    assert.strictEqual(acs.resolveFacultyId("Rahul Bachute"), "FAC001");
    assert.strictEqual(acs.resolveFacultyId("Dr Niranjan Shegokar"), "FAC002");
    assert.strictEqual(acs.resolveFacultyId("Prof Khandu Said"), "FAC004");
    assert.strictEqual(acs.resolveFacultyId("Dr Rahul P Bachute"), "ADMIN001");
  });

  // ---------------------------------------------------------------------------
  // I. Historical Data Verification & Inviolability
  // ---------------------------------------------------------------------------
  test("Test I: Historical submission and evaluation facts are untouched and respected", () => {
    const subCode = fs.readFileSync(path.join(__dirname, 'Google Script', '03_Submission.gs'), 'utf8');
    assert(subCode.includes("saveStudentSubmission"), "saveStudentSubmission must exist");
    assert(!subCode.includes("deleteRow"), "Must NOT delete historical rows");
  });

  // ---------------------------------------------------------------------------
  // J. Exact Root / Output Mirror Parity
  // ---------------------------------------------------------------------------
  test("Test J: Exact 1:1 parity between modified root files and outputs/meilp/ mirrors", () => {
    // 1. Config active registries parity
    const rootConfig = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
    const mirrorConfig = fs.readFileSync(path.join(__dirname, 'outputs', 'meilp', 'js', 'config.js'), 'utf8');
    const rootWin = { MEILP: {} };
    const mirrorWin = { MEILP: {} };
    new Function('window', rootConfig)(rootWin);
    new Function('window', mirrorConfig)(mirrorWin);
    assert.deepStrictEqual(rootWin.MEILP.ACTIVE_FACULTY_REGISTRY, mirrorWin.MEILP.ACTIVE_FACULTY_REGISTRY, "ACTIVE_FACULTY_REGISTRY parity");

    // 2. Full identical file pairs
    const filesToCompare = [
      'js/app.js',
      'js/assignment-control-service.js',
      'faculty/challenges.html',
      'faculty/js/challenges-engine.js',
      'faculty/js/data/auth.js'
    ];

    for (const relPath of filesToCompare) {
      const rootFile = path.join(__dirname, relPath);
      const mirrorFile = path.join(__dirname, 'outputs', 'meilp', relPath);

      assert(fs.existsSync(rootFile), `Root file must exist: ${relPath}`);
      assert(fs.existsSync(mirrorFile), `Mirror file must exist: outputs/meilp/${relPath}`);

      const rootContent = fs.readFileSync(rootFile, 'utf8');
      const mirrorContent = fs.readFileSync(mirrorFile, 'utf8');

      assert.strictEqual(rootContent, mirrorContent, `Exact 1:1 parity failure between ${relPath} and outputs/meilp/${relPath}`);
    }
  });

  console.log("\n================================================================");
  console.log(`TOTAL CANONICAL MIGRATION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCanonicalMigrationTests();
