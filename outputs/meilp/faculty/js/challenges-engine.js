class ChallengesEngine {
  constructor() {
    this.challenges = [];
    this.filteredChallenges = [];
    this.controlService = window.MEILP?.assignmentControlService || new window.MEILP.AssignmentControlService();
    this.activeFaculty = "Dr. Rahul Bachute";
  }

  async init() {
    this.initFacultyProfile();
    this.bindEvents();
    await this.loadChallenges();
  }

  initFacultyProfile() {
    const user = window.DESAuth?.getCurrentUser?.();
    if (user && user.name && !user.isGuest) {
      this.activeFaculty = user.name;
    }
    const selector = document.getElementById("facultySelector");
    if (selector) {
      selector.value = this.activeFaculty;
    }
  }

  getActiveFaculty() {
    const selector = document.getElementById("facultySelector");
    if (selector && selector.value) {
      return selector.value;
    }
    return this.activeFaculty || "Dr. Rahul Bachute";
  }

  async loadChallenges() {
    let baseAssignments = [];
    try {
      const response = await fetch("../data/assignments.json");
      if (response.ok) {
        const data = await response.json();
        baseAssignments = (data.assignments || []).map((c) => {
          let launchPath = c.launchPath || `assignment-workbench.html?assignment=${c.slug || c.id}`;
          if (launchPath && !launchPath.startsWith("../") && !launchPath.startsWith("/") && !launchPath.startsWith("http")) {
            launchPath = "../" + launchPath;
          }
          return { ...c, launchPath };
        });
      } else {
        baseAssignments = this.getDefaultAssignments();
      }
    } catch (e) {
      console.warn("Loading default assignments catalog:", e);
      baseAssignments = this.getDefaultAssignments();
    }

    // Merge custom (faculty-created) assignments stored in localStorage
    const custom = this.getCustomAssignments();
    const existingIds = new Set(baseAssignments.map(a => a.id));
    const newCustom = custom.filter(a => !existingIds.has(a.id));
    this.challenges = [...baseAssignments, ...newCustom];

    this.filteredChallenges = [...this.challenges];
    this.renderKpis();
    this.renderGrid();
  }

  // ─── Custom assignment storage ────────────────────────────────────────────
  getCustomAssignments() {
    try {
      const raw = window.localStorage.getItem("meilp-custom-assignments");
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  saveCustomAssignment(assignment) {
    const list = this.getCustomAssignments();
    const idx = list.findIndex(a => a.id === assignment.id);
    if (idx >= 0) { list[idx] = assignment; } else { list.push(assignment); }
    window.localStorage.setItem("meilp-custom-assignments", JSON.stringify(list));
    // Notify student portal via storage event
    window.dispatchEvent(new StorageEvent("storage", { key: "meilp-custom-assignments" }));
  }

  deleteCustomAssignment(id) {
    const list = this.getCustomAssignments().filter(a => a.id !== id);
    window.localStorage.setItem("meilp-custom-assignments", JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key: "meilp-custom-assignments" }));
  }

  getDefaultAssignments() {
    return [
      { id: "EC-01", title: "Safety Verification of Elevator Suspension Cables", discipline: "Design of Machine Elements", summary: "Configuration-driven engineering challenge for independent elevator suspension cable review.", status: "Ready", tasks: 9, icon: "bi-building-gear", configPath: "assignments/elevator/config.json", launchPath: "../assignment-workbench.html?assignment=elevator", slug: "elevator", co: "CO1", weightage: "12 Marks" },
      { id: "EC-02", title: "Determine factor of safety of motorcycle stand and verify whether design is safe", discipline: "Design of Machine Elements", summary: "Template-authored engineering challenge for side stand stability and load reasoning.", status: "Ready", tasks: 9, icon: "bi-bicycle", configPath: "assignments/motorcycle/config.json", launchPath: "../assignment-workbench.html?assignment=motorcycle", slug: "motorcycle", co: "CO1, CO2", weightage: "12 Marks" },
      { id: "EC-03", title: "Engineering Materials Selection in Two-Wheeler Components", discipline: "Design of Machine Elements", summary: "Engineering challenge scaffold for material selection decisions across two-wheeler components.", status: "Ready", tasks: 11, icon: "bi-tools", configPath: "assignments/materials-selection/config.json", launchPath: "../assignment-workbench.html?assignment=materials-selection", slug: "materials-selection", co: "CO3", weightage: "12 Marks" },
      { id: "EC-04", title: "Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever", discipline: "Design of Machine Elements", summary: "Configuration-driven engineering challenge for borewell pump hand lever safety and ergonomics.", status: "Ready", tasks: 14, icon: "bi-tools", configPath: "assignments/borewell-pump/config.json", launchPath: "../assignment-workbench.html?assignment=borewell-pump", slug: "borewell-pump", co: "CO1, CO3", weightage: "12 Marks" },
      { id: "EC-05", title: "Failure Analysis and Material Selection of a Failed Mechanical Component", discipline: "Design of Machine Elements", summary: "Engineering challenge to investigate the failure mechanism, material, and factor of safety of a bolted joint.", status: "Ready", tasks: 14, icon: "bi-wrench", configPath: "assignments/failure-analysis/config.json", launchPath: "../assignment-workbench.html?assignment=failure-analysis", slug: "failure-analysis", co: "CO5", weightage: "12 Marks" },
      { id: "EC-06", title: "Stress Concentration Analysis of a Plate with a Central Hole", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze stress concentration, nominal vs peak stress, material selection, and safety factor of a plate with a hole.", status: "Ready", tasks: 13, icon: "bi-symmetry-horizontal", configPath: "assignments/stress-concentration/config.json", launchPath: "../assignment-workbench.html?assignment=stress-concentration", slug: "stress-concentration", co: "CO4", weightage: "12 Marks" },
      { id: "EC-07", title: "Design of Shaft for a Real-World Engineering Application", discipline: "Design of Machine Elements", summary: "Engineering challenge to determine loading, bearing reactions, bending moment, torque, combined loading, required shaft diameter, and factor of safety for a power transmission shaft.", status: "Ready", tasks: 11, icon: "bi-gear-wide-connected", configPath: "assignments/shafts/config.json", launchPath: "../assignment-workbench.html?assignment=shafts", slug: "shafts", co: "CO2", weightage: "12 Marks" },
      { id: "EC-08", title: "Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze shaft-hub-key connections, transmitted torque, tangential force, key width and height, shear and crushing failure modes, factor of safety, and final key selection.", status: "Ready", tasks: 11, icon: "bi-key-fill", configPath: "assignments/Keys/config.json", launchPath: "../assignment-workbench.html?assignment=Keys", slug: "Keys", co: "CO2", weightage: "12 Marks" },
      { id: "EC-09", title: "Identification and Selection of Couplings Used in Mechanical Power Transmission", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze shaft connections, torque transmission, misalignment accommodation, working principles, coupling classification, application selection, and engineering justification for a motor-pump system.", status: "Ready", tasks: 13, icon: "bi-link-45deg", configPath: "assignments/coupling/config.json", launchPath: "../assignment-workbench.html?assignment=coupling", slug: "coupling", co: "CO2", weightage: "12 Marks" }
    ];
  }

  bindEvents() {
    const search = document.getElementById("challengeSearch");
    if (search) {
      search.addEventListener("input", (e) => this.filterGrid(e.target.value));
    }

    const selector = document.getElementById("facultySelector");
    if (selector) {
      selector.addEventListener("change", (e) => {
        this.activeFaculty = e.target.value;
        this.renderKpis();
        this.renderGrid();
      });
    }

    const btnEnableAll = document.getElementById("btnBulkEnable");
    if (btnEnableAll) {
      btnEnableAll.addEventListener("click", () => this.bulkToggle(true));
    }

    const btnDisableAll = document.getElementById("btnBulkDisable");
    if (btnDisableAll) {
      btnDisableAll.addEventListener("click", () => this.bulkToggle(false));
    }

    const settingsForm = document.getElementById("assignmentSettingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSettingsModal();
      });
    }

    // Preset buttons
    const presetContainer = document.querySelector("#assignmentSettingsForm .d-flex.flex-wrap");
    if (presetContainer) {
      presetContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-preset]");
        if (btn) {
          this.applyDeadlinePreset(btn.dataset.preset);
        }
      });
    }

    // Add Assignment form
    const addForm = document.getElementById("addAssignmentForm");
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = (document.getElementById("newAssignId")?.value || "").trim().toUpperCase();
        const title = (document.getElementById("newAssignTitle")?.value || "").trim();
        if (!id || !title) { alert("Assignment ID and Title are required."); return; }

        // Check for duplicate ID
        const exists = this.challenges.find(a => a.id === id);
        if (exists) { alert(`Assignment ID "${id}" already exists. Please use a different ID.`); return; }

        const rawLaunch = (document.getElementById("newAssignLaunchPath")?.value || "").trim();
        let launchPath = rawLaunch || null;
        if (launchPath && !launchPath.startsWith("../") && !launchPath.startsWith("/") && !launchPath.startsWith("http")) {
          launchPath = "../" + launchPath;
        }
        const dueDate = document.getElementById("newAssignDueDate")?.value || null;

        const newAssignment = {
          id,
          title,
          summary: (document.getElementById("newAssignSummary")?.value || "").trim(),
          discipline: (document.getElementById("newAssignDiscipline")?.value || "Design of Machine Elements").trim(),
          tasks: parseInt(document.getElementById("newAssignTasks")?.value || "10", 10),
          icon: (document.getElementById("newAssignIcon")?.value || "bi-journal-text").trim(),
          launchPath: launchPath || `../assignment-workbench.html?assignment=${id.toLowerCase()}`,
          status: "Ready",
          isCustom: true,
          createdAt: new Date().toISOString()
        };

        // Save the assignment metadata
        this.saveCustomAssignment(newAssignment);

        // If a due date was set, also save it as a control for the active faculty
        if (dueDate) {
          this.controlService.setControls(id, this.getActiveFaculty(), { enabled: true, dueDate, note: "" });
        }

        // Add to in-memory list and re-render
        this.challenges.push(newAssignment);
        this.filteredChallenges = [...this.challenges];
        this.renderKpis();
        this.renderGrid();

        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById("addAssignmentModal"))?.hide();
        addForm.reset();

        // Show success toast
        this.showToast(`Assignment "${id}: ${title}" added successfully! Students will see it immediately.`, "success");
      });
    }
  }

  showToast(message, type = "info") {
    const existing = document.getElementById("meilpToast");
    if (existing) existing.remove();
    const colors = { success: "bg-success", danger: "bg-danger", info: "bg-primary", warning: "bg-warning" };
    const toast = document.createElement("div");
    toast.id = "meilpToast";
    toast.className = "position-fixed bottom-0 end-0 m-4";
    toast.style.zIndex = "9999";
    toast.innerHTML = `<div class="toast show align-items-center text-white ${colors[type] || "bg-primary"} border-0 rounded-3 shadow-lg"><div class="d-flex"><div class="toast-body fw-semibold">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('#meilpToast').remove()"></button></div></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  filterGrid(searchTerm = "") {
    const term = searchTerm.toLowerCase().trim();
    this.filteredChallenges = this.challenges.filter((c) =>
      c.title.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.summary.toLowerCase().includes(term)
    );
    this.renderGrid();
  }

  bulkToggle(enabled) {
    const faculty = this.getActiveFaculty();
    this.challenges.forEach((c) => {
      const current = this.controlService.getControls(c.id, faculty);
      this.controlService.setControls(c.id, faculty, { ...current, enabled });
    });
    this.renderKpis();
    this.renderGrid();
  }

  renderKpis() {
    const kpiEl = document.getElementById("challengeKpiSummary");
    if (!kpiEl) return;
    const faculty = this.getActiveFaculty();

    let enabledCount = 0;
    let deadlineCount = 0;

    this.challenges.forEach((c) => {
      const access = this.controlService.evaluateAccess(c.id, faculty);
      if (access.enabled) enabledCount++;
      if (access.dueDate) deadlineCount++;
    });

    kpiEl.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Active Class</div>
            <div class="fs-6 fw-bold text-primary text-truncate"><i class="bi bi-person-badge me-1"></i>${this.escapeHtml(faculty)}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Classroom Status</div>
            <div class="fs-5 fw-bold text-success">${enabledCount} Enabled / ${this.challenges.length - enabledCount} Disabled</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Active Submission Deadlines</div>
            <div class="fs-5 fw-bold text-dark">${deadlineCount} Scheduled</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Accreditation Mapping</div>
            <div class="fs-5 fw-bold text-info">100% CO/PO/PSO/WK</div>
          </div>
        </div>
      </div>
    `;
  }

  renderGrid() {
    const gridEl = document.getElementById("challengeGrid");
    if (!gridEl) return;

    const faculty = this.getActiveFaculty();

    if (this.filteredChallenges.length === 0) {
      gridEl.innerHTML = '<div class="col-12 text-muted p-4 text-center">No matching challenges found in the studio library.</div>';
      return;
    }

    gridEl.innerHTML = this.filteredChallenges.map((c) => {
      const access = this.controlService.evaluateAccess(c.id, faculty);
      const isEnabled = access.enabled;

      let deadlineBadge = `<span class="badge bg-light text-muted border"><i class="bi bi-clock me-1"></i>No Deadline</span>`;
      if (access.dueDate) {
        if (access.isPastDue) {
          deadlineBadge = `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"><i class="bi bi-exclamation-triangle me-1"></i>Past Due: ${access.formattedDueDate}</span>`;
        } else {
          deadlineBadge = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-calendar-event me-1"></i>Due: ${access.formattedDueDate}</span>`;
        }
      }

      const statusBadge = isEnabled
        ? `<span class="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-1"><i class="bi bi-check-circle me-1"></i>Enabled for Class</span>`
        : `<span class="badge bg-danger-subtle text-danger-emphasis rounded-pill px-3 py-1"><i class="bi bi-slash-circle me-1"></i>Disabled for Class</span>`;

      return `
        <div class="col-lg-6 col-xl-6">
          <div class="card border-0 shadow-sm rounded-4 h-100 position-relative overflow-hidden hover-shadow transition ${!isEnabled ? "opacity-75 bg-light" : ""}">
            <div class="card-header bg-white border-bottom-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-start">
              <div class="d-flex align-items-center gap-3">
                <div class="bg-primary-subtle text-primary p-3 rounded-4 fs-4">
                  <i class="bi ${c.icon || "bi-gear"}"></i>
                </div>
                <div>
                  <span class="badge bg-dark text-white rounded-pill px-3 py-1 mb-1">${this.escapeHtml(c.id)}</span>
                  <h5 class="h6 fw-bold mb-0 text-dark">${this.escapeHtml(c.title)}</h5>
                </div>
              </div>
              ${statusBadge}
            </div>
            <div class="card-body px-4 py-3">
              <p class="small text-secondary mb-3">${this.escapeHtml(c.summary)}</p>
              
              <div class="p-2 rounded-3 bg-light border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                  <label class="form-check-label small fw-bold mb-0" for="toggle-${c.id}">Class Access:</label>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input cursor-pointer" type="checkbox" role="switch" id="toggle-${c.id}" ${isEnabled ? "checked" : ""} onchange="window.challengesEngine.toggleAssignmentAccess('${c.id}', this.checked)" />
                  </div>
                </div>
                <div>
                  ${deadlineBadge}
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="badge bg-light text-dark border"><i class="bi bi-list-check me-1"></i>${c.tasks || 10} Tasks</span>
                <span class="badge bg-light text-dark border"><i class="bi bi-award me-1"></i>${c.weightage || "12 Marks"}</span>
                <span class="badge bg-info-subtle text-info-emphasis"><i class="bi bi-bullseye me-1"></i>${c.co || "CO1-CO5"}</span>
                <span class="badge bg-secondary-subtle text-secondary-emphasis"><i class="bi bi-book me-1"></i>${this.escapeHtml(c.discipline)}</span>
              </div>
            </div>
            <div class="card-footer bg-light border-top-0 px-4 py-3 d-flex justify-content-between align-items-center gap-2">
              <button type="button" class="btn btn-primary btn-sm rounded-pill px-3" onclick="window.challengesEngine.openSettingsModal('${c.id}')">
                <i class="bi bi-calendar-range me-1"></i>Set Deadline & Rules
              </button>
              <div class="d-flex gap-1">
                <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="window.challengesEngine.openDetailsModal('${c.id}')">
                  <i class="bi bi-info-circle me-1"></i>Details
                </button>
                <a href="submissions.html?challenge=${encodeURIComponent(c.title)}" class="btn btn-outline-dark btn-sm rounded-pill px-3">
                  <i class="bi bi-file-earmark-text me-1"></i>Submissions
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  toggleAssignmentAccess(id, enabled) {
    const faculty = this.getActiveFaculty();
    const current = this.controlService.getControls(id, faculty);
    this.controlService.setControls(id, faculty, { ...current, enabled });
    this.renderKpis();
    this.renderGrid();
  }

  openSettingsModal(id) {
    const c = this.challenges.find((item) => item.id === id);
    if (!c) return;

    const faculty = this.getActiveFaculty();
    const ctrl = this.controlService.getControls(id, faculty);

    const inputId = document.getElementById("settingAssignmentId");
    const inputEnable = document.getElementById("settingEnableSwitch");
    const inputDue = document.getElementById("settingDueDate");
    const inputNote = document.getElementById("settingNote");
    const facultyLabel = document.getElementById("modalFacultyLabel");

    if (inputId) inputId.value = id;
    if (inputEnable) inputEnable.checked = ctrl.enabled;
    if (inputDue) inputDue.value = ctrl.dueDate || "";
    if (inputNote) inputNote.value = ctrl.note || "";
    if (facultyLabel) facultyLabel.textContent = faculty;

    const modalTitle = document.getElementById("settingsModalTitle");
    if (modalTitle) modalTitle.innerHTML = `<i class="bi bi-sliders me-2"></i>Class Settings: ${this.escapeHtml(c.id)}`;

    const modalEl = document.getElementById("assignmentSettingsModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  applyDeadlinePreset(type) {
    const inputDue = document.getElementById("settingDueDate");
    if (!inputDue) return;

    if (type === "clear") {
      inputDue.value = "";
      return;
    }

    const now = new Date();
    if (type === "7") {
      now.setDate(now.getDate() + 7);
      now.setHours(23, 59, 0, 0);
    } else if (type === "14") {
      now.setDate(now.getDate() + 14);
      now.setHours(23, 59, 0, 0);
    } else if (type === "end-month") {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0);
      now.setTime(nextMonth.getTime());
    }

    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    inputDue.value = localISOTime;
  }

  saveSettingsModal() {
    const inputId = document.getElementById("settingAssignmentId");
    const inputEnable = document.getElementById("settingEnableSwitch");
    const inputDue = document.getElementById("settingDueDate");
    const inputNote = document.getElementById("settingNote");

    if (!inputId || !inputId.value) return;

    const id = inputId.value;
    const faculty = this.getActiveFaculty();

    this.controlService.setControls(id, faculty, {
      enabled: inputEnable ? inputEnable.checked : true,
      dueDate: inputDue ? inputDue.value : null,
      note: inputNote ? inputNote.value : ""
    });

    const modalEl = document.getElementById("assignmentSettingsModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    this.renderKpis();
    this.renderGrid();
  }

  openDetailsModal(id) {
    const c = this.challenges.find((item) => item.id === id);
    if (!c) return;

    const faculty = this.getActiveFaculty();
    const access = this.controlService.evaluateAccess(c.id, faculty);

    const modalTitle = document.getElementById("challengeModalTitle");
    const modalBody = document.getElementById("challengeModalBody");

    if (modalTitle) modalTitle.textContent = `${c.id} - ${c.title}`;
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="row g-3 mb-3">
          <div class="col-md-6"><strong>Discipline:</strong> ${this.escapeHtml(c.discipline)}</div>
          <div class="col-md-6"><strong>Class Access (${this.escapeHtml(faculty)}):</strong> ${access.enabled ? '<span class="badge bg-success">Enabled</span>' : '<span class="badge bg-danger">Disabled</span>'}</div>
          <div class="col-md-6"><strong>Submission Deadline:</strong> ${access.formattedDueDate || 'No Deadline set'}</div>
          <div class="col-md-6"><strong>Total Tasks:</strong> ${c.tasks} Guided Activities</div>
          <div class="col-md-6"><strong>Max Weightage:</strong> ${c.weightage || '12 Marks'}</div>
          <div class="col-md-6"><strong>CO Mapping:</strong> ${c.co || 'CO1-CO5'}</div>
        </div>
        ${access.note ? `<div class="alert alert-secondary small my-2"><strong>Faculty Note:</strong> ${this.escapeHtml(access.note)}</div>` : ''}
        <hr />
        <h6 class="fw-bold">Engineering Summary</h6>
        <p class="small text-muted">${this.escapeHtml(c.summary)}</p>
        <h6 class="fw-bold mt-3">Rubric & Assessment Criteria</h6>
        <ul class="small text-secondary mb-3">
          <li><strong>Given Data & Identification:</strong> 2 Marks</li>
          <li><strong>Engineering Calculation & FOS:</strong> 6 Marks</li>
          <li><strong>Decision Justification & Safety Assessment:</strong> 4 Marks</li>
        </ul>
        <div class="d-flex gap-2 justify-content-end mt-4">
          <a href="${c.launchPath}" target="_blank" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Open Student View</a>
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
        </div>
      `;
    }

    const modalEl = document.getElementById("challengeDetailsModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  escapeHtml(val) {
    return String(val || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.challengesEngine = new ChallengesEngine();
  window.challengesEngine.init();
});
