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
    var rollNumber = studentInfo.rollNumber || '';
    var challengeId = challengeMeta.id || '';

    // -------------------------------------------------------------------
    // Step 4: Required-field validation. A submission cannot be
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
 * Returns a lightweight list of all submissions for the faculty
 * dashboard (summary fields only - not the full JSON payload).
 *
 * @return {TextOutput} Uniform JSON response containing an array of
 *   submission summary objects, sorted newest-first by timestamp.
 */
function getSubmissions() {
  try {
    var sheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    if (!sheet) {
      return response(null, false, 'Student_Submissions sheet not found.', 500);
    }

    var data = sheet.getDataRange().getValues();

    // Only a header row (or a completely empty sheet) - nothing to list.
    if (data.length <= 1) {
      return response([]);
    }

    var headerMap = getHeaderMap(data[0]);
    var submissions = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      submissions.push({
        submissionId: row[headerMap['Submission ID']],
        studentName: row[headerMap['Student Name']],
        rollNumber: row[headerMap['Roll Number']],
        challengeId: row[headerMap['Challenge ID']],
        challengeTitle: row[headerMap['Challenge Title']],
        completionPercent: row[headerMap['Completion %']],
        status: row[headerMap['Status']],
        timestamp: row[headerMap['Timestamp']]
      });
    }

    // Sort descending by timestamp (newest submission first) for the
    // faculty dashboard's default view.
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
 * @param {Object} payload - Expected shape: { submissionId: string }
 * @return {TextOutput} Uniform JSON response. On success, `data` is the
 *   original full submission payload exactly as it was stored at
 *   submit-time (i.e. the parsed contents of the "Full JSON Payload"
 *   column).
 */
function getSubmission(payload) {
  try {
    var submissionId = payload && payload.submissionId;
    if (!submissionId) {
      return response(null, false, 'Missing submissionId', 400);
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

    return response(fullPayload);

  } catch (error) {
    logError(error, payload);
    return response(null, false, 'Failed to retrieve submission.', 500);
  }
}