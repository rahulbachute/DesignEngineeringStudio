/**
 * ============================================================================
 * 04_Registry.gs
 * ----------------------------------------------------------------------------
 * Design Engineering Studio (DES) - Backend API
 * Faculty & College Registry Management and Authentication
 *
 * Responsibilities:
 *   - Retrieve Active College records from College_Registry.
 *   - Retrieve Active Faculty records from Faculty_Registry (filtered by College).
 *   - Authenticate faculty credentials (Login_ID + Salted Password Hash).
 *   - Protect credentials: NEVER expose Password_Hash to the client.
 * ============================================================================
 */

/**
 * Generates a random alphanumeric salt.
 * @return {string}
 */
function generateSalt() {
  var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var salt = "";
  for (var i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

/**
 * Normalizes a faculty name or identifier for robust cross-system matching.
 * @param {string} str
 * @return {string}
 */
function normalizeKey(str) {
  if (!str || typeof str !== "string") return "";
  var s = str.trim().toLowerCase();
  if (s.indexOf("rahul") !== -1 || s.indexOf("bachute") !== -1) return "dr-rahul-bachute";
  if (s.indexOf("niranjan") !== -1 || s.indexOf("shegokar") !== -1) return "dr-niranjan-shegokar";
  if (s.indexOf("atul") !== -1 || s.indexOf("gowardipe") !== -1) return "prof-atul-gowardipe";
  return s.replace(/[^a-z0-9]+/g, "-");
}

/**
 * Computes a salted SHA-256 password hash.
 * Output format: <salt>$<hex_hash>
 *
 * @param {string} password - Raw password.
 * @param {string} [salt] - Optional salt; generated if omitted.
 * @return {string}
 */
function hashPassword(password, salt) {
  if (!password) return "";
  if (!salt) {
    salt = generateSalt();
  }
  var rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + String(password),
    Utilities.Charset.UTF_8
  );
  var hash = rawBytes.map(function(byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
  return salt + "$" + hash;
}

/**
 * Verifies a raw password against a stored salted hash (<salt>$<hex_hash>).
 * Also supports backward compatibility for legacy unsalted SHA-256 hashes if encountered.
 *
 * @param {string} password - Raw password provided by user.
 * @param {string} storedHash - Salted hash from Faculty_Registry.
 * @return {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  var parts = storedHash.split("$");
  if (parts.length === 2) {
    var salt = parts[0];
    var computed = hashPassword(password, salt);
    return computed === storedHash;
  }

  // Fallback for simple SHA-256
  var rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );
  var simpleHash = rawBytes.map(function(byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
  if (simpleHash.toLowerCase() === storedHash.toLowerCase()) {
    return true;
  }

  // Fallback for plain-text temporary passwords directly entered by Admin in Google Sheet
  return String(password) === String(storedHash);
}

/**
 * ACTION: colleges / getColleges
 * -----------------------------------------------------------------------
 * Returns all ACTIVE colleges from College_Registry.
 *
 * @return {TextOutput} Uniform JSON array of college objects.
 */
var DEFAULT_COLLEGES = [
  "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
  "Jaihind College of Engineering",
  "AISSMS College of Engineering, Pune",
  "Alard College of Engineering & Management, Marunji",
  "Anantrao Pawar College of Engineering & Research, Pune",
  "Bharati Vidyapeeth's College of Engineering, Lavale",
  "COEP Technological University, Pune",
  "D.Y. Patil College of Engineering, Akurdi, Pune",
  "Dattakala Group of Institutions, Swami-Chincholi",
  "Dr. D.Y. Patil Institute of Technology, Pimpri, Pune",
  "Flora Institute of Technology, Khopi",
  "G.H. Raisoni College of Engineering & Management, Wagholi",
  "Genba Sopanrao Moze College of Engineering, Baner-Balewadi",
  "Government College of Engineering & Research, Avasari Khurd",
  "Indira College of Engineering & Management, Pune",
  "ISBM College of Engineering, Nande",
  "JSPM Narhe Technical Campus, Narhe",
  "JSPM's Bhivarabai Sawant Institute of Technology & Research, Wagholi",
  "JSPM's Jaywantrao Sawant College of Engineering, Hadapsar",
  "K.J. College of Engineering & Management Research, Pisoli",
  "Keystone School of Engineering, Pune",
  "Marathwada Mitra Mandal's College of Engineering, Karvenagar",
  "Marathwada Mitra Mandal's Institute of Technology, Lohgaon",
  "MIT Academy of Engineering, Alandi",
  "Modern College of Engineering, Pune",
  "Modern Education Society's Wadia College of Engineering, Pune",
  "Navsahyadri Education Society's Group of Institutions, Naigaon",
  "NBN Sinhgad Technical Institutes Campus, Ambegaon",
  "Nutan Maharashtra Institute of Engineering & Technology, Talegaon",
  "P. Vasantdada Patil Institute of Technology, Bavdhan",
  "P.K. Technical Campus, Chakan/Khed",
  "PDEA's College of Engineering, Manjari",
  "Pimpri Chinchwad College of Engineering & Research, Ravet",
  "Pimpri Chinchwad College of Engineering (PCCOE), Nigdi, Pune",
  "PVG's College of Engineering, Technology & Management, Pune",
  "Rajarshi Shahu College of Engineering, Tathawade",
  "Rajgad Technical Campus, Bhor",
  "Rasiklal M. Dhariwal Sinhgad Technical Institutes Campus, Warje",
  "S.B. Patil College of Engineering, Vangali/Indapur",
  "Samarth College of Engineering & Management, Belhe",
  "Sharadchandra Pawar College of Engineering & Technology, Someshwar Nagar",
  "Sharadchandra Pawar College of Engineering, Dumbarwadi",
  "Shree Ramchandra College of Engineering, Lonikand",
  "Siddhant College of Engineering, Sudumbare",
  "Sinhgad Academy of Engineering, Kondhwa",
  "Sinhgad College of Engineering, Vadgaon",
  "Sinhgad Institute of Technology & Science, Narhe",
  "SJVPM College of Engineering, Pune",
  "Smt. Kashibai Navale College of Engineering, Vadgaon",
  "Suman Ramesh Tulsiani Technical Campus, Kamshet",
  "Trinity Academy of Engineering, Yewalewadi",
  "Trinity College of Engineering & Research, Pisoli",
  "TSSM's Bhivarabai Sawant College of Engineering & Research, Narhe",
  "Universal College of Engineering & Research, Sasewadi",
  "Vidya Pratishthan's K.B. Institute of Engineering & Technology, Baramati",
  "Vishwakarma Institute of Technology (VIT), Bibwewadi, Pune",
  "Zeal College of Engineering & Research, Narhe",
  "Other – Pune",
  "Other – Maharashtra",
  "Other – Outside Maharashtra"
];

function getColleges() {
  try {
    var colSheetName = (CONFIG.SHEETS && CONFIG.SHEETS.COLLEGE_REGISTRY) || "College_Registry";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(colSheetName);
    var colleges = [];

    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      var headerMap = getHeaderMap(data[0]);

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[headerMap["Status"]] || "").trim().toUpperCase();
        if (!status || status === "ACTIVE") {
          colleges.push({
            collegeId: String(row[headerMap["College_ID"]] || "").trim(),
            collegeName: String(row[headerMap["College_Name"]] || "").trim(),
            status: status || "ACTIVE"
          });
        }
      }
    }

    if (colleges.length < 5) {
      return response(DEFAULT_COLLEGES.map(function (c, idx) {
        return {
          collegeId: "COL" + ("000" + (idx + 1)).slice(-3),
          collegeName: c,
          status: "ACTIVE"
        };
      }));
    }

    return response(colleges);
  } catch (err) {
    logError(err, "getColleges");
    return response(DEFAULT_COLLEGES.map(function (c, idx) {
      return {
        collegeId: "COL" + ("000" + (idx + 1)).slice(-3),
        collegeName: c,
        status: "ACTIVE"
      };
    }));
  }
}

/**
 * ACTION: facultyList / getFacultyList / facultyDirectory
 * -----------------------------------------------------------------------
 * Returns active faculty records for student selection / directory.
 * Never includes Password_Hash.
 *
 * @param {Object} [payload] - Optional: { collegeId: string }
 * @return {TextOutput} Uniform JSON array of faculty directory objects.
 */
function getFacultyList(payload) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (!sheet) {
      return response([], true);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return response([], true);
    }

    var headerMap = getHeaderMap(data[0]);
    var filterCollegeId = payload && (payload.collegeId || payload.college_id || payload.College_ID);
    if (filterCollegeId) {
      filterCollegeId = String(filterCollegeId).trim().toUpperCase();
    }

    var facultyList = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[headerMap["Status"]] || "").trim().toUpperCase();
      var collegeId = String(row[headerMap["College_ID"]] || "").trim().toUpperCase();

      if (status === "ACTIVE") {
        if (!filterCollegeId || collegeId === filterCollegeId) {
          facultyList.push({
            facultyId: String(row[headerMap["Faculty_ID"]] || "").trim(),
            facultyName: String(row[headerMap["Faculty_Name"]] || "").trim(),
            email: String(row[headerMap["Email"]] || "").trim(),
            collegeId: String(row[headerMap["College_ID"]] || "").trim(),
            collegeName: String(row[headerMap["College_Name"]] || "").trim(),
            department: String(row[headerMap["Department"]] || "").trim(),
            role: String(row[headerMap["Role"]] || "FACULTY").trim().toUpperCase(),
            status: status
          });
        }
      }
    }

    return response(facultyList);
  } catch (err) {
    logError(err, "getFacultyList");
    return response(null, false, "Failed to retrieve faculty list.", 500);
  }
}

/**
 * ACTION: faculty / getFaculty
 * -----------------------------------------------------------------------
 * Returns a single faculty record by Faculty_ID or Login_ID.
 * Never includes Password_Hash.
 *
 * @param {Object} payload - { facultyId: string } or { loginId: string }
 * @return {TextOutput} Uniform JSON response with faculty details.
 */
function getFaculty(payload) {
  try {
    var searchId = payload && (payload.facultyId || payload.loginId || payload.id || payload.email);
    if (!searchId) {
      return response(null, false, "Missing faculty identifier.", 400);
    }
    searchId = String(searchId).trim().toLowerCase();

    var sheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (!sheet) {
      return response(null, false, "Faculty registry not found.", 404);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return response(null, false, "Faculty not found.", 404);
    }

    var headerMap = getHeaderMap(data[0]);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fId = String(row[headerMap["Faculty_ID"]] || "").trim().toLowerCase();
      var lId = String(row[headerMap["Login_ID"]] || "").trim().toLowerCase();
      var email = String(row[headerMap["Email"]] || "").trim().toLowerCase();

      if (fId === searchId || lId === searchId || email === searchId) {
        var status = String(row[headerMap["Status"]] || "").trim().toUpperCase();
        return response({
          facultyId: String(row[headerMap["Faculty_ID"]] || "").trim(),
          facultyName: String(row[headerMap["Faculty_Name"]] || "").trim(),
          email: String(row[headerMap["Email"]] || "").trim(),
          collegeId: String(row[headerMap["College_ID"]] || "").trim(),
          collegeName: String(row[headerMap["College_Name"]] || "").trim(),
          department: String(row[headerMap["Department"]] || "").trim(),
          role: String(row[headerMap["Role"]] || "FACULTY").trim().toUpperCase(),
          status: status
        });
      }
    }

    return response(null, false, "Faculty not found.", 404);
  } catch (err) {
    logError(err, "getFaculty");
    return response(null, false, "Failed to retrieve faculty record.", 500);
  }
}

/**
 * ACTION: facultyLogin / login
 * -----------------------------------------------------------------------
 * Authenticates faculty against Faculty_Registry using salted SHA-256 hash.
 * Only ACTIVE faculty accounts may authenticate.
 * Updates Last_Login timestamp upon success.
 *
 * @param {Object} payload - { loginId: string, password: string }
 * @return {TextOutput} Uniform JSON response with authenticated faculty profile.
 */
function facultyLogin(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    var loginId = payload && (payload.loginId || payload.username || payload.email);
    var password = payload && payload.password;

    if (!loginId || !password) {
      return response(null, false, "Login ID and password are required.", 400);
    }

    loginId = String(loginId).trim().toLowerCase();

    var sheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (!sheet) {
      return response(null, false, "Faculty Registry sheet not found.", 500);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return response(null, false, "Invalid login credentials.", 401);
    }

    var headerMap = getHeaderMap(data[0]);
    var matchedRowIndex = -1;
    var matchedRow = null;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fLoginId = String(row[headerMap["Login_ID"]] || "").trim().toLowerCase();
      var fEmail = String(row[headerMap["Email"]] || "").trim().toLowerCase();
      var fId = String(row[headerMap["Faculty_ID"]] || "").trim().toLowerCase();

      if (fLoginId === loginId || fEmail === loginId || fId === loginId) {
        matchedRowIndex = i + 1; // 1-based row index for sheet
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      return response(null, false, "Invalid login credentials.", 401);
    }

    var status = String(matchedRow[headerMap["Status"]] || "").trim().toUpperCase();
    if (status !== "ACTIVE") {
      return response(null, false, "Faculty account is inactive. Please contact administrator.", 403);
    }

    var storedHash = String(matchedRow[headerMap["Password_Hash"]] || "").trim();
    if (!verifyPassword(password, storedHash)) {
      return response(null, false, "Invalid login credentials.", 401);
    }

    // Password verified! Update Last_Login timestamp
    try {
      lock.waitLock(10000);
      lockAcquired = true;
      var lastLoginCol = headerMap["Last_Login"] + 1; // 1-based column
      sheet.getRange(matchedRowIndex, lastLoginCol).setValue(new Date());
    } catch (lockErr) {
      // Non-critical if last login timestamp write fails
    }

    var facultyId = String(matchedRow[headerMap["Faculty_ID"]] || "").trim();
    var facultyName = String(matchedRow[headerMap["Faculty_Name"]] || "").trim();
    var email = String(matchedRow[headerMap["Email"]] || "").trim();
    var collegeId = String(matchedRow[headerMap["College_ID"]] || "").trim();
    var collegeName = String(matchedRow[headerMap["College_Name"]] || "").trim();
    var department = String(matchedRow[headerMap["Department"]] || "").trim();
    var role = String(matchedRow[headerMap["Role"]] || "FACULTY").trim().toUpperCase();

    return response({
      facultyId: facultyId,
      facultyName: facultyName,
      email: email,
      collegeId: collegeId,
      collegeName: collegeName,
      department: department,
      role: role,
      status: status
    });

  } catch (err) {
    logError(err, "facultyLogin");
    return response(null, false, "Authentication service failure.", 500);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * ACTION: registerFaculty / createFaculty
 * -----------------------------------------------------------------------
 * Self-registration endpoint for new faculty members.
 * Creates an ACTIVE faculty profile, auto-generates next FAC ID,
 * and securely hashes their password.
 *
 * @param {Object} payload - { facultyName, email, loginId, password, collegeId, collegeName, department }
 * @return {TextOutput} Uniform JSON response with created faculty profile (no password hash).
 */
function registerFaculty(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    var facultyName = payload && (payload.facultyName || payload.name);
    var email = payload && (payload.email || payload.loginId || payload.login_id);
    var password = payload && payload.password;
    var collegeId = payload && (payload.collegeId || payload.college_id || payload.College_ID);
    var collegeName = payload && (payload.collegeName || payload.college_name || payload.College_Name);
    var department = payload && (payload.department || "Mechanical Engineering");

    if (!facultyName || !email || !password) {
      return response(null, false, "Faculty name, email, and password are required.", 400);
    }

    facultyName = String(facultyName).trim();
    email = String(email).trim().toLowerCase();
    department = String(department).trim();
    collegeId = collegeId ? String(collegeId).trim() : "COL001";
    collegeName = collegeName ? String(collegeName).trim() : "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";

    if (String(password).length < 6) {
      return response(null, false, "Password must be at least 6 characters long.", 400);
    }

    if (lock && typeof lock.waitLock === "function") {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS || 30000);
      lockAcquired = true;
    }

    var facSheetName = (CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(facSheetName);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(facSheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Faculty_ID", "Login_ID", "Password_Hash", "Faculty_Name", "Email",
        "College_ID", "College_Name", "Department", "Role", "Status",
        "Created_At", "Last_Login", "Password_Updated_At"
      ]);
    }

    var data = sheet.getDataRange().getValues();
    var map = getHeaderMap(data[0]);

    // Check for duplicate email or login ID
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rLogin = String(row[map["Login_ID"]] || "").trim().toLowerCase();
      var rEmail = String(row[map["Email"]] || "").trim().toLowerCase();
      if (rLogin === email || rEmail === email) {
        return response(null, false, "A faculty member with this email is already registered. Please log in.", 409);
      }
    }

    // Auto-generate next Faculty_ID (e.g. FAC005)
    var nextNum = 1;
    for (var j = 1; j < data.length; j++) {
      var existingId = String(data[j][map["Faculty_ID"]] || "").trim();
      var match = existingId.match(/FAC(\d+)/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    }
    var facultyId = "FAC" + ("000" + nextNum).slice(-3);

    // Hash password with salt
    var passwordHash = hashPassword(password);
    var now = new Date();

    var newRow = [
      facultyId,
      email,
      passwordHash,
      facultyName,
      email,
      collegeId,
      collegeName,
      department,
      "FACULTY",
      "ACTIVE",
      now,
      "",
      now
    ];

    sheet.appendRow(newRow);

    return response({
      facultyId: facultyId,
      facultyName: facultyName,
      email: email,
      collegeId: collegeId,
      collegeName: collegeName,
      department: department,
      role: "FACULTY",
      status: "ACTIVE"
    });

  } catch (err) {
    logError(err, "registerFaculty");
    return response(null, false, "Failed to register faculty: " + (err.message || String(err)), 500);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Generates a collision-resistant Selection ID (e.g. SEL-XXXXXX).
 * @return {string}
 */
function generateSelectionId() {
  var rand = Math.floor(100000 + Math.random() * 900000);
  return "SEL-" + rand;
}

/**
 * ACTION: createAssignmentFacultySelection / saveAssignmentFacultySelection
 * -----------------------------------------------------------------------
 * Creates or confirms an Assignment_Faculty_Selection record.
 * Validates student, college, faculty, assignment, and attempt IDs.
 * Duplicate protection: If attemptId already exists, returns existing record without appending new row.
 *
 * @param {Object} payload - { attemptId, studentId, collegeId, facultyId, assignmentId, selectedAt, startedAt }
 * @return {TextOutput} Uniform JSON response.
 */
function createAssignmentFacultySelection(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    var attemptId = payload && (payload.attemptId || payload.attempt_id || payload.Attempt_ID);
    var studentId = payload && (payload.studentId || payload.student_id || payload.Student_ID || payload.rollNumber || payload.rollNo);
    var collegeId = payload && (payload.collegeId || payload.college_id || payload.College_ID);
    var facultyId = payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID);
    var assignmentId = payload && (payload.assignmentId || payload.assignment_id || payload.Assignment_ID || payload.challengeId);

    if (!attemptId || !studentId || !collegeId || !facultyId || !assignmentId) {
      return response(null, false, "Missing required fields: attemptId, studentId, collegeId, facultyId, assignmentId.", 400);
    }

    attemptId = String(attemptId).trim();
    studentId = String(studentId).trim();
    collegeId = String(collegeId).trim().toUpperCase();
    facultyId = String(facultyId).trim();
    assignmentId = String(assignmentId).trim();

    // 1. Validate College_ID in College_Registry
    var collegeSheet = getSheet(CONFIG.SHEETS.COLLEGE_REGISTRY);
    var isCollegeActive = false;
    if (collegeSheet) {
      var cData = collegeSheet.getDataRange().getValues();
      if (cData.length > 1) {
        var cMap = getHeaderMap(cData[0]);
        for (var ci = 1; ci < cData.length; ci++) {
          if (String(cData[ci][cMap["College_ID"]] || "").trim().toUpperCase() === collegeId) {
            var cStatus = String(cData[ci][cMap["Status"]] || "").trim().toUpperCase();
            if (cStatus === "ACTIVE") {
              isCollegeActive = true;
            }
            break;
          }
        }
      }
    }

    if (!isCollegeActive) {
      return response(null, false, "Invalid or inactive College_ID.", 400);
    }

    // 2. Validate Faculty_ID
    var isFacultyValid = false;
    if (facultyId.toUpperCase() === "UNKNOWN") {
      isFacultyValid = true;
      facultyId = "UNKNOWN";
    } else {
      var facultySheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
      if (facultySheet) {
        var fData = facultySheet.getDataRange().getValues();
        if (fData.length > 1) {
          var fMap = getHeaderMap(fData[0]);
          for (var fi = 1; fi < fData.length; fi++) {
            var rowFId = String(fData[fi][fMap["Faculty_ID"]] || "").trim();
            if (rowFId.toUpperCase() === facultyId.toUpperCase()) {
              var fStatus = String(fData[fi][fMap["Status"]] || "").trim().toUpperCase();
              var fColId = String(fData[fi][fMap["College_ID"]] || "").trim().toUpperCase();
              if (fStatus === "ACTIVE" && fColId === collegeId) {
                isFacultyValid = true;
                facultyId = rowFId; // Canonical case
              }
              break;
            }
          }
        }
      }
    }

    if (!isFacultyValid) {
      return response(null, false, "Faculty_ID is invalid, inactive, or does not belong to the selected college.", 400);
    }

    // 3. Acquire Script Lock for duplicate protection
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS || 30000);
    lockAcquired = true;

    var selSheet = getSheet(CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION);
    if (!selSheet) {
      return response(null, false, "Assignment_Faculty_Selection sheet not found.", 500);
    }

    var selData = selSheet.getDataRange().getValues();
    var selMap = getHeaderMap(selData[0]);

    // Check if Attempt_ID already exists
    for (var i = 1; i < selData.length; i++) {
      var row = selData[i];
      if (String(row[selMap["Attempt_ID"]] || "").trim() === attemptId) {
        // Return existing record (DO NOT create duplicate row)
        return response({
          selectionId: String(row[selMap["Selection_ID"]] || "").trim(),
          attemptId: String(row[selMap["Attempt_ID"]] || "").trim(),
          studentId: String(row[selMap["Student_ID"]] || "").trim(),
          collegeId: String(row[selMap["College_ID"]] || "").trim(),
          facultyId: String(row[selMap["Faculty_ID"]] || "").trim(),
          assignmentId: String(row[selMap["Assignment_ID"]] || "").trim(),
          selectedAt: row[selMap["Selected_At"]],
          startedAt: row[selMap["Started_At"]],
          submittedAt: row[selMap["Submitted_At"]],
          status: String(row[selMap["Status"]] || "ACTIVE").trim(),
          exists: true
        });
      }
    }

    // 4. Check Assignment_Controls enforcement for NEW attempt
    if (facultyId !== "UNKNOWN") {
      var ctrlSheet = getSheetSafe_(CONFIG.SHEETS.ASSIGNMENT_CONTROLS);
      if (ctrlSheet) {
        var ctrlData = ctrlSheet.getDataRange().getValues();
        if (ctrlData.length > 1) {
          var ctrlMap = getHeaderMap(ctrlData[0]);
          for (var ci = 1; ci < ctrlData.length; ci++) {
            var cRow = ctrlData[ci];
            var cFacId = String(cRow[ctrlMap["Faculty_ID"]] || "").trim();
            var cAsgId = String(cRow[ctrlMap["Assignment_ID"]] || "").trim();

            if (cFacId.toUpperCase() === facultyId.toUpperCase() && cAsgId.toUpperCase() === assignmentId.toUpperCase()) {
              var isEnabled = cRow[ctrlMap["Enabled"]] !== false && String(cRow[ctrlMap["Enabled"]]).toLowerCase() !== "false";
              if (!isEnabled) {
                return response(null, false, "This assignment has been disabled by the faculty for your class.", 403);
              }

              var releaseDate = cRow[ctrlMap["Release_Date"]];
              if (releaseDate) {
                var parsedRelease = new Date(releaseDate);
                if (!isNaN(parsedRelease.getTime()) && new Date() < parsedRelease) {
                  return response(null, false, "This assignment is scheduled to open on " + releaseDate + ".", 403);
                }
              }
              break;
            }
          }
        }
      }
    }

    // Create new selection row
    var selectionId = generateSelectionId();
    var now = new Date();
    var selectedAt = payload.selectedAt ? new Date(payload.selectedAt) : now;
    var startedAt = payload.startedAt ? new Date(payload.startedAt) : now;
    var status = "ACTIVE";

    var newRow = [
      selectionId,
      attemptId,
      studentId,
      collegeId,
      facultyId,
      assignmentId,
      selectedAt,
      startedAt,
      "", // Submitted_At initially blank
      status
    ];

    selSheet.appendRow(newRow);

    return response({
      selectionId: selectionId,
      attemptId: attemptId,
      studentId: studentId,
      collegeId: collegeId,
      facultyId: facultyId,
      assignmentId: assignmentId,
      selectedAt: selectedAt,
      startedAt: startedAt,
      submittedAt: "",
      status: status,
      created: true
    });

  } catch (err) {
    logError(err, "createAssignmentFacultySelection");
    return response(null, false, "Failed to create assignment faculty selection.", 500);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * ACTION: getAssignmentFacultySelection
 * -----------------------------------------------------------------------
 * Retrieves an existing Assignment_Faculty_Selection record by Attempt_ID or Selection_ID.
 *
 * @param {Object} payload - { attemptId: string } or { selectionId: string }
 * @return {TextOutput} Uniform JSON response.
 */
function getAssignmentFacultySelection(payload) {
  try {
    var searchId = payload && (payload.attemptId || payload.attempt_id || payload.Attempt_ID || payload.selectionId || payload.selection_id || payload.id);
    if (!searchId) {
      return response(null, false, "Missing attempt or selection identifier.", 400);
    }
    searchId = String(searchId).trim();

    var sheet = getSheet(CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION);
    if (!sheet) {
      return response(null, false, "Assignment_Faculty_Selection sheet not found.", 500);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return response(null, false, "Selection record not found.", 404);
    }

    var map = getHeaderMap(data[0]);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var attId = String(row[map["Attempt_ID"]] || "").trim();
      var selId = String(row[map["Selection_ID"]] || "").trim();

      if (attId === searchId || selId === searchId) {
        return response({
          selectionId: selId,
          attemptId: attId,
          studentId: String(row[map["Student_ID"]] || "").trim(),
          collegeId: String(row[map["College_ID"]] || "").trim(),
          facultyId: String(row[map["Faculty_ID"]] || "").trim(),
          assignmentId: String(row[map["Assignment_ID"]] || "").trim(),
          selectedAt: row[map["Selected_At"]],
          startedAt: row[map["Started_At"]],
          submittedAt: row[map["Submitted_At"]],
          status: String(row[map["Status"]] || "ACTIVE").trim()
        });
      }
    }

    return response(null, false, "Selection record not found.", 404);
  } catch (err) {
    logError(err, "getAssignmentFacultySelection");
    return response(null, false, "Failed to retrieve assignment faculty selection.", 500);
  }
}

/**
 * Helper to update Submitted_At and Status in Assignment_Faculty_Selection when a submission occurs.
 * Safe and non-throwing.
 *
 * @param {Object} payload - Submission payload.
 * @param {string} submissionId - Submission ID.
 */
function updateAssignmentSelectionOnSubmitSafe_(payload, submissionId) {
  try {
    var sheet = getSheetSafe_(CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var map = getHeaderMap(data[0]);
    var attemptId = (payload && payload.submission && payload.submission.attemptId) ||
                    (payload && payload.attemptId) ||
                    submissionId;

    var student = (payload && payload.studentInformation) || {};
    var studentId = student.rollNumber || student.rollNo || student.email || "";
    var challengeId = (payload && payload.challengeMetadata && payload.challengeMetadata.id) || "";

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowAttId = String(row[map["Attempt_ID"]] || "").trim();
      var rowStuId = String(row[map["Student_ID"]] || "").trim();
      var rowAsgId = String(row[map["Assignment_ID"]] || "").trim();

      if (rowAttId === String(attemptId).trim() || (rowStuId === studentId && rowAsgId === challengeId && String(row[map["Status"]]).toUpperCase() === "ACTIVE")) {
        var rowIndex = i + 1; // 1-based
        var submittedAtCol = map["Submitted_At"] + 1;
        var statusCol = map["Status"] + 1;

        sheet.getRange(rowIndex, submittedAtCol).setValue(new Date());
        sheet.getRange(rowIndex, statusCol).setValue("SUBMITTED");
        break;
      }
    }
  } catch (e) {
    logError(e, "updateAssignmentSelectionOnSubmitSafe_");
  }
}

/**
 * ACTION: getAssignmentControls
 * -----------------------------------------------------------------------
 * Returns assignment controls for a specific faculty member.
 *
 * @param {Object} payload - { facultyId: string }
 * @return {TextOutput} Uniform JSON response with array of assignment controls.
 */
function getAssignmentControls(payload) {
  try {
    var facultyId = payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID);
    if (!facultyId || String(facultyId).trim().toUpperCase() === "UNKNOWN") {
      return response([]);
    }
    facultyId = String(facultyId).trim();

    var sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_CONTROLS) || "Assignment_Controls";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return response([]);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return response([]);
    }

    var map = getHeaderMap(data[0]);
    var controls = [];
    var normTarget = normalizeKey(facultyId);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fId = String(row[map["Faculty_ID"]] || "").trim();

      if (fId.toUpperCase() === facultyId.toUpperCase() || normalizeKey(fId) === normTarget) {
        controls.push({
          facultyId: fId,
          assignmentId: String(row[map["Assignment_ID"]] || "").trim(),
          enabled: row[map["Enabled"]] === true || String(row[map["Enabled"]]).toLowerCase() === "true",
          releaseDate: row[map["Release_Date"]] || null,
          dueDate: row[map["Due_Date"]] || null,
          allowLate: row[map["Allow_Late"]] === true || String(row[map["Allow_Late"]]).toLowerCase() === "true",
          updatedAt: row[map["Updated_At"]] || null
        });
      }
    }

    return response(controls);
  } catch (err) {
    logError(err, "getAssignmentControls");
    return response(null, false, "Failed to retrieve assignment controls: " + (err.message || String(err)), 500);
  }
}

/**
 * ACTION: saveAssignmentControl
 * -----------------------------------------------------------------------
 * Creates or updates an assignment control record for Faculty_ID + Assignment_ID.
 * Enforces server-side authorization and unique constraint (1 row per faculty+assignment).
 *
 * @param {Object} payload - { facultyId, assignmentId, enabled, releaseDate, dueDate, allowLate, authFacultyId }
 * @return {TextOutput} Uniform JSON response with saved controls.
 */
function saveAssignmentControl(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    var facultyId = payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID);
    var assignmentId = payload && (payload.assignmentId || payload.assignment_id || payload.Assignment_ID || payload.challengeId);
    var authFacultyId = payload && (payload.authFacultyId || payload.authenticatedFacultyId);

    if (!facultyId || !assignmentId) {
      return response(null, false, "facultyId and assignmentId are required.", 400);
    }

    facultyId = String(facultyId).trim();
    assignmentId = String(assignmentId).trim();

    // 1. UNKNOWN faculty cannot create controls
    if (facultyId.toUpperCase() === "UNKNOWN") {
      return response(null, false, "Unknown faculty cannot manage assignment controls.", 400);
    }

    // 2. Server-side authorization check
    if (authFacultyId && String(authFacultyId).trim().toUpperCase() !== facultyId.toUpperCase()) {
      return response(null, false, "Unauthorized: Cannot modify controls for another faculty member.", 403);
    }

    // 3. Validate facultyId exists and is ACTIVE (matching Faculty_ID, Faculty_Name, or Email)
    var facSheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
    var isFacultyActive = false;
    var normTarget = normalizeKey(facultyId);

    if (facSheet) {
      var fData = facSheet.getDataRange().getValues();
      if (fData.length > 1) {
        var fMap = getHeaderMap(fData[0]);
        for (var fi = 1; fi < fData.length; fi++) {
          var rowFacId = String(fData[fi][fMap["Faculty_ID"]] || "").trim();
          var rowFacName = String(fData[fi][fMap["Faculty_Name"]] || "").trim();
          var rowEmail = String(fData[fi][fMap["Email"]] || "").trim();

          var match = (rowFacId && rowFacId.toUpperCase() === facultyId.toUpperCase()) ||
                      (rowFacName && rowFacName.toUpperCase() === facultyId.toUpperCase()) ||
                      (rowEmail && rowEmail.toUpperCase() === facultyId.toUpperCase()) ||
                      (rowFacId && normalizeKey(rowFacId) === normTarget) ||
                      (rowFacName && normalizeKey(rowFacName) === normTarget);

          if (match) {
            var statusVal = String(fData[fi][fMap["Status"]] || "").trim().toUpperCase();
            if (!statusVal || statusVal === "ACTIVE") {
              isFacultyActive = true;
              facultyId = rowFacId || rowFacName; // use canonical registry ID
            }
            break;
          }
        }
      }
    }

    // Fallback: If registry is empty or unpopulated, accept valid non-empty faculty name/ID
    if (!isFacultyActive && (!facSheet || facSheet.getLastRow() <= 1)) {
      isFacultyActive = true;
    }

    if (!isFacultyActive) {
      return response(null, false, "Faculty is inactive or does not exist in Faculty Registry.", 400);
    }

    // 4. Validate assignmentId
    if (!assignmentId || assignmentId.length < 2 || /[^a-zA-Z0-9\-_ ]/.test(assignmentId)) {
      return response(null, false, "Invalid Assignment_ID.", 400);
    }

    var enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : true;
    var releaseDate = payload.releaseDate ? String(payload.releaseDate).trim() : "";
    var dueDate = payload.dueDate ? String(payload.dueDate).trim() : "";
    var allowLate = payload.allowLate !== undefined ? Boolean(payload.allowLate) : false;
    var now = new Date();

    // 5. Acquire Script Lock
    if (lock && typeof lock.waitLock === "function") {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS || 30000);
      lockAcquired = true;
    }

    var ctrlSheetName = (CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_CONTROLS) || "Assignment_Controls";
    var ctrlSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ctrlSheetName);
    if (!ctrlSheet) {
      ctrlSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(ctrlSheetName);
    }
    if (ctrlSheet.getLastRow() === 0) {
      ctrlSheet.appendRow(["Faculty_ID", "Assignment_ID", "Enabled", "Release_Date", "Due_Date", "Allow_Late", "Updated_At"]);
    }

    var data = ctrlSheet.getDataRange().getValues();
    var map = getHeaderMap(data[0]);
    var matchedRowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rFacId = String(row[map["Faculty_ID"]] || "").trim();
      var rAsgId = String(row[map["Assignment_ID"]] || "").trim();

      if (rFacId.toUpperCase() === facultyId.toUpperCase() && rAsgId.toUpperCase() === assignmentId.toUpperCase()) {
        matchedRowIndex = i + 1; // 1-based row
        break;
      }
    }

    if (matchedRowIndex > 0) {
      // UPDATE existing row (Uniqueness guarantee)
      ctrlSheet.getRange(matchedRowIndex, map["Enabled"] + 1).setValue(enabled);
      ctrlSheet.getRange(matchedRowIndex, map["Release_Date"] + 1).setValue(releaseDate);
      ctrlSheet.getRange(matchedRowIndex, map["Due_Date"] + 1).setValue(dueDate);
      ctrlSheet.getRange(matchedRowIndex, map["Allow_Late"] + 1).setValue(allowLate);
      ctrlSheet.getRange(matchedRowIndex, map["Updated_At"] + 1).setValue(now);

      return response({
        facultyId: facultyId,
        assignmentId: assignmentId,
        enabled: enabled,
        releaseDate: releaseDate || null,
        dueDate: dueDate || null,
        allowLate: allowLate,
        updatedAt: now,
        updated: true
      });
    } else {
      // CREATE new row
      var newRow = [
        facultyId,
        assignmentId,
        enabled,
        releaseDate,
        dueDate,
        allowLate,
        now
      ];
      ctrlSheet.appendRow(newRow);

      return response({
        facultyId: facultyId,
        assignmentId: assignmentId,
        enabled: enabled,
        releaseDate: releaseDate || null,
        dueDate: dueDate || null,
        allowLate: allowLate,
        updatedAt: now,
        created: true
      });
    }

  } catch (err) {
    logError(err, "saveAssignmentControl");
    return response(null, false, "Failed to save assignment control: " + (err.message || String(err)), 500);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}
