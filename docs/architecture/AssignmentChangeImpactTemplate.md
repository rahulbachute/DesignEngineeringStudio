# Assignment Change Impact Analysis & Declaration Template

> **Mandatory Template for Developers & AI Agents**  
> Every pull request or code modification affecting shared engine files or adding a new assignment MUST include a completed copy of this document in the pull request description or release notes.

---

## 1. Overview & Scope

- **Task / Feature Name:** [e.g. Add Assignment 10 / Stabilize Engine]
- **Target Branch:** [e.g. `feat/assignment-10`]
- **Author:** [Developer Name / AI Agent Identifier]
- **Date:** [YYYY-MM-DD]

---

## 2. File Change Inventory

### A. New Files Created
- `[NEW] path/to/file1`
- `[NEW] path/to/file2`

### B. Assignment-Specific Files Modified
- `[MODIFY] path/to/file1`

### C. Shared Core / Global Files Modified
> [!WARNING]
> Any modification to shared files (`js/challenge-runner.js`, `js/submission-engine.js`, `js/state-manager.js`, `js/storage.js`, `faculty/js/*`) MUST be declared here with backward-compatibility justification.

| File Path | Rationale for Modification | Current Consumers | Potential Impact | Backward-Compatible Solution |
|---|---|---|---|---|
| `js/challenge-runner.js` | [Reason] | All Assignments 01-09 | Navigation/Rendering | [Fallback implementation] |

### D. Files Deleted
- `[DELETE] path/to/file` (State N/A if none)

---

## 3. Storage & Namespace Isolation Verification

- [ ] Storage namespace verified as `meilp-<assignmentSlug>`.
- [ ] No generic global `localStorage` keys modified.
- [ ] Backward compatibility maintained for existing student progress keys.

---

## 4. Submission & Analytics Isolation Verification

- [ ] Submissions include assignment slug, challenge ID, and unique timestamp hash.
- [ ] Google Sheets transport payload matches established schema.
- [ ] Faculty analytics filtering verified (no data bleed between assignment IDs).

---

## 5. Regression Test Results (Assignments 01–09)

| Assignment | Student Workflow | Faculty Review | Submission & Analytics | Result | Notes |
|---|---|---|---|---|---|
| **EC-01 (Elevator)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-02 (Motorcycle)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-03 (Materials)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-04 (Borewell)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-05 (Failure)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-06 (Stress)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-07 (Shafts)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-08 (Keys)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |
| **EC-09 (Coupling)** | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | PASS / FAIL / NOT EXECUTED | [Status] | [Notes] |

---

## 6. Sign-off & Approval

- [ ] All shared core modifications verified as non-breaking.
- [ ] Regression checklist completed.
- [ ] Code meets DES Definition of Done.
