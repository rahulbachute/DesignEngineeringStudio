# New Assignment Development Contract (DES / MEILP)

> **Architectural Standard & Developer Governance Document**  
> **Platform Version:** DES v1.0 (MEILP Architecture)  
> **Status:** MANDATORY & ACTIVE

---

## 1. Executive Summary & Purpose

The Design Engineering Studio (DES) platform is a configuration-driven, modular engineering challenge workbench. The core engine (`ChallengeRunner`, `PlatformEngine`, `SubmissionEngine`, `StorageService`, `StateManager`, `ComponentRegistry`, and Faculty Analytics engines) is shared across all assignments (Assignments 01–09+).

**The Golden Rule of DES Architecture:**
> **NEW ASSIGNMENTS MUST NOT BREAK EXISTING ASSIGNMENTS.**  
> Existing working functionality of released assignments (Assignments 01–09) is production functionality. All new assignments must be implemented strictly via isolated configuration, content JSONs, and asset files without altering shared core engine logic unless backward compatibility is 100% proven and regression-tested.

---

## 2. Mandatory Rules for Future AI Coding Agents & Human Developers

> [!IMPORTANT]
> **Rule 1:** Future AI coding agents and human developers MUST inspect the existing DES architecture before implementing a new assignment.  
> **Rule 2:** Future AI coding agents and human developers MUST prefer configuration and content changes over shared-core modifications.  
> **Rule 3:** If a shared-core modification is necessary, the developer / AI agent MUST perform a formal change-impact analysis and execute full regression testing on Assignments 01–09 before declaring the assignment complete.

---

## 3. Assignment Folder Structure & Path Conventions

Every assignment must reside in isolated directories under both `assignments/<slug>/` and `outputs/meilp/assignments/<slug>/`:

```text
assignments/<slug>/
├── config.json               # Challenge metadata & subject configuration
├── workflow.json             # Step sequence & activity component bindings
├── content.json              # Student prompt text, cards, questions, & options
├── rubric.json               # CCE scoring criteria & OBE mappings (CO/PO/PSO)
├── evaluation-template.json  # Faculty evaluation schema & max marks breakdown
├── asset-manifest.json       # (Optional) Asset catalog mapping keys to image paths
├── student-guide.md          # Student instructions & problem statement
├── faculty-guide.md          # Faculty solution key & grading guidelines
└── images/                   # Isolated assignment images
    ├── EA-XX_Student_v1.0.png
    └── EA-XX_Faculty_v1.0.png
```

Both `assignments/<slug>/` (source repository root) and `outputs/meilp/assignments/<slug>/` (standalone execution bundle) MUST remain synchronized.

---

## 4. Naming & Identifier Conventions

1. **Assignment Slug:** Lowercase, hyphen-separated string matching the folder name (e.g., `elevator`, `motorcycle`, `materials-selection`, `borewell-pump`, `failure-analysis`, `stress-concentration`, `shafts`, `Keys`, `coupling`).
2. **Challenge ID:** Official institutional project code formatted as `EC-XX` (e.g., `EC-01` through `EC-09`).
3. **Step IDs:** Lowercase hyphenated identifiers (e.g., `project-charter`, `identify-components`, `working-principle`, `free-body-diagram`, `calculation-inputs`, `engineering-decision`, `submit`).
4. **Asset Identifiers:** Asset keys must use camelCase or explicit EA codes (e.g., `engineeringAssetStudent`, `engineeringAssetFaculty`, `EA-09A`).

---

## 5. Required JSON Schemas & Specifications

Each assignment requires 5 core JSON files:

### A. `config.json`
Contains challenge identity, subject code, unit, difficulty, CCE marks, CO/PO/PSO mappings, and launch parameters.

### B. `workflow.json`
Defines total marks and the ordered array of `steps`:
```json
{
  "totalCceMarks": 12,
  "steps": [
    { "id": "project-charter", "component": "information-card" },
    { "id": "identify-components", "component": "image-label" },
    ...
    { "id": "submit", "component": "submission-summary" }
  ]
}
```

### C. `content.json`
Defines `dashboard`, `attemptMode` registration fields, `widgets`, and `activities` content for every step in `workflow.json`.

### D. `rubric.json`
Defines grading criteria, weightage, evaluation types (`auto-grading`, `scoring`, `completion`), and outcome mappings.

### E. `evaluation-template.json`
Defines faculty grading fields, maximum marks breakdown, and rubric references.

---

## 6. Storage & Namespace Isolation

- All student progress, draft responses, and session settings MUST be scoped under the assignment's unique namespace.
- Storage keys MUST follow:
  ```text
  meilp-${assignmentSlug}
  ```
- Storage keys MUST NEVER use un-scoped generic global keys like `responses` or `progress` in `localStorage`.

---

## 7. Submission & Payload Isolation

- Submissions to Google Sheets / backend APIs MUST contain:
  - `assignmentSlug`
  - `challengeId`
  - `submissionId` (generated via `createSubmissionId(config, student, timestamp)`)
  - `studentInformation`
  - `challengeMetadata`
  - `activityResponses`
- Submissions from one assignment MUST NEVER overwrite or mutate another assignment's submission records or draft storage.

---

## 8. Analytics & Report Isolation

- Faculty analytics (`outcome-engine.js`, `analytics-engine.js`, `report-engine.js`) MUST filter student records by `assignmentSlug` / `challengeId`.
- Calculations for CO/PO/PSO attainment, class averages, and grade distributions must be filtered strictly by the selected assignment context.

---

## 9. CSS & JavaScript Isolation

- **Shared Core JavaScript:** Located in `js/` and `outputs/meilp/js/`. Core files (`challenge-runner.js`, `submission-engine.js`, `state-manager.js`, `storage.js`, `event-bus.js`) MUST remain assignment-agnostic.
- **No Hardcoded Special Cases:** Core JS MUST NOT contain `if (assignmentId === 'EC-01')` or `switch (slug)` conditionals. All behavior must be configuration-driven.
- **CSS Selectors:** Shared CSS (`css/workbench.css`) must use generic component utility classes. Assignment-specific styling, if needed, must be scoped under `.assignment-<slug>` wrappers.

---

## 10. Versioning & Backward Compatibility

- Every released assignment is assigned version `v1.0`.
- Any subsequent modifications to released assignments must update the version tag (e.g. `v1.1`) and maintain backward-compatible field fallbacks for existing student progress records.

---

## 11. Git Branching & Baseline Governance

- New assignments MUST be developed on dedicated topic branches (e.g., `feat/assignment-10`).
- Direct commits to `main` without regression testing are strictly prohibited.
- Working trees containing uncommitted work must be reported and validated prior to branching.

---

## 12. Definition of Done (DoD)

An assignment is considered **DONE** only when:
1. All 5 JSON files and assets are created in both `assignments/<slug>/` and `outputs/meilp/assignments/<slug>/`.
2. The assignment is registered in `data/assignments.json` and `outputs/meilp/data/assignments.json`.
3. The student workflow launches, saves, autosaves, resumes, validates, and submits without errors.
4. The faculty workflow displays student submissions, enables evaluation, and updates analytics correctly.
5. Regression testing confirms Assignments 01–09 remain 100% functional.
6. A completed Change Impact Report and Regression Checklist are produced.
