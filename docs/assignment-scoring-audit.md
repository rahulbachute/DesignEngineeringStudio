# Assignment scoring audit

26 active catalogue entries: data/assignments.json. Local source audit, not a live student-sheet audit.

## Counts (overlapping categories)

- 26 active assignments use the shared submission builder.
- 0 assignments have criteria missed by its activityId-only lookup.
- 0 assignments currently emit maxima that differ from the rubric, combining grouped criteria.
- 5 assignments require many-criteria-to-one-activity schema support.
- 0 assignments have workflow/rubric IDs, weights or total conflicts requiring review.
- All 0 produce no systemSuggestedMarks/suggestedMarks field through the shared submission builder.

Missing output is a shared pipeline limitation. It does not mean all activities should receive automated marks. Explicit policy opt-outs and independent academic judgement must remain respected.

## Assignment-by-assignment result

| ID | Assignment | Lookup defect | Incorrect emitted maxima | Grouped criteria | Definition conflict |
| --- | --- | --- | --- | --- | --- |
| EC-01 | Safety Verification of Elevator Suspension Cables | No | No | No | No |
| EC-02 | Determine factor of safety of motorcycle stand and verify whether design is safe | No | No | No | No |
| EC-03 | Engineering Materials Selection in Two-Wheeler Components | No | No | No | No |
| EC-04 | Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever | No | No | Yes | No |
| EC-05 | Failure Analysis and Material Selection of a Failed Mechanical Component | No | No | Yes | No |
| EC-06 | Stress Concentration Analysis of a Plate with a Central Hole | No | No | No | No |
| EC-07 | Design of Shaft for a Real-World Engineering Application | No | No | No | No |
| EC-08 | Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission | No | No | No | No |
| EC-09 | Identification and Selection of Couplings Used in Mechanical Power Transmission | No | No | No | No |
| EC-10 | Design of a Cotter Joint for a Bicycle | No | No | No | No |
| EA-11 | Design and Analysis of a Knuckle Joint for a Tractor–Trailer | No | No | No | No |
| EA-12 | Design of a Helical Compression Spring for Motorcycle Suspension | No | No | No | No |
| EA-13 | Construction and Design Verification of a Leaf Spring | No | No | No | No |
| EA-14 | Comparative Study and Selection of Springs for Engineering Applications | No | No | No | No |
| EA-15 | Analysis of an Automobile Suspension System | No | No | No | No |
| EA-16 | Fatigue Design of an Automotive Propeller Shaft | No | No | No | No |
| EA-17 | Fatigue Analysis of a Connecting Rod | No | No | No | No |
| EA-18 | Torque Requirement and Efficiency Estimation of a Bench Vice Screw Mechanism | No | No | No | No |
| EA-19 | Analysis of C-Clamp Screw and Collar Friction Effects | No | No | No | No |
| EA-20 | Design of a Power Screw for a Hydraulic Press | No | No | No | No |
| EC-21 | Design of Automotive Steering Gear (Recirculating Ball Type) | No | No | No | No |
| EA-22 | Design of a 2-Ton Mobile Scissor Lift Power Screw | No | No | No | No |
| EA-TS-01 | Design of Helical Gears for High-Speed Rotary Equipment | No | No | Yes | No |
| EA-TS-02 | Design Parameters of Spur Gears for Industrial Conveyor Systems | No | No | Yes | No |
| EA-TS-03 | Comparison of Spur and Helical Gears in Industrial Power Transmission | No | No | No | No |
| EA-TS-04 | Analysis of Spur Gears in a Car Transmission System | No | No | Yes | No |

## Important details

- Rubric lookup now supports id, activityId and stepId, and sums grouped criteria. Original findings are preserved in assignment-scoring-audit-before-fix.md/json.
- Many-criteria-to-one-activity schema support is present for EA-TS-01, EA-TS-02 and EA-TS-04.
- Corrected definitions retain the rubric total of 24 for Borewell Pump and 12 for the two gear assignments; Failure Analysis uses the user-approved 0.8 scale to retain 12.
- The faculty Activity Summary now labels maxima and system scores separately; unassessed/manual activities do not display an awarded zero.
- Historical submissions with missing/zero maxima or absent suggestions require reassessment from their stored responses after the pipeline is corrected. This audit makes no changes to student records.
- Four non-catalogue folders were excluded from the 26-assignment count: 2-ton mobile scissor lift, cotter joint, hydraulic press, recirculating ball screw.
- The submission builder under outputs/meilp is byte-identical: Yes.

## Detailed conflicts

## Reproduce

Run node tools/audit-assignment-scoring.js from the project root. The script only writes these Markdown/JSON reports. It does not evaluate actual student answers, alter grading logic, access the live sheet or deploy code.

Sources: js/submission-engine.js (buildActivityResponses, criteriaByActivityId), data/assignments.json, each catalogued assignment config/rubric/workflow, and faculty/js/submissions-browser.js (renderActivityList).
