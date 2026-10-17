/**
 * ============================================================================
 * 03_Submission.gs
 * ----------------------------------------------------------------------------
 * Design Engineering Studio (DES) - Backend API
 * Student Submission Module
 *
 * Responsibilities:
 *   - Accept, validate, and persist new student submissions ("submit" action).
 *   - Serve the faculty dashboard's lightweight submission list
 *     ("submissions" action).
 *   - Serve a single submission's full JSON payload ("submission" action).
 *
 * This file implements ONLY the Submission module. It depends on symbols
 * defined elsewhere in the project (do not redefine them here):
 *
 *   From 01_Config.gs:
 *     - CONFIG                         (sheet names, header arrays, status
 *                                        enum, lock timeout, version info)
 *
 *   From 05_Common.gs:
 *     - getSheet(sheetName)            -> Sheet | null
 *     - getHeaderMap(headerRow)        -> { headerLabel: columnIndex, ... }
 *     - response(data, success, error, statusCode) -> TextOutput (JSON)
 *     - logError(error, contextPayload)
 *     - safeJsonParse(jsonString, fallback)
 *     - safeJsonStringify(obj)
 *     - generateId()
 *     - getUserEmail()
 *
 * Compatibility contract (must not change):
 *   - Action names: "submit", "submissions", "submission"
 *   - Request payload shapes (submission / studentInformation /
 *     challengeMetadata / submissionData)
 *   - Response JSON shape (via response())
 *   - Student_Submissions sheet name and column order:
 *       [Timestamp, Submission ID, Submission Hash, Student Name,
 *        Roll Number, Division, Attempt Mode, Challenge ID, Challenge Title,
 *        Attempt Number, Completion %, Status, Full JSON Payload, Email]
 * ============================================================================
 */

/**
 * ACTION: submit
 * -----------------------------------------------------------------------
 * Validates, deduplicates, and persists a new student submission.
 *
 * Concurrency:
 *   The duplicate-hash check, the attempt-number calculation, and the
 *   final appendRow() together form a single critical section: if two
 *   requests for the same student/challenge/hash run concurrently without
 *   a lock, they can both read the sheet before either has written,
 *   producing duplicate rows or two rows with the same attempt number.
 *   A script-wide lock is held for the entire read-check-write sequence
 *   to make this operation effectively atomic across concurrent
 *   executions.
 *
 * @param {Object} payload - Parsed request body. Expected shape:
 *   {
 *     submission: { submissionId, submissionHash, attemptMode, ... },
 *     studentInformation: { rollNumber, name, division, ... },
 *     challengeMetadata: { id, title, ... },
 *     submissionData: { completionPercent, ... }
 *   }
 * @return {TextOutput} Uniform JSON response. On success:
 *   { success: true, data: { submissionId, attemptNumber, status }, ... }
 */
function saveStudentSubmission(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  // ---------------------------------------------------------------------
  // Step 1: Acquire the script lock before touching the sheet. This
  // guarantees no other execution of saveStudentSubmission (from any
  // concurrent request) can interleave with this one.
  // ---------------------------------------------------------------------
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS || 30000);
    lockAcquired = true;
  } catch (lockError) {
    // Could not acquire the lock within the timeout window - another
    // submission is still in flight. Fail fast with a retryable status
    // code rather than letting the request hang indefinitely.
    logError(lockError, 'saveStudentSubmission: failed to acquire script lock');
    return response(
      null,
      false,
      'System is busy processing another submission. Please retry.',
      429
    );
  }

  try {
    // -------------------------------------------------------------------
    // Step 2: Load the sheet and build a header-name -> column-index map.
    // All column lookups below use this map instead of hard-coded
    // indices, so the code keeps working even if a column is ever
    // manually reordered on the live sheet.
    // -------------------------------------------------------------------
    var sheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!sheet) {
      throw new Error(
        'Student_Submissions sheet not found. Run ensureSheets() before use.'
      );
    }

    var data = sheet.getDataRange().getValues();
    var headerMap = getHeaderMap(data[0]);

    // -------------------------------------------------------------------
    // Step 3: Safely extract nested payload sections. Every section
    // defaults to an empty object so a missing/malformed section never
    // throws a "Cannot read properties of undefined" error - it simply
    // falls through to the "Missing required fields" validation below.
    // -------------------------------------------------------------------
    var submission = (payload && payload.submission) || {};
    var studentInfo = (payload && payload.studentInformation) || {};
    var challengeMeta = (payload && payload.challengeMetadata) || {};
    var submissionData = (payload && payload.submissionData) || {};

    var submissionHash = submission.submissionHash || '';
    var rollNumber = studentInfo.rollNumber || studentInfo.rollNo || '';
    var challengeId = challengeMeta.id || challengeMeta.challengeId || '';

    // -------------------------------------------------------------------
    // Step 4a: Role authorization check. Guest mode is strictly read-only.
    // -------------------------------------------------------------------
    var reqRole = (payload && (payload.role || payload.activeRole || payload.userRole)) ||
                  (submission && submission.role) ||
                  (studentInfo && studentInfo.role) || "";
    var isGuest = String(reqRole).trim().toUpperCase() === "GUEST" ||
                  (payload && payload.isGuest === true) ||
                  (submission && submission.isGuest === true) ||
                  (studentInfo && studentInfo.isGuest === true) ||
                  String(rollNumber).trim().toUpperCase() === "GUEST" ||
                  String(studentInfo.name || "").trim().toUpperCase() === "GUEST" ||
                  String(studentInfo.studentId || "").trim().toUpperCase() === "GUEST" ||
                  String(payload && payload.studentId || "").trim().toUpperCase() === "GUEST";

    if (isGuest) {
      return response(
        null,
        false,
        "Guest mode is strictly read-only and cannot submit student assignments.",
        403
      );
    }

    // -------------------------------------------------------------------
    // Step 4b: Required-field validation. A submission cannot be
    // deduplicated or attempt-counted without all three of these, so
    // reject early with a 400 rather than writing a malformed row.
    // -------------------------------------------------------------------
    if (!submissionHash || !rollNumber || !challengeId) {
      return response(
        null,
        false,
        'Missing required fields: hash, rollNumber, or challengeId',
        400
      );
    }

    // -------------------------------------------------------------------
    // Step 5: Duplicate detection. Rejects the request with 409 if this
    // exact submission hash has already been recorded.
    // -------------------------------------------------------------------
    if (duplicateSubmissionCheck(data, headerMap, submissionHash)) {
      return response(
        null,
        false,
        'Duplicate Submission Hash detected. Submission rejected.',
        409
      );
    }

    // -------------------------------------------------------------------
    // Step 5b: Authoritative Attempt Association and Assignment Control Enforcement
    // -------------------------------------------------------------------
    var attemptId = submission.attemptId || submission.submissionId || payload.attemptId || '';
    var clientFacultyId = String((studentInfo && (studentInfo.facultyId || studentInfo.selectedFacultyId)) || "").trim();
    var clientCollegeId = String((studentInfo && (studentInfo.collegeId || studentInfo.selectedCollegeId)) || "").trim();
    var facultyId = clientFacultyId;
    var matchedAfs = null;
    var afsRowIndex = -1;

    // Search Assignment_Faculty_Selection for authoritative attempt record
    var selSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || "Assignment_Faculty_Selection";
    var selSheet = getSheetSafe_(selSheetName);
    if (selSheet) {
      var selData = selSheet.getDataRange().getValues();
      if (selData.length > 1) {
        var selMap = getHeaderMap(selData[0]);
        for (var si = 1; si < selData.length; si++) {
          var sRow = selData[si];
          var sAttId = String(sRow[selMap["Attempt_ID"]] || "").trim();
          var sStuId = String(sRow[selMap["Student_ID"]] || "").trim();
          var sAsgId = String(sRow[selMap["Assignment_ID"]] || "").trim();
          if (attemptId && sAttId === String(attemptId).trim()) {
            afsRowIndex = si + 1;
            matchedAfs = {
              attemptId: sAttId,
              studentId: sStuId,
              collegeId: String(sRow[selMap["College_ID"]] || "").trim(),
              facultyId: String(sRow[selMap["Faculty_ID"]] || "").trim(),
              assignmentId: sAsgId
            };
            break;
          }
        }
      }
    }

    var isAfsAnonymous = false;
    if (matchedAfs) {
      var afsStudentId = String(matchedAfs.studentId || "").trim();
      isAfsAnonymous = (!afsStudentId || afsStudentId.toUpperCase() === "STU-ANONYMOUS");

      // 1. Authoritative Attempt Lock Enforcement
      // Do NOT allow client to rebind attempt to another student, assignment, faculty, or college.
      // Special-case STU-ANONYMOUS: if initial attempt was created with placeholder STU-ANONYMOUS,
      // allow the submitted identity to establish the actual student ID.
      // Otherwise, any mismatch with a real registered Student_ID is strictly rejected with HTTP 403.
      if (!isAfsAnonymous) {
        if (rollNumber && afsStudentId && rollNumber.toUpperCase() !== afsStudentId.toUpperCase()) {
          return response(null, false, "Attempt tampering detected: student (" + rollNumber + ") does not match registered attempt record (" + afsStudentId + ").", 403);
        }
      }
      if (challengeId && matchedAfs.assignmentId && challengeId.toUpperCase() !== matchedAfs.assignmentId.toUpperCase()) {
        return response(null, false, "Attempt tampering detected: assignment (" + challengeId + ") does not match registered attempt record (" + matchedAfs.assignmentId + ").", 403);
      }
      if (clientFacultyId && matchedAfs.facultyId && clientFacultyId.toUpperCase() !== matchedAfs.facultyId.toUpperCase()) {
        return response(null, false, "Attempt tampering detected: faculty (" + clientFacultyId + ") does not match registered attempt record (" + matchedAfs.facultyId + ").", 403);
      }
      if (clientCollegeId && matchedAfs.collegeId && clientCollegeId.toUpperCase() !== matchedAfs.collegeId.toUpperCase()) {
        return response(null, false, "Attempt tampering detected: college (" + clientCollegeId + ") does not match registered attempt record (" + matchedAfs.collegeId + ").", 403);
      }

      // Lock to authoritative server records.
      // If placeholder STU-ANONYMOUS, submitted rollNumber establishes the real student ID.
      facultyId = matchedAfs.facultyId;
      if (!isAfsAnonymous) {
        rollNumber = matchedAfs.studentId;
      }
      challengeId = matchedAfs.assignmentId;
      if (payload && payload.studentInformation) {
        payload.studentInformation.facultyId = matchedAfs.facultyId;
        payload.studentInformation.collegeId = matchedAfs.collegeId;
        payload.studentInformation.rollNumber = rollNumber;
      }
    } else {
      // Attempt not pre-registered in AFS (e.g. direct API submission or legacy payload)
      if (clientFacultyId && clientFacultyId.toUpperCase() !== "UNKNOWN") {
        var isFacActive = false;
        var facSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
        var facSheet = getSheetSafe_(facSheetName);
        if (facSheet) {
          var fData = facSheet.getDataRange().getValues();
          if (fData.length > 1) {
            var fMap = getHeaderMap(fData[0]);
            for (var fi = 1; fi < fData.length; fi++) {
              var rFId = String(fData[fi][fMap["Faculty_ID"]] || "").trim();
              if (rFId.toUpperCase() === clientFacultyId.toUpperCase()) {
                var rStatus = String(fData[fi][fMap["Status"]] || "").trim().toUpperCase();
                var rColId = String(fData[fi][fMap["College_ID"]] || "").trim().toUpperCase();
                if (rStatus === "ACTIVE" || !rStatus) {
                  if (!clientCollegeId || !rColId || rColId === clientCollegeId.toUpperCase()) {
                    isFacActive = true;
                    facultyId = rFId;
                  } else {
                    return response(null, false, "Faculty does not belong to the selected college.", 400);
                  }
                } else {
                  return response(null, false, "Faculty is inactive.", 400);
                }
                break;
              }
            }
          }
        }
        if (!isFacActive && facSheet && facSheet.getLastRow() > 1) {
          return response(null, false, "Invalid or nonexistent Faculty_ID.", 400);
        }
        if (!facultyId) facultyId = clientFacultyId;
      } else {
        facultyId = "UNKNOWN";
      }
    }

    // Check if the effective college is in the active College_Registry
    var targetCollegeId = (matchedAfs && matchedAfs.collegeId) ? matchedAfs.collegeId : clientCollegeId;
    var clientCollegeName = String((studentInfo && (studentInfo.collegeName || studentInfo.college)) || "").trim();

    var isRegisteredCollege = false;
    var hasCollegeRegistryRows = false;
    var colSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.COLLEGE_REGISTRY) || "College_Registry";
    var colSheet = getSheetSafe_(colSheetName);
    if (colSheet) {
      var colData = colSheet.getDataRange().getValues();
      if (colData.length > 1) {
        hasCollegeRegistryRows = true;
        var colMap = getHeaderMap(colData[0]);
        var colIdIdx = colMap["College_ID"];
        var colNameIdx = colMap["College_Name"];
        var colStatusIdx = colMap["Status"];

        // Priority 1 & 2: Match by targetCollegeId (from matchedAfs or clientCollegeId)
        if (targetCollegeId) {
          for (var cj = 1; cj < colData.length; cj++) {
            var cRowId = String(colData[cj][colIdIdx] || "").trim();
            if (cRowId.toUpperCase() === String(targetCollegeId).trim().toUpperCase()) {
              var cStatus = String(colData[cj][colStatusIdx] || "").trim().toUpperCase();
              if (cStatus === "ACTIVE" || !cStatus) {
                isRegisteredCollege = true;
                targetCollegeId = cRowId;
              }
              break;
            }
          }
        }

        // Priority 3: Fallback match by registered college name if targetCollegeId not yet resolved
        if (!isRegisteredCollege && clientCollegeName) {
          for (var ck = 1; ck < colData.length; ck++) {
            var cRowName = String(colData[ck][colNameIdx] || "").trim();
            if (cRowName.toUpperCase() === clientCollegeName.toUpperCase()) {
              var cStatus2 = String(colData[ck][colStatusIdx] || "").trim().toUpperCase();
              if (cStatus2 === "ACTIVE" || !cStatus2) {
                isRegisteredCollege = true;
                targetCollegeId = String(colData[ck][colIdIdx] || "").trim();
                if (payload && payload.studentInformation) {
                  payload.studentInformation.collegeId = targetCollegeId;
                }
              }
              break;
            }
          }
        }
      }
    }

    // Fallback to DEFAULT_COLLEGES only if College_Registry has no data rows.
    if (!isRegisteredCollege && !hasCollegeRegistryRows && typeof DEFAULT_COLLEGES !== "undefined" && Array.isArray(DEFAULT_COLLEGES)) {
      for (var dci = 0; dci < DEFAULT_COLLEGES.length; dci++) {
        var dColId = "COL" + ("000" + (dci + 1)).slice(-3);
        var dColName = DEFAULT_COLLEGES[dci];
        if (targetCollegeId && dColId.toUpperCase() === String(targetCollegeId).trim().toUpperCase()) {
          isRegisteredCollege = true;
          targetCollegeId = dColId;
          break;
        }
        if (!isRegisteredCollege && clientCollegeName && dColName.toUpperCase() === clientCollegeName.toUpperCase()) {
          isRegisteredCollege = true;
          targetCollegeId = dColId;
          if (payload && payload.studentInformation) {
            payload.studentInformation.collegeId = targetCollegeId;
          }
          break;
        }
      }
    }

    // Rule C: Unregistered college / no college cannot submit assignments
    if (!isRegisteredCollege) {
      return response(
        null,
        false,
        "Submission rejected: College is not registered or active with MEILP. Guest users cannot submit assignments.",
        403
      );
    }

    // Query active registered faculties belonging to targetCollegeId
    var activeFacultyCount = 0;
    var facSheetName2 = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
    var facSheet = getSheetSafe_(facSheetName2);
    if (facSheet) {
      var fData = facSheet.getDataRange().getValues();
      if (fData.length > 1) {
        var fMap = getHeaderMap(fData[0]);
        for (var fi = 1; fi < fData.length; fi++) {
          var rFId = String(fData[fi][fMap["Faculty_ID"]] || "").trim();
          var rStatus = String(fData[fi][fMap["Status"]] || "").trim().toUpperCase();
          var rColId = String(fData[fi][fMap["College_ID"]] || "").trim().toUpperCase();
          if ((rStatus === "ACTIVE" || !rStatus) && rColId === String(targetCollegeId).trim().toUpperCase() && rFId.toUpperCase() !== "UNKNOWN") {
            activeFacultyCount++;
          }
        }
      }
    }

    if (activeFacultyCount > 0) {
      // Rule A: Registered college with active faculties requires valid active faculty. UNKNOWN is strictly rejected!
      if (!facultyId || String(facultyId).trim().toUpperCase() === "UNKNOWN") {
        return response(
          null,
          false,
          "Submission rejected: Registered college requires valid active faculty allocation. UNKNOWN is not permitted.",
          403
        );
      }
    } else {
      // Rule B: Registered college with zero active faculties allows UNKNOWN submission!
      if (String(facultyId).trim().toUpperCase() !== "UNKNOWN") {
        return response(
          null,
          false,
          "Submission rejected: College has zero active registered faculties. Faculty_ID must be UNKNOWN.",
          400
        );
      }
    }

    // 2. Authoritative Assignment Controls Enforcement
    if (facultyId && facultyId.toUpperCase() !== "UNKNOWN") {
      var ctrlSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_CONTROLS) || "Assignment_Controls";
      var ctrlSheet = getSheetSafe_(ctrlSheetName);
      if (ctrlSheet) {
        var ctrlData = ctrlSheet.getDataRange().getValues();
        if (ctrlData.length > 1) {
          var ctrlMap = getHeaderMap(ctrlData[0]);
          for (var ci = 1; ci < ctrlData.length; ci++) {
            var cRow = ctrlData[ci];
            var cFacId = String(cRow[ctrlMap["Faculty_ID"]] || "").trim();
            var cAsgId = String(cRow[ctrlMap["Assignment_ID"]] || "").trim();

            if (cFacId.toUpperCase() === facultyId.toUpperCase() && cAsgId.toUpperCase() === challengeId.toUpperCase()) {
              // A. Enabled check
              var isEnabled = cRow[ctrlMap["Enabled"]] !== false && String(cRow[ctrlMap["Enabled"]]).toLowerCase() !== "false";
              if (!isEnabled) {
                return response(
                  null,
                  false,
                  "This assignment has been disabled by the faculty for your class.",
                  403
                );
              }

              // B. Release Date check
              var releaseDateStr = cRow[ctrlMap["Release_Date"]];
              if (releaseDateStr) {
                var parsedReleaseDate = new Date(releaseDateStr);
                if (!isNaN(parsedReleaseDate.getTime()) && new Date() < parsedReleaseDate) {
                  return response(
                    null,
                    false,
                    "This assignment is scheduled to open on " + releaseDateStr + ". Submissions are not yet open.",
                    403
                  );
                }
              }

              // C. Due Date and Allow Late check
              var dueDateStr = cRow[ctrlMap["Due_Date"]];
              var allowLate = (typeof parseBooleanSafe === "function")
                ? parseBooleanSafe(cRow[ctrlMap["Allow_Late"]], false)
                : (function(val) {
                    if (val === true || val === 1) return true;
                    if (val === false || val === 0) return false;
                    if (typeof val === "string") {
                      var s = String(val).trim().toLowerCase();
                      return s === "true" || s === "1" || s === "yes";
                    }
                    return false;
                  })(cRow[ctrlMap["Allow_Late"]]);

              if (dueDateStr) {
                var parsedDueDate = new Date(dueDateStr);
                if (!isNaN(parsedDueDate.getTime()) && new Date() > parsedDueDate) {
                  if (!allowLate) {
                    return response(
                      null,
                      false,
                      "Submission deadline (" + dueDateStr + ") has passed. Late submissions are not permitted by your faculty.",
                      403
                    );
                  } else {
                    if (!payload.submission) payload.submission = {};
                    payload.submission.isLate = true;
                    payload.submission.submittedLate = true;
                  }
                } else {
                  if (!payload.submission) payload.submission = {};
                  payload.submission.isLate = false;
                  payload.submission.submittedLate = false;
                }
              } else {
                if (!payload.submission) payload.submission = {};
                payload.submission.isLate = false;
                payload.submission.submittedLate = false;
              }
              break;
            }
          }
        }
      }
    }

    // Prospective Late Stamping: ensure accepted submissions explicitly persist isLate & submittedLate
    if (!payload.submission) {
      payload.submission = {};
    }
    if (payload.submission.isLate === undefined) {
      payload.submission.isLate = false;
      payload.submission.submittedLate = false;
    }

    // -------------------------------------------------------------------
    // Step 6: Attempt number = 1 + count of prior submissions by this
    // roll number for this challenge ID.
    // -------------------------------------------------------------------
    var attemptNumber = calculateAttemptNumber(
      data,
      headerMap,
      rollNumber,
      challengeId
    );

    var submissionId = submission.submissionId || generateId();
    var timestamp = new Date();
    var status = (CONFIG.STATUS && CONFIG.STATUS.SUBMITTED) || 'Submitted';

    // -------------------------------------------------------------------
    // Step 7: Build the row. Column ORDER here is fixed and MUST exactly
    // match CONFIG.HEADERS.SUBMISSIONS / the live sheet's physical column
    // order - this is a hard compatibility requirement, not something
    // that can be reordered for style. Any change here breaks the
    // frontend and every read path in this module and in Faculty.gs.
    // -------------------------------------------------------------------
    var rowData = [
      timestamp,                                   // Timestamp
      submissionId,                                 // Submission ID
      submissionHash,                                // Submission Hash
      studentInfo.name || 'Unknown',                 // Student Name
      rollNumber,                                    // Roll Number
      studentInfo.division || 'Unknown',              // Division
      submission.attemptMode || 'Standard',           // Attempt Mode
      challengeId,                                    // Challenge ID
      challengeMeta.title || 'Untitled Challenge',      // Challenge Title
      attemptNumber,                                  // Attempt Number
      submissionData.completionPercent || 0,           // Completion %
      status,                                          // Status
      safeJsonStringify(payload),                       // Full JSON Payload
      getUserEmail()                                    // Email
    ];

    // -------------------------------------------------------------------
    // Step 8: Persist. appendSubmissionRow() enforces the 14-column
    // schema guard before writing, so a malformed rowData array (e.g.
    // from a future edit that forgets a field) fails loudly here instead
    // of silently corrupting the sheet with a shifted row.
    // -------------------------------------------------------------------
    appendSubmissionRow(sheet, rowData);

    // Finalize placeholder STU-ANONYMOUS in Assignment_Faculty_Selection on successful submission
    if (selSheet && afsRowIndex > 1 && isAfsAnonymous && rollNumber) {
      try {
        var selHeaderMap = getHeaderMap(selSheet.getDataRange().getValues()[0]);
        if (selHeaderMap && selHeaderMap["Student_ID"] !== undefined) {
          selSheet.getRange(afsRowIndex, selHeaderMap["Student_ID"] + 1).setValue(rollNumber);
        }
      } catch (afsUpdateErr) {
        logError(afsUpdateErr, "saveStudentSubmission: finalize STU-ANONYMOUS in AFS");
      }
    }

    // Update corresponding Assignment_Faculty_Selection record if present
    if (typeof updateAssignmentSelectionOnSubmitSafe_ === 'function') {
      updateAssignmentSelectionOnSubmitSafe_(payload, submissionId);
    }

    return response({
      submissionId: submissionId,
      attemptNumber: attemptNumber,
      status: status
    });

  } catch (error) {
    // Any unexpected failure (sheet access error, schema guard trip,
    // etc.) is logged and reported as a clean 500 - never leaks a raw
    // stack trace or breaks the "always return JSON" contract.
    logError(error, payload);
    return response(null, false, 'Failed to save submission.', 500);

  } finally {
    // ---------------------------------------------------------------------
    // Always release the lock, even on early return or thrown error, so a
    // failed request never permanently blocks subsequent submissions.
    // ---------------------------------------------------------------------
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Determines whether a submission hash already exists in the sheet.
 *
 * Uses header-name lookup (not a hard-coded column index) and coerces
 * both sides to String before comparing. The coercion matters because
 * Google Sheets can silently store a purely-numeric string value as a
 * Number type on write; without coercion, a strict `===` comparison
 * between a Number read from the sheet and a String from the incoming
 * payload would incorrectly report "no duplicate" even when one exists.
 *
 * @param {Array<Array<*>>} data - Full getDataRange().getValues() result,
 *   including the header row at index 0.
 * @param {Object} headerMap - { headerLabel: columnIndex } from getHeaderMap().
 * @param {string} submissionHash - The incoming submission's hash to check.
 * @return {boolean} true if a row with a matching hash already exists.
 */
function duplicateSubmissionCheck(data, headerMap, submissionHash) {
  var hashIndex = headerMap['Submission Hash'];

  if (hashIndex === undefined) {
    // The expected header could not be found on the live sheet. Fail
    // safe by logging loudly rather than throwing (a missing header
    // should not take the whole submission endpoint down), but this
    // condition indicates the sheet schema has drifted and should be
    // investigated immediately - duplicate protection is effectively
    // disabled while this persists.
    logError(
      new Error('duplicateSubmissionCheck: "Submission Hash" header not found'),
      'duplicateSubmissionCheck'
    );
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][hashIndex]) === String(submissionHash)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates the next attempt number for a given student/challenge pair.
 *
 * Counts existing rows where both Roll Number and Challenge ID match the
 * incoming submission, then returns count + 1. Both sides of each
 * comparison are coerced to String so that Sheets' automatic type
 * coercion (e.g. a roll number stored as a Number vs. supplied as a
 * String) never causes an undercount.
 *
 * @param {Array<Array<*>>} data - Full getDataRange().getValues() result,
 *   including the header row at index 0.
 * @param {Object} headerMap - { headerLabel: columnIndex } from getHeaderMap().
 * @param {string} rollNumber - The submitting student's roll number.
 * @param {string} challengeId - The challenge ID being submitted for.
 * @return {number} The 1-based attempt number for this submission.
 */
function calculateAttemptNumber(data, headerMap, rollNumber, challengeId) {
  var rollIndex = headerMap['Roll Number'];
  var challengeIdIndex = headerMap['Challenge ID'];
  var attemptNumber = 1;

  if (rollIndex === undefined || challengeIdIndex === undefined) {
    // Required headers missing - cannot safely count prior attempts.
    // Log for visibility and fall back to attempt 1 rather than throwing,
    // so a schema drift on this sheet doesn't block submissions entirely.
    logError(
      new Error('calculateAttemptNumber: "Roll Number" or "Challenge ID" header not found'),
      'calculateAttemptNumber'
    );
    return attemptNumber;
  }

  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][rollIndex]) === String(rollNumber) &&
      String(data[i][challengeIdIndex]) === String(challengeId)
    ) {
      attemptNumber++;
    }
  }

  return attemptNumber;
}

/**
 * Appends a fully-built row to the Student_Submissions sheet.
 *
 * Enforces the fixed 14-column schema before writing. This guard exists
 * specifically to prevent silent column-shift corruption: if a future
 * edit to saveStudentSubmission() accidentally omits or adds a field to
 * rowData, this throws immediately instead of writing a row where every
 * value after the mistake lands one column off from its label - a class
 * of bug that is otherwise very difficult to detect from the sheet alone.
 *
 * @param {Sheet} sheet - The Student_Submissions Sheet object to append to.
 * @param {Array<*>} rowData - The fully-assembled row, in schema column order.
 * @throws {Error} If rowData does not have exactly 14 elements.
 */
function appendSubmissionRow(sheet, rowData) {
  if (rowData.length != 14) {
    throw new Error('Row length mismatch');
  }

  sheet.appendRow(rowData);
}

/**
 * ACTION: submissions
 * -----------------------------------------------------------------------
/**
 * ACTION: submissions / getSubmissions
 * -----------------------------------------------------------------------
 * Returns a lightweight list of submissions authorized for the requesting
 * faculty member (summary fields only - not the full JSON payload).
 * Requires authenticated Faculty_ID. Server-side isolation ensures
 * faculty members can only retrieve submissions assigned to them via
 * Assignment_Faculty_Selection.
 *
 * @param {Object} payload - { facultyId?: string, authFacultyId?: string, assignmentId?: string, status?: string }
 * @return {TextOutput} Uniform JSON response containing an array of
 *   submission summary objects, sorted newest-first by timestamp.
 */
function getSubmissions(payload) {
  try {
    var subSheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!subSheet) {
      return response(null, false, 'Student_Submissions sheet not found.', 500);
    }

    var subData = subSheet.getDataRange().getValues();

    // Only a header row (or a completely empty sheet) - nothing to list.
    if (subData.length <= 1) {
      return response([]);
    }

    var subMap = getHeaderMap(subData[0]);

    // Defensive payload normalization
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (pe) {
        payload = {};
      }
    }

    // Extract authorization and filter parameters
    var authFacultyId = payload && (payload.authFacultyId || payload.authenticatedFacultyId);
    var reqFacultyId = payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID);
    var reqRole = payload && (payload.role || payload.authRole || payload.userRole);
    var reqAssignmentId = payload && (payload.assignmentId || payload.assignment_id || payload.Assignment_ID || payload.challengeId);
    var reqStatus = payload && payload.status;

    var normRole = String(reqRole || '').trim().toUpperCase();
    var normAuth = String(authFacultyId || '').trim().toUpperCase();
    var normReq = String(reqFacultyId || '').trim().toUpperCase();

    // Role check: Guests and students are strictly prohibited from accessing faculty submissions
    if (normRole === 'GUEST' || normRole === 'STUDENT' || normAuth === 'GUEST' || normReq === 'GUEST') {
      return response(null, false, 'Unauthorized: Guests and students are not permitted to access submissions.', 403);
    }

    var isReqAdmin = (normAuth === 'ADMIN001') || (normRole === 'ADMIN');

    // Cross-faculty access guard: client cannot specify a different facultyId unless authorized admin
    if (normAuth && normReq) {
      if (normAuth !== normReq && !isReqAdmin) {
        return response(null, false, 'Unauthorized: Cannot access submissions for another faculty member.', 403);
      }
    }

    // Resolve authoritative target faculty ID
    var targetFacultyId = '';
    if (normAuth && !isReqAdmin) {
      targetFacultyId = normAuth;
    } else if (normReq) {
      targetFacultyId = normReq;
    } else if (normAuth) {
      targetFacultyId = normAuth;
    }

    // Missing authenticated faculty identity must never return all submissions
    if (!targetFacultyId) {
      return response(null, false, 'Unauthorized: Valid authenticated faculty ID required.', 403);
    }

    // UNKNOWN records are NEVER routed to normal faculty evaluation
    if (targetFacultyId === 'UNKNOWN') {
      return response([]);
    }

    if (reqAssignmentId) {
      reqAssignmentId = String(reqAssignmentId).trim();
    }

    // Query Assignment_Faculty_Selection for permitted attempts
    var selSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || "Assignment_Faculty_Selection";
    var selSheet = getSheetSafe_(selSheetName);
    var permittedAttempts = {};
    var permittedStudentChallenges = {};
    var permittedCollegesByAttempt = {};
    var permittedCollegesByStuAsg = {};
    var otherFacultyAttempts = {};
    var otherFacultyStudentChallenges = {};

    if (selSheet) {
      var selData = selSheet.getDataRange().getValues();
      if (selData.length > 1) {
        var selMap = getHeaderMap(selData[0]);
        for (var si = 1; si < selData.length; si++) {
          var sRow = selData[si];
          var sFacultyId = String(sRow[selMap['Faculty_ID']] || '').trim().toUpperCase();
          var sAssignmentId = String(sRow[selMap['Assignment_ID']] || '').trim();
          var sAttemptId = String(sRow[selMap['Attempt_ID']] || '').trim();
          var sStudentId = String(sRow[selMap['Student_ID']] || '').trim();
          var sColId = (selMap['College_ID'] !== undefined) ? String(sRow[selMap['College_ID']] || '').trim() : '';
          if (sStudentId.endsWith('.0')) {
            sStudentId = sStudentId.slice(0, -2);
          }

          if (sFacultyId === targetFacultyId) {
            if (!reqAssignmentId || sAssignmentId.toUpperCase() === reqAssignmentId.toUpperCase()) {
              if (sAttemptId) {
                permittedAttempts[sAttemptId] = true;
                if (sColId) permittedCollegesByAttempt[sAttemptId] = sColId;
              }
              if (sStudentId && sAssignmentId) {
                var stuAsgKey = sStudentId + '___' + sAssignmentId.toUpperCase();
                permittedStudentChallenges[stuAsgKey] = true;
                if (sColId) permittedCollegesByStuAsg[stuAsgKey] = sColId;
              }
            }
          } else if (sFacultyId && sFacultyId !== 'UNKNOWN') {
            if (!reqAssignmentId || sAssignmentId.toUpperCase() === reqAssignmentId.toUpperCase()) {
              if (sAttemptId) otherFacultyAttempts[sAttemptId] = true;
              if (sStudentId && sAssignmentId) {
                otherFacultyStudentChallenges[sStudentId + '___' + sAssignmentId.toUpperCase()] = true;
              }
            }
          }
        }
      }
    }

    var facultyProfile = verifyActiveFacultyMember_(targetFacultyId);
    var targetFacultyName = facultyProfile ? facultyProfile.facultyName : targetFacultyId;
    var targetCollegeId = (facultyProfile && facultyProfile.collegeId) ? facultyProfile.collegeId : 'COL001';
    var targetCollegeName = (facultyProfile && facultyProfile.collegeName) ? facultyProfile.collegeName : 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon';

    var submissions = [];
    var payloadIndex = subMap['Full JSON Payload'];

    for (var i = 1; i < subData.length; i++) {
      var row = subData[i];
      var sId = String(row[subMap['Submission ID']] || '').trim();
      var roll = String(row[subMap['Roll Number']] || '').trim();
      if (roll.endsWith('.0')) {
        roll = roll.slice(0, -2);
      }
      var chId = String(row[subMap['Challenge ID']] || '').trim();
      var statusVal = String(row[subMap['Status']] || '').trim();

      if (!chId) continue;
      if (reqAssignmentId && chId.toUpperCase() !== reqAssignmentId.toUpperCase()) continue;
      if (reqStatus && statusVal.toLowerCase() !== String(reqStatus).trim().toLowerCase()) continue;

      var rawPayload = (payloadIndex !== undefined) ? String(row[payloadIndex] || '').trim() : '';
      var parsedPayload = null;
      var payloadAttemptId = '';
      var payloadFaculty = '';

      var storedIsLate = null;
      var storedSubmittedLate = null;
      if (rawPayload) {
        parsedPayload = safeJsonParse(rawPayload, null);
        if (parsedPayload) {
          var pStu = parsedPayload.studentInformation || {};
          var pSub = parsedPayload.submission || {};
          payloadAttemptId = String(pSub.attemptId || parsedPayload.attemptId || (typeof pStu === 'object' ? pStu.attemptId : '') || '').trim();
          var fRaw = (typeof pStu === 'object' ? (pStu.facultyId || pStu.selectedFacultyId) : '') || parsedPayload.facultyId || (typeof pSub === 'object' ? pSub.facultyId : '') || '';
          payloadFaculty = String(fRaw).trim().toUpperCase();

          if (typeof pSub.isLate === 'boolean') {
            storedIsLate = pSub.isLate;
          } else if (pSub.isLate === 'true' || pSub.isLate === 'TRUE' || pSub.isLate === 1) {
            storedIsLate = true;
          } else if (pSub.isLate === 'false' || pSub.isLate === 'FALSE' || pSub.isLate === 0) {
            storedIsLate = false;
          }

          if (typeof pSub.submittedLate === 'boolean') {
            storedSubmittedLate = pSub.submittedLate;
          } else if (pSub.submittedLate === 'true' || pSub.submittedLate === 'TRUE' || pSub.submittedLate === 1) {
            storedSubmittedLate = true;
          } else if (pSub.submittedLate === 'false' || pSub.submittedLate === 'FALSE' || pSub.submittedLate === 0) {
            storedSubmittedLate = false;
          }
        }
      }

      // Check cross-faculty conflict from AFS
      var isOtherFaculty = (
        otherFacultyAttempts[sId] ||
        (payloadAttemptId && otherFacultyAttempts[payloadAttemptId]) ||
        otherFacultyStudentChallenges[roll + '___' + chId.toUpperCase()]
      );
      if (isOtherFaculty) continue;

      // Check permitted from AFS
      var isPermitted = (
        permittedAttempts[sId] ||
        (payloadAttemptId && permittedAttempts[payloadAttemptId]) ||
        permittedStudentChallenges[roll + '___' + chId.toUpperCase()]
      );

      // Fallback: Trusted payload association for legacy or direct submissions without an AFS entry
      if (!isPermitted) {
        if (payloadFaculty && payloadFaculty === targetFacultyId) {
          isPermitted = true;
        }
      }

      if (isPermitted) {
        var resolvedCollegeId = permittedCollegesByAttempt[sId] ||
          (payloadAttemptId && permittedCollegesByAttempt[payloadAttemptId]) ||
          permittedCollegesByStuAsg[roll + '___' + chId.toUpperCase()] ||
          targetCollegeId;

        submissions.push({
          submissionId: sId,
          studentName: row[subMap['Student Name']],
          rollNumber: roll,
          division: (subMap['Division'] !== undefined) ? row[subMap['Division']] : '',
          challengeId: chId,
          challengeTitle: row[subMap['Challenge Title']],
          attemptNumber: (subMap['Attempt Number'] !== undefined && row[subMap['Attempt Number']])
            ? row[subMap['Attempt Number']]
            : ((subMap['Attempt No'] !== undefined && row[subMap['Attempt No']])
              ? row[subMap['Attempt No']]
              : 1),
          completionPercent: row[subMap['Completion %']],
          status: statusVal,
          timestamp: row[subMap['Timestamp']],
          facultyId: targetFacultyId,
          facultyName: targetFacultyName,
          allocationStatus: 'Allocated',
          isAllocated: true,
          collegeId: resolvedCollegeId,
          collegeName: targetCollegeName,
          isLate: (storedIsLate !== null) ? storedIsLate : (storedSubmittedLate !== null ? storedSubmittedLate : null),
          submittedLate: (storedSubmittedLate !== null) ? storedSubmittedLate : (storedIsLate !== null ? storedIsLate : null)
        });
      }
    }

    // Sort descending by timestamp
    submissions.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return response(submissions);

  } catch (error) {
    logError(error, 'getSubmissions');
    return response(null, false, 'Failed to retrieve submissions.', 500);
  }
}

/**
 * ACTION: submission
 * -----------------------------------------------------------------------
 * Returns the complete stored JSON payload for a single submission ID.
 *
 * @param {Object} payload - Expected shape: { submissionId: string, facultyId?: string }
 * @return {TextOutput} Uniform JSON response. On success, `data` is the
 *   original full submission payload exactly as it was stored at
 *   submit-time (i.e. the parsed contents of the "Full JSON Payload"
 *   column).
 */
function getSubmission(payload) {
  try {
    var submissionId = payload && (payload.submissionId || payload.id);
    if (!submissionId) {
      return response(null, false, 'Missing submissionId', 400);
    }
    submissionId = String(submissionId).trim();

    var reqFacultyId = payload && (payload.authFacultyId || payload.facultyId || payload.faculty_id || payload.Faculty_ID);
    var isAuthorized = false;
    var selSheet = null;

    if (reqFacultyId) {
      reqFacultyId = String(reqFacultyId).trim();
      // If UNKNOWN faculty, forbid access
      if (reqFacultyId.toUpperCase() === "UNKNOWN") {
        return response(null, false, "Unauthorized access to submission.", 403);
      }

      // Check Assignment_Faculty_Selection to confirm faculty authorization for this submission
      var selSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || "Assignment_Faculty_Selection";
      selSheet = getSheetSafe_(selSheetName);
      if (selSheet) {
        var selData = selSheet.getDataRange().getValues();
        if (selData.length > 1) {
          var selMap = getHeaderMap(selData[0]);
          for (var si = 1; si < selData.length; si++) {
            var sRow = selData[si];
            var sFacultyId = String(sRow[selMap["Faculty_ID"]] || "").trim();
            var sAttemptId = String(sRow[selMap["Attempt_ID"]] || "").trim();

            if (sAttemptId === submissionId && sFacultyId.toUpperCase() === reqFacultyId.toUpperCase()) {
              isAuthorized = true;
              break;
            }
          }
          // Note: if routing record is found for a DIFFERENT faculty, deny
          for (var di = 1; di < selData.length; di++) {
            var dRow = selData[di];
            var dFacultyId = String(dRow[selMap["Faculty_ID"]] || "").trim();
            var dAttemptId = String(dRow[selMap["Attempt_ID"]] || "").trim();
            if (dAttemptId === submissionId && dFacultyId.toUpperCase() !== reqFacultyId.toUpperCase()) {
              return response(null, false, "Unauthorized access to submission.", 403);
            }
          }
        }
      }
    }

    var sheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!sheet) {
      return response(null, false, 'Student_Submissions sheet not found.', 500);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return response(null, false, 'Submission not found', 404);
    }
    var lastCol = sheet.getLastColumn();

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerMap = getHeaderMap(headers);
    var idIndex = headerMap['Submission ID'];
    var payloadIndex = headerMap['Full JSON Payload'];

    if (idIndex === undefined || payloadIndex === undefined) {
      logError(
        new Error('getSubmission: required headers not found on sheet'),
        'getSubmission'
      );
      return response(null, false, 'Failed to retrieve submission.', 500);
    }

    var idColumnValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
    var rowIndex = -1;
    for (var i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(submissionId)) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return response(null, false, 'Submission not found', 404);
    }

    var jsonString = sheet.getRange(rowIndex, payloadIndex + 1).getValue();
    var fullPayload = safeJsonParse(jsonString, null);

    if (fullPayload === null) {
      return response(null, false, 'Stored payload is corrupt or invalid JSON', 500);
    }

    if (reqFacultyId && reqFacultyId.toUpperCase() !== "ADMIN001") {
      var pStu = fullPayload.studentInformation || {};
      var pSub = fullPayload.submission || {};
      var pAttId = String(pSub.attemptId || fullPayload.attemptId || (typeof pStu === 'object' ? pStu.attemptId : '') || '').trim();
      var pFac = (typeof pStu === 'object' ? (pStu.facultyId || pStu.selectedFacultyId) : '') || fullPayload.facultyId || (typeof pSub === 'object' ? pSub.facultyId : '') || '';
      pFac = String(pFac).trim().toUpperCase();

      if (selSheet && pAttId) {
        var selData2 = selSheet.getDataRange().getValues();
        if (selData2.length > 1) {
          var selMap2 = getHeaderMap(selData2[0]);
          for (var si2 = 1; si2 < selData2.length; si2++) {
            var sRow2 = selData2[si2];
            var sFac2 = String(sRow2[selMap2["Faculty_ID"]] || "").trim().toUpperCase();
            var sAtt2 = String(sRow2[selMap2["Attempt_ID"]] || "").trim();
            if (sAtt2 === pAttId && sFac2 !== reqFacultyId.toUpperCase() && sFac2 !== "UNKNOWN") {
              return response(null, false, "Unauthorized access to submission.", 403);
            }
          }
        }
      }

      if (pFac && pFac !== reqFacultyId.toUpperCase() && !isAuthorized) {
        return response(null, false, "Unauthorized access to submission.", 403);
      }
    }

    return response(fullPayload);

  } catch (error) {
    logError(error, payload);
    return response(null, false, 'Failed to retrieve submission.', 500);
  }
}

/**
 * Validates that an identity corresponds to an active, registered faculty member.
 * Checks Faculty_Registry sheet (and DEFAULT_FACULTY_REGISTRY fallback).
 *
 * @param {string} facultyId - Faculty identifier, email, or login ID.
 * @return {Object|null} Verified faculty profile object or null if invalid/inactive.
 */
function verifyActiveFacultyMember_(facultyId) {
  if (!facultyId) return null;
  var normTarget = String(facultyId).trim().toUpperCase();
  if (normTarget === 'UNKNOWN' || normTarget === 'GUEST' || normTarget === 'STUDENT') {
    return null;
  }

  // 1. Check Faculty_Registry sheet if available
  var facSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
  var facSheet = getSheetSafe_(facSheetName);
  if (facSheet) {
    var data = (typeof facSheet.getDataRange === 'function') ? facSheet.getDataRange().getValues() : [];
    if (data && data.length > 1) {
      var fMap = getHeaderMap(data[0]);
      for (var fi = 1; fi < data.length; fi++) {
        var row = data[fi];
        var rowFacId = String(row[fMap["Faculty_ID"]] || "").trim().toUpperCase();
        var rowEmail = String(row[fMap["Email"]] || "").trim().toUpperCase();
        var rowLogin = String(row[fMap["Login_ID"]] || "").trim().toUpperCase();

        if (rowFacId === normTarget || rowEmail === normTarget || rowLogin === normTarget) {
          var statusVal = String(row[fMap["Status"]] || "").trim().toUpperCase();
          if (!statusVal || statusVal === "ACTIVE") {
            return {
              facultyId: String(row[fMap["Faculty_ID"]] || "").trim(),
              facultyName: String(row[fMap["Faculty_Name"]] || "").trim(),
              collegeId: String(row[fMap["College_ID"]] || "").trim(),
              collegeName: String(row[fMap["College_Name"]] || "").trim(),
              role: String(row[fMap["Role"]] || "FACULTY").trim().toUpperCase()
            };
          }
          return null; // found but inactive
        }
      }
    }
  }

  // 2. Fallback to DEFAULT_FACULTY_REGISTRY if sheet not populated or in test harness
  if (typeof DEFAULT_FACULTY_REGISTRY !== "undefined" && Array.isArray(DEFAULT_FACULTY_REGISTRY)) {
    for (var d = 0; d < DEFAULT_FACULTY_REGISTRY.length; d++) {
      var df = DEFAULT_FACULTY_REGISTRY[d];
      var dfId = String(df.facultyId || '').trim().toUpperCase();
      var dfEmail = String(df.email || '').trim().toUpperCase();
      if (dfId === normTarget || dfEmail === normTarget) {
        var dfStatus = String(df.status || 'ACTIVE').trim().toUpperCase();
        if (dfStatus === 'ACTIVE') {
          return {
            facultyId: df.facultyId,
            facultyName: df.facultyName,
            collegeId: df.collegeId,
            collegeName: df.collegeName,
            role: df.role || "FACULTY"
          };
        }
        return null;
      }
    }
  }

  return null;
}

/**
 * Authoritatively verifies that a request originates from an active Administrator.
 * Queries Faculty_Registry (and DEFAULT_FACULTY_REGISTRY fallback).
 *
 * Security & Anti-Spoofing Rules:
 * 1. Must supply an explicit authenticated identity (authFacultyId or authenticatedFacultyId).
 *    Client-supplied target facultyId, role, localStorage, or browser flags are NEVER trusted.
 * 2. Unauthenticated, student, guest, or unknown callers are rejected.
 * 3. Verified database record must be ACTIVE and have role === "ADMIN".
 *
 * @param {Object} payload - Request payload containing authFacultyId or authenticatedFacultyId.
 * @return {Object|null} Verified admin profile object or null if unauthorized.
 */
function verifyActiveAdminMember_(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  var authFacultyId = payload.authFacultyId || payload.authenticatedFacultyId;
  if (!authFacultyId) {
    return null;
  }

  var normAuth = String(authFacultyId).trim().toUpperCase();
  if (!normAuth || normAuth === 'UNKNOWN' || normAuth === 'GUEST' || normAuth === 'STUDENT') {
    return null;
  }

  var reqRole = String(payload.role || payload.authRole || payload.userRole || '').trim().toUpperCase();
  if (reqRole === 'GUEST' || reqRole === 'STUDENT') {
    return null;
  }

  var verifiedCaller = verifyActiveFacultyMember_(normAuth);
  if (!verifiedCaller) {
    return null;
  }

  if (verifiedCaller.role === 'ADMIN') {
    return verifiedCaller;
  }

  return null;
}

/**
 * ACTION: getInstituteSubmissions / instituteSubmissions
 * -----------------------------------------------------------------------
 * Explicit, read-only viewing path allowing authenticated, server-verified
 * administrators to view student submissions across all colleges and assignments.
 *
 * Security & Authorization Rules:
 * 1. Restricted exclusively to authenticated, server-verified Admin accounts.
 * 2. Ordinary active faculty members are denied with HTTP 403.
 * 3. Unauthenticated requests, students, guests, and unknown identities are denied with HTTP 403.
 * 4. Client-supplied role and target facultyId parameters are never trusted for authorization.
 * 5. Strictly READ-ONLY: grants no evaluation, marks-awarding, or assignment-control privileges.
 * 6. Preserves data integrity: malformed or blank rows are omitted; unallocated/UNKNOWN records
 *    are explicitly marked as Unallocated / UNKNOWN and distinguished from verified faculty allocations.
 * 7. Legitimate legacy submissions are included where stored data supports retrieval.
 *
 * @param {Object} payload - { authFacultyId, collegeId?, assignmentId?, division?, status?, dateFrom?, dateTo? }
 * @return {TextOutput} Uniform JSON response containing array of submission summary objects with institute metadata.
 */
function getInstituteSubmissions(payload) {
  try {
    // 1. Defensive payload normalization
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (pe) {
        payload = {};
      }
    }

    // 2. Authoritative Admin verification
    var verifiedAdmin = verifyActiveAdminMember_(payload);
    if (!verifiedAdmin) {
      return response(null, false, 'Unauthorized: Access restricted to verified administrators.', 403);
    }

    // Optional query filters
    var filterCollege = payload && (payload.collegeId || payload.college || payload.collegeName);
    var filterAssignment = payload && (payload.assignmentId || payload.assignment_id || payload.Assignment_ID || payload.challengeId);
    var filterDivision = payload && payload.division;
    var filterStatus = payload && payload.status;
    var filterDateFrom = payload && (payload.dateFrom || payload.startDate);
    var filterDateTo = payload && (payload.dateTo || payload.endDate);

    if (filterCollege) filterCollege = String(filterCollege).trim().toLowerCase();
    if (filterAssignment) filterAssignment = String(filterAssignment).trim().toUpperCase();
    if (filterDivision) filterDivision = String(filterDivision).trim().toUpperCase();
    if (filterStatus) filterStatus = String(filterStatus).trim().toLowerCase();

    // 3. Open Student_Submissions sheet
    var subSheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!subSheet) {
      return response(null, false, 'Student_Submissions sheet not found.', 500);
    }

    var subData = subSheet.getDataRange().getValues();
    if (subData.length <= 1) {
      return response([]);
    }

    var subMap = getHeaderMap(subData[0]);
    var payloadIndex = subMap['Full JSON Payload'];

    // 4. Preload reference mappings for enrichment and verification
    // A. Assignment_Faculty_Selection (AFS)
    var selSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || "Assignment_Faculty_Selection";
    var selSheet = getSheetSafe_(selSheetName);
    var afsAttemptMap = {};
    var afsStudentChallengeMap = {};

    if (selSheet) {
      var selData = selSheet.getDataRange().getValues();
      if (selData.length > 1) {
        var selMap = getHeaderMap(selData[0]);
        for (var si = 1; si < selData.length; si++) {
          var sRow = selData[si];
          var sAttId = String(sRow[selMap['Attempt_ID']] || '').trim();
          var sStuId = String(sRow[selMap['Student_ID']] || '').trim();
          if (sStuId.endsWith('.0')) sStuId = sStuId.slice(0, -2);
          var sAsgId = String(sRow[selMap['Assignment_ID']] || '').trim().toUpperCase();
          var sColId = String(sRow[selMap['College_ID']] || '').trim();
          var sFacId = String(sRow[selMap['Faculty_ID']] || '').trim();

          var rec = { collegeId: sColId, facultyId: sFacId, assignmentId: sAsgId, studentId: sStuId };
          if (sAttId) afsAttemptMap[sAttId] = rec;
          if (sStuId && sAsgId) afsStudentChallengeMap[sStuId + '___' + sAsgId] = rec;
        }
      }
    }

    // B. College_Registry
    var colSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.COLLEGE_REGISTRY) || "College_Registry";
    var colSheet = getSheetSafe_(colSheetName);
    var collegeNameById = {};
    var collegeIdByName = {};

    if (colSheet && colSheet.getLastRow() > 1) {
      var colData = colSheet.getDataRange().getValues();
      var colMap = getHeaderMap(colData[0]);
      for (var ci = 1; ci < colData.length; ci++) {
        var cId = String(colData[ci][colMap['College_ID']] || '').trim();
        var cName = String(colData[ci][colMap['College_Name']] || '').trim();
        if (cId) collegeNameById[cId.toUpperCase()] = cName;
        if (cName) collegeIdByName[cName.toLowerCase()] = cId;
      }
    }

    // Fallback to DEFAULT_COLLEGES
    if (typeof DEFAULT_COLLEGES !== 'undefined' && Array.isArray(DEFAULT_COLLEGES)) {
      for (var dci = 0; dci < DEFAULT_COLLEGES.length; dci++) {
        var dfcName = DEFAULT_COLLEGES[dci];
        var dfcId = 'COL' + ('00' + (dci + 1)).slice(-3);
        if (!collegeNameById[dfcId]) collegeNameById[dfcId] = dfcName;
        if (!collegeIdByName[dfcName.toLowerCase()]) collegeIdByName[dfcName.toLowerCase()] = dfcId;
      }
    }

    // C. Faculty_Registry
    var facSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
    var facSheet = getSheetSafe_(facSheetName);
    var facultyNameById = {};
    var facultyCollegeById = {};

    if (facSheet && facSheet.getLastRow() > 1) {
      var fData = facSheet.getDataRange().getValues();
      var fMap = getHeaderMap(fData[0]);
      for (var fi = 1; fi < fData.length; fi++) {
        var fId = String(fData[fi][fMap['Faculty_ID']] || '').trim().toUpperCase();
        var fName = String(fData[fi][fMap['Faculty_Name']] || '').trim();
        var fCId = String(fData[fi][fMap['College_ID']] || '').trim();
        if (fId) {
          facultyNameById[fId] = fName;
          facultyCollegeById[fId] = fCId;
        }
      }
    }

    if (typeof DEFAULT_FACULTY_REGISTRY !== 'undefined' && Array.isArray(DEFAULT_FACULTY_REGISTRY)) {
      for (var dfi = 0; dfi < DEFAULT_FACULTY_REGISTRY.length; dfi++) {
        var dfObj = DEFAULT_FACULTY_REGISTRY[dfi];
        var dfId = dfObj.facultyId.toUpperCase();
        if (!facultyNameById[dfId]) facultyNameById[dfId] = dfObj.facultyName;
        if (!facultyCollegeById[dfId]) facultyCollegeById[dfId] = dfObj.collegeId;
      }
    }

    // D. Faculty_Evaluation
    var evalSheet = getSheetSafe_(CONFIG.SHEETS.EVALUATION);
    var evalMapBySubId = {};
    if (evalSheet && evalSheet.getLastRow() > 1) {
      var evalData = evalSheet.getDataRange().getValues();
      var eMap = getHeaderMap(evalData[0]);
      for (var ei = 1; ei < evalData.length; ei++) {
        var eSubId = String(evalData[ei][eMap['Submission ID']] || '').trim();
        if (eSubId) {
          evalMapBySubId[eSubId] = {
            marks: evalData[ei][eMap['Marks']],
            maxMarks: evalData[ei][eMap['Max Marks']],
            percentage: evalData[ei][eMap['Percentage']],
            facultyName: evalData[ei][eMap['Faculty Name']],
            facultyEmail: evalData[ei][eMap['Faculty Email']],
            evaluatedAt: evalData[ei][eMap['Timestamp']]
          };
        }
      }
    }

    // 5. Iterate and enrich legitimate submissions
    var submissions = [];

    for (var i = 1; i < subData.length; i++) {
      var row = subData[i];
      var sId = String(row[subMap['Submission ID']] || '').trim();
      var roll = String(row[subMap['Roll Number']] || '').trim();
      if (roll.endsWith('.0')) roll = roll.slice(0, -2);
      var chId = String(row[subMap['Challenge ID']] || '').trim();
      var studentName = String(row[subMap['Student Name']] || '').trim();
      var divisionVal = (subMap['Division'] !== undefined) ? String(row[subMap['Division']] || '').trim() : '';
      var statusVal = String(row[subMap['Status']] || '').trim();
      var rawTimestamp = row[subMap['Timestamp']];

      // Integrity Guard: skip malformed, empty or corrupted rows
      if (!sId || !chId || !roll) continue;

      // Parse payload defensively
      var rawPayload = (payloadIndex !== undefined) ? String(row[payloadIndex] || '').trim() : '';
      var parsedPayload = null;
      var payloadAttemptId = '';
      var payloadFaculty = '';
      var payloadCollegeId = '';
      var payloadCollegeName = '';
      var payloadBranch = '';
      var payloadDivision = '';

      var instIsLate = null;
      var instSubmittedLate = null;
      if (rawPayload) {
        parsedPayload = safeJsonParse(rawPayload, null);
        if (parsedPayload) {
          var pStu = parsedPayload.studentInformation || {};
          var pSub = parsedPayload.submission || {};
          payloadAttemptId = String(pSub.attemptId || parsedPayload.attemptId || (typeof pStu === 'object' ? pStu.attemptId : '') || '').trim();
          var fRaw = (typeof pStu === 'object' ? (pStu.facultyId || pStu.selectedFacultyId) : '') || parsedPayload.facultyId || (typeof pSub === 'object' ? pSub.facultyId : '') || '';
          payloadFaculty = String(fRaw).trim().toUpperCase();
          payloadCollegeId = String((typeof pStu === 'object' ? (pStu.collegeId || pStu.selectedCollegeId) : '') || parsedPayload.collegeId || '').trim();
          payloadCollegeName = String((typeof pStu === 'object' ? (pStu.college || pStu.collegeName) : '') || parsedPayload.collegeName || '').trim();
          payloadBranch = String((typeof pStu === 'object' ? (pStu.branch || pStu.department) : '') || '').trim();
          payloadDivision = String((typeof pStu === 'object' ? pStu.division : '') || '').trim();

          if (typeof pSub.isLate === 'boolean') {
            instIsLate = pSub.isLate;
          } else if (pSub.isLate === 'true' || pSub.isLate === 'TRUE' || pSub.isLate === 1) {
            instIsLate = true;
          } else if (pSub.isLate === 'false' || pSub.isLate === 'FALSE' || pSub.isLate === 0) {
            instIsLate = false;
          }

          if (typeof pSub.submittedLate === 'boolean') {
            instSubmittedLate = pSub.submittedLate;
          } else if (pSub.submittedLate === 'true' || pSub.submittedLate === 'TRUE' || pSub.submittedLate === 1) {
            instSubmittedLate = true;
          } else if (pSub.submittedLate === 'false' || pSub.submittedLate === 'FALSE' || pSub.submittedLate === 0) {
            instSubmittedLate = false;
          }
        }
      }

      // Resolve AFS association
      var afsMatch = afsAttemptMap[sId] || (payloadAttemptId && afsAttemptMap[payloadAttemptId]) || afsStudentChallengeMap[roll + '___' + chId.toUpperCase()];

      // Resolve College
      var resolvedCollegeId = '';
      var resolvedCollegeName = '';

      if (afsMatch && afsMatch.collegeId) {
        resolvedCollegeId = afsMatch.collegeId;
      } else if (payloadCollegeId) {
        resolvedCollegeId = payloadCollegeId;
      } else if (afsMatch && afsMatch.facultyId && facultyCollegeById[afsMatch.facultyId.toUpperCase()]) {
        resolvedCollegeId = facultyCollegeById[afsMatch.facultyId.toUpperCase()];
      } else if (payloadFaculty && facultyCollegeById[payloadFaculty]) {
        resolvedCollegeId = facultyCollegeById[payloadFaculty];
      } else if (payloadCollegeName && collegeIdByName[payloadCollegeName.toLowerCase()]) {
        resolvedCollegeId = collegeIdByName[payloadCollegeName.toLowerCase()];
      } else {
        resolvedCollegeId = 'COL001'; // Default canonical institute
      }

      resolvedCollegeName = collegeNameById[resolvedCollegeId.toUpperCase()] || payloadCollegeName || 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon';

      // Resolve Faculty Allocation
      var resolvedFacultyId = '';
      var resolvedFacultyName = '';
      var allocationStatus = 'Unallocated';

      if (afsMatch && afsMatch.facultyId && afsMatch.facultyId.toUpperCase() !== 'UNKNOWN') {
        resolvedFacultyId = afsMatch.facultyId.toUpperCase();
        resolvedFacultyName = facultyNameById[resolvedFacultyId] || resolvedFacultyId;
        allocationStatus = 'Allocated';
      } else if (payloadFaculty && payloadFaculty !== 'UNKNOWN') {
        resolvedFacultyId = payloadFaculty;
        resolvedFacultyName = facultyNameById[resolvedFacultyId] || resolvedFacultyId;
        allocationStatus = 'Allocated';
      } else {
        resolvedFacultyId = 'UNKNOWN';
        resolvedFacultyName = 'Unallocated';
        allocationStatus = 'Unallocated';
      }

      // Resolve Evaluation Status & Scores
      var evalRec = evalMapBySubId[sId] || (payloadAttemptId && evalMapBySubId[payloadAttemptId]);
      var isEvaluated = Boolean(evalRec) || (statusVal.toLowerCase() === 'evaluated');
      var finalStatus = isEvaluated ? 'Evaluated' : (statusVal || 'Submitted');
      var facultyScore = evalRec ? evalRec.marks : null;

      // Effective division & branch
      var finalDivision = divisionVal || payloadDivision || '';
      var finalBranch = payloadBranch || 'Mechanical Engineering';

      // 6. Apply Filters
      if (filterCollege) {
        var matchCol = (resolvedCollegeId.toLowerCase() === filterCollege || resolvedCollegeName.toLowerCase().indexOf(filterCollege) !== -1);
        if (!matchCol) continue;
      }

      if (filterAssignment) {
        if (chId.toUpperCase() !== filterAssignment && String(row[subMap['Challenge Title']] || '').toUpperCase().indexOf(filterAssignment) === -1) {
          continue;
        }
      }

      if (filterDivision) {
        if (finalDivision.toUpperCase() !== filterDivision) continue;
      }

      if (filterStatus) {
        if (finalStatus.toLowerCase() !== filterStatus) continue;
      }

      if (filterDateFrom) {
        if (new Date(rawTimestamp) < new Date(filterDateFrom)) continue;
      }

      if (filterDateTo) {
        if (new Date(rawTimestamp) > new Date(filterDateTo)) continue;
      }

      // Attempt number
      var attemptNumberVal = (subMap['Attempt Number'] !== undefined && row[subMap['Attempt Number']])
        ? row[subMap['Attempt Number']]
        : ((subMap['Attempt No'] !== undefined && row[subMap['Attempt No']])
          ? row[subMap['Attempt No']]
          : 1);

      submissions.push({
        id: sId,
        submissionId: sId,
        studentName: studentName || 'Unknown Student',
        rollNumber: roll,
        prn: roll,
        collegeId: resolvedCollegeId,
        collegeName: resolvedCollegeName,
        branch: finalBranch,
        division: finalDivision,
        challengeId: chId,
        challengeTitle: row[subMap['Challenge Title']] || chId,
        attemptNumber: Number(attemptNumberVal) || 1,
        completionPercent: row[subMap['Completion %']] || 0,
        status: finalStatus,
        timestamp: rawTimestamp,
        facultyId: resolvedFacultyId,
        facultyName: resolvedFacultyName,
        allocationStatus: allocationStatus,
        isAllocated: (allocationStatus === 'Allocated'),
        facultyScore: facultyScore,
        evaluatorName: evalRec ? evalRec.facultyName : null,
        isLate: (instIsLate !== null) ? instIsLate : (instSubmittedLate !== null ? instSubmittedLate : null),
        submittedLate: (instSubmittedLate !== null) ? instSubmittedLate : (instIsLate !== null ? instIsLate : null),
        readOnly: true
      });
    }

    // Sort descending by timestamp (newest first)
    submissions.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return response(submissions);

  } catch (error) {
    logError(error, 'getInstituteSubmissions');
    return response(null, false, 'Failed to retrieve institute submissions.', 500);
  }
}

/**
 * ACTION: getInstituteSubmissionDetail / instituteSubmissionDetail
 * -----------------------------------------------------------------------
 * Explicit, read-only viewing path allowing authenticated, server-verified
 * administrators to view the stored payload of any legitimate submission.
 *
 * Security & Authorization Rules:
 * 1. Restricted exclusively to authenticated, server-verified Admin accounts.
 * 2. Ordinary active faculty members are denied with HTTP 403.
 * 3. Unauthenticated, student, guest, unknown, or spoofed requests are denied with HTTP 403.
 * 4. Returns readOnly: true and viewPermission: 'INSTITUTE_READ_ONLY' metadata.
 * 5. Write/evaluation endpoints continue to strictly verify ownership.
 *
 * @param {Object} payload - { submissionId: string, authFacultyId: string }
 * @return {TextOutput} Uniform JSON response with full stored submission payload marked readOnly.
 */
function getInstituteSubmissionDetail(payload) {
  try {
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
    }

    var submissionId = payload && (payload.submissionId || payload.id);
    if (!submissionId) {
      return response(null, false, 'Missing submissionId', 400);
    }
    submissionId = String(submissionId).trim();

    // Authoritative Admin verification
    var verifiedAdmin = verifyActiveAdminMember_(payload);
    if (!verifiedAdmin) {
      return response(null, false, 'Unauthorized: Access restricted to verified administrators.', 403);
    }

    var sheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!sheet) {
      return response(null, false, 'Student_Submissions sheet not found.', 500);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return response(null, false, 'Submission not found', 404);
    }
    var lastCol = sheet.getLastColumn();

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerMap = getHeaderMap(headers);
    var idIndex = headerMap['Submission ID'];
    var payloadIndex = headerMap['Full JSON Payload'];

    if (idIndex === undefined || payloadIndex === undefined) {
      return response(null, false, 'Failed to retrieve submission.', 500);
    }

    var idColumnValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
    var rowIndex = -1;
    for (var i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(submissionId)) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return response(null, false, 'Submission not found', 404);
    }

    var jsonString = sheet.getRange(rowIndex, payloadIndex + 1).getValue();
    var fullPayload = safeJsonParse(jsonString, null);

    if (fullPayload === null) {
      return response(null, false, 'Stored payload is corrupt or invalid JSON', 500);
    }

    var rowValues = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    var studentName = (headerMap['Student Name'] !== undefined) ? rowValues[headerMap['Student Name']] : '';
    var rollNumber = (headerMap['Roll Number'] !== undefined) ? rowValues[headerMap['Roll Number']] : '';
    var division = (headerMap['Division'] !== undefined) ? rowValues[headerMap['Division']] : '';
    var challengeId = (headerMap['Challenge ID'] !== undefined) ? rowValues[headerMap['Challenge ID']] : '';
    var challengeTitle = (headerMap['Challenge Title'] !== undefined) ? rowValues[headerMap['Challenge Title']] : '';
    var attemptNumber = (headerMap['Attempt Number'] !== undefined) ? rowValues[headerMap['Attempt Number']] : 1;
    var status = (headerMap['Status'] !== undefined) ? rowValues[headerMap['Status']] : 'Submitted';
    var timestamp = (headerMap['Timestamp'] !== undefined) ? rowValues[headerMap['Timestamp']] : '';

    var selSheet = getSheetSafe_((CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || 'Assignment_Faculty_Selection');
    var allocatedFacultyId = 'UNKNOWN';
    var allocatedCollegeId = 'COL001';
    if (selSheet) {
      var selData = selSheet.getDataRange().getValues();
      if (selData.length > 1) {
        var selMap = getHeaderMap(selData[0]);
        for (var s = 1; s < selData.length; s++) {
          var sRow = selData[s];
          if (String(sRow[selMap['Attempt_ID']] || '').trim() === String(submissionId).trim() ||
              (String(sRow[selMap['Student_ID']] || '').trim() === String(rollNumber).trim() && String(sRow[selMap['Assignment_ID']] || '').trim() === String(challengeId).trim())) {
            allocatedFacultyId = String(sRow[selMap['Faculty_ID']] || 'UNKNOWN').trim();
            allocatedCollegeId = String(sRow[selMap['College_ID']] || 'COL001').trim();
            break;
          }
        }
      }
    }

    var facSheet = getSheetSafe_((CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || 'Faculty_Registry');
    var facultyName = allocatedFacultyId === 'UNKNOWN' ? 'Unallocated' : allocatedFacultyId;
    if (facSheet && allocatedFacultyId !== 'UNKNOWN') {
      var facData = facSheet.getDataRange().getValues();
      if (facData.length > 1) {
        var facMap = getHeaderMap(facData[0]);
        for (var f = 1; f < facData.length; f++) {
          if (String(facData[f][facMap['Faculty_ID']] || '').trim().toUpperCase() === allocatedFacultyId.toUpperCase()) {
            facultyName = facData[f][facMap['Faculty_Name']] || allocatedFacultyId;
            if (facMap['College_ID']) allocatedCollegeId = facData[f][facMap['College_ID']] || allocatedCollegeId;
            break;
          }
        }
      }
    }

    var colSheet = getSheetSafe_((CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.COLLEGE_REGISTRY) || 'College_Registry');
    var collegeName = allocatedCollegeId;
    if (colSheet) {
      var colData = colSheet.getDataRange().getValues();
      if (colData.length > 1) {
        var colMap = getHeaderMap(colData[0]);
        for (var c = 1; c < colData.length; c++) {
          if (String(colData[c][colMap['College_ID']] || '').trim().toUpperCase() === allocatedCollegeId.toUpperCase()) {
            collegeName = colData[c][colMap['College_Name']] || allocatedCollegeId;
            break;
          }
        }
      }
    }

    fullPayload.id = submissionId;
    fullPayload.submissionId = submissionId;
    fullPayload.studentName = fullPayload.studentName || studentName;
    fullPayload.prn = fullPayload.prn || rollNumber;
    fullPayload.rollNumber = fullPayload.rollNumber || rollNumber;
    fullPayload.division = fullPayload.division || division;
    fullPayload.challenge = fullPayload.challenge || challengeTitle || challengeId;
    fullPayload.challengeId = fullPayload.challengeId || challengeId;
    fullPayload.attempt = fullPayload.attempt || attemptNumber;
    fullPayload.submittedOn = fullPayload.submittedOn || timestamp;
    fullPayload.submissionStatus = fullPayload.submissionStatus || status;
    fullPayload.collegeId = allocatedCollegeId;
    fullPayload.collegeName = collegeName;
    fullPayload.facultyId = allocatedFacultyId;
    fullPayload.facultyName = facultyName;
    fullPayload.allocationStatus = (allocatedFacultyId === 'UNKNOWN' ? 'Unallocated' : 'Allocated');
    fullPayload.isAllocated = (allocatedFacultyId !== 'UNKNOWN');
    fullPayload.readOnly = true;
    fullPayload.viewPermission = 'INSTITUTE_READ_ONLY';

    return response(fullPayload);

  } catch (error) {
    logError(error, 'getInstituteSubmissionDetail');
    return response(null, false, 'Failed to retrieve submission detail.', 500);
  }
}
