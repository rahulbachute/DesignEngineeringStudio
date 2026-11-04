# Separate system suggestions and faculty awards

The user confirmed: **Separate System Marks field; leave Faculty Marks blank.** This supersedes the former bulk behaviour that copied system suggestions into faculty awards.

## Behaviour

- Bulk **Prepare System Marks for All Students** creates a review-draft preview for every valid, authorized, nonfinalized filtered submission, across all pages. It never fills or approves a faculty mark.
- **Confirm Save Drafts** saves system suggestions separately. A submission can be saved as a pending-review draft even if no system suggestion exists. Missing suggestions stay blank; activity maximum marks are never used in their place.
- Existing faculty-entered marks, including actual zero awards and reasons, remain unchanged. Existing finalized evaluations remain protected. Final submission continues to require faculty review.
- The individual evaluation's explicit Accept All action remains a faculty approval action for eligible activities; bulk preparation is separate and does not invoke it.

## Faculty_Evaluation sheet fields

| Field | Meaning |
| --- | --- |
| System Marks | JSON map of activity ID to actual system suggestion, or null if unavailable |
| System: activity-id | Individual system suggestion cell; blank if unavailable |
| System Total | Sum of available suggestions, blank when none exist; a valid system zero remains numeric zero |
| Faculty Marks | JSON map of activity ID to reviewed faculty award, or null if pending |
| activity-id (existing columns) | Individual faculty mark; blank until reviewed |
| Faculty Total | Sum of reviewed faculty marks; blank when no faculty activity is marked |
| Scored Activities / Pending Activities | Counts of reviewed and pending positive-maximum faculty activities |
| System Scored Activities / System Pending Activities | Counts of positive-maximum activities with and without a system suggestion |

Legacy Marks/Total Marks and Percentage cells are blank when no faculty mark has been entered. A genuinely reviewed zero is still stored as zero. Evaluation JSON retains a numeric running sum for validation, with null per-activity faculty marks and Draft status; it is not a final grade.

System suggestions are computed from the original stored student responses with the deployed answer-key policy. They are not trusted from incoming client values. Activities whose rubrics disable automation and activities with no assessable answers may have no system suggestion and remain pending faculty review.

The backend verifies both sets of JSON maps, activity cells, totals and counts by readback before returning success. The repository requires separateSystemMarks and activityMarksReadback capabilities before sending any save and requires systemMarksPersisted in the response. Old deployments are blocked before writes.

## Deployment

Replace **Google Script/02_Main.gs** and **Google Script/03_Faculty.gs** from the current local folder, then deploy a new version of the existing web-app deployment, retaining its URL and access settings. The previous scoring files (03_Submission.gs, 05_EvaluationPolicies.gs and 06_AssessmentCore.gs) remain required. No new configuration file or manual sheet-column setup is needed; columns are appended on the next confirmed save.

Refresh the local site with Ctrl+F5. Open My Evaluation Queue, filter students/assignments, choose Prepare System Marks for All Students, review the preview and confirm the draft save. Backend marks are not finalized by this action.

No live sheet rows were modified during implementation, and no GitHub push or cloud deployment was performed.
