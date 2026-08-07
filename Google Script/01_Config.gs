/**
 * ============================================================================
 * DESIGN ENGINEERING STUDIO (DES)
 * Backend Version 3.0
 *
 * File : 01_Config.gs
 * Purpose : Global Configuration
 * ============================================================================
 */

const DEBUG = true;

const CONFIG = {

  VERSION: {
    backend: "3.0.0",
    api: "v1",
    buildDate: "2026-07-29"
  },

  SHEETS: {

    SUBMISSIONS: "Student_Submissions",

    EVALUATION: "Faculty_Evaluation",

    ANALYTICS: "Analytics",

    LOGS: "Logs"

  },

  STATUS: {

    SUBMITTED: "Submitted",

    PENDING: "Pending",

    EVALUATED: "Evaluated"

  },

  LOCK_TIMEOUT_MS: 30000,

  HEADERS: {

    SUBMISSIONS: [

      "Timestamp",

      "Submission ID",

      "Submission Hash",

      "Student Name",

      "Roll Number",

      "Division",

      "Attempt Mode",

      "Challenge ID",

      "Challenge Title",

      "Attempt Number",

      "Completion %",

      "Status",

      "Full JSON Payload",

      "Email"

    ],

    EVALUATION: [
      "Timestamp",
      "Submission ID",
      "Challenge ID",
      "Student Name",
      "Roll Number",
      "Faculty Name",
      "Faculty Email",
      "Evaluation",
      "Marks",
      "Max Marks",
      "Percentage",
      "Remarks",
      "Rubric Scores",
      "project-charter",
      "identify-components",
      "working-principle",
      "material-selection",
      "engineering-calculations",
      "engineering-decision",
      "reflection",
      "Status"
    ],

    ANALYTICS: [

      "Last Updated",

      "Total Submissions",

      "Pending Evaluations",

      "Completed Evaluations"

    ],

    LOGS: [

      "Timestamp",

      "Type",

      "Stage",

      "Message",

      "Payload"

    ]

  }

};


/* ============================================================================
   HEADER INDEXES
   (Used throughout the project)
   ========================================================================== */

const COL = {

  TIMESTAMP: 0,

  SUBMISSION_ID: 1,

  SUBMISSION_HASH: 2,

  STUDENT_NAME: 3,

  ROLL_NUMBER: 4,

  DIVISION: 5,

  ATTEMPT_MODE: 6,

  CHALLENGE_ID: 7,

  CHALLENGE_TITLE: 8,

  ATTEMPT_NUMBER: 9,

  COMPLETION_PERCENT: 10,

  STATUS: 11,

  JSON_PAYLOAD: 12,

  EMAIL: 13

};