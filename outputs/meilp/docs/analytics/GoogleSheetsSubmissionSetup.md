# Google Sheets Submission Setup

This guide configures DES Version 1.0 challenge submissions for Google Sheets through Google Apps Script.

## 1. Required Config

Edit `js/config.js` and set:

```js
window.MEILP.googleSheetsConfig = {
  submissionWebAppUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  requestTimeoutMs: 10000,
  apiKey: ""
};
```

`apiKey` is optional. If used, DES sends it as an `apiKey` query parameter so the request remains compatible with Google Apps Script Web Apps.

## 2. Google Sheet Tabs

Create these tabs in the target spreadsheet:

```text
Submissions
ActivityResponses
FacultyEvaluation
Analytics
SubmissionErrors
```

Recommended columns:

```text
Submissions:
submissionId, submittedAt, status, challengeId, challengeTitle, challengeVersion,
attemptMode, rollNumber, studentName, groupNumber, groupMembers, division,
cceMarks, completedActivities, totalActivities, rawJson

ActivityResponses:
submissionId, activityId, title, component, cceMarks, coMapping, poMapping,
psoMapping, bloomLevel, activityStatus, responseJson

FacultyEvaluation:
submissionId, challengeId, totalCceMarks, provisionalCceMarks, facultyRemarks,
evaluationStatus, evaluationTimestamp, mappingSummaryJson

Analytics:
submissionId, challengeId, studentName, rollNumber, attemptMode,
completionPercent, submissionStatus, coJson, poJson, psoJson, bloomJson,
reflectionSummary

SubmissionErrors:
timestamp, submissionId, errorMessage, rawJson
```

## 3. Apps Script Deployment

Create an Apps Script project bound to the spreadsheet and deploy it as a Web App.

Deployment settings:

```text
Execute as: Me
Who has access: Anyone with the link
```

Use this `doPost` handler:

```js
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
const API_KEY = "";

function doPost(e) {
  try {
    if (API_KEY) {
      const headerKey = (e && e.parameter && e.parameter.apiKey) || "";
      if (headerKey !== API_KEY) {
        return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Invalid API key." });
      }
    }

    const payload = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    writeSubmission(spreadsheet, payload);
    writeActivityResponses(spreadsheet, payload);
    writeFacultyEvaluation(spreadsheet, payload);
    writeAnalytics(spreadsheet, payload);

    return jsonResponse({
      ok: true,
      submissionId: payload.submission.submissionId,
      submittedAt: new Date().toISOString()
    });
  } catch (error) {
    logError(e, error);
    return jsonResponse({ ok: false, code: "SCRIPT_ERROR", message: error.message });
  }
}

function writeSubmission(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Submissions");
  const student = payload.studentInformation || {};
  const data = payload.submissionData || {};
  const meta = payload.challengeMetadata || {};
  sheet.appendRow([
    payload.submission.submissionId,
    payload.submission.submittedAt,
    payload.submission.status,
    meta.id,
    meta.title,
    meta.version,
    payload.submission.attemptMode,
    student.rollNumber || "",
    student.name || student.student1 || "",
    student.groupNumber || "",
    (student.groupMembers || []).join(", "),
    student.division || "",
    meta.cceMarks,
    data.completedActivities,
    data.totalActivities,
    JSON.stringify(payload)
  ]);
}

function writeActivityResponses(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("ActivityResponses");
  (payload.submissionData.activityResponses || []).forEach(function(activity) {
    sheet.appendRow([
      payload.submission.submissionId,
      activity.activityId,
      activity.title,
      activity.component,
      activity.cceMarks,
      activity.coMapping,
      JSON.stringify(activity.poMapping || []),
      JSON.stringify(activity.psoMapping || []),
      activity.bloomLevel,
      activity.status,
      JSON.stringify(activity.response || {})
    ]);
  });
}

function writeFacultyEvaluation(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("FacultyEvaluation");
  const evaluation = payload.facultyEvaluation || {};
  sheet.appendRow([
    payload.submission.submissionId,
    payload.challengeMetadata.id,
    evaluation.totalCceMarks,
    evaluation.provisionalCceMarks,
    evaluation.facultyRemarks || "",
    evaluation.status,
    evaluation.evaluationTimestamp || "",
    JSON.stringify(evaluation.mappingSummary || {})
  ]);
}

function writeAnalytics(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Analytics");
  const student = payload.analytics.studentDashboard || {};
  const learning = payload.analytics.learningAnalytics || {};
  sheet.appendRow([
    payload.submission.submissionId,
    student.challengeId,
    student.studentName,
    student.rollNumber,
    student.attemptMode,
    student.completionPercent,
    student.submissionStatus,
    JSON.stringify(learning.coAttainment || {}),
    JSON.stringify(learning.poMapping || {}),
    JSON.stringify(learning.psoMapping || {}),
    JSON.stringify(learning.bloomDistribution || {}),
    JSON.stringify(payload.submissionData.reflection || [])
  ]);
}

function logError(e, error) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("SubmissionErrors");
  if (sheet) {
    sheet.appendRow([
      new Date().toISOString(),
      "",
      error.message,
      e && e.postData ? e.postData.contents : ""
    ]);
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 4. Verification

1. Deploy the Apps Script Web App.
2. Copy the Web App URL into `window.MEILP.googleSheetsConfig.submissionWebAppUrl`.
3. Open `assignment-workbench.html?assignment=elevator`.
4. Complete all activities and open Submit.
5. Confirm that the Submission Summary reports `Google Sheets: Configured`.
6. Submit and verify new rows in all configured tabs.

If the network is unavailable, DES stores the submission locally and enables Retry Queue.
