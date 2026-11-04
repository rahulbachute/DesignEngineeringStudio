> Current confirmed bulk behaviour: see [separate-system-faculty-marks.md](separate-system-faculty-marks.md). Bulk preparation now saves suggestions separately and leaves unreviewed faculty awards blank.

# Activity-wise marks in Faculty_Evaluation

## Supplied export

The pasted export contains five evaluation rows and 59 columns, including 41 activity-related columns. For all five rows, each awarded activity value in evaluation.activities matches its corresponding activity column. Four rows are finalized and one is a draft. No names, emails or roll numbers are reproduced in this report.

The latest EC-01 Elevator draft contains:

| Activity | Awarded mark | Maximum |
| --- | ---: | ---: |
| project-charter | Pending | 1 |
| identify-components | 2 | 2 |
| working-principle | Pending | 2 |
| free-body-diagram | 2 | 2 |
| engineering-model | Pending | 2 |
| design-requirements | Pending | 2 |
| material-selection | Pending | 2 |
| engineering-calculations | Pending | 9 |
| engineering-decision | Pending | 2 |

Total awarded so far: 4/24. Two activities are marked; seven remain pending. Pending is not an awarded zero. This export alone contains no original answers for the pending calculation activity, so its correctness cannot be determined from the evaluation record. Free-text/judgement activities need independent faculty marking under their existing policies.

Older finalized rows use legacy activity identifiers (including ec01-act-* and gen-act-*). They remain unchanged; mapping them to the current rubric or replacing their grades requires the corresponding original student responses and explicit review.

## Local corrections

- Derive the persisted rubric score map from evaluation.activities, including payloads that omit rubricScores.
- Store each activity's awarded numeric mark under its exact activity ID column. Keep pending draft cells blank and genuine awarded zeros numeric.
- Add Scored Activities and Pending Activities columns on the next save. These count positive-maximum activities with and without a faculty mark, respectively.
- Read back every activity cell, Rubric Scores JSON, counts and evaluation totals before confirming persistence. A correct total is insufficient if an activity cell is missing or incorrect.
- Finalize Student_Submissions only after the evaluation and activity-cell checks pass.
- Require the backend capability activityMarksReadback before any save and verify the returned activity score map in the frontend repository.

No marks are inferred from maxima, no pending subjective activities are auto-awarded, and no historical or live sheet rows were changed.

## Activation

Replace Google Script/02_Main.gs and Google Script/03_Faculty.gs using the current local source, then redeploy a new version of the existing web app. Retain the previously required 03_Submission.gs, 05_EvaluationPolicies.gs and 06_AssessmentCore.gs updates. Refresh the local frontend with Ctrl+F5. New activity columns/counts are added by the save handler; existing rows are not bulk rewritten.

The regression suites cover pending blanks, numeric zero, fractional marks, missing rubricScores, damaged activity-cell readback, damaged score JSON, incompatible deployments and actual per-activity persistence. The full evaluation, bulk and scoring suites contain 72 passing checks after this correction.
