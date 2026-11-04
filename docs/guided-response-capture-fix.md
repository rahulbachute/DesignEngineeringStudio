# Guided calculation response capture

## Verified diagnosis

A read-only check of the configured live backend confirmed that protected-draft-v2, response-assessment-v2 and activityMarksReadback are deployed. In the specific Elevator submission supplied for diagnosis, identification and free-body-diagram scores are both assessed as 2/2 and are already saved in a draft. The stored engineering-calculations response is an empty object. The backend therefore correctly reports not-assessed and cannot generate new calculation marks from that record.

The remaining student frontend defect was in ChallengeRunner.saveStep. GuidedWorkflowComponent autosaved its nested values through BaseComponent.save, but the generic Save Draft handler collected only ordinary data-response/data-calc form controls and replaced the activity response with an empty object. Its completion flag was still set, explaining why an attempted/completed activity could lack stored numbers.

## Correction

- Mounted components now supply their complete response schema through getValue or collect. The generic form collector is used for ordinary activities only.
- A component for a different activity cannot provide a stale response.
- Empty activity responses are not marked complete solely by clicking Save Draft.
- Numeric zero is preserved in guided calculation storage and display.
- The bulk report distinguishes automated marks that are already saved, absent graded answers and activities requiring independent faculty review. Reassessment information is kept separate from activity skip counts.
- Source and outputs/meilp copies are synchronized.

Files: js/challenge-runner.js, components/guided-workflow/guided-workflow.js, faculty/js/services/bulk-evaluation-service.js, faculty/js/submissions-browser.js and their mirrors. Tests: test_student_response_capture.js and the updated bulk suite.

## Recovery limit

This frontend correction prevents future loss; it cannot reconstruct numbers already absent from Student_Submissions. For an affected past submission, use a surviving student draft, original calculation work or a re-entry of the missing calculation section followed by the normal submission/faculty-review workflow. Do not invent answers or overwrite an existing finalized grade. Earlier expectations that no re-entry would be needed apply only when the original responses actually exist.

No live evaluation or student-submission row was modified during diagnosis. No further Apps Script scoring change was made for this frontend fix. Refresh the local student workbench and faculty submissions page using Ctrl+F5 to use the corrected scripts.
