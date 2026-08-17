# DES Platform Regression Checklist

> **Standard Quality Assurance Checklist for DES / MEILP Assignments (EC-01 to EC-09+)**  
> **Execution Frequency:** Must be executed before merging any new assignment or core engine change.

---

## 1. Assignment Registration & Index Verification

- [ ] **Catalog Sync:** The assignment is listed in `data/assignments.json` and `outputs/meilp/data/assignments.json` with matching ID, title, status (`Ready`), and launch URL.
- [ ] **Dual Folder Parity:** Files in `assignments/<slug>/` match `outputs/meilp/assignments/<slug>/`.
- [ ] **URL Launching:** Accessing `assignment-workbench.html?assignment=<slug>` loads without 404 or CORS errors.

---

## 2. Student Workflow Smoke Test (Assignments 01–09)

For each assignment slug (`elevator`, `motorcycle`, `materials-selection`, `borewell-pump`, `failure-analysis`, `stress-concentration`, `shafts`, `Keys`, `coupling`):

- [ ] **1. Header & Title:** Correct project code (`EC-XX`), title, and progress percentage render in header.
- [ ] **2. Task Navigator:** Task Navigator sidebar displays all step titles cleanly (no blank titles or broken icons).
- [ ] **3. Registration / Student Setup:** Input fields (`collegeName`, `fullName`/`name`, `rollNo`/`rollNumber`, `email`, `division`, `academicYear`) render and save without error.
- [ ] **4. Activity Rendering:** All step components (`information-card`, `image-label`, `text-mcq`, `selection-cards`, `ranking`, `calculation-inputs`, `guided-workflow`, `engineering-decision-canvas`, `recommendation`, `reflection`) render content properly.
- [ ] **5. Images & Diagrams:** All reference diagrams and callout images load without broken image icons.
- [ ] **6. Interactive Controls:** Input fields, radio options, checkboxes, sliders, and calculator links function as expected.
- [ ] **7. Save & Autosave:** Clicking "Save and Continue" or entering inputs updates `localStorage` (`meilp-<slug>`) and advances progress.
- [ ] **8. Resume Capability:** Refreshing the browser page restores saved student details, current step index, and response values.
- [ ] **9. Reset Assignment:** Clicking the Reset Assignment button prompts confirmation, clears `meilp-<slug>` storage, and reloads to initial state.
- [ ] **10. Final Submission:** Activity 12 / Submission Summary builds payload, validates student details (`fullName` / `rollNo`), displays raw JSON payload, and posts to Google Sheets or queue.

---

## 3. Faculty Portal Smoke Test

- [ ] **1. Authentication:** Guest and credentials login function correctly (`faculty/index.html`).
- [ ] **2. Challenges Catalog:** `faculty/challenges.html` renders all active assignments with accurate CCE marks and CO mappings.
- [ ] **3. Submissions Browser:** `faculty/submissions.html` filters submissions cleanly by assignment code (`EC-01` through `EC-09`).
- [ ] **4. Evaluation Engine:** `faculty/evaluation.html?submissionId=...` loads student answers, renders evaluation template fields, and saves grades.
- [ ] **5. Analytics & Outcomes:** `faculty/analytics.html` and `faculty/outcomes.html` calculate attainment stats (CO/PO/PSO/WK) without cross-assignment contamination.
- [ ] **6. Report Generation:** PDF / Print and CSV export generate accurate data matching the selected filters.

---

## 4. Platform Engine & Infrastructure Smoke Test

- [ ] **1. Storage Isolation:** Verification that keys in `localStorage` are namespaced as `meilp-<slug>`.
- [ ] **2. Submission Isolation:** Submissions contain unique `submissionId` and do not overwrite other assignments in storage or Google Sheets.
- [ ] **3. Mobile Responsiveness:** Task navigator offcanvas drawer and responsive layout adapt on mobile viewports.
- [ ] **4. Dark / Light Theme:** Theme toggle preserves active preference across session navigation.
