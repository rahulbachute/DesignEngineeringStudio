# Assignment scoring audit

26 active catalogue entries: data/assignments.json. Local source audit, not a live student-sheet audit.

## Counts (overlapping categories)

- 26 active assignments use the shared submission builder.
- 20 assignments have criteria missed by its activityId-only lookup.
- 3 assignments currently emit maxima that differ from the rubric, combining grouped criteria.
- 3 assignments require many-criteria-to-one-activity schema support.
- 4 assignments have workflow/rubric IDs, weights or total conflicts requiring review.
- All 26 produce no systemSuggestedMarks/suggestedMarks field through the shared submission builder.

Missing output is a shared pipeline limitation. It does not mean all activities should receive automated marks. Explicit policy opt-outs and independent academic judgement must remain respected.

## Assignment-by-assignment result

| ID | Assignment | Lookup defect | Incorrect emitted maxima | Grouped criteria | Definition conflict |
| --- | --- | --- | --- | --- | --- |
| EC-01 | Safety Verification of Elevator Suspension Cables | Yes | Yes | No | No |
| EC-02 | Determine factor of safety of motorcycle stand and verify whether design is safe | No | No | No | No |
| EC-03 | Engineering Materials Selection in Two-Wheeler Components | No | No | No | No |
| EC-04 | Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever | No | No | No | Yes |
| EC-05 | Failure Analysis and Material Selection of a Failed Mechanical Component | No | No | No | Yes |
| EC-06 | Stress Concentration Analysis of a Plate with a Central Hole | No | No | No | No |
| EC-07 | Design of Shaft for a Real-World Engineering Application | No | No | No | No |
| EC-08 | Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission | Yes | No | No | No |
| EC-09 | Identification and Selection of Couplings Used in Mechanical Power Transmission | Yes | No | No | No |
| EC-10 | Design of a Cotter Joint for a Bicycle | Yes | No | No | No |
| EA-11 | Design and Analysis of a Knuckle Joint for a Tractor–Trailer | Yes | No | No | No |
| EA-12 | Design of a Helical Compression Spring for Motorcycle Suspension | Yes | No | No | No |
| EA-13 | Construction and Design Verification of a Leaf Spring | Yes | No | No | No |
| EA-14 | Comparative Study and Selection of Springs for Engineering Applications | Yes | No | No | No |
| EA-15 | Analysis of an Automobile Suspension System | Yes | No | No | No |
| EA-16 | Fatigue Design of an Automotive Propeller Shaft | Yes | No | No | No |
| EA-17 | Fatigue Analysis of a Connecting Rod | Yes | No | No | No |
| EA-18 | Torque Requirement and Efficiency Estimation of a Bench Vice Screw Mechanism | Yes | No | No | No |
| EA-19 | Analysis of C-Clamp Screw and Collar Friction Effects | Yes | No | No | No |
| EA-20 | Design of a Power Screw for a Hydraulic Press | Yes | No | No | No |
| EC-21 | Design of Automotive Steering Gear (Recirculating Ball Type) | Yes | No | No | No |
| EA-22 | Design of a 2-Ton Mobile Scissor Lift Power Screw | Yes | No | No | No |
| EA-TS-01 | Design of Helical Gears for High-Speed Rotary Equipment | Yes | Yes | Yes | Yes |
| EA-TS-02 | Design Parameters of Spur Gears for Industrial Conveyor Systems | Yes | Yes | Yes | Yes |
| EA-TS-03 | Comparison of Spur and Helical Gears in Industrial Power Transmission | Yes | No | No | No |
| EA-TS-04 | Analysis of Spur Gears in a Car Transmission System | Yes | No | Yes | No |

## Important details

- Elevator: all nine rubric entries use id, while the builder indexes only activityId. Its workflow lacks fallback step marks, so the emitted cceMarks are zero for all nine scored activities.
- For 17 of the other 19 lookup-affected assignments, workflow marks mask the lookup problem. Correct-looking maxima do not mean rubric metadata or automated grading is connected.
- EA-TS-01, EA-TS-02 and EA-TS-04 have grouped rubric subcriteria. A single-criterion-per-step importer misreads this schema. EA-TS-04 maxima agree once its Lewis criteria are combined; it should not be counted as a genuine maximum-weight conflict.
- Definition conflicts needing academic/data review: EA-04 Borewell Pump, EA-05 Failure Analysis, EA-TS-01 Helical Gear Design and EA-TS-02 Spur Gear Design.
- The faculty Activity Summary badge currently displays maxMarks with a zero fallback; it is not an awarded system score.
- Historical submissions with missing/zero maxima or absent suggestions require reassessment from their stored responses after the pipeline is corrected. This audit makes no changes to student records.
- Four non-catalogue folders were excluded from the 26-assignment count: 2-ton mobile scissor lift, cotter joint, hydraulic press, recirculating ball screw.
- The submission builder under outputs/meilp is byte-identical: Yes.

## Detailed conflicts

### EC-04 — Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever

- mechanical-advantage: rubric activity is absent from workflow
- human-effort: rubric activity is absent from workflow
- reaction-forces: rubric activity is absent from workflow
- bending-moment: rubric activity is absent from workflow
- section-properties: rubric activity is absent from workflow
- stress-analysis: rubric activity is absent from workflow
- design-improvement: rubric activity is absent from workflow
- Workflow maxima total 25 differs from declared assignment total 24

### EC-05 — Failure Analysis and Material Selection of a Failed Mechanical Component

- design-requirements: rubric activity is absent from workflow
- loading-analysis: rubric activity is absent from workflow
- bolt-geometry: rubric activity is absent from workflow
- stress-analysis: rubric activity is absent from workflow
- factor-of-safety: rubric activity is absent from workflow
- Workflow maxima total 16.5 differs from declared assignment total 12

### EA-TS-01 — Design of Helical Gears for High-Speed Rotary Equipment

- gear-geometry: workflow maximum 1 differs from combined rubric maximum 1.5

### EA-TS-02 — Design Parameters of Spur Gears for Industrial Conveyor Systems

- transmission-requirements: workflow maximum 1 differs from combined rubric maximum 0.5
- lewis-beam-strength: workflow maximum 1.5 differs from combined rubric maximum 2
- parametric-redesign: workflow maximum 1 differs from combined rubric maximum 1.5

## Reproduce

Run node tools/audit-assignment-scoring.js from the project root. The script only writes these Markdown/JSON reports. It does not evaluate actual student answers, alter grading logic, access the live sheet or deploy code.

Sources: js/submission-engine.js (buildActivityResponses, criteriaByActivityId), data/assignments.json, each catalogued assignment config/rubric/workflow, and faculty/js/submissions-browser.js (renderActivityList).
