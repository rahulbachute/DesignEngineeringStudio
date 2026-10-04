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
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  if (String(password) === String(storedHash)) {
    return true;
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

var DEFAULT_FACULTY_REGISTRY = [
  {
    facultyId: "ADMIN001",
    loginId: "bachuterahul@gmail.com",
    facultyName: "Dr Rahul P Bachute",
    email: "bachuterahul@gmail.com",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "ADMIN",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC001",
    loginId: "rahul.bachute@dypic.in",
    facultyName: "Rahul Bachute",
    email: "rahul.bachute@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC002",
    loginId: "niranjan.shegokar@dypic.in",
    facultyName: "Dr Niranjan Shegokar",
    email: "niranjan.shegokar@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC004",
    loginId: "saidkhandu@gmail.com",
    facultyName: "Prof Khandu Said",
    email: "saidkhandu@gmail.com",
    collegeId: "COL002",
    collegeName: "Jaihind College of Engineering",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  }
];

function getColleges() {
  try {
    var colSheetName = (CONFIG.SHEETS && CONFIG.SHEETS.COLLEGE_REGISTRY) || "College_Registry";
    var sheet = getSheetSafe_(colSheetName);
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
      return response(colleges);
    }

    return response(DEFAULT_COLLEGES.map(function (c, idx) {
      return {
        collegeId: "COL" + ("000" + (idx + 1)).slice(-3),
        collegeName: c,
        status: "ACTIVE"
      };
    }));
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
    var filterCollegeId = payload && (payload.collegeId || payload.college_id || payload.College_ID);
    if (filterCollegeId) {
      filterCollegeId = String(filterCollegeId).trim().toUpperCase();
    }

    var sheet = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (!sheet || sheet.getLastRow() <= 1) {
      return response(DEFAULT_FACULTY_REGISTRY.filter(function (f) {
        if (f.status !== "ACTIVE" || f.facultyId === "FAC003" || f.role === "ADMIN") return false;
        if (filterCollegeId && f.collegeId.toUpperCase() !== filterCollegeId) return false;
        return true;
      }));
    }

    var data = sheet.getDataRange().getValues();
    var headerMap = getHeaderMap(data[0]);

    var facultyList = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[headerMap["Status"]] || "").trim().toUpperCase();
      var collegeId = String(row[headerMap["College_ID"]] || "").trim().toUpperCase();
      var fId = String(row[headerMap["Faculty_ID"]] || "").trim();
      var fName = String(row[headerMap["Faculty_Name"]] || "").trim();
      var fEmail = String(row[headerMap["Email"]] || "").trim();
      var fLogin = String(row[headerMap["Login_ID"]] || "").trim();

      // Exclude obsolete Atul Gowardipe / FAC003 from active faculty selection
      if (fId.toUpperCase() === "FAC003" || fName.toLowerCase().indexOf("atul") !== -1 || fEmail.toLowerCase().indexOf("atul") !== -1 || fLogin.toLowerCase().indexOf("atul") !== -1) {
        continue;
      }

      var cFacId = fId;
      var cFacName = fName;
      var cRole = String(row[headerMap["Role"]] || "FACULTY").trim().toUpperCase();

      // Canonical identity alignment
      if (fEmail.toLowerCase() === "rahul.bachute@dypic.in" || fLogin.toLowerCase() === "rahul.bachute@dypic.in") {
        cFacId = "FAC001";
        cFacName = "Rahul Bachute";
        cRole = "FACULTY";
      } else if (fEmail.toLowerCase() === "niranjan.shegokar@dypic.in" || fLogin.toLowerCase() === "niranjan.shegokar@dypic.in") {
        cFacId = "FAC002";
        cFacName = "Dr Niranjan Shegokar";
        cRole = "FACULTY";
      } else if (fEmail.toLowerCase() === "saidkhandu@gmail.com" || fLogin.toLowerCase() === "saidkhandu@gmail.com") {
        cFacId = "FAC004";
        cFacName = "Prof Khandu Said";
        cRole = "FACULTY";
      } else if (fEmail.toLowerCase() === "bachuterahul@gmail.com" || fLogin.toLowerCase() === "bachuterahul@gmail.com") {
        cFacId = "ADMIN001";
        cFacName = "Dr Rahul P Bachute";
        cRole = "ADMIN";
      }

      if (status === "ACTIVE" && cRole !== "ADMIN") {
        if (!filterCollegeId || collegeId === filterCollegeId) {
          facultyList.push({
            facultyId: cFacId,
            facultyName: cFacName,
            email: fEmail,
            collegeId: String(row[headerMap["College_ID"]] || "").trim(),
            collegeName: String(row[headerMap["College_Name"]] || "").trim(),
            department: String(row[headerMap["Department"]] || "").trim(),
            role: cRole,
            status: status
          });
        }
      }
    }

    return response(facultyList);
  } catch (err) {
    logError(err, "getFacultyList");
    return response(DEFAULT_FACULTY_REGISTRY.filter(function (f) {
      if (f.status !== "ACTIVE" || f.facultyId === "FAC003" || f.role === "ADMIN") return false;
      if (filterCollegeId && f.collegeId.toUpperCase() !== filterCollegeId) return false;
      return true;
    }));
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

    var sheet = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      var headerMap = getHeaderMap(data[0]);

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var fId = String(row[headerMap["Faculty_ID"]] || "").trim().toLowerCase();
        var lId = String(row[headerMap["Login_ID"]] || "").trim().toLowerCase();
        var email = String(row[headerMap["Email"]] || "").trim().toLowerCase();

        if (fId === searchId || lId === searchId || email === searchId) {
          var status = String(row[headerMap["Status"]] || "").trim().toUpperCase();
          var retFacId = String(row[headerMap["Faculty_ID"]] || "").trim();
          var retFacName = String(row[headerMap["Faculty_Name"]] || "").trim();
          var retRole = String(row[headerMap["Role"]] || "FACULTY").trim().toUpperCase();

          // Canonical alignment
          if (email === "rahul.bachute@dypic.in" || lId === "rahul.bachute@dypic.in") {
            retFacId = "FAC001";
            retFacName = "Rahul Bachute";
            retRole = "FACULTY";
          } else if (email === "niranjan.shegokar@dypic.in" || lId === "niranjan.shegokar@dypic.in") {
            retFacId = "FAC002";
            retFacName = "Dr Niranjan Shegokar";
            retRole = "FACULTY";
          } else if (email === "saidkhandu@gmail.com" || lId === "saidkhandu@gmail.com") {
            retFacId = "FAC004";
            retFacName = "Prof Khandu Said";
            retRole = "FACULTY";
          } else if (email === "bachuterahul@gmail.com" || lId === "bachuterahul@gmail.com") {
            retFacId = "ADMIN001";
            retFacName = "Dr Rahul P Bachute";
            retRole = "ADMIN";
          }

          return response({
            facultyId: retFacId,
            facultyName: retFacName,
            email: String(row[headerMap["Email"]] || "").trim(),
            collegeId: String(row[headerMap["College_ID"]] || "").trim(),
            collegeName: String(row[headerMap["College_Name"]] || "").trim(),
            department: String(row[headerMap["Department"]] || "").trim(),
            role: retRole,
            status: status
          });
        }
      }
    }

    // Fallback to DEFAULT_FACULTY_REGISTRY
    for (var d = 0; d < DEFAULT_FACULTY_REGISTRY.length; d++) {
      var df = DEFAULT_FACULTY_REGISTRY[d];
      if (df.facultyId.toLowerCase() === searchId || df.loginId.toLowerCase() === searchId || df.email.toLowerCase() === searchId) {
        return response(df);
      }
    }

    return response(null, false, "Faculty not found.", 404);
  } catch (err) {
    logError(err, "getFaculty");
    for (var d = 0; d < DEFAULT_FACULTY_REGISTRY.length; d++) {
      var df = DEFAULT_FACULTY_REGISTRY[d];
      if (df.facultyId.toLowerCase() === searchId || df.loginId.toLowerCase() === searchId || df.email.toLowerCase() === searchId) {
        return response(df);
      }
    }
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

    var sheet = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
    var matchedRowIndex = -1;
    var matchedRow = null;
    var headerMap = null;

    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      headerMap = getHeaderMap(data[0]);

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
    }

    // If sheet matched
    if (matchedRow && headerMap) {
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
      } catch (lockErr) {}

      var facultyId = String(matchedRow[headerMap["Faculty_ID"]] || "").trim();
      var facultyName = String(matchedRow[headerMap["Faculty_Name"]] || "").trim();
      var email = String(matchedRow[headerMap["Email"]] || "").trim();
      var collegeId = String(matchedRow[headerMap["College_ID"]] || "").trim();
      var collegeName = String(matchedRow[headerMap["College_Name"]] || "").trim();
      var department = String(matchedRow[headerMap["Department"]] || "").trim();
      var role = String(matchedRow[headerMap["Role"]] || "FACULTY").trim().toUpperCase();

      // Canonical alignment & sheet healing
      var cleanLogin = (loginId || email).toLowerCase();
      var needsSync = false;

      if (cleanLogin === "rahul.bachute@dypic.in" || email.toLowerCase() === "rahul.bachute@dypic.in") {
        if (facultyId !== "FAC001" || role !== "FACULTY") needsSync = true;
        facultyId = "FAC001";
        facultyName = "Rahul Bachute";
        role = "FACULTY";
      } else if (cleanLogin === "niranjan.shegokar@dypic.in" || email.toLowerCase() === "niranjan.shegokar@dypic.in") {
        if (facultyId !== "FAC002" || role !== "FACULTY") needsSync = true;
        facultyId = "FAC002";
        facultyName = "Dr Niranjan Shegokar";
        role = "FACULTY";
      } else if (cleanLogin === "saidkhandu@gmail.com" || email.toLowerCase() === "saidkhandu@gmail.com") {
        if (facultyId !== "FAC004" || role !== "FACULTY") needsSync = true;
        facultyId = "FAC004";
        facultyName = "Prof Khandu Said";
        role = "FACULTY";
      } else if (cleanLogin === "bachuterahul@gmail.com" || email.toLowerCase() === "bachuterahul@gmail.com") {
        if (facultyId !== "ADMIN001" || role !== "ADMIN") needsSync = true;
        facultyId = "ADMIN001";
        facultyName = "Dr Rahul P Bachute";
        role = "ADMIN";
      }

      if (needsSync && matchedRowIndex > 0) {
        try {
          sheet.getRange(matchedRowIndex, headerMap["Faculty_ID"] + 1).setValue(facultyId);
          sheet.getRange(matchedRowIndex, headerMap["Faculty_Name"] + 1).setValue(facultyName);
          sheet.getRange(matchedRowIndex, headerMap["Role"] + 1).setValue(role);
        } catch (sErr) {}
      }

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
    }

    // Offline / Bootstrap fallback if sheet is unpopulated
    for (var d = 0; d < DEFAULT_FACULTY_REGISTRY.length; d++) {
      var df = DEFAULT_FACULTY_REGISTRY[d];
      if (df.loginId.toLowerCase() === loginId || df.email.toLowerCase() === loginId || df.facultyId.toLowerCase() === loginId) {
        var validPass = (password === "dypic123" || password === "admin123" || password === "Jaihind@123" || password === "des@admin123");
        if (!validPass) {
          return response(null, false, "Invalid login credentials.", 401);
        }
        return response({
          facultyId: df.facultyId,
          facultyName: df.facultyName,
          email: df.email,
          collegeId: df.collegeId,
          collegeName: df.collegeName,
          department: df.department,
          role: df.role,
          status: df.status
        });
      }
    }

    return response(null, false, "Invalid login credentials.", 401);

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
    var sheet = getSheet(facSheetName);
    if (!sheet && typeof SpreadsheetApp !== "undefined" && SpreadsheetApp.getActiveSpreadsheet) {
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

    // Guest Mode check: strictly read-only
    var reqRole = payload && (payload.role || payload.activeRole || payload.userRole || "");
    var isGuest = String(reqRole).trim().toUpperCase() === "GUEST" ||
                  (payload && payload.isGuest === true) ||
                  String(studentId || "").trim().toUpperCase() === "GUEST" ||
                  String(facultyId || "").trim().toUpperCase() === "GUEST";
    if (isGuest) {
      return response(null, false, "Guest mode is strictly read-only and cannot create assignment attempts or AFS records.", 403);
    }

    if (!attemptId || !studentId || !collegeId || !facultyId || !assignmentId) {
      return response(null, false, "Missing required fields: attemptId, studentId, collegeId, facultyId, assignmentId.", 400);
    }

    attemptId = String(attemptId).trim();
    studentId = String(studentId).trim();
    collegeId = String(collegeId).trim().toUpperCase();
    facultyId = String(facultyId).trim();
    assignmentId = String(assignmentId).trim();

    // 1. Acquire Script Lock for duplicate and tampering protection
    if (lock && typeof lock.waitLock === "function") {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS || 30000);
      lockAcquired = true;
    }

    var selSheet = getSheet(CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION);
    if (!selSheet) {
      return response(null, false, "Assignment_Faculty_Selection sheet not found.", 500);
    }

    var selData = selSheet.getDataRange().getValues();
    var selMap = getHeaderMap(selData[0]);

    // 2. Check if Attempt_ID already exists (Enforce Attempt Lock & Idempotency)
    for (var i = 1; i < selData.length; i++) {
      var row = selData[i];
      var rAttId = String(row[selMap["Attempt_ID"]] || "").trim();
      if (rAttId === attemptId) {
        var existingStudentId = String(row[selMap["Student_ID"]] || "").trim();
        var existingCollegeId = String(row[selMap["College_ID"]] || "").trim();
        var existingFacultyId = String(row[selMap["Faculty_ID"]] || "").trim();
        var existingAssignmentId = String(row[selMap["Assignment_ID"]] || "").trim();

        // Check if client is attempting to rebind attempt to different identity/context
        var studentMismatch = studentId && (studentId.toUpperCase() !== existingStudentId.toUpperCase());
        var collegeMismatch = collegeId && (collegeId.toUpperCase() !== existingCollegeId.toUpperCase());
        var facultyMismatch = facultyId && (facultyId.toUpperCase() !== existingFacultyId.toUpperCase());
        var assignmentMismatch = assignmentId && (assignmentId.toUpperCase() !== existingAssignmentId.toUpperCase());

        if (studentMismatch || collegeMismatch || facultyMismatch || assignmentMismatch) {
          return response(null, false, "Attempt binding conflict: Attempt_ID is already bound to " + existingFacultyId + " (" + existingAssignmentId + ") and cannot be rebound.", 409);
        }

        // Return existing record (idempotency)
        return response({
          selectionId: String(row[selMap["Selection_ID"]] || "").trim(),
          attemptId: rAttId,
          studentId: existingStudentId,
          collegeId: existingCollegeId,
          facultyId: existingFacultyId,
          assignmentId: existingAssignmentId,
          selectedAt: row[selMap["Selected_At"]],
          startedAt: row[selMap["Started_At"]],
          submittedAt: row[selMap["Submitted_At"]],
          status: String(row[selMap["Status"]] || "ACTIVE").trim(),
          exists: true
        });
      }
    }

    // 3. Validate College and Faculty consistency for NEW attempt
    var collegeSheet = getSheet(CONFIG.SHEETS.COLLEGE_REGISTRY);
    var foundCollegeInRegistry = false;
    var isCollegeActive = false;
    if (collegeSheet) {
      var cData = collegeSheet.getDataRange().getValues();
      if (cData.length > 1) {
        var cMap = getHeaderMap(cData[0]);
        for (var ci = 1; ci < cData.length; ci++) {
          if (String(cData[ci][cMap["College_ID"]] || "").trim().toUpperCase() === collegeId) {
            foundCollegeInRegistry = true;
            var cStatus = String(cData[ci][cMap["Status"]] || "").trim().toUpperCase();
            if (cStatus === "ACTIVE") {
              isCollegeActive = true;
            }
            break;
          }
        }
      }
    }

    var isRegisteredCollege = foundCollegeInRegistry && isCollegeActive;

    // Rule C: Unregistered or inactive college cannot create attempt / AFS record
    if (!isRegisteredCollege) {
      return response(
        null,
        false,
        "Your College is not registered or active with MEILP. Guest users cannot create attempts or AFS records.",
        403
      );
    }

    // Query active registered faculties belonging to this College_ID
    var activeFacultyCount = 0;
    var matchedFacultyRow = null;
    var facultySheet = getSheet(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (facultySheet) {
      var fData = facultySheet.getDataRange().getValues();
      if (fData.length > 1) {
        var fMap = getHeaderMap(fData[0]);
        for (var fi = 1; fi < fData.length; fi++) {
          var rowFId = String(fData[fi][fMap["Faculty_ID"]] || "").trim();
          var fStatus = String(fData[fi][fMap["Status"]] || "").trim().toUpperCase();
          var fColId = String(fData[fi][fMap["College_ID"]] || "").trim().toUpperCase();
          if ((fStatus === "ACTIVE" || !fStatus) && fColId === collegeId && rowFId.toUpperCase() !== "UNKNOWN") {
            activeFacultyCount++;
            if (rowFId.toUpperCase() === facultyId.toUpperCase()) {
              matchedFacultyRow = fData[fi];
              facultyId = rowFId; // Canonical case
            }
          }
        }
      }
    }

    if (activeFacultyCount > 0) {
      // Rule A: Registered college + active faculties
      // Empty/null/undefined or UNKNOWN: REJECT
      if (!facultyId || facultyId.toUpperCase() === "UNKNOWN") {
        return response(
          null,
          false,
          "Faculty selection is mandatory for registered colleges with active faculties. UNKNOWN is not permitted.",
          403
        );
      }
      if (!matchedFacultyRow) {
        return response(
          null,
          false,
          "Faculty_ID is invalid, inactive, or does not belong to the selected college.",
          403
        );
      }
    } else {
      // Rule B: Registered college + zero active faculties
      // Faculty_ID = UNKNOWN: ACCEPT
      if (facultyId.toUpperCase() === "UNKNOWN") {
        facultyId = "UNKNOWN";
      } else {
        return response(
          null,
          false,
          "This college has zero active registered faculties. Faculty_ID must be UNKNOWN.",
          400
        );
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

              var dueDate = cRow[ctrlMap["Due_Date"]];
              var allowLate = cRow[ctrlMap["Allow_Late"]] === true || String(cRow[ctrlMap["Allow_Late"]]).toLowerCase() === "true";
              if (dueDate) {
                var parsedDue = new Date(dueDate);
                if (!isNaN(parsedDue.getTime()) && new Date() > parsedDue && !allowLate) {
                  return response(null, false, "This assignment deadline (" + dueDate + ") has passed and late attempts are not permitted.", 403);
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
    var searchId = typeof payload === "string" ? payload : (payload && (payload.attemptId || payload.attempt_id || payload.Attempt_ID || payload.selectionId || payload.selection_id || payload.id));
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
    var facultyId = typeof payload === "string" ? payload : (payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID));
    if (!facultyId || String(facultyId).trim().toUpperCase() === "UNKNOWN") {
      return response([]);
    }
    facultyId = String(facultyId).trim();

    var sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_CONTROLS) || "Assignment_Controls";
    var sheet = getSheetSafe_(sheetName);
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

    // Canonical resolution mapping for backward compatibility and migration
    var isRahulFaculty = (facultyId.toUpperCase() === "FAC001" || normTarget === "fac001" || normTarget === "dr-rahul-bachute" || normTarget === "rahul-bachute");

    var rowsToMigrate = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fId = String(row[map["Faculty_ID"]] || "").trim();
      var normFId = normalizeKey(fId);

      var matched = false;
      if (fId.toUpperCase() === facultyId.toUpperCase() || normFId === normTarget) {
        matched = true;
      } else if (isRahulFaculty && (fId.toUpperCase() === "FAC001" || normFId === "dr-rahul-bachute" || normFId === "rahul-bachute")) {
        matched = true;
        // If row still has legacy "Dr. Rahul Bachute", queue for auto-migration to canonical "FAC001"
        if (fId !== "FAC001") {
          rowsToMigrate.push(i + 1);
        }
      }

      if (matched) {
        controls.push({
          facultyId: isRahulFaculty ? "FAC001" : fId,
          assignmentId: String(row[map["Assignment_ID"]] || "").trim(),
          enabled: row[map["Enabled"]] === true || String(row[map["Enabled"]]).toLowerCase() === "true",
          releaseDate: row[map["Release_Date"]] || null,
          dueDate: row[map["Due_Date"]] || null,
          allowLate: row[map["Allow_Late"]] === true || String(row[map["Allow_Late"]]).toLowerCase() === "true",
          updatedAt: row[map["Updated_At"]] || null
        });
      }
    }

    // Auto-migrate legacy rows in sheet to canonical FAC001 if found
    if (rowsToMigrate.length > 0 && map["Faculty_ID"] !== undefined) {
      try {
        var facCol = map["Faculty_ID"] + 1;
        for (var m = 0; m < rowsToMigrate.length; m++) {
          sheet.getRange(rowsToMigrate[m], facCol).setValue("FAC001");
        }
      } catch (mErr) {
        // Non-blocking
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

    // Canonical alignment for facultyId
    var normTarget = normalizeKey(facultyId);
    if (normTarget === "dr-rahul-bachute" || normTarget === "rahul-bachute") {
      facultyId = "FAC001";
    }

    // 1. UNKNOWN faculty cannot create controls
    if (facultyId.toUpperCase() === "UNKNOWN") {
      return response(null, false, "Unknown faculty cannot manage assignment controls.", 400);
    }

    // 2. Server-side authorization check
    var reqRole = payload && (payload.role || payload.authRole || "");
    if (String(reqRole).trim().toUpperCase() === "GUEST" || String(reqRole).trim().toUpperCase() === "STUDENT" || (authFacultyId && String(authFacultyId).trim().toUpperCase() === "GUEST")) {
      return response(null, false, "Unauthorized: Guests and students cannot modify assignment controls.", 403);
    }

    if (!authFacultyId) {
      return response(null, false, "Unauthorized: Authentication required to modify assignment controls.", 403);
    }

    var authNorm = normalizeKey(authFacultyId);
    if (String(authFacultyId).trim().toUpperCase() !== facultyId.toUpperCase() && authNorm !== normTarget) {
      var isAuthorizedAdmin = false;
      var facSheetAdmin = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
      if (facSheetAdmin) {
        var faData = facSheetAdmin.getDataRange().getValues();
        if (faData.length > 1) {
          var faMap = getHeaderMap(faData[0]);
          for (var fai = 1; fai < faData.length; fai++) {
            var rFaId = String(faData[fai][faMap["Faculty_ID"]] || "").trim();
            if (rFaId.toUpperCase() === String(authFacultyId).trim().toUpperCase() || normalizeKey(rFaId) === authNorm) {
              var rFaRole = String(faData[fai][faMap["Role"]] || "").trim().toUpperCase();
              var rFaStatus = String(faData[fai][faMap["Status"]] || "").trim().toUpperCase();
              if (rFaRole === "ADMIN" && (rFaStatus === "ACTIVE" || !rFaStatus)) {
                isAuthorizedAdmin = true;
              }
              break;
            }
          }
        }
      }
      if (!isAuthorizedAdmin && authFacultyId !== "ADMIN001") {
        return response(null, false, "Unauthorized: Cannot modify controls for another faculty member.", 403);
      }
    }

    // 3. Validate facultyId exists and is ACTIVE (matching Faculty_ID, Faculty_Name, or Email)
    var facSheet = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
    var isFacultyActive = false;

    if (facSheet && facSheet.getLastRow() > 1) {
      var fData = facSheet.getDataRange().getValues();
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
            facultyId = rowFacId || rowFacName;
          }
          break;
        }
      }
    }

    // Fallback if sheet is unpopulated or local
    if (!isFacultyActive) {
      for (var d = 0; d < DEFAULT_FACULTY_REGISTRY.length; d++) {
        var df = DEFAULT_FACULTY_REGISTRY[d];
        if (df.facultyId.toUpperCase() === facultyId.toUpperCase() || normalizeKey(df.facultyName) === normTarget || df.email.toLowerCase() === facultyId.toLowerCase()) {
          isFacultyActive = true;
          facultyId = df.facultyId;
          break;
        }
      }
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
    var ctrlSheet = getSheetSafe_(ctrlSheetName);
    if (!ctrlSheet && typeof SpreadsheetApp !== "undefined" && SpreadsheetApp.getActiveSpreadsheet) {
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
      var rFacNorm = normalizeKey(rFacId);

      var matchFac = (rFacId.toUpperCase() === facultyId.toUpperCase() || rFacNorm === normTarget);
      if (!matchFac && facultyId.toUpperCase() === "FAC001" && (rFacNorm === "dr-rahul-bachute" || rFacNorm === "rahul-bachute")) {
        matchFac = true;
      }

      if (matchFac && rAsgId.toUpperCase() === assignmentId.toUpperCase()) {
        matchedRowIndex = i + 1; // 1-based row
        break;
      }
    }

    if (matchedRowIndex > 0) {
      // UPDATE existing row (Migrates Faculty_ID to canonical ID)
      ctrlSheet.getRange(matchedRowIndex, map["Faculty_ID"] + 1).setValue(facultyId);
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

/**
 * ACTION: migrateFacultyCanonicalIdentity / migrateFacultyIdentity
 * -----------------------------------------------------------------------
 * Administrative migration endpoint:
 *   1. Updates Faculty_Registry to canonical IDs:
 *      ADMIN001 | bachuterahul@gmail.com | Dr Rahul P Bachute | ADMIN | ACTIVE
 *      FAC001   | rahul.bachute@dypic.in | Rahul Bachute      | FACULTY | ACTIVE
 *      FAC002   | niranjan.shegokar@dypic.in | Dr Niranjan Shegokar | FACULTY | ACTIVE
 *      FAC004   | saidkhandu@gmail.com   | Prof Khandu Said   | FACULTY | ACTIVE
 *      Marks obsolete FAC003 / Atul Gowardipe as INACTIVE.
 *   2. Updates Assignment_Controls legacy "Dr. Rahul Bachute" rows to canonical "FAC001".
 *
 * @return {TextOutput} Uniform JSON response with summary of updated records.
 */
function migrateFacultyCanonicalIdentity() {
  var results = { facultyRegistry: 0, assignmentControls: 0, errors: [] };

  // 1. Migrate Faculty_Registry
  try {
    var facSheet = getSheetSafe_(CONFIG.SHEETS.FACULTY_REGISTRY);
    if (facSheet && facSheet.getLastRow() > 1) {
      var fData = facSheet.getDataRange().getValues();
      var fMap = getHeaderMap(fData[0]);
      var facIdCol = fMap["Faculty_ID"] + 1;
      var facNameCol = fMap["Faculty_Name"] + 1;
      var roleCol = fMap["Role"] + 1;
      var statusCol = fMap["Status"] + 1;

      for (var fi = 1; fi < fData.length; fi++) {
        var fRow = fData[fi];
        var fLogin = String(fRow[fMap["Login_ID"]] || "").trim().toLowerCase();
        var fEmail = String(fRow[fMap["Email"]] || "").trim().toLowerCase();
        var fId = String(fRow[fMap["Faculty_ID"]] || "").trim();

        if (fLogin === "bachuterahul@gmail.com" || fEmail === "bachuterahul@gmail.com") {
          facSheet.getRange(fi + 1, facIdCol).setValue("ADMIN001");
          facSheet.getRange(fi + 1, facNameCol).setValue("Dr Rahul P Bachute");
          facSheet.getRange(fi + 1, roleCol).setValue("ADMIN");
          facSheet.getRange(fi + 1, statusCol).setValue("ACTIVE");
          results.facultyRegistry++;
        } else if (fLogin === "rahul.bachute@dypic.in" || fEmail === "rahul.bachute@dypic.in") {
          facSheet.getRange(fi + 1, facIdCol).setValue("FAC001");
          facSheet.getRange(fi + 1, facNameCol).setValue("Rahul Bachute");
          facSheet.getRange(fi + 1, roleCol).setValue("FACULTY");
          facSheet.getRange(fi + 1, statusCol).setValue("ACTIVE");
          results.facultyRegistry++;
        } else if (fLogin === "niranjan.shegokar@dypic.in" || fEmail === "niranjan.shegokar@dypic.in") {
          facSheet.getRange(fi + 1, facIdCol).setValue("FAC002");
          facSheet.getRange(fi + 1, facNameCol).setValue("Dr Niranjan Shegokar");
          facSheet.getRange(fi + 1, roleCol).setValue("FACULTY");
          facSheet.getRange(fi + 1, statusCol).setValue("ACTIVE");
          results.facultyRegistry++;
        } else if (fLogin === "saidkhandu@gmail.com" || fEmail === "saidkhandu@gmail.com") {
          facSheet.getRange(fi + 1, facIdCol).setValue("FAC004");
          facSheet.getRange(fi + 1, facNameCol).setValue("Prof Khandu Said");
          facSheet.getRange(fi + 1, roleCol).setValue("FACULTY");
          facSheet.getRange(fi + 1, statusCol).setValue("ACTIVE");
          results.facultyRegistry++;
        } else if (fId.toUpperCase() === "FAC003" || fLogin.indexOf("atul") !== -1 || fEmail.indexOf("atul") !== -1) {
          facSheet.getRange(fi + 1, statusCol).setValue("INACTIVE");
          results.facultyRegistry++;
        }
      }
    }
  } catch (err) {
    results.errors.push("Faculty_Registry migration: " + (err.message || String(err)));
  }

  // 2. Migrate Assignment_Controls
  try {
    var ctrlSheet = getSheetSafe_(CONFIG.SHEETS.ASSIGNMENT_CONTROLS);
    if (ctrlSheet && ctrlSheet.getLastRow() > 1) {
      var cData = ctrlSheet.getDataRange().getValues();
      var cMap = getHeaderMap(cData[0]);
      var cFacCol = cMap["Faculty_ID"] + 1;

      for (var ci = 1; ci < cData.length; ci++) {
        var cRow = cData[ci];
        var curFId = String(cRow[cMap["Faculty_ID"]] || "").trim();
        var norm = normalizeKey(curFId);
        if (norm === "dr-rahul-bachute" || norm === "rahul-bachute" || curFId === "Dr. Rahul Bachute") {
          ctrlSheet.getRange(ci + 1, cFacCol).setValue("FAC001");
          results.assignmentControls++;
        }
      }
    }
  } catch (cErr) {
    results.errors.push("Assignment_Controls migration: " + (cErr.message || String(cErr)));
  }

  return response(results);
}
