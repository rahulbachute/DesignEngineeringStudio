/**
 * ============================================================================
 * DESIGN ENGINEERING STUDIO (DES)
 * Backend Version 3.0
 *
 * File : 02_Main.gs
 * Purpose : Entry Points & Request Routing
 * ============================================================================
 */


/* ============================================================================
   GET REQUEST
   ========================================================================== */

function doGet(e) {

  try {

    ensureSheets();
    ensureHeaders();

    const params = (e && e.parameter) ? e.parameter : {};

    const payload = {
      action: params.action || "",
      submissionId: params.submissionId || params.id || ""
    };

    debugLog("GET REQUEST", payload);

    return routeAction(payload.action, payload);

  }

  catch (error) {

    logError(error, "doGet");

    return response(
      null,
      false,
      "Internal Server Error",
      500
    );

  }

}


/* ============================================================================
   POST REQUEST
   ========================================================================== */

function doPost(e) {

  try {

    ensureSheets();
    ensureHeaders();

    if (!e || !e.postData || !e.postData.contents) {
      return response(
        null,
        false,
        "No payload received.",
        400
      );
    }

    debugLog("RAW REQUEST", e.postData.contents);

    const parsedContent = safeJsonParse(
      e.postData.contents,
      null
    );
    
    if (parsedContent === null) {
      debugLog("INVALID JSON", e.postData.contents);
      return response(
        null,
        false,
        "Invalid JSON payload.",
        400
      );
    }
    
    const payload = {};
    if (e.parameter) {
      for (var key in e.parameter) {
        if (e.parameter.hasOwnProperty(key)) {
          payload[key] = e.parameter[key];
        }
      }
    }
    for (var key in parsedContent) {
      if (parsedContent.hasOwnProperty(key)) {
        payload[key] = parsedContent[key];
      }
    }

    const action =
      (e.parameter && e.parameter.action)
      || payload.action
      || "";

    debugLog("ACTION", action);

    return routeAction(action, payload);

  }
  catch (error) {
    logError(error, "doPost");
    return response(
      null,
      false,
      "Internal Server Error",
      500
    );
  }
}


/* ============================================================================
   ROUTER
   ========================================================================== */

function routeAction(action, payload) {

  action = String(action || "").trim();

  debugLog("ROUTER", action);

  switch (action) {

    case "submit":
      return saveStudentSubmission(payload);

    case "submissions":
    case "getSubmissions":
      return getSubmissions();

    case "submission":
    case "getSubmission":
      return getSubmission(payload);

    case "saveEvaluation":
    case "evaluate":
      return saveEvaluation(payload);

    case "analytics":
    case "getAnalytics":
      return getAnalytics();

    case "health":
      return response(healthCheck());

    case "version":
      return response(versionInfo());

    case "validate":
      return response(validateBackend());

    case "sheetinfo":
      return response(sheetInformation());

    default:
      debugLog("INVALID ACTION", action);
      return response(
        null,
        false,
        "Invalid or missing action parameter.",
        400
      );
  }
}
