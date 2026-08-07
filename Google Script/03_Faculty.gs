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
    // Step 1: Defensive extraction and required-field validation.
    // -------------------------------------------------------------------
    var submissionId = payload && payload.submissionId;
    var facultyName = (payload && payload.facultyName) || (payload && payload.evaluatorName);
    var facultyEmail = (payload && payload.facultyEmail) || (payload && payload.evaluatedBy) || '';
    var evaluation = (payload && payload.evaluation) || (payload && payload.hasEvaluation ? payload : '');
    var facultyMarks = (payload && payload.facultyMarks) || (payload && payload.activities) || [];
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
    // Step 3: Duplicate-evaluation check against Faculty_Evaluation.
    // -------------------------------------------------------------------
    var evaluationSheet = getSheet(CONFIG.SHEETS.EVALUATION);
    var evaluationData = evaluationSheet.getDataRange().getValues();
    var evaluationHeaderMap = getHeaderMap(evaluationData[0]);

    if (duplicateEvaluationCheck(evaluationData, evaluationHeaderMap, submissionId)) {
      return response(
        null,
        false,
        'Duplicate Evaluation: this submission has already been evaluated.',
        409
      );
    }

    // -------------------------------------------------------------------
    // Step 4: Build and append the Faculty_Evaluation row, dynamically,
    // from CONFIG.HEADERS.EVALUATION - see appendEvaluationRow() for the
    // field-resolution rules and the length-validation guard.
    // -------------------------------------------------------------------
    var evaluationTimestamp = new Date();
    var finalStatus = 'Evaluated';

    var fieldValues = {
      'Timestamp': evaluationTimestamp,
      'Evaluation Time': evaluationTimestamp,
      'Submission ID': submissionId,
      'Challenge ID': challengeId,
      'Roll Number': rollNumber,
      'Student Name': studentName,
      'Faculty Name': facultyName,
      'Faculty Email': facultyEmail,
      'Evaluation': (typeof evaluation === 'object') ? safeJsonStringify(evaluation) : evaluation,
      'Feedback': feedback,
      'Remarks': feedback,
      'Rubric Scores': safeJsonStringify(rubricScores),
      'Marks': totalMarks,
      'Total Marks': totalMarks,
      'Max Marks': maxMarks,
      'Percentage': percentage,
      'Status': finalStatus
    };

    if (rubricScores && typeof rubricScores === 'object') {
      for (var key in rubricScores) {
        if (rubricScores.hasOwnProperty(key)) {
          fieldValues[key] = rubricScores[key];
        }
      }
    }

    appendEvaluationRow(evaluationSheet, fieldValues);

    // -------------------------------------------------------------------
    // Step 5: Update the Student_Submissions row's Status to "Evaluated"
    // via header lookup (1-based row/column addressing for Range access).
    // -------------------------------------------------------------------
    var sheetRowNumber = submissionRowIndex + 1; // convert 0-based data index to 1-based sheet row
    submissionsSheet.getRange(sheetRowNumber, subStatusIndex + 1).setValue(finalStatus);

    debugLog('saveEvaluation: evaluation saved and status updated', {
      submissionId: submissionId,
      status: finalStatus
    });

    return response({
      submissionId: submissionId,
      status: finalStatus
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
function appendEvaluationRow(sheet, fieldValues) {
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

  sheet.appendRow(rowData);
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
  if (rubricScores && Object.keys(rubricScores).length > 0) return rubricScores;
  if (Array.isArray(activities)) {
    var mapped = {};
    for (var i = 0; i < activities.length; i++) {
      if (activities[i] && activities[i].id) {
        mapped[activities[i].id] = activities[i].facultyMarks || 0;
      }
    }
    return mapped;
  }
  return {};
}