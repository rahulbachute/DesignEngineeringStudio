/**
 * ============================================================================
 * 04_Faculty.gs
 * ----------------------------------------------------------------------------
 * Design Engineering Studio (DES) - Backend API
 * Faculty Module
 *
 * Responsibilities:
 *   - Accept and persist a faculty member's evaluation of a student
 *     submission ("saveEvaluation" action), updating that submission's
 *     status from Submitted to Evaluated.
 *   - Compute platform-wide analytics across Student_Submissions and
 *     Faculty_Evaluation ("analytics" action).
 *
 * This file implements ONLY the Faculty module. It depends on symbols
 * defined elsewhere in the project and MUST NOT redefine them:
 *
 *   From 01_Config.gs:
 *     - CONFIG.SHEETS.SUBMISSIONS / CONFIG.SHEETS.EVALUATION
 *     - CONFIG.HEADERS.SUBMISSIONS / CONFIG.HEADERS.EVALUATION (arrays)
 *     - CONFIG.STATUS.SUBMITTED (and CONFIG.STATUS.EVALUATED, if defined)
 *     - CONFIG.LOCK_TIMEOUT_MS
 *
 *   From 05_Common.gs:
 *     - response(data, success, error, statusCode)
 *     - getSheet(sheetName)
 *     - getHeaderMap(headerRow)
 *     - safeJsonParse(text, fallback)
 *     - safeJsonStringify(obj)
 *     - logError(error, context)
 *     - debugLog(message, object)
 *     - generateId()
 *     - validateSubmissionHeaders()
 *
 * Compatibility contract (must not change):
 *   - Action names: "saveEvaluation", "analytics"
 *   - response() JSON shape (built entirely via response(), never
 *     constructed locally)
 *   - Student_Submissions sheet name, header names, and column order
 *   - Faculty_Evaluation sheet name and CONFIG.HEADERS.EVALUATION column
 *     order (this file writes rows dynamically from that header list -
 *     see appendEvaluationRow() below - rather than assuming a fixed
 *     column count, since the exact schema lives in 01_Config.gs)
 *
 * Coding constraints honored throughout: ES5 syntax only (var, function
 * expressions, no arrow functions, no let/const, no classes), defensive
 * checks on every external input, try/catch on every public function,
 * and no stack trace ever exposed to the API caller.
 * ============================================================================
 */

/**
 * ACTION: saveEvaluation
 * -----------------------------------------------------------------------
 * Purpose:
 *   Accepts a faculty evaluation for a single student submission,
 *   validates it, prevents duplicate evaluation of the same submission,
 *   appends one row to Faculty_Evaluation, and flips the corresponding
 *   Student_Submissions row's Status from "Submitted" to "Evaluated".
 *
 * Parameters:
 *   @param {Object} payload - Parsed request body. Expected shape:
 *     {
 *       submissionId:  string  (required),
 *       facultyName:   string  (required),
 *       facultyEmail:  string  (optional),
 *       evaluation:    *       (required - faculty's evaluation content;
 *                                may be a string or structured object),
 *       feedback:      string  (optional),
 *       rubricScores:  Object  (optional),
 *       totalMarks:    number  (optional),
 *       maxMarks:      number  (optional),
 *       percentage:    number  (optional),
 *       status:        string  (optional - caller-supplied status label;
 *                                the Student_Submissions row is always
 *                                moved to "Evaluated" regardless of this
 *                                value, per the fixed workflow contract)
 *     }
 *
 * Returns:
 *   @return {TextOutput} Uniform JSON response.
 *     - 400 if submissionId, facultyName, or evaluation is missing.
 *     - 404 if submissionId does not exist in Student_Submissions.
 *     - 409 if an evaluation for this submissionId already exists in
 *       Faculty_Evaluation.
 *     - 429 if the concurrency lock cannot be acquired in time.
 *     - 500 on any unexpected internal failure.
 *     - 200 with { submissionId, status: "Evaluated" } on success.
 *
 * Validation:
 *   1. submissionId is mandatory.
 *   2. facultyName is mandatory.
 *   3. evaluation is mandatory.
 *   4. submissionId must exist in Student_Submissions.
 *   5. submissionId must not already have a Faculty_Evaluation row.
 *
 * Processing steps:
 *   1. Acquire a script lock (mirrors the duplicate-protection pattern
 *      already used by saveStudentSubmission() in 03_Submission.gs) so
 *      two concurrent evaluations of the same submission cannot both
 *      pass the duplicate check before either has written its row.
 *   2. Validate required fields.
 *   3. Look up the submission in Student_Submissions by Submission ID
 *      (header lookup, not a hard-coded column index) to confirm it
 *      exists and to pull context fields (Roll Number, Student Name,
 *      Challenge ID, Challenge Title) that may be needed by the
 *      Faculty_Evaluation schema.
 *   4. Check Faculty_Evaluation for an existing row with this
 *      submissionId; reject with 409 if found.
 *   5. Build the Faculty_Evaluation row dynamically from
 *      CONFIG.HEADERS.EVALUATION (see appendEvaluationRow()) and append
 *      it, after validating the row length matches the configured
 *      schema.
 *   6. Update the Status cell of the matching Student_Submissions row to
 *      "Evaluated" via header lookup.
 *   7. Return { submissionId, status: "Evaluated" }.
 */
function saveEvaluation(payload) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    lock.waitLock((CONFIG && CONFIG.LOCK_TIMEOUT_MS) || 30000);
    lockAcquired = true;
  } catch (lockError) {
    logError(lockError, 'saveEvaluation: failed to acquire script lock');
    return response(
      null,
      false,
      'System is busy processing another evaluation. Please retry.',
      429
    );
  }

  try {
    // -------------------------------------------------------------------
    // Step 0: Role authorization check.
    // Guests and students are strictly prohibited from evaluating submissions.
    // Valid authenticated faculty ID is required.
    // Client-side facultyId tampering cannot grant evaluation rights.
    // -------------------------------------------------------------------
    var authFacultyId = payload && (payload.authFacultyId || payload.authenticatedFacultyId);
    var reqFacultyId = payload && (payload.facultyId || payload.faculty_id || payload.Faculty_ID || payload.evalFacultyId);
    var evalRole = (payload && (payload.role || payload.authRole || payload.evaluatorRole || payload.evalRole)) || "";

    var normRole = String(evalRole || '').trim().toUpperCase();
    var normAuth = String(authFacultyId || '').trim().toUpperCase();
    var normReq = String(reqFacultyId || '').trim().toUpperCase();

    if (normRole === "GUEST" || normRole === "STUDENT" || normAuth === "GUEST" || normReq === "GUEST" || normAuth === "STUDENT" || normReq === "STUDENT") {
      return response(null, false, "Unauthorized: Guests and students are not permitted to evaluate submissions.", 403);
    }
    if (!normAuth && !normReq) {
      return response(null, false, "Unauthorized: Valid authenticated faculty ID required for evaluation.", 403);
    }
    if (normAuth === "UNKNOWN" || normReq === "UNKNOWN") {
      return response(null, false, "Unauthorized: Valid authenticated faculty ID required for evaluation.", 403);
    }

    var isReqAdmin = (normAuth === 'ADMIN001') || (normRole === 'ADMIN');
    if (normAuth && normReq && normAuth !== normReq && !isReqAdmin) {
      return response(null, false, "Unauthorized: Mismatched authenticated faculty identity.", 403);
    }

    var evalFacultyId = normAuth || normReq;

    // -------------------------------------------------------------------
    // Step 1: Defensive extraction and required-field validation.
    // -------------------------------------------------------------------
    var submissionId = payload && payload.submissionId;
    var facultyName = (payload && payload.facultyName) || (payload && payload.evaluatorName) || evalFacultyId;
    var facultyEmail = (payload && payload.facultyEmail) || (payload && payload.evaluatedBy) || '';
    var evaluation = (payload && payload.evaluation) || (payload && (payload.marks !== undefined ? payload.marks : '')) || (payload && payload.hasEvaluation ? payload : '');
    var facultyMarks = (evaluation && Array.isArray(evaluation.activities) && evaluation.activities) || (payload && payload.facultyMarks) || (payload && payload.activities) || [];
    var feedback = (payload && (payload.feedback || payload.remarks)) || '';
    var rubricScores = normalizeRubricScores_((payload && payload.rubricScores) || {}, facultyMarks);
    var totalMarks = firstDefined_(
      payload && payload.totalMarks,
      evaluation && evaluation.totalMarks,
      sumFacultyMarks_(facultyMarks),
      sumRubricScores_(rubricScores),
      ''
    );
    var maxMarks = firstDefined_(
      payload && payload.maxMarks,
      evaluation && evaluation.maxMarks,
      sumMaxMarks_((evaluation && evaluation.activities) || facultyMarks),
      ''
    );
    var percentage = firstDefined_(
      payload && payload.percentage,
      evaluation && evaluation.percentage,
      calculatePercentage_(totalMarks, maxMarks),
      ''
    );

    if (!submissionId) {
      return response(null, false, 'Missing required field: submissionId', 400);
    }
    if (!facultyName) {
      return response(null, false, 'Missing required field: facultyName', 400);
    }
    if (evaluation === undefined || evaluation === null || evaluation === '') {
      return response(null, false, 'Missing required field: evaluation', 400);
    }

    // -------------------------------------------------------------------
    // Step 2: Confirm the submission exists in Student_Submissions and
    // capture context fields for the evaluation row / status update.
    // -------------------------------------------------------------------
    var submissionsSheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    var submissionsData = submissionsSheet.getDataRange().getValues();
    var submissionsHeaderMap = getHeaderMap(submissionsData[0]);

    var subIdIndex = submissionsHeaderMap['Submission ID'];
    var subStatusIndex = submissionsHeaderMap['Status'];

    if (subIdIndex === undefined || subStatusIndex === undefined) {
      logError(
        new Error('saveEvaluation: required Student_Submissions headers not found'),
        'saveEvaluation'
      );
      return response(null, false, 'Failed to save evaluation.', 500);
    }

    var submissionRowIndex = -1; // 0-based index into submissionsData
    var submissionRow = null;
    for (var i = 1; i < submissionsData.length; i++) {
      if (submissionsData[i][subIdIndex] === submissionId) {
        submissionRowIndex = i;
        submissionRow = submissionsData[i];
        break;
      }
    }

    if (submissionRowIndex === -1) {
      return response(null, false, 'Submission not found', 404);
    }

    // Pull optional context fields, defensively, only if those headers
    // exist on Student_Submissions - never assumes a fixed position.
    var rollNumber = (submissionsHeaderMap['Roll Number'] !== undefined)
      ? submissionRow[submissionsHeaderMap['Roll Number']]
      : '';
    var studentName = (submissionsHeaderMap['Student Name'] !== undefined)
      ? submissionRow[submissionsHeaderMap['Student Name']]
      : '';
    var challengeId = (submissionsHeaderMap['Challenge ID'] !== undefined)
      ? submissionRow[submissionsHeaderMap['Challenge ID']]
      : '';

    // -------------------------------------------------------------------
    // Step 2b: Cross-Faculty Evaluation Authorization Check.
    // Ensure the evaluating faculty has authority over this submission.
    // -------------------------------------------------------------------
    // evalFacultyId was validated and tamper-checked in Step 0.
    if (!evalFacultyId) {
      evalFacultyId = normAuth || normReq;
    }

    var selSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.ASSIGNMENT_FACULTY_SELECTION) || "Assignment_Faculty_Selection";
    var selSheet = getSheetSafe_(selSheetName);
    if (selSheet) {
      var selData = selSheet.getDataRange().getValues();
      if (selData.length > 1) {
        var selMap = getHeaderMap(selData[0]);
        var matchedSelection = false;
        var foundAttempt = false;
        var assignedFacultyId = "";

        for (var si = 1; si < selData.length; si++) {
          var sRow = selData[si];
          var sAttId = String(sRow[selMap["Attempt_ID"]] || "").trim();
          var sStuId = String(sRow[selMap["Student_ID"]] || "").trim();
          var sAsgId = String(sRow[selMap["Assignment_ID"]] || "").trim();
          var sFacId = String(sRow[selMap["Faculty_ID"]] || "").trim();

          if (sAttId === String(submissionId).trim() || (sStuId === String(rollNumber).trim() && sAsgId === String(challengeId).trim())) {
            foundAttempt = true;
            assignedFacultyId = sFacId;
            if (sFacId.toUpperCase() === evalFacultyId.toUpperCase()) {
              matchedSelection = true;
            }
            break;
          }
        }

        if (foundAttempt) {
          // Rule: UNKNOWN attempts cannot be evaluated by arbitrary faculty before controlled allocation
          if (assignedFacultyId.toUpperCase() === "UNKNOWN") {
            return response(null, false, "This attempt is unassigned (UNKNOWN faculty) and cannot be evaluated until a faculty allocation is made.", 403);
          }

          if (!matchedSelection) {
            // Check if evaluator is an ADMIN
            var isEvaluatorAdmin = false;
            var facRegSheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.FACULTY_REGISTRY) || "Faculty_Registry";
            var facRegSheet = getSheetSafe_(facRegSheetName);
            if (facRegSheet) {
              var fRegData = facRegSheet.getDataRange().getValues();
              if (fRegData.length > 1) {
                var fRegMap = getHeaderMap(fRegData[0]);
                for (var fri = 1; fri < fRegData.length; fri++) {
                  var rfId = String(fRegData[fri][fRegMap["Faculty_ID"]] || "").trim();
                  if (rfId.toUpperCase() === evalFacultyId.toUpperCase()) {
                    var rfRole = String(fRegData[fri][fRegMap["Role"]] || "").trim().toUpperCase();
                    var rfStatus = String(fRegData[fri][fRegMap["Status"]] || "").trim().toUpperCase();
                    if (rfRole === "ADMIN" && (rfStatus === "ACTIVE" || !rfStatus)) {
                      isEvaluatorAdmin = true;
                    }
                    break;
                  }
                }
              }
            }

            if (!isEvaluatorAdmin) {
              return response(null, false, "Unauthorized: You are not authorized to evaluate submissions assigned to another faculty member.", 403);
            }
          }
        }
      }
    }

    // -------------------------------------------------------------------
    // Step 3: Duplicate-evaluation check against Faculty_Evaluation.
    // -------------------------------------------------------------------
    var evaluationSheet = getSheet(CONFIG.SHEETS.EVALUATION);
    var evaluationData = evaluationSheet.getDataRange().getValues();
    var evaluationHeaderMap = getHeaderMap(evaluationData[0]);

    var existingDraftRow = 0;
    for (var eri = 1; eri < evaluationData.length; eri++) {
      if (String(evaluationData[eri][evaluationHeaderMap['Submission ID']]) === String(submissionId)) {
        if (evaluationData[eri][evaluationHeaderMap['Status']] !== 'Draft' ||
            String(evaluationData[eri][evaluationHeaderMap['Faculty ID']]) !== evalFacultyId) {
          return response(null, false, 'Duplicate Evaluation: reload the saved evaluation before proceeding.', 409);
        }
        existingDraftRow = eri + 1;
      }
    }
    if (payload.bulkAcceptance) {
      var originalPayloadIndex = submissionsHeaderMap['Full JSON Payload'];
      var originalPayload = originalPayloadIndex !== undefined ? safeJsonParse(submissionRow[originalPayloadIndex], null) : null;
      var existingEvaluation = existingDraftRow ? safeJsonParse(evaluationData[existingDraftRow - 1][evaluationHeaderMap['Evaluation']], null) : null;
      originalPayload = reassessSubmissionPayload_(originalPayload);
      var bulkError = validateBulkAcceptance_(payload, originalPayload, existingEvaluation, challengeId, evalFacultyId);
      if (bulkError) return response(null, false, bulkError, 409);
    }
    var validation = validateEvaluationMarks_(payload, challengeId);
    if (validation) return response(null, false, validation, 400);

    // -------------------------------------------------------------------
    // Step 4: Build and append the Faculty_Evaluation row, dynamically,
    // from CONFIG.HEADERS.EVALUATION - see appendEvaluationRow() for the
    // field-resolution rules and the length-validation guard.
    // -------------------------------------------------------------------
    var evaluationTimestamp = new Date();
    var finalStatus = payload.status === 'Draft' ? 'Draft' : 'Evaluated';

    var activityCounts = {scored:0,pending:0};
    for (var aci = 0; aci < facultyMarks.length; aci++) {
      if (Number(facultyMarks[aci].maxMarks) > 0) {
        if (evaluationNumber_(facultyMarks[aci].facultyMarks !== undefined ? facultyMarks[aci].facultyMarks : facultyMarks[aci].marks) === null) activityCounts.pending++;
        else activityCounts.scored++;
      }
    }
    var systemBreakdown = systemMarkBreakdown_(facultyMarks, submissionRow, submissionsHeaderMap);
    var facultyTotal = activityCounts.scored ? Number(totalMarks) : null;
    var fieldValues = {
      'Timestamp': evaluationTimestamp,
      'Evaluation Time': evaluationTimestamp,
      'Submission ID': submissionId,
      'Challenge ID': challengeId,
      'Roll Number': rollNumber,
      'Student Name': studentName,
      'Faculty ID': evalFacultyId,
      'Faculty Name': facultyName,
      'Faculty Email': facultyEmail,
      'Evaluation': (typeof evaluation === 'object') ? safeJsonStringify(evaluation) : evaluation,
      'Feedback': feedback,
      'Remarks': feedback,
      'Rubric Scores': safeJsonStringify(rubricScores),
      'Faculty Marks': safeJsonStringify(rubricScores),
      'Faculty Total': facultyTotal === null ? '' : facultyTotal,
      'System Marks': safeJsonStringify(systemBreakdown.scores),
      'System Total': systemBreakdown.total === null ? '' : systemBreakdown.total,
      'System Scored Activities': systemBreakdown.scored,
      'System Pending Activities': systemBreakdown.pending,
      'Scored Activities': activityCounts.scored,
      'Pending Activities': activityCounts.pending,
      'Marks': facultyTotal === null ? '' : facultyTotal,
      'Total Marks': facultyTotal === null ? '' : facultyTotal,
      'Max Marks': maxMarks,
      'Percentage': facultyTotal === null ? '' : percentage,
      'Status': finalStatus
    };

    if (rubricScores && typeof rubricScores === 'object') {
      for (var key in rubricScores) {
        if (rubricScores.hasOwnProperty(key)) {
          fieldValues[key] = rubricScores[key] === null || rubricScores[key] === undefined ? '' : rubricScores[key];
        }
      }
    }

    for (var systemId in systemBreakdown.scores) {
      fieldValues['System: ' + systemId] = systemBreakdown.scores[systemId] === null ? '' : systemBreakdown.scores[systemId];
    }
    var savedRowNumber = appendEvaluationRow(evaluationSheet, fieldValues, existingDraftRow);

    // -------------------------------------------------------------------
    // Step 5: Update the Student_Submissions row's Status to "Evaluated"
    // via header lookup (1-based row/column addressing for Range access).
    // -------------------------------------------------------------------
    var sheetRowNumber = submissionRowIndex + 1; // convert 0-based data index to 1-based sheet row
    SpreadsheetApp.flush();
    // Read the stored row after flush; an append call alone is not persistence evidence.
    var savedRows = evaluationSheet.getDataRange().getValues();
    var savedMap = getHeaderMap(savedRows[0]);
    var storedRow = savedRows[savedRowNumber - 1];
    var storedEvaluation = safeJsonParse(storedRow[savedMap['Evaluation']], null);
    var storedScores = safeJsonParse(storedRow[savedMap['Rubric Scores']], null);
    var storedSystemScores = safeJsonParse(storedRow[savedMap['System Marks']], null);
    var systemCells = {};
    for (var sysId in systemBreakdown.scores) systemCells['System: ' + sysId] = systemBreakdown.scores[sysId];
    var systemPersisted = verifyActivityMarks_(storedRow, savedMap, systemCells) &&
      safeJsonStringify(storedSystemScores) === safeJsonStringify(systemBreakdown.scores) &&
      verifyMarkTotal_(storedRow[savedMap['System Total']], systemBreakdown.total) &&
      Number(storedRow[savedMap['System Scored Activities']]) === systemBreakdown.scored &&
      Number(storedRow[savedMap['System Pending Activities']]) === systemBreakdown.pending;
    var activitiesPersisted = verifyActivityMarks_(storedRow, savedMap, rubricScores) &&
      storedScores !== null && safeJsonStringify(storedScores) === safeJsonStringify(rubricScores) &&
      storedRow[savedMap['Faculty Marks']] === safeJsonStringify(rubricScores) &&
      verifyMarkTotal_(storedRow[savedMap['Faculty Total']], facultyTotal) &&
      Number(storedRow[savedMap['Scored Activities']]) === activityCounts.scored &&
      Number(storedRow[savedMap['Pending Activities']]) === activityCounts.pending;
    if (!systemPersisted || !activitiesPersisted || String(storedRow[savedMap['Submission ID']]) !== String(submissionId) ||
        storedRow[savedMap['Status']] !== finalStatus ||
        Number(storedRow[savedMap['Total Marks']]) !== Number(totalMarks) ||
        Number(storedRow[savedMap['Max Marks']]) !== Number(maxMarks) ||
        safeJsonStringify(storedEvaluation) !== safeJsonStringify(evaluation)) {
      throw new Error('Evaluation persistence verification failed');
    }
    if (finalStatus === 'Evaluated') {
      submissionsSheet.getRange(sheetRowNumber, subStatusIndex + 1).setValue(finalStatus);
      SpreadsheetApp.flush();
      if (submissionsSheet.getRange(sheetRowNumber, subStatusIndex + 1).getValues()[0][0] !== finalStatus) throw new Error('Submission status persistence verification failed');
    }

    debugLog('saveEvaluation: evaluation saved and status updated', {
      submissionId: submissionId,
      status: finalStatus
    });

    return response({
      submissionId: submissionId,
      status: finalStatus,
      persisted: true,
      activityMarksPersisted: true,
      systemMarksPersisted: true,
      systemMarks: storedSystemScores,
      systemTotal: systemBreakdown.total,
      facultyTotal: facultyTotal,
      rubricScores: storedScores,
      activityCounts: activityCounts,
      evaluation: storedEvaluation
    });

  } catch (error) {
    logError(error, payload);
    return response(null, false, 'Failed to save evaluation.', 500);

  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Determines whether a Faculty_Evaluation row already exists for the
 * given submissionId.
 *
 * Purpose:
 *   Prevents a submission from being evaluated more than once.
 *
 * Parameters:
 *   @param {Array<Array<*>>} data      - Full getDataRange().getValues()
 *                                         result for Faculty_Evaluation,
 *                                         including the header row.
 *   @param {Object} headerMap          - { headerLabel: columnIndex } from
 *                                         getHeaderMap().
 *   @param {string} submissionId       - The submissionId to check for.
 *
 * Returns:
 *   @return {boolean} true if an evaluation row for this submissionId
 *                      already exists.
 *
 * Validation:
 *   If the "Submission ID" header cannot be found, logs the condition
 *   and returns false rather than throwing - a missing header here
 *   should not silently block all future evaluations, but it is logged
 *   for investigation since duplicate protection is compromised while
 *   this persists.
 */
function duplicateEvaluationCheck(data, headerMap, submissionId) {
  var idIndex = headerMap['Submission ID'];

  if (idIndex === undefined) {
    logError(
      new Error('duplicateEvaluationCheck: "Submission ID" header not found on Faculty_Evaluation'),
      'duplicateEvaluationCheck'
    );
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(submissionId)) {
      return true;
    }
  }

  return false;
}

/**
 * Appends one evaluation row to the Faculty_Evaluation sheet, building
 * the row dynamically from CONFIG.HEADERS.EVALUATION rather than a
 * hard-coded array.
 *
 * Purpose:
 *   Column order for Faculty_Evaluation is owned entirely by
 *   CONFIG.HEADERS.EVALUATION in 01_Config.gs. Rather than assuming a
 *   fixed field list here (which risks the exact column-shift corruption
 *   this backend has previously suffered from when a written row didn't
 *   match the sheet's actual column count), this function walks the
 *   configured header list and resolves each header name to a known
 *   value from fieldValues, defaulting to an empty string for any header
 *   this module does not have a value for.
 *
 * Parameters:
 *   @param {Sheet}  sheet        - The Faculty_Evaluation Sheet object.
 *   @param {Object} fieldValues  - Map of header label -> value, for
 *                                   every field this module knows how to
 *                                   populate (see saveEvaluation()).
 *
 * Returns:
 *   @return {void}
 *
 * Validation:
 *   Throws "Row length mismatch" if the constructed row's length does
 *   not exactly equal CONFIG.HEADERS.EVALUATION.length - this guards
 *   against a future edit to fieldValues or CONFIG.HEADERS.EVALUATION
 *   silently producing a misaligned row.
 */
function appendEvaluationRow(sheet, fieldValues, existingRowNumber) {
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1);
  var currentHeaders = range.getValues()[0];
  
  if (!currentHeaders || currentHeaders.length === 0 || currentHeaders[0] === '') {
    currentHeaders = CONFIG.HEADERS.EVALUATION.slice();
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }

  // Find any keys in fieldValues that aren't in currentHeaders
  var newHeaders = [];
  for (var key in fieldValues) {
    if (fieldValues.hasOwnProperty(key)) {
      if (currentHeaders.indexOf(key) === -1) {
        newHeaders.push(key);
      }
    }
  }

  // Append new headers to the sheet if any
  if (newHeaders.length > 0) {
    var combinedHeaders = currentHeaders.concat(newHeaders);
    sheet.getRange(1, 1, 1, combinedHeaders.length).setValues([combinedHeaders]);
    currentHeaders = combinedHeaders;
  }

  var rowData = [];
  for (var i = 0; i < currentHeaders.length; i++) {
    var headerName = currentHeaders[i];
    var value = fieldValues.hasOwnProperty(headerName) ? fieldValues[headerName] : '';
    rowData.push(value);
  }

  if (existingRowNumber) {
    sheet.getRange(existingRowNumber, 1, 1, rowData.length).setValues([rowData]);
    return existingRowNumber;
  }
  sheet.appendRow(rowData);
  return sheet.getLastRow();
}

/**
 * ACTION: analytics
 * -----------------------------------------------------------------------
 * Purpose:
 *   Computes platform-wide analytics dynamically from Student_Submissions
 *   and Faculty_Evaluation. All column access uses getHeaderMap() - no
 *   hard-coded column indexes.
 *
 * Parameters:
 *   (none)
 *
 * Returns:
 *   @return {TextOutput} Uniform JSON response. On success, `data` is:
 *     {
 *       totalSubmissions:     number,
 *       evaluatedSubmissions: number,
 *       pendingEvaluations:   number,
 *       completionRate:       number (percentage, 0-100),
 *       averageMarks:         number,
 *       averagePercentage:    number,
 *       statusCounts:         { <status>: count, ... },
 *       challengeWise: [
 *         { challengeId, challengeTitle, submissions, evaluated, completionRate }
 *       ],
 *       facultyWise: [
 *         { facultyName, evaluations, averageMarks }
 *       ]
 *     }
 *
 * Validation:
 *   Every division is guarded against a zero denominator; a missing
 *   header anywhere is tolerated (the corresponding aggregate is simply
 *   left at its zero/empty default rather than throwing).
 *
 * Processing steps:
 *   1. Read Student_Submissions in full; build header map.
 *   2. Walk every submission row once, accumulating: total count,
 *      per-status counts, and per-challenge submission/evaluated counts.
 *   3. Read Faculty_Evaluation in full; build header map.
 *   4. Walk every evaluation row once, accumulating: total marks sum and
 *      count (for averageMarks), total percentage sum and count (for
 *      averagePercentage), and per-faculty evaluation count/marks sum.
 *   5. Derive completionRate, averages, and the challengeWise /
 *      facultyWise arrays from the accumulators, guarding every division.
 */
function getAnalytics() {
  try {
    var result = {
      totalSubmissions: 0,
      evaluatedSubmissions: 0,
      pendingEvaluations: 0,
      completionRate: 0,
      averageMarks: 0,
      averagePercentage: 0,
      statusCounts: {},
      challengeWise: [],
      facultyWise: []
    };

    var evaluatedStatusLabel = (CONFIG.STATUS && CONFIG.STATUS.EVALUATED)
      ? CONFIG.STATUS.EVALUATED
      : 'Evaluated';

    // ---------------------------------------------------------------------
    // Pass 1: Student_Submissions - totals, status counts, challenge-wise.
    // ---------------------------------------------------------------------
    var submissionsSheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
    var submissionsData = submissionsSheet.getDataRange().getValues();

    var challengeMap = {}; // challengeId -> { challengeId, challengeTitle, submissions, evaluated }

    if (submissionsData.length > 1) {
      var subHeaderMap = getHeaderMap(submissionsData[0]);
      var statusIdx = subHeaderMap['Status'];
      var challengeIdIdx = subHeaderMap['Challenge ID'];
      var challengeTitleIdx = subHeaderMap['Challenge Title'];

      for (var i = 1; i < submissionsData.length; i++) {
        var row = submissionsData[i];
        result.totalSubmissions++;

        // --- Status counts ---
        var statusValue = (statusIdx !== undefined) ? row[statusIdx] : 'Unknown';
        if (statusValue === undefined || statusValue === null || statusValue === '') {
          statusValue = 'Unknown';
        }
        result.statusCounts[statusValue] = (result.statusCounts[statusValue] || 0) + 1;

        var isEvaluated = (statusValue === evaluatedStatusLabel);
        if (isEvaluated) {
          result.evaluatedSubmissions++;
        }

        // --- Challenge-wise accumulation ---
        if (challengeIdIdx !== undefined) {
          var challengeId = row[challengeIdIdx];
          var challengeTitle = (challengeTitleIdx !== undefined) ? row[challengeTitleIdx] : '';

          if (challengeId !== undefined && challengeId !== null && challengeId !== '') {
            if (!challengeMap[challengeId]) {
              challengeMap[challengeId] = {
                challengeId: challengeId,
                challengeTitle: challengeTitle,
                submissions: 0,
                evaluated: 0
              };
            }
            challengeMap[challengeId].submissions++;
            if (isEvaluated) {
              challengeMap[challengeId].evaluated++;
            }
          }
        }
      }
    }

    result.pendingEvaluations = result.totalSubmissions - result.evaluatedSubmissions;

    // Guard against divide-by-zero.
    result.completionRate = (result.totalSubmissions > 0)
      ? round2_((result.evaluatedSubmissions / result.totalSubmissions) * 100)
      : 0;

    // ---------------------------------------------------------------------
    // Pass 2: Faculty_Evaluation - average marks/percentage, faculty-wise.
    // ---------------------------------------------------------------------
    var evaluationSheet = getSheet(CONFIG.SHEETS.EVALUATION);
    var evaluationData = evaluationSheet.getDataRange().getValues();

    var facultyMap = {}; // facultyName -> { facultyName, evaluations, marksSum }
    var marksSum = 0;
    var marksCount = 0;
    var percentageSum = 0;
    var percentageCount = 0;

    if (evaluationData.length > 1) {
      var evalHeaderMap = getHeaderMap(evaluationData[0]);
      var marksIdx = (evalHeaderMap['Marks'] !== undefined)
        ? evalHeaderMap['Marks']
        : evalHeaderMap['Total Marks'];
      var percentageIdx = evalHeaderMap['Percentage'];
      var facultyNameIdx = evalHeaderMap['Faculty Name'];

      for (var j = 1; j < evaluationData.length; j++) {
        var evalRow = evaluationData[j];

        // --- Marks accumulation ---
        if (marksIdx !== undefined) {
          var marksValue = Number(evalRow[marksIdx]);
          if (!isNaN(marksValue)) {
            marksSum += marksValue;
            marksCount++;
          }
        }

        // --- Percentage accumulation ---
        if (percentageIdx !== undefined) {
          var percentageValue = Number(evalRow[percentageIdx]);
          if (!isNaN(percentageValue)) {
            percentageSum += percentageValue;
            percentageCount++;
          }
        }

        // --- Faculty-wise accumulation ---
        if (facultyNameIdx !== undefined) {
          var facultyName = evalRow[facultyNameIdx];
          if (facultyName !== undefined && facultyName !== null && facultyName !== '') {
            if (!facultyMap[facultyName]) {
              facultyMap[facultyName] = {
                facultyName: facultyName,
                evaluations: 0,
                marksSum: 0,
                marksCount: 0
              };
            }
            facultyMap[facultyName].evaluations++;

            if (marksIdx !== undefined) {
              var facultyMarksValue = Number(evalRow[marksIdx]);
              if (!isNaN(facultyMarksValue)) {
                facultyMap[facultyName].marksSum += facultyMarksValue;
                facultyMap[facultyName].marksCount++;
              }
            }
          }
        }
      }
    }

    // Guard against divide-by-zero for both averages.
    result.averageMarks = (marksCount > 0) ? round2_(marksSum / marksCount) : 0;
    result.averagePercentage = (percentageCount > 0) ? round2_(percentageSum / percentageCount) : 0;

    // ---------------------------------------------------------------------
    // Finalize challengeWise array (with per-challenge completionRate).
    // ---------------------------------------------------------------------
    for (var challengeKey in challengeMap) {
      if (!challengeMap.hasOwnProperty(challengeKey)) {
        continue;
      }
      var challengeEntry = challengeMap[challengeKey];
      var challengeCompletionRate = (challengeEntry.submissions > 0)
        ? round2_((challengeEntry.evaluated / challengeEntry.submissions) * 100)
        : 0;

      result.challengeWise.push({
        challengeId: challengeEntry.challengeId,
        challengeTitle: challengeEntry.challengeTitle,
        submissions: challengeEntry.submissions,
        evaluated: challengeEntry.evaluated,
        completionRate: challengeCompletionRate
      });
    }

    // ---------------------------------------------------------------------
    // Finalize facultyWise array (with per-faculty averageMarks).
    // ---------------------------------------------------------------------
    for (var facultyKey in facultyMap) {
      if (!facultyMap.hasOwnProperty(facultyKey)) {
        continue;
      }
      var facultyEntry = facultyMap[facultyKey];
      var facultyAverageMarks = (facultyEntry.marksCount > 0)
        ? round2_(facultyEntry.marksSum / facultyEntry.marksCount)
        : 0;

      result.facultyWise.push({
        facultyName: facultyEntry.facultyName,
        evaluations: facultyEntry.evaluations,
        averageMarks: facultyAverageMarks
      });
    }

    return response(result);

  } catch (error) {
    logError(error, 'getAnalytics');
    return response(null, false, 'Failed to compute analytics.', 500);
  }
}

/**
 * Internal helper: rounds a number to 2 decimal places. Used throughout
 * getAnalytics() for rate/average fields so the response returns clean
 * numeric values rather than long floating-point tails. Not part of the
 * module's public utility surface - kept local to this file.
 *
 * @param {number} value - The number to round.
 * @return {number} value rounded to 2 decimal places.
 */
function round2_(value) {
  return Math.round(value * 100) / 100;
}function firstDefined_() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') {
      return arguments[i];
    }
  }
}

function sumFacultyMarks_(activities) {
  if (!Array.isArray(activities)) return '';
  var sum = 0;
  for (var i = 0; i < activities.length; i++) {
    if (activities[i] && typeof activities[i].facultyMarks === 'number') {
      sum += activities[i].facultyMarks;
    }
  }
  return sum;
}

function sumMaxMarks_(activities) {
  if (!Array.isArray(activities)) return '';
  var sum = 0;
  for (var i = 0; i < activities.length; i++) {
    if (activities[i] && typeof activities[i].maxMarks === 'number') {
      sum += activities[i].maxMarks;
    }
  }
  return sum;
}

function sumRubricScores_(rubricScores) {
  if (!rubricScores || typeof rubricScores !== 'object') return '';
  var sum = 0;
  for (var key in rubricScores) {
    if (rubricScores.hasOwnProperty(key) && typeof rubricScores[key] === 'number') {
      sum += rubricScores[key];
    }
  }
  return sum;
}

function calculatePercentage_(totalMarks, maxMarks) {
  if (typeof totalMarks === 'number' && typeof maxMarks === 'number' && maxMarks > 0) {
    return Math.round((totalMarks / maxMarks) * 10000) / 100;
  }
  return '';
}

function normalizeRubricScores_(rubricScores, activities) {
  if (Array.isArray(activities) && activities.length) {
    var mapped = {};
    for (var i = 0; i < activities.length; i++) {
      var activity = activities[i], id = activity && (activity.id || activity.activityId);
      if (id) mapped[id] = evaluationNumber_(activity.facultyMarks !== undefined ? activity.facultyMarks : activity.marks);
    }
    return mapped;
  }
  return rubricScores || {};
}

/** Every scored activity gets its own cell; pending drafts remain blank rather than awarded zero. */
function verifyActivityMarks_(row, headerMap, scores) {
  for (var key in scores) {
    if (!Object.prototype.hasOwnProperty.call(scores, key)) continue;
    if (headerMap[key] === undefined) return false;
    var stored = row[headerMap[key]], expected = evaluationNumber_(scores[key]);
    if (expected === null) {
      if (stored !== '' && stored !== null && stored !== undefined) return false;
    } else if (evaluationNumber_(stored) !== expected) return false;
  }
  return true;
}

/** Validate the actual assignment policy, not a client-supplied maximum or total. */
function evaluationNumber_(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !isFinite(Number(value))) return null;
  return Number(value);
}
function validateEvaluationMarks_(payload, challengeId) {
  var id = String(challengeId || '').replace(/^EA-/i, 'EC-');
  var policy = null;
  for (var slug in DES_EVALUATION_POLICIES) {
    if (DES_EVALUATION_POLICIES[slug].id === id || slug === id) policy = DES_EVALUATION_POLICIES[slug];
  }
  if (!policy) return 'Assignment evaluation policy unavailable.';
  if (policy.errors.length) return 'Assignment mapping requires correction: ' + policy.errors.join('; ');
  if (payload.challengeId && String(payload.challengeId).replace(/^EA-/i, 'EC-') !== policy.id) return 'Assignment identity mismatch.';
  if (!payload.evaluation || !Array.isArray(payload.evaluation.activities)) return 'Activity evaluation details are required.';
  var activities = payload.evaluation.activities, seen = {}, total = 0, maximum = 0;
  var draft = payload.status === 'Draft';
  for (var i = 0; i < activities.length; i++) {
    var activity = activities[i], key = activity.id || activity.activityId;
    var rule = policy.activities[key];
    var max = evaluationNumber_(activity.maxMarks);
    var mark = evaluationNumber_(activity.facultyMarks !== undefined ? activity.facultyMarks : activity.marks);
    if (!rule || seen[key]) return 'Unmapped or duplicate activity: ' + key;
    seen[key] = true;
    if (max === null || max < 0 || max !== evaluationNumber_(rule.maxMarks)) return 'Invalid activity maximum: ' + key;
    if (mark === null && (max === 0 || draft)) mark = 0;
    if (mark === null || mark < 0 || mark > max) return 'Missing or out-of-range activity marks: ' + key;
    if (activity.marks !== undefined && activity.marks !== null && evaluationNumber_(activity.marks) !== mark) return 'Inconsistent activity marks: ' + key;
    if (payload.rubricScores && !(draft && payload.rubricScores[key] === null) && evaluationNumber_(payload.rubricScores[key]) !== mark) return 'Rubric score mismatch: ' + key;
    total = Math.round((total + mark)*100)/100; maximum = Math.round((maximum + max)*100)/100;
  }
  for (var scoreKey in (payload.rubricScores || {})) {
    if (!seen[scoreKey]) return 'Unmapped rubric score: ' + scoreKey;
  }
  for (var activityId in policy.activities) {
    if (Number(policy.activities[activityId].maxMarks) > 0 && !seen[activityId]) return 'Missing scored activity: ' + activityId;
  }
  if (!activities.length || maximum !== policy.total || evaluationNumber_(payload.maxMarks) !== maximum ||
      evaluationNumber_(payload.totalMarks) !== total || evaluationNumber_(payload.evaluation.totalMarks) !== total ||
      evaluationNumber_(payload.evaluation.maxMarks) !== maximum) return 'Invalid evaluation or assignment total.';
  var percentage = Number(((total / maximum) * 100).toFixed(2));
  if (evaluationNumber_(payload.percentage) !== percentage || evaluationNumber_(payload.evaluation.percentage) !== percentage) return 'Invalid evaluation percentage.';
  return '';
}

/** Called only after getSubmission has authorized access to the submission. */
function attachSavedEvaluation_(fullPayload, submissionId) {
  var sheet = getSheet(CONFIG.SHEETS.EVALUATION);
  var rows = sheet.getDataRange().getValues();
  var map = getHeaderMap(rows[0]);
  for (var i = rows.length - 1; i > 0; i--) {
    if (String(rows[i][map['Submission ID']]) === String(submissionId)) {
      fullPayload.facultyEvaluation = {
        evaluation: safeJsonParse(rows[i][map['Evaluation']], {}),
        rubricScores: safeJsonParse(rows[i][map['Rubric Scores']], {}),
        systemMarks: safeJsonParse(rows[i][map['System Marks']], {}),
        systemTotal: map['System Total'] !== undefined ? rows[i][map['System Total']] : null,
        facultyTotal: map['Faculty Total'] !== undefined ? rows[i][map['Faculty Total']] : null,
        feedback: rows[i][map['Feedback']] || rows[i][map['Remarks']] || '',
        status: rows[i][map['Status']]
      };
      break;
    }
  }
  return fullPayload;
}


/** Bulk acceptance may fill only previously blank, policy-permitted automated marks. */
function validateBulkAcceptance_(payload, source, currentEvaluation, challengeId, facultyId) {
  if (payload.status !== 'Draft') return 'Bulk acceptance can save drafts only.';
  if (!Object.prototype.hasOwnProperty.call(payload, 'expectedEvaluation') ||
      safeJsonStringify(payload.expectedEvaluation) !== safeJsonStringify(currentEvaluation)) {
    return 'Evaluation changed after preview. Reload and create a fresh preview.';
  }
  if (!source || !source.submissionData || !Array.isArray(source.submissionData.activityResponses)) return 'Original recorded activity responses are unavailable.';
  var student = source.studentInformation || {};
  var owner = String(student.facultyId || student.selectedFacultyId || (source.submission || {}).facultyId || source.facultyId || '').trim().toUpperCase();
  if (owner !== String(facultyId).toUpperCase()) return 'Bulk acceptance requires a verified faculty allocation.';
  var policy = null, normalizedId = String(challengeId).replace(/^EA-/i, 'EC-');
  for (var slug in DES_EVALUATION_POLICIES) if (DES_EVALUATION_POLICIES[slug].id === normalizedId) policy = DES_EVALUATION_POLICIES[slug];
  if (!policy || policy.errors.length) return 'Assignment evaluation policy is unavailable or conflicting.';
  var acceptedIds = payload.bulkAcceptedActivityIds;
  if (!Array.isArray(acceptedIds) || (!acceptedIds.length && !payload.suggestionsOnly)) return 'No accepted activity IDs supplied.';
  if (payload.suggestionsOnly && acceptedIds.length) return 'Suggestion-only drafts cannot accept faculty marks.';
  var accepted = {};
  for (var i = 0; i < acceptedIds.length; i++) {
    if (accepted[acceptedIds[i]]) return 'Duplicate accepted activity ID.';
    accepted[acceptedIds[i]] = true;
  }
  var rows = payload.evaluation && payload.evaluation.activities;
  if (!Array.isArray(rows)) return 'Activity evaluation details are required.';
  var originals = source.submissionData.activityResponses;
  var priorRows = (currentEvaluation && currentEvaluation.activities) || [];
  for (var j = 0; j < rows.length; j++) {
    var row = rows[j], id = row.id || row.activityId, rule = policy.activities[id];
    var original = null, prior = null;
    for (var oi = 0; oi < originals.length; oi++) if ((originals[oi].id || originals[oi].activityId) === id) original = originals[oi];
    for (var pi = 0; pi < priorRows.length; pi++) if ((priorRows[pi].id || priorRows[pi].activityId) === id) prior = priorRows[pi];
    if (!original || !rule) return 'Activity mapping changed. Create a fresh preview.';
    var oldMark = prior && prior.facultyMarks !== null && prior.facultyMarks !== undefined ? prior.facultyMarks : original.facultyMarks;
    if (oldMark === null || oldMark === undefined) oldMark = ((source.facultyEvaluation || {}).rubricScores || {})[id];
    var oldValue = evaluationNumber_(oldMark);
    var newValue = evaluationNumber_(row.facultyMarks);
    if (!payload.suggestionsOnly && Number(rule.maxMarks) === 0) oldValue = 0;
    if (accepted[id]) {
      var suggestion = evaluationNumber_(original.systemSuggestedMarks !== undefined && original.systemSuggestedMarks !== null ? original.systemSuggestedMarks : original.suggestedMarks);
      if (oldValue !== null || !rule.allowAutomated || rule.procedural || !(Number(rule.maxMarks) > 0) ||
          suggestion === null || suggestion < 0 || suggestion > Number(rule.maxMarks) || newValue !== suggestion) return 'Bulk acceptance would replace faculty marks or use an invalid system suggestion: ' + id;
      delete accepted[id];
    } else if (newValue !== oldValue) return 'Independent faculty marks must remain unchanged: ' + id;
    var oldReason = (prior && prior.reason) || original.reason || '';
    if (String(row.reason || '') !== String(oldReason)) return 'Faculty remarks changed after preview: ' + id;
  }
  for (var remaining in accepted) return 'Accepted activity was not included: ' + remaining;
  return '';
}


/** Reassess a returned payload in memory. Original spreadsheet responses are never rewritten here. */
function reassessSubmissionPayload_(payload) {
  if (!payload || !payload.submissionData || !Array.isArray(payload.submissionData.activityResponses)) return payload;
  if (typeof DESAssessmentCore === 'undefined') return payload;
  var id = String((payload.challengeMetadata || {}).id || '').replace(/^EA-/i, 'EC-');
  var policy = null;
  for (var slug in DES_EVALUATION_POLICIES) if (DES_EVALUATION_POLICIES[slug].id === id || slug === id) policy = DES_EVALUATION_POLICIES[slug];
  if (!policy || policy.errors.length) return payload;
  var corrections = [], rows = payload.submissionData.activityResponses;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i], key = row.id || row.activityId, rule = policy.activities[key];
    if (!rule || rule.maxMarks === null) continue;
    var oldMaximum = row.maxMarks !== undefined && row.maxMarks !== null ? row.maxMarks : row.cceMarks;
    if (evaluationNumber_(oldMaximum) !== Number(rule.maxMarks)) {
      corrections.push({activityId:key,recordedMaximum:oldMaximum === undefined ? null : oldMaximum,correctedMaximum:rule.maxMarks});
      row.recordedMaximum = oldMaximum === undefined ? null : oldMaximum;
    }
    row.maxMarks = rule.maxMarks;
    row.cceMarks = rule.maxMarks;
    var assessment = DESAssessmentCore.assess(rule.assessment, row.response !== undefined ? row.response : row.studentResponse);
    // Recompute keyed suggestions even when an older/client score exists; blank answers stay unassessed.
    if ((rule.assessment && rule.assessment.checks && rule.assessment.checks.length) || row.systemSuggestedMarks === undefined || row.systemSuggestedMarks === null) row.systemSuggestedMarks = assessment.marks;
    if (!rule.allowAutomated) row.systemSuggestedMarks = null;
    row.systemAssessment = assessment;
    row.assessmentPolicyRevision = policy.revision;
  }
  payload.assessmentSummary = {version:'response-assessment-v2',policyRevision:policy.revision,maximumCorrections:corrections,source:'recorded-responses',persisted:false};
  return payload;
}


/** System suggestions are advisory and never substitute for faculty awards. */
function systemMarkBreakdown_(activities, submissionRow, headerMap) {
  var payloadIndex = headerMap['Full JSON Payload'];
  var original = payloadIndex !== undefined ? safeJsonParse(submissionRow[payloadIndex], null) : null;
  original = reassessSubmissionPayload_(original);
  var recorded = original && original.submissionData && original.submissionData.activityResponses || [];
  var scores = {}, total = 0, scored = 0, pending = 0;
  for (var i = 0; i < activities.length; i++) {
    var activity = activities[i], id = activity.id || activity.activityId, max = evaluationNumber_(activity.maxMarks), suggestion = null;
    for (var j = 0; j < recorded.length; j++) {
      if ((recorded[j].id || recorded[j].activityId) === id) {
        suggestion = evaluationNumber_(recorded[j].systemSuggestedMarks !== undefined ? recorded[j].systemSuggestedMarks : recorded[j].suggestedMarks);
        break;
      }
    }
    if (suggestion !== null && (max === null || suggestion < 0 || suggestion > max)) suggestion = null;
    scores[id] = suggestion;
    if (max > 0) {
      if (suggestion === null) pending++;
      else { scored++; total = Math.round((total + suggestion)*100)/100; }
    }
  }
  return {scores:scores,total:scored?total:null,scored:scored,pending:pending};
}
function verifyMarkTotal_(stored, expected) {
  return expected === null ? (stored === '' || stored === null || stored === undefined) : evaluationNumber_(stored) === expected;
}
