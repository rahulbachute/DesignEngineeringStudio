> Current scoring status and backend file list: see [scoring-pipeline-correction.md](scoring-pipeline-correction.md). Sections below retain earlier implementation history, including mapping issues that are now resolved.

# Accept All System-Generated Marks

Implemented in the standalone faculty evaluation page and the Student Submissions evaluation modal. Source files under outputs/meilp/faculty are synchronized with faculty; no deployment is performed.

## Behaviour

- Accept copies recorded systemSuggestedMarks (or the existing suggestedMarks alias) only for activities permitted by the assignment policy. Zero is a valid suggestion. Blank, nonnumeric, infinite and out-of-range suggestions never become maximum marks.
- The action preserves every independently entered or previously saved faculty score and reason, including zero. Repeated clicks are idempotent. The existing reset action requires confirmation before replacing eligible manual marks.
- Procedural and zero-mark activities are excluded. Rubric autoEvaluation.enabled=false is respected; auto-grading policies and calculation workflow policies permit acceptance. An explicitly automated rubric may permit other activity types. Response text is never used to infer eligibility.
- Both routes report accepted marks, skipped activities and validation errors. Final saving requires all scored activities, valid per-activity maxima, valid marks (including zero), consistent assignment totals and an explicit confirmation. Standalone overrides retain the existing reason requirement.
- Acceptance never saves. A draft preserves missing marks as null and leaves the submission open. Final saving updates the same faculty member's draft row. Existing final evaluations retain duplicate protection.
- The repository propagates failures and rejects local-only/unverified success. POST requests are not automatically retried after an uncertain write. Apps Script flushes and reads the evaluation row and final submission status before returning persisted=true with the stored evaluation. The repository compares the returned identity, status and full evaluation to the save payload. Reloading a submission restores stored faculty scores.

## Assignment audit: EA-01 to EA-09

EA identifiers resolve to the existing EC identifiers. Policy maxima come from assignment config, rubric, workflow and evaluation-template data, not the hard-coded demonstration activity arrays. Partial or historical submissions are never replaced by example answers.

| Assignment | Total | Findings and current handling |
| --- | ---: | --- |
| EA-01 Elevator | 24 | Canonical rubric/template agree; old demonstration activities totalled 12. Auto-grading activities can accept actual recorded suggestions. |
| EA-02 Motorcycle | 12 | Canonical mapping agrees; rubric explicitly disables automatic evaluation. Faculty marks remain independent. |
| EA-03 Materials | 30 | Rubric/template specify 30; no config cceMarks. Rubric disables automatic evaluation. |
| EA-04 Borewell pump | 24 | Workflow maxima sum to 25; workflow groups force/structural calculations while rubric lists separate activities, and report/improvement activities differ. Acceptance and final save are blocked pending an academic mapping decision. |
| EA-05 Failure analysis | 12 | Workflow maxima sum to 16.5; rubric and workflow use different calculation activity IDs. Acceptance and final save are blocked pending an academic mapping decision. |
| EA-06 Stress concentration | 12 | Mapping agrees; rubric explicitly disables automatic evaluation. |
| EA-07 Shafts | 12 | Mapping agrees; rubric explicitly disables automatic evaluation. |
| EA-08 Keys | 12 | Supports the sections-style evaluation template; calculation workflow activities may accept actual suggestions. Decision/safety activities require faculty marks. |
| EA-09 Coupling | 12 | Supports the sections-style evaluation template; engineering requirements calculations may accept actual suggestions. Selection/justification activities require faculty marks. |

Conflicts are exposed rather than silently rescaled or assigned invented marks. Assignment definitions were not edited to resolve conflicting academic policy. Records without actual suggestions or with older/unmapped activity IDs need faculty input or data correction. The existing submission engine does not generally emit top-level suggestions, so such records correctly report them as unavailable.

## Changed files

- faculty/evaluation.html and faculty/submissions.html: shared script imports, action label and reporting UI.
- faculty/js/evaluation-engine.js and faculty/js/submissions-browser.js: safe acceptance, validation, manual mark preservation, confirmed saving and in-flight controls.
- faculty/js/evaluation-rules.js: shared normalization, eligibility, acceptance and validation.
- faculty/js/evaluation-policies.js: generated assignment policy registry.
- faculty/js/data/models.js and faculty/js/data/repository.js: lossless mark normalization and verified saves.
- The eight corresponding files under outputs/meilp/faculty.
- Google Script/03_Faculty.gs: strict validation, draft handling and persistence readback.
- Google Script/03_Submission.gs: restore persisted evaluation details after existing access checks.
- Google Script/05_EvaluationPolicies.gs: generated backend policy registry.
- tools/build-evaluation-policies.js: regenerate both policy registries after assignment policy changes.
- test_accept_system_marks.js: regression coverage for both routes and backend persistence.
- test_phase1_security.js: update its authorized-save fixture and sheet mocks for the strict validation/readback contract, preserving authorization assertions.

## Verification and release limits

Run from the repository root:

    node tools/build-evaluation-policies.js
    node --test test_accept_system_marks.js
    node test_phase1_security.js
    node test_guest_mode_ui.js

The persistence regression tests execute the real Apps Script handler with an in-memory spreadsheet implementation, including write failures and corrupted readback. They are not a live Google Sheets persistence test. No live faculty evaluation was created, changed or finalized. The new backend policy file must be included when the owner eventually deploys Apps Script; the frontend deliberately rejects the older backend's unverified success responses. No deployment or push was performed.


## Bulk acceptance for all filtered students

From Evaluation, choose **Accept for All Students…**, or open Student Submissions, switch to **My Evaluation Queue** and **Submission-Details View**, and filter the assignment/students to include. **Accept System Marks for All Students** prepares a preview across every filtered page. Review each student's accepted/skipped marks and errors, then choose **Confirm Save Drafts** and confirm once. Unset marks requiring academic judgement remain unset. Drafts do not finalize students.

Changes to filters invalidate the preview. Already finalized, unauthorized, missing-data and invalid-policy submissions are skipped. Every save reports success or failure separately; partial failures are never represented as a fully successful batch. A used preview cannot be saved again; refresh and prepare a new one to retry. No cloud marks are changed when generating the preview.

The bulk service uses fresh uncached submission details. The backend checks the evaluation snapshot under the existing save lock, verifies every accepted mark against the original recorded suggestion and assignment policy, and rejects changes to independent marks or reasons. Save failures still require verified readback before the UI counts a saved draft. Both bulk and individual drafts now require a successful read-only **evaluationCapabilities** protocol check, preventing an older deployment from silently finalizing a draft.

Additional affected files: faculty/js/services/bulk-evaluation-service.js, faculty/js/services/submission-service.js, Google Script/02_Main.gs, test_bulk_system_marks.js and their applicable frontend mirrors. Backend source changes remain local until separately deployed; the compatibility check prevents bulk writes to the older deployment.

Bulk verification:

    node --test test_bulk_system_marks.js test_accept_system_marks.js


### Rubric schema compatibility correction

The policy generator now resolves rubric activityId, stepId and id fields, reads marks/maxMarks, and resolves evaluation-template rubricRef identifiers to workflow activities. Criterion IDs such as crit-01 are not activity IDs. EA and EC prefixes resolve consistently in both frontend and backend policies. This removes false mapping errors for EA-20 Hydraulic Press, EA-21 Recirculating-Ball Steering and EA-22 Scissor Lift. Actual EA-04/EA-05 conflicts remain blocked. Static template systemSuggestedMarks values are never treated as student-specific recorded suggestions. After this correction the regenerated Google Script/05_EvaluationPolicies.gs must also replace the deployed policy file.
