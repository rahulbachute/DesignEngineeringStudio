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

    LOGS: "Logs",

    FACULTY_REGISTRY: "Faculty_Registry",

    COLLEGE_REGISTRY: "College_Registry",

    ASSIGNMENT_FACULTY_SELECTION: "Assignment_Faculty_Selection",

    ASSIGNMENT_CONTROLS: "Assignment_Controls"

  },

  STATUS: {

    SUBMITTED: "Submitted",

    PENDING: "Pending",

    EVALUATED: "Evaluated",

    ACTIVE: "ACTIVE",

    INACTIVE: "INACTIVE"

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

    ],

    FACULTY_REGISTRY: [
      "Faculty_ID",
      "Login_ID",
      "Password_Hash",
      "Faculty_Name",
      "Email",
      "College_ID",
      "College_Name",
      "Department",
      "Role",
      "Status",
      "Created_At",
      "Last_Login",
      "Password_Updated_At"
    ],

    COLLEGE_REGISTRY: [
      "College_ID",
      "College_Name",
      "Status",
      "Created_At"
    ],

    ASSIGNMENT_FACULTY_SELECTION: [
      "Selection_ID",
      "Attempt_ID",
      "Student_ID",
      "College_ID",
      "Faculty_ID",
      "Assignment_ID",
      "Selected_At",
      "Started_At",
      "Submitted_At",
      "Status"
    ],

    ASSIGNMENT_CONTROLS: [
      "Faculty_ID",
      "Assignment_ID",
      "Enabled",
      "Release_Date",
      "Due_Date",
      "Allow_Late",
      "Updated_At"
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