> Current confirmed bulk behaviour: see [separate-system-faculty-marks.md](separate-system-faculty-marks.md). Bulk preparation now saves suggestions separately and leaves unreviewed faculty awards blank.

# Scoring pipeline correction

The active catalogue has 26 assignments. The shared submission engine now reads rubric id/activityId/stepId fields, combines grouped rubric criteria, emits correct maxima and produces explicit assessment results. There are no remaining rubric lookup, emitted-maximum or definition-total conflicts in the current source audit.

## Scoring behaviour

- Correctness is checked against configured answer keys: image labels/accepted synonyms, MCQ ids/values/labels, or numeric expected values/tolerances. Attempting an activity does not earn maximum marks.
- Partial credit is the activity maximum multiplied by the proportion of correct configured checks, rounded to two decimals. Missing checks count in the denominator; when no graded check is answered, the score remains null/unassessed. Incorrect attempted answers can earn a valid zero.
- Numeric reference keys were added from the stated assignment givens/equations for Keys, Cotter Joint, Knuckle Joint, Helical Spring, Leaf Spring and the three numerical transmission assignments. New numeric keys use a stated 1% tolerance with a minimum absolute tolerance of 0.005. Existing explicit tolerances remain in effect elsewhere. Hints, placeholders, completion flags, client correctness booleans and template scores are never answer keys.
- 123 activities across 20 assignments have permitted, keyed automatic scoring. The six assignments whose rubrics explicitly disable automation (02–07) retain faculty review. Mixed automated/subjective grouped activities also remain faculty-reviewed as a whole.
- Activity Summary now distinguishes **Max** from **System** marks and shows **Not assessed** instead of an awarded zero for missing scores.

## Assignment definition alignment

- Borewell Pump: retain rubric total 24; map the three force/effort criteria to force-effort-analysis, three structural criteria to structural-analysis, and design-improvement to the final report. Final report maximum is 1, consistent with the existing rubric.
- Failure Analysis: user approved retaining 12 and scaling every existing rubric weight by 0.8. The related requirements/load/geometry/stress/safety criteria map to the existing calculation activity. Workflow and evaluation template match the scaled rubric; maxima include 0.8, 0.4 and 3.6, supported by two-decimal inputs and rounded total arithmetic.
- Helical Gear and Spur Gear: workflow activity maxima now equal the combined existing rubric weights. Procedural charter steps without a rubric allocation carry zero; grouped criteria retain their existing total of 12.
- Automotive Spur Gear: grouped criteria are combined without changing its existing 12-mark definition.

## Existing students

The authorized submission-detail read reassesses the stored response payload in memory using current trusted policy keys. Missing/zero historic maxima are corrected in the returned view and listed in assessmentSummary.maximumCorrections. Existing faculty marks and reasons are preserved. Original spreadsheet response JSON is not rewritten by a read. Keyed suggestions are recomputed even if the payload contains an old or client-supplied score; blank answers remain unassessed. Unsupported/unmapped legacy activities still require review rather than invented scores.

Bulk preview uses fresh reassessed details; the backend repeats assessment before validating a bulk draft save. Existing save confirmation, stale-preview checks, manual-mark preservation, draft-only bulk behaviour and persistence readback remain required. The protocol is now protected-draft-v2, so old deployments cannot silently accept the new draft requests.

## Files changed

- js/assessment-core.js: shared deterministic grading core; identical copy in Google Script/06_AssessmentCore.gs.
- js/submission-engine.js and assignment-workbench.html: grouped metadata and grading at submission, with the new script imported first.
- tools/build-evaluation-policies.js and generated faculty/js/evaluation-policies.js / Google Script/05_EvaluationPolicies.gs: combined criteria, compiled keys and policy revisions for all active catalogue entries.
- tools/add-reference-answer-keys.js: reproducible formula-derived keys.
- Four assignment workflows/rubrics/templates and related content; eight assignments have numeric reference content updates.
- faculty/js/data/repository.js, evaluation-rules.js, evaluation-engine.js, submissions-browser.js and services/bulk-evaluation-service.js: updated protocol, raw-response metadata, explicit mark labels, fractional marks and reassessment reporting.
- Google Script/02_Main.gs, 03_Faculty.gs, 03_Submission.gs: capabilities, read-only reassessment and guarded saves.
- Applicable files under outputs/meilp are synchronized.
- test_scoring_pipeline.js and updated evaluation/bulk suites. The original audit is preserved in assignment-scoring-audit-before-fix.md/json; assignment-scoring-audit.md/json reports current source.

## Verification

- node --test test_accept_system_marks.js test_bulk_system_marks.js test_scoring_pipeline.js
- node test_phase1_security.js
- node test_guest_mode_ui.js
- node test_ea_ts_01.js through test_ea_ts_04.js
- node tools/audit-assignment-scoring.js

Tests exercise all 26 assignments, correct/wrong/partial/blank answers, trusted keys, policy opt-outs, historical zero-max Elevator responses, preserved faculty marks, full backend draft persistence with mock sheets, and fractional Failure Analysis totals. Live Google Sheets writes were not performed.

## Backend update required

Replace **02_Main.gs**, **03_Faculty.gs**, **03_Submission.gs**, **05_EvaluationPolicies.gs**, and add **06_AssessmentCore.gs** from the local Google Script folder to the existing Google Apps Script project. Save, then deploy a new version of the existing web-app deployment, retaining its URL and current access settings. Keep 01_Config.gs, 03_Common.gs and 04_Registry.gs unchanged.

Refresh the local site with Ctrl+F5 and generate a new bulk preview. Students do not need to reattempt supported activities; existing responses are used. New code remains local until the Apps Script owner deploys these files. No GitHub push was performed.
