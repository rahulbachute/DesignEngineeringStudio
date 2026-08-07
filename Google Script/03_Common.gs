/**
 * ============================================================================
 * 05_Common.gs
 * ----------------------------------------------------------------------------
 * Design Engineering Studio (DES) - Backend API
 * Common / Shared Utility Module
 *
 * This file contains ONLY reusable, cross-cutting utilities consumed by
 * 02_Main.gs, 03_Submission.gs, and 04_Faculty.gs. It defines no request
 * handlers of its own and introduces no new API actions, sheet names,
 * header names, or response fields beyond what is explicitly required
 * below. It depends on (and must never redefine):
 *
 *   From 01_Config.gs:
 *     - CONFIG.SHEETS    { SUBMISSIONS, EVALUATION, ANALYTICS, LOGS }
 *     - CONFIG.HEADERS   { SUBMISSIONS, EVALUATION, ANALYTICS, LOGS } (arrays)
 *     - CONFIG.VERSION   { backend, buildDate, api, ... }
 *     - CONFIG.DEBUG     (boolean)
 *     - CONFIG.LOCK_TIMEOUT_MS (used by 03_Submission.gs, not this file)
 *
 * Compatibility contract (must not change):
 *   - response() JSON shape: success / data / error / timestamp, with
 *     statusCode present only when non-200. `version` is an additive
 *     field only - see note above.
 *   - Sheet names, header names, and column order exactly as defined in
 *     CONFIG.HEADERS.
 *   - No new Apps Script triggers, no external libraries.
 *
 * Coding constraints honored throughout this file: ES5 syntax only (var,
 * function expressions, no arrow functions, no let/const, no classes),
 * defensive null/undefined checks on every external input, and no public
 * function that can throw a raw, unhandled exception back through
 * doGet/doPost.
 * ============================================================================
 */

/**
 * Builds the single uniform JSON response envelope used by every action
 * handler in the backend. This is the ONLY place response JSON is
 * constructed - no other file should build its own response object.
 *
 * Shape (matches the existing, deployed API contract):
 *   {
 *     success:    boolean,
 *     data:       <included only when data is not null/undefined>,
 *     error:      <included only when error is not null/undefined>,
 *     timestamp:  ISO 8601 string,
 *     statusCode: <included only when statusCode !== 200>,
 *     version:    CONFIG.VERSION.backend  (additive diagnostic field)
 *   }
 *
 * Rationale for conditional data/error/statusCode inclusion: this exactly
 * preserves the response shape already relied upon by the deployed
 * frontend (Apps Script Web Apps cannot set a real HTTP status code, so
 * clients read `statusCode` from the body itself; always emitting
 * `data:null` or `error:null` would be a silent contract change for
 * existing consumers that branch on key presence rather than value).
 *
 * @param {*}      [data=null]        Payload to return on success. Pass
 *                                     null/undefined to omit the "data" key.
 * @param {boolean}[success=true]     Whether the operation succeeded.
 * @param {*}      [error=null]       Error message/object. Pass
 *                                     null/undefined to omit the "error" key.
 * @param {number} [statusCode=200]   Logical status code. Included in the
 *                                     body only when it is not 200, since
 *                                     Apps Script cannot alter the real
 *                                     HTTP transport status.
 * @return {TextOutput} A ContentService JSON TextOutput ready to return
 *                       directly from doGet/doPost.
 */
function response(data, success, error, statusCode) {
  // Defensive defaulting: callers throughout the codebase sometimes omit
  // trailing arguments (e.g. response({ ok: true })), so every parameter
  // must be normalized rather than assumed present.
  var isSuccess = (success === undefined || success === null) ? true : success;
  var code = (statusCode === undefined || statusCode === null) ? 200 : statusCode;

  var out = {
    success: isSuccess,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined && data !== null) {
    out.data = data;
  }

  if (error !== undefined && error !== null) {
    out.error = error;
  }

  if (code !== 200) {
    out.statusCode = code;
  }

  // Additive diagnostic field only - never relied upon for control flow
  // by existing consumers, safe to include unconditionally. Guarded so a
  // missing/malformed CONFIG.VERSION can never break response() itself.
  try {
    if (CONFIG && CONFIG.VERSION && CONFIG.VERSION.backend) {
      out.version = CONFIG.VERSION.backend;
    }
  } catch (versionError) {
    // Swallow silently - response() must never fail because of a
    // diagnostic field. The core envelope above is already built.
  }

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Logs an error safely to the Logs sheet. This function is the backend's
 * last line of defense for error visibility and therefore must NEVER
 * throw - a failure inside logError() must never mask or replace the
 * original error that triggered the call.
 *
 * Writes one row to CONFIG.SHEETS.LOGS in the existing column order
 * (Timestamp, Type, Message, Stack Trace, Payload). The "Type" column
 * carries the severity level (e.g. "ERROR"); the "Payload" column
 * carries the caller-supplied context.
 *
 * @param {*} error   The caught error. May be an Error object, a string,
 *                     or (defensively handled) null/undefined.
 * @param {*} context Optional contextual information: the request
 *                     payload, an action name, or a free-text label
 *                     describing where the error occurred.
 */
function logError(error, context) {
  try {
    var sheet = getSheetSafe_(CONFIG.SHEETS.LOGS);
    if (!sheet) {
      // No Logs sheet available (e.g. ensureSheets() has not run yet, or
      // the spreadsheet is in an inconsistent state). There is nowhere
      // safe to record this - fail silently rather than throwing.
      return;
    }

    var message = (error && typeof error.toString === 'function')
      ? error.toString()
      : String(error);

    var stage = '';
    var payloadString;
    if (typeof context === 'object' && context !== null) {
      payloadString = safeJsonStringify(context);
    } else if (context === undefined || context === null) {
      payloadString = '';
    } else {
      stage = String(context);
      payloadString = '';
    }

    sheet.appendRow([
      new Date(),
      'ERROR',
      stage,
      message,
      payloadString
    ]);

  } catch (loggingError) {
    // Absolute failsafe: logging must never throw or mask the original
    // error. Fall back to the Apps Script execution log only.
    try {
      console.error('Fatal Logging Error: ', loggingError);
    } catch (finalError) {
      // Nothing further can be done - intentionally swallow.
    }
  }
}

/**
 * Writes a debug-level trace entry, but only when CONFIG.DEBUG is
 * explicitly true. Uses the Apps Script execution logger (Logger.log)
 * rather than writing to the Logs sheet, so verbose debug output never
 * pollutes production audit data or consumes sheet write quota.
 *
 * Never throws: a debug logging call must never be able to break the
 * request it is instrumenting.
 *
 * @param {string} message Short description of the event being traced.
 * @param {*}      [object] Optional associated data to include, safely
 *                           stringified if it is an object.
 */
function debugLog(message, object) {
  try {
    if (DEBUG !== true) {
      return;
    }

    var suffix = '';
    if (object !== undefined && object !== null) {
      suffix = ' | ' + (typeof object === 'object'
        ? safeJsonStringify(object)
        : String(object));
    }

    Logger.log('[DEBUG] ' + String(message) + suffix);

  } catch (debugError) {
    // Debug logging must never surface an error of its own.
  }
}

/**
 * Retrieves a sheet by name from the active spreadsheet.
 *
 * Per architectural requirement, this throws a meaningful error when the
 * sheet does not exist, rather than returning null. Callers in
 * 03_Submission.gs and 04_Faculty.gs are expected to invoke this from
 * within their own try/catch blocks (which they do), so a thrown error
 * here is caught upstream, logged via logError(), and converted into the
 * standard error response - it never reaches the API consumer as a raw
 * exception.
 *
 * @param {string} sheetName The exact sheet name to look up (should
 *                            always be one of the CONFIG.SHEETS values).
 * @return {Sheet} The matching Sheet object. Never returns null.
 * @throws {Error} If the active spreadsheet has no sheet with this name.
 */
function getSheet(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(
      'Required sheet "' + sheetName + '" was not found. ' +
      'Ensure ensureSheets() has been run for this spreadsheet.'
    );
  }

  return sheet;
}

/**
 * Internal, non-throwing variant of getSheet(), used only by utilities in
 * this file (ensureSheets, ensureHeaders, logError, sheetInformation,
 * validateBackend) that must run safely BEFORE a sheet is guaranteed to
 * exist, or that need to distinguish "missing" from "error" without
 * triggering the public throwing contract of getSheet(). Not exported as
 * part of the module's public utility surface.
 *
 * @param {string} sheetName The sheet name to look up.
 * @return {Sheet|null} The Sheet object, or null if it does not exist.
 */
function getSheetSafe_(sheetName) {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  } catch (lookupError) {
    return null;
  }
}

/**
 * Builds a { headerLabel: columnIndex } lookup map from a single header
 * row array (typically data[0] from a getValues() call). Using this map
 * instead of hard-coded column numbers means every read path keeps
 * working correctly even if a column is manually reordered on the live
 * sheet, as long as the header label itself is unchanged.
 *
 * @param {Array<*>} headerRow Array of header cell values, e.g.
 *                              ["Timestamp", "Submission ID", ...].
 * @return {Object} Map of header label (String) to zero-based column
 *                   index. Returns an empty object for a missing or
 *                   non-array input rather than throwing.
 */
function getHeaderMap(headerRow) {
  var headerMap = {};

  if (!headerRow || Object.prototype.toString.call(headerRow) !== '[object Array]') {
    return headerMap;
  }

  for (var i = 0; i < headerRow.length; i++) {
    headerMap[headerRow[i]] = i;
  }

  return headerMap;
}

/**
 * Parses a JSON string without ever throwing. On any parse failure (or
 * non-string input), returns the caller-supplied fallback instead.
 *
 * @param {*} text     The value to attempt to JSON.parse(). Only strings
 *                      are attempted; any other type returns fallback.
 * @param {*} fallback  The value to return if parsing is not possible.
 * @return {*} The parsed value, or fallback.
 */
function safeJsonParse(text, fallback) {
  if (typeof text !== 'string' || text.trim() === '') {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    return fallback;
  }
}

/**
 * Serializes a value to a JSON string without ever throwing. Used
 * primarily for persisting the full submission payload and for building
 * log context strings, both of which must never abort the surrounding
 * request due to a circular reference or other stringify failure.
 *
 * @param {*} obj The value to serialize.
 * @return {string} The JSON string, or "{}" if serialization fails.
 */
function safeJsonStringify(obj) {
  try {
    var result = JSON.stringify(obj);
    // JSON.stringify can legitimately return undefined (e.g. for a bare
    // function or undefined input) - guard against writing the literal
    // string "undefined" into a sheet cell.
    return (result === undefined) ? '{}' : result;
  } catch (stringifyError) {
    return '{}';
  }
}

/**
 * Generates a unique identifier for submissions that arrive without a
 * client-supplied submissionId. Combines the current timestamp with a
 * random alphanumeric suffix to guarantee uniqueness even under rapid,
 * near-simultaneous calls.
 *
 * @return {string} A unique ID of the form "des-<timestamp>-<random>".
 */
function generateId() {
  var timestampPart = new Date().getTime().toString(36);
  var randomPart = Math.random().toString(36).substring(2, 10);
  return 'des-' + timestampPart + '-' + randomPart;
}

/**
 * Retrieves the email address of the user currently executing the script,
 * if available. Never throws: depending on the deployment's "Execute as"
 * setting and the caller's authorization, Session.getActiveUser().getEmail()
 * can be restricted or return an empty string - both are treated as
 * "no email available" rather than an error condition.
 *
 * @return {string} The active user's email address, or "" if unavailable.
 */
function getUserEmail() {
  try {
    var email = Session.getActiveUser().getEmail();
    return email || '';
  } catch (emailError) {
    return '';
  }
}

/**
 * Ensures every sheet required by the backend exists on the active
 * spreadsheet, creating any that are missing. Safe to call on every
 * request - a no-op when all sheets already exist. Uses direct
 * SpreadsheetApp access (not getSheet()) so that this bootstrapping
 * function never throws merely because a sheet has not been created yet.
 */
function ensureSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetNames = CONFIG.SHEETS;

    for (var key in sheetNames) {
      if (!sheetNames.hasOwnProperty(key)) {
        continue;
      }
      var name = sheetNames[key];
      if (!ss.getSheetByName(name)) {
        ss.insertSheet(name);
      }
    }
  } catch (ensureError) {
    // Bootstrapping must not silently corrupt state, but it also must
    // not crash the request before the caller's own try/catch (in
    // doGet/doPost) has a chance to log it. Re-throw so the standard
    // error-handling path in 02_Main.gs converts this into a clean
    // JSON 500 response, exactly as an error later in the request
    // would be.
    throw ensureError;
  }
}

/**
 * Ensures every required sheet has the correct headers.
 *
 *  - If a sheet is completely empty (no rows at all), the full header
 *    row from CONFIG.HEADERS is inserted and bolded.
 *  - If a sheet already has data (a non-empty header row), any expected
 *    header that is currently MISSING is safely repaired by appending it
 *    as a new column at the far right. Existing columns are never
 *    reordered, renamed, or removed, and existing data rows are never
 *    modified - this guarantees the fixed positional column contract
 *    relied upon by 03_Submission.gs's rowData array is never disturbed
 *    for the first N original columns.
 *
 * Must be called after ensureSheets().
 */
function ensureHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  for (var key in CONFIG.SHEETS) {
    if (!CONFIG.SHEETS.hasOwnProperty(key)) {
      continue;
    }

    var sheetName = CONFIG.SHEETS[key];
    var expectedHeaders = CONFIG.HEADERS[key];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet || !expectedHeaders || expectedHeaders.length === 0) {
      continue;
    }

    if (sheet.getLastRow() === 0) {
      // Sheet is completely empty - safe to write the full header row.
      sheet.appendRow(expectedHeaders);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      continue;
    }

    // Sheet already has a header row (and possibly data below it).
    // Identify any expected header that is not currently present, and
    // repair by appending ONLY the missing ones as new trailing columns.
    var existingHeaderRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    var existingHeaders = existingHeaderRange.getValues()[0];
    var existingHeaderMap = getHeaderMap(existingHeaders);

    var missingHeaders = [];
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (existingHeaderMap[expectedHeaders[i]] === undefined) {
        missingHeaders.push(expectedHeaders[i]);
      }
    }

    if (missingHeaders.length > 0) {
      var startColumn = sheet.getLastColumn() + 1;
      var repairRange = sheet.getRange(1, startColumn, 1, missingHeaders.length);
      repairRange.setValues([missingHeaders]);
      repairRange.setFontWeight('bold');

      debugLog(
        'ensureHeaders: repaired missing headers on "' + sheetName + '"',
        missingHeaders
      );
    }
  }
}

/**
 * Validates that the Student_Submissions sheet contains every header
 * defined in CONFIG.HEADERS.SUBMISSIONS. This is the schema guard other
 * modules can call before relying on header-based column lookups.
 *
 * @return {boolean} true if every expected header is present.
 * @throws {Error} If the sheet is missing, or if any expected header
 *                 cannot be found in its current header row. The error
 *                 message names the missing header(s) for fast diagnosis.
 */
function validateSubmissionHeaders() {
  var sheet = getSheet(CONFIG.SHEETS.SUBMISSIONS);
  var lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    throw new Error(
      'Student_Submissions has no header row. Run ensureHeaders() first.'
    );
  }

  var headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var headerMap = getHeaderMap(headerRow);

  var expectedHeaders = CONFIG.HEADERS.SUBMISSIONS;
  var missing = [];

  for (var i = 0; i < expectedHeaders.length; i++) {
    if (headerMap[expectedHeaders[i]] === undefined) {
      missing.push(expectedHeaders[i]);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      'Student_Submissions is missing required header(s): ' + missing.join(', ')
    );
  }

  return true;
}

/**
 * Lightweight liveness check. Returns a plain data object (NOT a
 * TextOutput) so callers can wrap it with response() themselves, e.g.
 * `return response(healthCheck());` from the "health" action route.
 *
 * @return {Object} { status: "OK", timestamp: <ISO string>, version: <string> }
 */
function healthCheck() {
  var backendVersion = (CONFIG && CONFIG.VERSION && CONFIG.VERSION.backend)
    ? CONFIG.VERSION.backend
    : 'unknown';

  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: backendVersion
  };
}

/**
 * Returns the backend's version metadata exactly as defined in
 * CONFIG.VERSION. Returns a plain data object (NOT a TextOutput) so
 * callers can wrap it with response() themselves, e.g.
 * `return response(versionInfo());` from the "version" action route.
 *
 * @return {Object} CONFIG.VERSION (backend, buildDate, api, ...).
 */
function versionInfo() {
  return CONFIG.VERSION;
}

/**
 * Runs a full backend diagnostic: confirms every required sheet exists
 * and that the Student_Submissions header schema is valid. Designed to
 * be safe to call at any time (including from the Apps Script editor
 * for manual verification) - it never throws, instead capturing any
 * failure into the returned report.
 *
 * Returns a plain data object (NOT a TextOutput); wrap with response()
 * at the call site if exposing this via an API action.
 *
 * @return {Object} {
 *   ok: boolean,
 *   sheets: { <sheetKey>: boolean },
 *   headers: { valid: boolean, error: string|null },
 *   timestamp: <ISO string>
 * }
 */
function validateBackend() {
  var report = {
    ok: true,
    sheets: {},
    headers: { valid: true, error: null },
    timestamp: new Date().toISOString()
  };

  for (var key in CONFIG.SHEETS) {
    if (!CONFIG.SHEETS.hasOwnProperty(key)) {
      continue;
    }
    var exists = !!getSheetSafe_(CONFIG.SHEETS[key]);
    report.sheets[key] = exists;
    if (!exists) {
      report.ok = false;
    }
  }

  try {
    validateSubmissionHeaders();
  } catch (headerError) {
    report.headers.valid = false;
    report.headers.error = headerError.message || String(headerError);
    report.ok = false;
  }

  return report;
}

/**
 * Produces a diagnostic snapshot of every configured sheet: its row
 * count, column count, and whether its header row currently satisfies
 * CONFIG.HEADERS for that sheet. Intended for operational visibility
 * (e.g. an internal "sheetInformation" action or manual debugging) - it
 * never throws, and sheets that do not yet exist are reported as such
 * rather than causing a failure.
 *
 * Returns a plain data object (NOT a TextOutput); wrap with response()
 * at the call site if exposing this via an API action.
 *
 * @return {Object} {
 *   <sheetKey>: {
 *     sheetName: string,
 *     exists: boolean,
 *     rowCount: number,
 *     columnCount: number,
 *     headersValid: boolean,
 *     missingHeaders: Array<string>
 *   },
 *   ...
 * }
 */
function sheetInformation() {
  var info = {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  for (var key in CONFIG.SHEETS) {
    if (!CONFIG.SHEETS.hasOwnProperty(key)) {
      continue;
    }

    var sheetName = CONFIG.SHEETS[key];
    var expectedHeaders = CONFIG.HEADERS[key] || [];
    var sheet = ss.getSheetByName(sheetName);

    var entry = {
      sheetName: sheetName,
      exists: !!sheet,
      rowCount: 0,
      columnCount: 0,
      headersValid: false,
      missingHeaders: []
    };

    if (sheet) {
      entry.rowCount = sheet.getLastRow();
      entry.columnCount = sheet.getLastColumn();

      if (entry.columnCount > 0) {
        var headerRow = sheet.getRange(1, 1, 1, entry.columnCount).getValues()[0];
        var headerMap = getHeaderMap(headerRow);
        var missing = [];

        for (var i = 0; i < expectedHeaders.length; i++) {
          if (headerMap[expectedHeaders[i]] === undefined) {
            missing.push(expectedHeaders[i]);
          }
        }

        entry.missingHeaders = missing;
        entry.headersValid = (missing.length === 0);
      }
    }

    info[key] = entry;
  }

  return info;
}
