window.addEventListener("DOMContentLoaded", () => {
  const runner = new ChallengeRunner();
  runner.start();
});

class ChallengeRunner {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.assignmentSlug = params.get("assignment") || "elevator";
    this.storage = new window.MEILP.StorageService(`meilp-${this.assignmentSlug}`);
    this.engine = new window.MEILP.PlatformEngine({ storage: this.storage, config: window.MEILP.platformConfig });
    this.services = this.engine.getServices();
    window.MEILP.registerAllComponents(this.services.componentRegistry);
    this.config = null;
    this.workflow = null;
    this.content = null;
    this.rubric = null;
    this.currentIndex = 0;
    this.completed = new Set();
    this.activeComponent = null;
    this.unsubscribe = [];
    this.assignmentJsonFiles = [];
    this.missingJsonFiles = [];
    this.googleSheets = new window.MEILP.GoogleSheetsService({
      config: window.MEILP.googleSheetsConfig || {}
    });
    this.submissionEngine = new window.MEILP.SubmissionEngine({
      storage: this.storage,
      transport: this.googleSheets,
      eventBus: this.services.eventBus,
      config: window.MEILP.submissionConfig || {}
    });
    this.renderers = {
      "information-card": (host, step, activity) => this.renderInformation(host, activity),
      "image-label": (host, step, activity) => this.renderImageLabel(host, step, activity),
      "text-mcq": (host, step, activity) => this.renderTextMcq(host, step, activity),
      "selection-cards": (host, step, activity) => this.renderSelection(host, step, activity),
      "ranking": (host, step, activity) => this.renderRanking(host, step, activity),
      "calculation-inputs": (host, step, activity) => this.renderCalculation(host, step, activity),
      "guided-workflow": (host, step, activity) => this.renderGuidedWorkflow(host, step, activity),
      "engineering-decision-canvas": (host, step, activity) => this.renderEngineeringDecisionCanvas(host, step, activity),
      "drs-station": (host, step, activity) => this.renderEngineeringDecisionCanvas(host, step, activity),
      "recommendation": (host, step, activity) => this.renderRecommendation(host, step, activity),
      "reflection": (host, step, activity) => this.renderReflection(host, step, activity),
      "submission-summary": (host) => this.renderSubmission(host)
    };
  }

  /**
   * Loads the assignment, initializes platform services, and renders the first screen.
   */
  async start() {
    this.engine.start();
    const base = `assignments/${this.assignmentSlug}`;
    const files = {
      config: `${base}/config.json`,
      workflow: `${base}/workflow.json`,
      content: `${base}/content.json`,
      rubric: `${base}/rubric.json`
    };
    this.assignmentJsonFiles = Object.values(files);
    const [config, workflow, content, rubric, manifest] = await Promise.all([
      window.MEILP.fetchJson(files.config, null),
      window.MEILP.fetchJson(files.workflow, null),
      window.MEILP.fetchJson(files.content, null),
      window.MEILP.fetchJson(files.rubric, null),
      window.MEILP.fetchJson(`${base}/asset-manifest.json`, null)
    ]);
    const loadedFiles = { config, workflow, content, rubric };
    this.missingJsonFiles = Object.keys(loadedFiles)
      .filter((key) => !loadedFiles[key])
      .map((key) => files[key]);
    if (!config || !workflow || !content || !rubric) {
      this.renderLoadError();
      return;
    }
    this.config = config;
    this.workflow = workflow;
    this.content = content;
    this.rubric = rubric;
    this.assetManifest = manifest;

    if (manifest && manifest.assets) {
      this.content.assets = this.content.assets || {};
      Object.entries(manifest.assets).forEach(([key, val]) => {
        if (!this.content.assets[key]) {
          this.content.assets[key] = val;
        }
      });
    }
    this.services.progressManager.startAssignment({ id: config.id, title: config.title, tasks: workflow.steps });
    this.restoreAttempt();
    this.bindEvents();
    this.applyTheme();
    this.renderHeader();
    
    this.controlService = window.MEILP.assignmentControlService || new window.MEILP.AssignmentControlService();
    let state = this.services.stateManager.getState();
    
    // Attempt ID & Faculty Association Locking
    let attemptId = state.attemptId || (state.student && state.student.attemptId);
    let collegeId = state.student && state.student.collegeId;
    let collegeName = state.student && state.student.collegeName;
    let facultyId = state.student && state.student.facultyId;
    let facultyName = state.student && state.student.facultyName;

    if (!attemptId) {
      // New Attempt: Bind current selected college & faculty from localStorage
      attemptId = "ATT-" + (config.id || "ASG") + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      try {
        collegeId = JSON.parse(window.localStorage.getItem("meilp:selectedStudentCollegeId")) || "COL001";
        collegeName = JSON.parse(window.localStorage.getItem("meilp:selectedStudentCollege")) || "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";
        facultyId = JSON.parse(window.localStorage.getItem("meilp:selectedStudentFacultyId")) || "UNKNOWN";
        facultyName = JSON.parse(window.localStorage.getItem("meilp:selectedStudentFaculty")) || "Unknown / Unassigned Faculty";
      } catch (e) {
        collegeId = collegeId || "COL001";
        collegeName = collegeName || "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";
        facultyId = facultyId || "UNKNOWN";
        facultyName = facultyName || "Unknown / Unassigned Faculty";
      }

      state = this.services.stateManager.update((s) => ({
        attemptId,
        student: {
          ...s.student,
          attemptId,
          collegeId,
          collegeName,
          facultyId,
          facultyName
        }
      }));
    }

    const effectiveFaculty = (state.student && state.student.facultyName) ? state.student.facultyName : "Unknown / Unassigned Faculty";
    const access = this.controlService.evaluateAccess(config.id || this.assignmentSlug, effectiveFaculty);

    if (!access.enabled) {
      this.renderDisabledScreen(effectiveFaculty);
      return;
    }

    if (access.isPastDue) {
      this.renderPastDueBanner(access.formattedDueDate, effectiveFaculty);
    }

    if (state.student.saved) {
      this.syncAssignmentFacultySelection();
      const mode = state.student.attemptMode || "individual";
      this.setAttemptModeLabel(mode);
      this.renderDashboard();
    } else {
      this.renderAttemptMode();
    }
  }

  renderDisabledScreen(facultyName) {
    this.setActivity("Assignment Disabled", "Access Restricted");
    this.setBreadcrumb("Access Restricted");
    const host = this.host();
    if (host) {
      host.innerHTML = `
        <div class="card border-danger shadow-sm rounded-4 text-center p-5 bg-white my-4">
          <div class="mb-3 text-danger fs-1">
            <i class="bi bi-slash-circle-fill"></i>
          </div>
          <h3 class="h4 text-dark fw-bold mb-2">Assignment Disabled for Your Class</h3>
          <p class="text-secondary max-w-lg mx-auto mb-4">
            This assignment has been disabled by <strong>${window.MEILP.escapeHtml(facultyName)}</strong>. Students in this class cannot access or submit this coursework at this time.
          </p>
          <div>
            <a href="index.html" class="btn btn-primary rounded-pill px-4">
              <i class="bi bi-arrow-left me-1"></i> Return to Assignment Catalog
            </a>
          </div>
        </div>
      `;
    }
  }

  renderPastDueBanner(formattedDueDate, facultyName) {
    const existing = document.getElementById("pastDueHeaderBanner");
    if (existing) return;

    const banner = document.createElement("div");
    banner.id = "pastDueHeaderBanner";
    banner.className = "alert alert-warning border-0 rounded-0 m-0 py-2 px-4 d-flex justify-content-between align-items-center bg-warning-subtle text-warning-emphasis";
    banner.innerHTML = `
      <span><i class="bi bi-exclamation-triangle-fill me-2"></i><strong>Submission Deadline Expired:</strong> The last date for submission set by <strong>${window.MEILP.escapeHtml(facultyName)}</strong> was ${formattedDueDate}. Submissions are locked.</span>
      <span class="badge bg-warning text-dark">View Only</span>
    `;
    const header = document.querySelector(".workbench-header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    }
  }

  /**
   * Wires shell controls and runner navigation events.
   */
  bindEvents() {
    const themeToggle = document.querySelector("[data-workbench-theme-toggle]");
    const helpButton = document.querySelector("[data-workbench-help]");
    const resetButton = document.querySelector("[data-workbench-reset]");
    const reportButton = document.querySelector("[data-workbench-report-btn]");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
    if (helpButton) {
      helpButton.addEventListener("click", () => this.prependCard("hint", "Help", "Use the task navigator and Save Draft button to move through the challenge."));
    }
    if (resetButton) {
      resetButton.addEventListener("click", () => this.resetAssignment());
    }
    if (reportButton) {
      reportButton.addEventListener("click", () => this.openStudentReportModal());
    }
    this.unsubscribe.push(this.services.eventBus.listen("navigate-next", () => this.next()));
    this.unsubscribe.push(this.services.eventBus.listen("navigate-previous", () => this.previous()));
    this.unsubscribe.push(this.services.eventBus.listen("navigate-home", () => this.renderDashboard()));
    this.unsubscribe.push(this.services.eventBus.listen("save-request", () => this.saveCurrent()));
    this.unsubscribe.push(this.services.eventBus.listen("reset-assignment", () => this.resetAssignment()));
  }

  /**
   * Resets progress, clears stored responses & student details, and reloads the challenge.
   */
  resetAssignment() {
    const confirmed = window.confirm(
      "Are you sure you want to reset this assignment?\n\nAll saved progress, student details, and answers for this challenge will be cleared."
    );
    if (!confirmed) {
      return;
    }

    try {
      if (this.submissionEngine && typeof this.submissionEngine.clearDraft === "function") {
        this.submissionEngine.clearDraft();
      }
      if (this.storage && typeof this.storage.clearNamespace === "function") {
        this.storage.clearNamespace();
      } else {
        localStorage.removeItem(`meilp-${this.assignmentSlug}`);
      }
    } catch (e) {
      console.error("Failed to clear assignment storage:", e);
    }

    if (this.services && this.services.stateManager && typeof this.services.stateManager.reset === "function") {
      this.services.stateManager.reset();
    }

    this.completed = new Set();
    this.currentIndex = 0;
    this.returnStepIndex = null;

    window.location.reload();
  }

  /**
   * Renders the attempt mode selection screen.
   */
  renderAttemptMode() {
    this.setActivity("Attempt Mode", "Choose Attempt Mode");
    this.setBreadcrumb("Attempt Mode");
    const host = this.host();
    host.innerHTML = `
      <section class="workbench-card card-information">
        <h3>Choose Attempt Mode</h3>
        <p class="text-muted">Select the submission mode for this engineering challenge.</p>
        <div class="attempt-grid">
          <label class="attempt-option"><input class="form-check-input me-2" type="radio" name="attemptMode" value="individual" checked><strong>Individual</strong><span>Submit as one student.</span></label>
          <label class="attempt-option"><input class="form-check-input me-2" type="radio" name="attemptMode" value="group"><strong>Group</strong><span>Submit with up to four listed members.</span></label>
        </div>
        <div class="component-actions"><button class="btn btn-primary" type="button" data-continue-mode><i class="bi bi-arrow-right" aria-hidden="true"></i> Continue</button></div>
      </section>`;
    host.querySelector("[data-continue-mode]").addEventListener("click", () => {
      const selectedMode = host.querySelector("[name='attemptMode']:checked");
      const mode = selectedMode ? selectedMode.value : "individual";
      this.services.stateManager.update((state) => ({ settings: { ...state.settings, attemptMode: mode } }));
      this.setAttemptModeLabel(mode);
      this.renderStudentForm(mode);
    });
    this.renderTaskNav();
    this.renderWidgets();
    this.updateProgress();
  }

  /**
   * Renders and validates the student or group setup form.
   */
  renderStudentForm(mode) {
    this.setActivity("Student Setup", mode === "group" ? "Group Information" : "Individual Information");
    this.setBreadcrumb("Student Information");
    let fields = [];
    if (this.content && this.content.attemptMode && Array.isArray(this.content.attemptMode[mode])) {
      fields = this.content.attemptMode[mode];
    } else if (this.content && this.content.registration && Array.isArray(this.content.registration.fields)) {
      fields = this.content.registration.fields.filter((field) => {
        if (mode === "individual" && field.groupOnly) return false;
        return true;
      });
    }
    if (!fields || !fields.length) {
      fields = mode === "group" ? [
        { name: "collegeName", label: "College / Institution", type: "select", required: true },
        { name: "groupNumber", label: "Group Number", required: true, numeric: true },
        { name: "division", label: "Division", type: "select", options: ["A", "B", "C", "D"], required: true },
        { name: "student1", label: "Lead Student (Group Lead)", required: true },
        { name: "student2", label: "Student 2", required: true },
        { name: "student3", label: "Student 3", required: false },
        { name: "student4", label: "Student 4", required: false },
        { name: "academicYear", label: "Academic Year", required: true, readonly: true, auto: "academicYear" }
      ] : [
        { name: "collegeName", label: "College / Institution", type: "select", required: true },
        { name: "fullName", label: "Full Name", required: true },
        { name: "rollNo", label: "Roll Number / Student ID", required: true },
        { name: "email", label: "Email Address", type: "email", required: true },
        { name: "division", label: "Division", type: "select", options: ["A", "B", "C", "D"], required: true },
        { name: "academicYear", label: "Academic Year", required: true, readonly: true, auto: "academicYear" }
      ];
    }
    const host = this.host();
    const savedStudent = (this.services.stateManager.getState() || {}).student || {};
    host.innerHTML = `<section class="workbench-card"><h3>${mode === "group" ? "Group Details" : "Student Details"}</h3><form data-student-form novalidate><div class="student-form-grid">${fields.map((field) => this.field(field, savedStudent[field.name])).join("")}</div><div class="component-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-save" aria-hidden="true"></i> Save and Continue</button></div></form></section>`;
    host.querySelector("[data-student-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const result = this.collectFields(host, fields);
      if (!result.valid) {
        return;
      }
      this.services.stateManager.update((state) => {
        const resolvedName = result.value.name || result.value.fullName || result.value.student1 || (state.student && (state.student.name || state.student.fullName)) || "";
        const resolvedRoll = result.value.rollNumber || result.value.rollNo || result.value.groupNumber || (state.student && (state.student.rollNumber || state.student.rollNo)) || "";
        return {
          student: {
            ...state.student,
            ...result.value,
            name: resolvedName,
            fullName: resolvedName,
            rollNumber: resolvedRoll,
            rollNo: resolvedRoll,
            attemptMode: mode,
            saved: true
          }
        };
      });
      this.autosaveAttempt();
      this.syncAssignmentFacultySelection();
      if (this.returnStepIndex !== undefined && this.returnStepIndex !== null) {
        const returnIdx = this.returnStepIndex;
        this.returnStepIndex = null;
        this.renderStep(returnIdx);
      } else {
        this.renderDashboard();
      }
    });
    this.renderTaskNav();
    this.renderWidgets();
    this.updateProgress();
  }

  /**
   * Renders the project dashboard and workflow entry point.
   */
  renderDashboard() {
    this.currentIndex = 0;
    this.renderTaskNav();
    this.setActivity("Project Dashboard", this.config.title);
    this.setBreadcrumb("Project Dashboard");
    const dashboard = this.content.dashboard || {};
    const host = this.host();
    host.innerHTML = `<section class="workbench-card card-information"><h3>Project Dashboard</h3><div class="row g-3">${Object.entries(dashboard).map(([key, value]) => `<div class="col-md-6"><span class="component-kicker">${this.title(key)}</span><strong>${this.escape(value)}</strong></div>`).join("")}</div><div class="component-actions"><button class="btn btn-primary" type="button" data-open-kickoff><i class="bi bi-play-fill" aria-hidden="true"></i> Open Project Kick-off</button></div></section>`;
    host.querySelector("[data-open-kickoff]").addEventListener("click", () => this.renderStep(0));
    this.renderWidgets();
    this.updateProgress();
  }

  /**
   * Renders the requested workflow step with defensive component lookup.
   */
  renderStep(index) {
    const steps = this.workflow && Array.isArray(this.workflow.steps) ? this.workflow.steps : [];
    const host = this.host();
    if (!host) {
      return;
    }
    this.destroyActiveComponent();
    const lastIndex = Math.max(steps.length - 1, 0);
    this.currentIndex = Math.max(0, Math.min(lastIndex, index));
    const step = steps[this.currentIndex];

    host.innerHTML = "";
    if (!step) {
      this.setActivity("Workflow Error", "Missing Workflow Step");
      this.setBreadcrumb("Missing Workflow Step");
      host.innerHTML = this.card("error", "Missing Workflow Step", `No workflow step exists at index ${this.currentIndex}.`);
      this.renderWidgets();
      this.updateProgress();
      return;
    }

    const renderer = this.renderers[step.component];
    const activity = this.content.activities[step.id];
    const title = this.getStepTitle(step);
    this.setActivity(this.title(step.component), title);
    this.setBreadcrumb(title);
    this.renderTaskNav();

    if (!renderer) {
      host.innerHTML = this.card("error", "Unknown Component", `No renderer is registered for component "${step.component || "undefined"}".`);
    } else if (step.component !== "submission-summary" && !activity) {
      host.innerHTML = this.card("error", "Missing Activity", `No activity content was found for workflow step "${step.id}".`);
    } else {
      renderer(host, step, activity);
    }

    if (step.component !== "submission-summary") {
      this.renderNavigation(host);
    }
    this.renderWidgets();
    this.updateProgress();
  }

  /**
   * Renders informational cards and optional acceptance content.
   */
  renderInformation(host, activity) {
    const saved = this.response((this.workflow.steps[this.currentIndex] || {}).id);
    host.innerHTML = activity.cards.map((card) => this.card(card.type, card.title, card.body, card.items)).join("");
    if (activity.acceptanceText) {
      const accept = document.createElement("section");
      accept.className = "workbench-card card-student-response";
      accept.innerHTML = `<label class="form-check"><input class="form-check-input" type="checkbox" data-accept-project ${saved.accepted ? "checked" : ""}> ${this.escape(activity.acceptanceText)}</label>`;
      host.append(accept);
    }
    this.bindAutosave((this.workflow.steps[this.currentIndex] || {}).id);
  }

  /**
   * Renders the registered image-label activity component.
   */
  renderImageLabel(host, step, activity) {
    const component = this.services.componentRegistry.create("image-label", {
      config: { id: step.id, title: activity.title, image: activity.image, figure: activity.figure, description: activity.description, labels: activity.labels, options: activity.options },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    this.mount(component, host);
  }

  /**
   * Renders a text response paired with an MCQ.
   */
  renderTextMcq(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    const mcqData = activity.mcq || {};
    const question = mcqData.question || activity.question || activity.prompt || activity.title || "Concept Verification Question";
    const options = Array.isArray(mcqData.options) ? mcqData.options : (Array.isArray(activity.options) ? activity.options : []);

    let mcqHtml = "";
    if (options.length) {
      mcqHtml = `
        <section class="workbench-card card-information">
          <h3>${this.escape(question)}</h3>
          ${options.map((option) => {
            const optVal = typeof option === "object" ? (option.id || option.value || option.title || "") : option;
            const optLabel = typeof option === "object" ? (option.title || option.label || option.text || option.value || option.id || "") : option;
            const isChecked = saved.mcq === optVal || saved.mcq === optLabel;
            return `<label class="form-check"><input class="form-check-input" type="radio" name="mcq" value="${this.escape(optVal)}" ${isChecked ? "checked" : ""}> ${this.escape(optLabel)}</label>`;
          }).join("")}
        </section>
      `;
    }

    host.innerHTML = `
      ${this.card("theory", activity.title || step.title || "", activity.prompt || activity.description || "")}
      <section class="workbench-card card-student-response">
        <h3>Engineering Text Response</h3>
        <textarea class="form-control" rows="6" data-response="text">${this.escape(saved.text || "")}</textarea>
      </section>
      ${mcqHtml}
    `;
    this.bindAutosave(step.id);
  }

  renderSelection(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    const options = Array.isArray(activity.options) ? activity.options : [];
    
    // Determine if this step is a single selection choice (e.g., coupling-selection)
    const isSelectionChoice = step.id === "coupling-selection" || (activity.options && activity.options.some(opt => opt.suitability || opt.reason));
    
    let boxTitle = "Engineering Analysis & Justification";
    if (step.id === "coupling-classification") {
      boxTitle = "Classification Analysis & Summary";
    } else if (step.id === "application-analysis") {
      boxTitle = "Application Analysis & Justification";
    } else if (step.id === "coupling-comparison") {
      boxTitle = "Comparison Synthesis & Technical Justification";
    } else if (step.id === "coupling-selection") {
      boxTitle = "Selected Coupling & Recommendation Justification";
    }

    const cardsHtml = options.map((option) => {
      const optId = typeof option === "object" ? (option.id || option.value || option.title) : option;
      const optTitle = typeof option === "object" ? (option.title || option.label || option.name || option.id) : option;
      const optCategory = typeof option === "object" ? option.category : null;
      const optDesc = typeof option === "object" ? (option.description || option.comparison || option.requirements || option.note || "") : "";
      const optSuitability = typeof option === "object" ? option.suitability : null;
      const optReason = typeof option === "object" ? option.reason : null;
      const isChecked = saved.selection === optId || saved.selection === optTitle;

      if (isSelectionChoice) {
        return `
          <div class="col-md-6">
            <label class="attempt-option h-100">
              <input class="form-check-input me-2" type="radio" name="selection" value="${this.escape(optId)}" ${isChecked ? "checked" : ""}>
              <div class="flex-grow-1">
                <strong>${this.escape(optTitle)}</strong>
                ${optSuitability ? `<span class="badge bg-secondary ms-2">${this.escape(optSuitability)}</span>` : ""}
                ${optDesc ? `<p class="small text-muted mb-1 mt-1">${this.escape(optDesc)}</p>` : ""}
                ${optReason ? `<p class="small text-dark mb-0"><em>${this.escape(optReason)}</em></p>` : ""}
              </div>
            </label>
          </div>
        `;
      } else {
        return `
          <div class="col-md-6">
            <div class="workbench-card h-100 mb-0 shadow-sm border">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="mb-0 text-primary fs-6 fw-bold">${this.escape(optTitle)}</h5>
                ${optCategory ? `<span class="badge bg-info text-dark fw-semibold">${this.escape(optCategory)}</span>` : ""}
              </div>
              ${optDesc ? `<p class="small text-secondary mb-0">${this.escape(optDesc)}</p>` : ""}
            </div>
          </div>
        `;
      }
    }).join("");

    host.innerHTML = `
      ${this.card("theory", activity.title || step.title || "", activity.prompt || activity.description || "")}
      <section class="workbench-card">
        <div class="row g-3">
          ${cardsHtml}
        </div>
      </section>
      <section class="workbench-card card-student-response">
        <h3>${boxTitle}</h3>
        <p class="text-muted small mb-2">Provide your detailed engineering response for this activity below.</p>
        <textarea class="form-control" rows="5" data-response="justification" placeholder="Type your response here...">${this.escape(saved.justification || "")}</textarea>
      </section>
    `;
    this.bindAutosave(step.id);
  }

  renderRanking(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    const rankingItems = Array.isArray(activity.rankingItems) ? activity.rankingItems : (Array.isArray(activity.items) ? activity.items : []);
    host.innerHTML = `
      <section class="workbench-card">
        <h3>${this.escape(activity.title || step.title || "")}</h3>
        <div class="student-form-grid">
          ${rankingItems.map((item) => {
            const label = typeof item === "object" ? (item.title || item.label || item.name || item.id) : item;
            const id = typeof item === "object" ? (item.id || label) : item;
            const val = (saved.ranking || {})[id] || (saved.ranking || {})[label] || "";
            return `
              <div>
                <label class="form-label">${this.escape(label)}</label>
                <input class="form-control" type="number" min="1" max="${rankingItems.length}" data-rank="${this.escape(id)}" value="${this.escape(val)}">
              </div>
            `;
          }).join("")}
        </div>
      </section>
      <section class="workbench-card card-student-response">
        <h3>Safety Justification</h3>
        <textarea class="form-control" rows="5" data-response="justification">${this.escape(saved.justification || "")}</textarea>
      </section>
    `;
    this.bindAutosave(step.id);
  }

  renderCalculation(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    let imageHostHtml = "";
    if (activity.image) {
      imageHostHtml = `<div data-calculation-image-viewer class="mb-3"></div>`;
    }
    let toolBtnHtml = "";
    if (activity.toolUrl) {
      toolBtnHtml = `
        <div class="mb-3">
          <a href="${this.escape(activity.toolUrl)}" target="_blank" class="btn btn-warning fw-bold text-dark px-3 py-2 shadow-sm d-inline-flex align-items-center gap-2">
            <i class="bi bi-calculator-fill fs-5" aria-hidden="true"></i>
            ${this.escape(activity.toolButtonText || "Launch Calculator")}
          </a>
        </div>
      `;
    }
    const given = Array.isArray(activity.given) ? activity.given : [];
    const formulas = Array.isArray(activity.formulas) ? activity.formulas : [];
    const fields = Array.isArray(activity.fields) ? activity.fields : (Array.isArray(activity.inputs) ? activity.inputs : []);
    
    const givenCard = given.length ? this.card("calculation", "Given Data", "", given) : "";
    
    let formulaHtml = "";
    if (formulas.length) {
      formulaHtml = `
        <section class="workbench-card card-information mb-3">
          <h4 class="h6 fw-bold text-dark mb-2"><i class="bi bi-journal-code text-primary me-2"></i>Formulas & Governing Equations</h4>
          <div class="row g-2">
            ${formulas.map(f => `
              <div class="col-md-6">
                <div class="p-2 bg-light rounded border">
                  <span class="small text-muted d-block fw-semibold">${this.escape(f.name || "")}</span>
                  <code class="text-dark fs-6">${this.escape(f.formula || "")}</code>
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      `;
    }

    host.innerHTML = `
      ${imageHostHtml}
      ${givenCard}
      ${formulaHtml}
      ${toolBtnHtml}
      <section class="workbench-card card-student-response">
        <h3>${this.escape(activity.title || step.title || "")}</h3>
        <p class="text-muted small mb-3">Calculate and enter the required engineering values below.</p>
        <div class="student-form-grid">
          ${fields.map((field) => {
            const fieldId = typeof field === "object" ? (field.id || field.name) : field;
            const fieldLabel = typeof field === "object" ? (field.label || field.title || fieldId) : field;
            const fieldPlaceholder = typeof field === "object" ? (field.placeholder || "") : "";
            const fieldUnit = typeof field === "object" && field.unit ? field.unit : "";
            const fieldHint = typeof field === "object" && field.hint ? field.hint : "";
            return `
              <div>
                <label class="form-label fw-semibold">${this.escape(fieldLabel)} ${fieldUnit ? `<span class="text-muted">(${this.escape(fieldUnit)})</span>` : ""}</label>
                <div class="input-group">
                  <input class="form-control" type="number" step="0.01" data-calc="${this.escape(fieldId)}" placeholder="${this.escape(fieldPlaceholder)}" value="${this.escape(saved[fieldId] || "")}">
                  ${fieldUnit ? `<span class="input-group-text">${this.escape(fieldUnit)}</span>` : ""}
                </div>
                ${fieldHint ? `<small class="form-text text-muted">${this.escape(fieldHint)}</small>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;

    if (activity.image) {
      const viewerHost = host.querySelector("[data-calculation-image-viewer]");
      if (viewerHost) {
        const viewer = this.services.componentRegistry.create("image-viewer", {
          config: {
            id: `${step.id}Viewer`,
            title: activity.figure || activity.title || "Free Body Diagram",
            figure: activity.figure || "Free Body Diagram",
            description: activity.description || "",
            image: activity.image,
            zoom: true,
            fullscreen: true
          },
          stateManager: this.services.stateManager,
          eventBus: this.services.eventBus
        });
        viewerHost.append(viewer.render());
      }
    }

    this.bindAutosave(step.id);
  }

  renderGuidedWorkflow(host, step, activity = {}) {
    const component = this.services.componentRegistry.create("guided-workflow", {
      config: { id: step.id, title: activity.title, given: activity.given, steps: activity.steps },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    this.mount(component, host);
  }

  renderEngineeringDecisionCanvas(host, step, activity = {}) {
    let imagePath = activity.image;
    if (!imagePath && activity.asset) {
      const assets = (this.content && this.content.assets) || (this.assetManifest && this.assetManifest.assets) || {};
      const assetObj = assets[activity.asset];
      if (assetObj) {
        imagePath = typeof assetObj === "string" ? assetObj : (assetObj.path || assetObj.src || assetObj.url);
      }
      if (!imagePath && (activity.asset === "engineeringAssetStudent" || activity.asset === "engineeringAssetFaculty")) {
        imagePath = `assignments/${this.assignmentSlug}/images/EA-03A_Student_v1.0.png`;
      }
    }

    const component = this.services.componentRegistry.create("engineering-decision-canvas", {
      config: {
        id: step.id,
        stationCode: activity.stationCode,
        title: activity.title,
        components: activity.components,
        figure: activity.figure,
        image: imagePath,
        imageAlt: activity.imageAlt,
        options: this.content.options || {}
      },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    this.mount(component, host);
  }

  renderRecommendation(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    const options = Array.isArray(activity.options) ? activity.options : [];
    host.innerHTML = `
      <section class="workbench-card card-information">
        <h3>${this.escape(activity.title || step.title || "")}</h3>
        ${options.map((option) => {
          const optVal = typeof option === "object" ? (option.id || option.value || option.title) : option;
          const optLabel = typeof option === "object" ? (option.title || option.label || option.name || option.id) : option;
          const isChecked = saved.decision === optVal || saved.decision === optLabel;
          return `<label class="form-check"><input class="form-check-input" type="radio" name="decision" value="${this.escape(optVal)}" ${isChecked ? "checked" : ""}> ${this.escape(optLabel)}</label>`;
        }).join("")}
      </section>
      <section class="workbench-card card-student-response">
        <h3>Engineering Justification</h3>
        <textarea class="form-control" rows="6" data-response="justification">${this.escape(saved.justification || "")}</textarea>
      </section>
    `;
    this.bindAutosave(step.id);
  }

  renderReflection(host, step, activity = {}) {
    const saved = this.response(step.id) || {};
    const questions = Array.isArray(activity.questions)
      ? activity.questions
      : (Array.isArray(activity.prompts) ? activity.prompts : (Array.isArray(activity.items) ? activity.items : []));
    host.innerHTML = questions.map((question, index) => {
      const qText = typeof question === "object" ? (question.label || question.title || question.text || question.question || question.id || "") : question;
      const qHelp = typeof question === "object" ? (question.helpText || question.description || question.placeholder || "") : "";
      const qId = typeof question === "object" ? (question.id || `q${index + 1}`) : `q${index + 1}`;
      const qPlaceholder = typeof question === "object" ? (question.placeholder || "") : "";
      return `
        <section class="workbench-card card-student-response">
          <h3>${this.escape(qText)}</h3>
          ${qHelp ? `<p class="text-muted small mb-2">${this.escape(qHelp)}</p>` : ""}
          <textarea class="form-control" rows="4" data-reflection="${this.escape(qId)}" placeholder="${this.escape(qPlaceholder)}">${this.escape(saved[qId] || "")}</textarea>
        </section>
      `;
    }).join("");
    this.bindAutosave(step.id);
  }

  /**
   * Renders the submission summary, validation, and submission controls.
   */
  renderSubmission(host) {
    this.autosaveAttempt();
    const state = this.services.stateManager.getState() || {};
    const payload = this.submissionEngine.buildPayload(this.submissionContext(state)) || {};
    const validation = this.submissionEngine.validateSubmissionPayload(payload) || { valid: true, errors: [] };
    const status = this.submissionEngine.getStatus() || {};
    const queueCount = (this.submissionEngine.getQueue() || []).length;
    const isSubmitted = Boolean(status.submitted || status.code === "SUBMITTED");
    const submitBody = (this.content && this.content.activities && this.content.activities.submit && this.content.activities.submit.body)
      || "Review completion status, verify submitted responses, and generate official submission report.";
    const totalSteps = (this.workflow && Array.isArray(this.workflow.steps)) ? this.workflow.steps.length : 1;
    const learningStepsCount = Math.max(1, totalSteps - 1);
    const subId = (payload.submission && payload.submission.submissionId) || `${(this.config && this.config.id) || "EA"}-${(state.student && state.student.rollNumber) || "DRAFT"}`;

    host.innerHTML = `
      ${isSubmitted ? `
        <div class="alert alert-success d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-4 mb-4 shadow-sm border border-success-subtle">
          <div class="mb-3 mb-md-0">
            <h4 class="alert-heading h6 fw-bold mb-1 text-success"><i class="bi bi-check-circle-fill me-2"></i>Submission Recorded &amp; Verified</h4>
            <p class="mb-0 small text-success-emphasis">Submission ID: <code class="fw-bold bg-white px-2 py-1 rounded border">${this.escape(subId)}</code></p>
          </div>
          <button class="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm" type="button" data-generate-student-report>
            <i class="bi bi-file-earmark-pdf-fill me-1"></i> View &amp; Print Report
          </button>
        </div>
      ` : ""}

      <section class="workbench-card card-result">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h3 class="mb-0">Project Summary</h3>
          <button class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-semibold" type="button" data-generate-student-report>
            <i class="bi bi-file-earmark-text me-1"></i> Report Preview
          </button>
        </div>
        <p>${this.escape(submitBody)}</p>
        <p><strong>Completion Status:</strong> ${this.completed.size} of ${learningStepsCount} activities completed.</p>
        <p><strong>Submission Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Google Sheets:</strong> ${this.googleSheets.isConfigured() ? "Configured" : "Endpoint not configured"}</p>
        <p><strong>Submission Status:</strong> <span data-submission-status>${this.escape(status.message || (status.submitted ? "Submitted" : "Ready for validation"))}</span></p>
      </section>

      ${validation.valid ? "" : `<section class="workbench-card card-warning"><h3>Submission Validation</h3><ul>${(validation.errors || []).map((error) => `<li>${this.escape(error)}</li>`).join("")}</ul><div class="mt-3"><button class="btn btn-outline-warning btn-sm fw-bold" type="button" data-edit-student-info-btn><i class="bi bi-person-gear me-1" aria-hidden="true"></i> Edit Student / Group Details</button></div></section>`}

      <section class="workbench-card card-student-response">
        <h3>Submission Actions</h3>
        <p data-submission-message>${validation.valid ? "Review and submit the completed challenge package, or generate your official submission report." : "Resolve the validation messages above before final submission."}</p>
        <div class="component-actions">
          <button class="btn btn-primary" type="button" data-submit-challenge ${validation.valid ? "" : "disabled"}><i class="bi bi-send-check" aria-hidden="true"></i> Submit to Google Sheets</button>
          <button class="btn btn-success" type="button" data-generate-student-report><i class="bi bi-file-earmark-text-fill me-1"></i> Generate &amp; Print Report</button>
          <button class="btn btn-outline-primary" type="button" data-retry-submissions ${queueCount ? "" : "disabled"}><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Retry Queue (${queueCount})</button>
          <button class="btn btn-outline-secondary" type="button" data-edit-student-info-btn><i class="bi bi-pencil-square me-1" aria-hidden="true"></i> Edit Student Details</button>
          <button class="btn btn-outline-danger" type="button" data-reset-assignment-btn><i class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i> Reset Assignment</button>
        </div>
      </section>

      <section class="workbench-card card-student-response"><h3>Responses Prepared for Submission</h3><pre class="mb-0">${this.escape(JSON.stringify(payload, null, 2))}</pre></section>`;
    this.bindSubmissionActions(host);
  }

  /**
   * Generates and renders a comprehensive Student Submission Report Modal.
   */
  openStudentReportModal() {
    try {
      this.autosaveAttempt();
      const state = this.services.stateManager.getState() || {};
      const payload = this.submissionEngine.buildPayload(this.submissionContext(state)) || {};
      const student = payload.studentInformation || (state.student || {});
      const submission = payload.submission || {};
      const subData = payload.submissionData || {};
      const config = this.config || {};
      const workflow = this.workflow || {};
      const rubric = this.rubric || {};
      const learningSteps = Array.isArray(workflow.steps)
        ? workflow.steps.filter((s) => s.component !== "submission-summary")
        : [];
      const responses = state.responses || {};

      const subId = submission.submissionId || `${config.id || "EA"}-${student.rollNumber || "DRAFT"}`;
      const compAct = subData.completedActivities !== undefined ? subData.completedActivities : this.completed.size;
      const totAct = subData.totalActivities !== undefined ? subData.totalActivities : learningSteps.length;
      const compPct = subData.completionPercent !== undefined ? subData.completionPercent : this.progress();
      const subHash = submission.submissionHash || "";

      let existingModal = document.getElementById("studentReportModal");
      if (!existingModal) {
        existingModal = document.createElement("div");
        existingModal.id = "studentReportModal";
        existingModal.className = "modal fade student-report-modal";
        existingModal.tabIndex = -1;
        existingModal.setAttribute("aria-hidden", "true");
        document.body.appendChild(existingModal);
      }

      const activityRows = learningSteps.map((step, idx) => {
        const resp = responses[step.id] || {};
        const criterion = (rubric.criteria || []).find((c) => c.id === step.id || c.stepId === step.id) || {};
        const stepTitle = this.getStepTitle(step);
        const isComplete = this.completed.has(step.id);

        let formattedResp = "";
        if (step.component === "image-label") {
          const labeled = Object.keys(resp).filter((k) => k.startsWith("label-") || !isNaN(k)).length;
          formattedResp = `<span class="badge bg-primary-subtle text-primary border">${labeled} components identified</span>`;
        } else if (step.component === "engineering-decision-canvas" || step.component === "drs-station") {
          const keys = Object.keys(resp);
          if (keys.length) {
            formattedResp = `<div class="small">${keys.map((k) => `<strong>${this.escape(k)}:</strong> ${this.escape(typeof resp[k] === "object" ? JSON.stringify(resp[k]) : resp[k])}`).join("<br>")}</div>`;
          } else {
            formattedResp = `<span class="text-muted small">No decision recorded</span>`;
          }
        } else if (step.component === "guided-workflow" || step.component === "calculation") {
          const keys = Object.keys(resp);
          if (keys.length) {
            formattedResp = `<div class="small">${keys.map((k) => `<strong>${this.escape(k)}:</strong> <code class="text-dark bg-light px-1 rounded">${this.escape(resp[k])}</code>`).join(", ")}</div>`;
          } else {
            formattedResp = `<span class="text-muted small">No calculations entered</span>`;
          }
        } else if (step.component === "reflection" || step.component === "final-report") {
          const keys = Object.keys(resp);
          if (keys.length) {
            formattedResp = `<div class="small fst-italic">${keys.map((k) => `<strong>${this.escape(k)}:</strong> ${this.escape(resp[k])}`).join("<br>")}</div>`;
          } else {
            formattedResp = `<span class="text-muted small">No reflection recorded</span>`;
          }
        } else {
          const keys = Object.keys(resp);
          if (keys.length) {
            formattedResp = `<div class="small">${keys.map((k) => `<strong>${this.escape(k)}:</strong> ${this.escape(resp[k])}`).join(", ")}</div>`;
          } else {
            formattedResp = `<span class="badge bg-secondary-subtle text-secondary">Reviewed / Completed</span>`;
          }
        }

        return `
          <tr>
            <td class="text-center fw-bold text-muted" style="width: 45px;">${idx + 1}</td>
            <td>
              <strong class="text-dark">${this.escape(stepTitle)}</strong>
              <div class="text-muted small">${this.escape(step.component || "activity")}</div>
            </td>
            <td>${formattedResp}</td>
            <td class="text-center" style="width: 110px;">
              ${isComplete ? '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle"><i class="bi bi-check-circle-fill me-1"></i>Completed</span>' : '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Pending</span>'}
            </td>
            <td class="text-center fw-semibold text-secondary" style="width: 85px;">
              ${criterion.maxMarks !== undefined ? Number(criterion.maxMarks).toFixed(1) : (criterion.marks !== undefined ? Number(criterion.marks).toFixed(1) : "-")}
            </td>
          </tr>
        `;
      }).join("");

      existingModal.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <div class="modal-header bg-dark text-white p-3 px-4 d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-file-earmark-check-fill fs-4 text-warning"></i>
                <div>
                  <h5 class="modal-title fw-bold mb-0 text-white">Student Submission Report</h5>
                  <span class="small text-white-50">${this.escape(config.id || "EA")} — ${this.escape(config.title || "Assignment")}</span>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-warning btn-sm px-3 fw-bold shadow-sm" data-print-student-report>
                  <i class="bi bi-printer-fill me-1"></i> Print / Save PDF
                </button>
                <button type="button" class="btn btn-outline-light btn-sm px-3" data-download-json-report>
                  <i class="bi bi-download me-1"></i> JSON
                </button>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
            </div>
            <div class="modal-body p-4 student-report-printable">
              <div class="student-report-doc p-3 p-md-4 rounded-3 border">
                
                <!-- Report Official Header -->
                <div class="student-report-header text-center pb-3 mb-4">
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div class="text-start">
                      <span class="badge bg-dark text-white px-3 py-1 rounded-pill mb-1 d-inline-block">DES • MEILP</span>
                      <h4 class="h5 fw-bold text-dark mb-0">${this.escape(student.collegeName || "Engineering Institution")}</h4>
                      <p class="text-muted small mb-0">Department of Mechanical Engineering</p>
                    </div>
                    <div class="text-end">
                      <div class="badge bg-primary text-white px-3 py-2 rounded-3 text-uppercase fw-bold student-report-badge">
                        ${this.escape(config.id || "ASSIGNMENT")} REPORT
                      </div>
                      <div class="text-muted small mt-1">Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                    </div>
                  </div>
                  <div class="p-3 bg-light rounded-3 text-center border">
                    <h3 class="h5 fw-bold text-primary mb-1">${this.escape(config.title || "Engineering Assignment")}</h3>
                    <div class="text-secondary small">
                      Course: <strong>${this.escape(config.subject || "Design of Machine Elements")}</strong> | 
                      Max CCE Marks: <strong>${Number(config.cceMarks || rubric.totalMarks || 12).toFixed(1)}</strong>
                    </div>
                  </div>
                </div>

                <!-- Student Details Grid -->
                <div class="card mb-4 border shadow-none bg-light-subtle">
                  <div class="card-header bg-white py-2 fw-bold text-dark border-bottom">
                    <i class="bi bi-person-badge text-primary me-2"></i>Student &amp; Submission Profile
                  </div>
                  <div class="card-body p-3">
                    <div class="row g-3 small">
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Student Name:</span>
                        <strong class="text-dark fs-6">${this.escape(student.fullName || "Student")}</strong>
                      </div>
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Roll Number / PRN:</span>
                        <strong class="text-dark">${this.escape(student.rollNumber || student.prn || "N/A")}</strong>
                      </div>
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Class / Div / Batch:</span>
                        <strong class="text-dark">${this.escape([student.class, student.division, student.batch].filter(Boolean).join(" / ") || "N/A")}</strong>
                      </div>
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Assigned Faculty:</span>
                        <strong class="text-dark">${this.escape(student.facultyName || "Unknown / Unassigned Faculty")}</strong>
                      </div>
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Academic Year / Attempt:</span>
                        <strong class="text-dark">${this.escape(student.academicYear || "2026-27")} • ${this.escape(student.attemptMode || "Individual")}</strong>
                      </div>
                      <div class="col-sm-6 col-md-4">
                        <span class="text-muted d-block">Submission ID:</span>
                        <code class="text-primary fw-bold">${this.escape(subId)}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Performance Summary Strip -->
                <div class="row g-3 mb-4 text-center">
                  <div class="col-4">
                    <div class="p-3 border rounded-3 bg-light">
                      <span class="text-muted small d-block mb-1">Activities Completed</span>
                      <h4 class="h5 fw-bold text-dark mb-0">${compAct} / ${totAct}</h4>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="p-3 border rounded-3 bg-light">
                      <span class="text-muted small d-block mb-1">Completion Rate</span>
                      <h4 class="h5 fw-bold text-success mb-0">${compPct}%</h4>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="p-3 border rounded-3 bg-light">
                      <span class="text-muted small d-block mb-1">CCE Weightage</span>
                      <h4 class="h5 fw-bold text-primary mb-0">${Number(config.cceMarks || rubric.totalMarks || 12).toFixed(1)} Marks</h4>
                    </div>
                  </div>
                </div>

                <!-- Activity Response Details Table -->
                <div class="mb-4">
                  <h6 class="fw-bold text-dark mb-3"><i class="bi bi-list-check text-primary me-2"></i>Detailed Activity Submissions</h6>
                  <div class="table-responsive">
                    <table class="table table-bordered table-sm align-middle student-report-table mb-0">
                      <thead>
                        <tr>
                          <th class="text-center">#</th>
                          <th>Activity / Module</th>
                          <th>Submitted Engineering Values / Decisions</th>
                          <th class="text-center">Status</th>
                          <th class="text-center">Max Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${activityRows}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Academic Sign-off / Lab Assessment Box -->
                <div class="student-report-signoff p-4 mt-4">
                  <div class="row align-items-end g-4 text-center text-md-start">
                    <div class="col-md-4">
                      <div class="border-top border-dark pt-2">
                        <span class="small text-muted d-block">Student Signature</span>
                        <strong>${this.escape(student.fullName || "Student")}</strong>
                      </div>
                    </div>
                    <div class="col-md-4 text-center">
                      <div class="p-2 border rounded bg-white d-inline-block px-3">
                        <span class="small text-muted d-block">Marks Awarded</span>
                        <strong class="fs-6 text-primary">______ / ${Number(config.cceMarks || rubric.totalMarks || 12).toFixed(1)}</strong>
                      </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                      <div class="border-top border-dark pt-2">
                        <span class="small text-muted d-block">Faculty Evaluator Signature</span>
                        <strong>${this.escape(student.facultyName || "Unknown / Unassigned Faculty")}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Security Hash & Footer -->
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 pt-3 border-top text-muted small">
                  <span>Verification Hash: <code>${subHash ? subHash.slice(0, 16) + "..." : "Local Draft Verified"}</code></span>
                  <span>DES Academic Verification System • MEILP v2.0</span>
                </div>

              </div>
            </div>
            <div class="modal-footer bg-light p-3 d-flex justify-content-between">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-primary" data-copy-report-summary>
                  <i class="bi bi-clipboard me-1"></i> Copy Summary
                </button>
                <button type="button" class="btn btn-primary" data-print-student-report>
                  <i class="bi bi-printer me-1"></i> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Bind modal actions
      const printBtns = existingModal.querySelectorAll("[data-print-student-report]");
      printBtns.forEach((b) => {
        b.addEventListener("click", () => {
          document.body.classList.add("printing-student-report");
          window.print();
          document.body.classList.remove("printing-student-report");
        });
      });

      const jsonBtn = existingModal.querySelector("[data-download-json-report]");
      if (jsonBtn) {
        jsonBtn.addEventListener("click", () => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
          const a = document.createElement("a");
          a.setAttribute("href", dataStr);
          a.setAttribute("download", `Report_${config.id || "EA"}_${student.rollNumber || "Submission"}.json`);
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
      }

      const copyBtn = existingModal.querySelector("[data-copy-report-summary]");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          const summaryText = `[MEILP / DES SUBMISSION REPORT]\nAssignment: ${config.id} - ${config.title}\nStudent: ${student.fullName} (Roll: ${student.rollNumber})\nCollege: ${student.collegeName}\nFaculty: ${student.facultyName}\nStatus: ${compAct}/${totAct} Completed (${compPct}%)\nSubmission ID: ${subId}\nHash: ${subHash}`;
          navigator.clipboard.writeText(summaryText).then(() => {
            copyBtn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copied!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy Summary'; }, 2000);
          });
        });
      }

      // Show Bootstrap Modal
      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        const bsModal = new bootstrap.Modal(existingModal);
        bsModal.show();
      }
    } catch (err) {
      console.error("[MEILP] Error opening student report modal:", err);
      alert("Unable to generate submission report preview: " + err.message);
    }
  }

  /**
   * Appends assignment navigation controls.
   */
  renderNavigation(host) {
    const nav = this.services.componentRegistry.create("assignment-navigation", { config: { id: "challengeNavigation" }, stateManager: this.services.stateManager, eventBus: this.services.eventBus });
    host.append(nav.render());
  }

  /**
   * Binds autosave listeners for the current activity inputs.
   */
  bindAutosave(stepId) {
    const host = this.host();
    if (!host) {
      return;
    }
    host.querySelectorAll("input, textarea, select").forEach((input) => {
      input.addEventListener("input", () => this.saveStep(stepId));
      input.addEventListener("change", () => this.saveStep(stepId));
    });
  }

  /**
   * Saves the current step response without changing the response schema.
   */
  saveStep(stepId) {
    const value = {};
    const steps = this.workflow && Array.isArray(this.workflow.steps) ? this.workflow.steps : [];
    const step = steps[this.currentIndex] || {};
    const host = this.host();
    if (!host || !stepId) {
      return;
    }
    host.querySelectorAll("[data-response]").forEach((input) => { value[input.dataset.response] = input.value.trim(); });
    host.querySelectorAll("[name='mcq'], [name='selection'], [name='decision']").forEach((input) => { if (input.checked) value[input.name] = input.value; });
    const ranking = {};
    host.querySelectorAll("[data-rank]").forEach((input) => { ranking[input.dataset.rank] = input.type === "text" ? input.value.trim() : input.value; });
    if (Object.keys(ranking).length) value.ranking = ranking;
    host.querySelectorAll("[data-calc]").forEach((input) => { value[input.dataset.calc] = input.type === "text" ? input.value.trim() : input.value; });
    host.querySelectorAll("[data-reflection]").forEach((input) => { value[input.dataset.reflection] = input.value.trim(); });
    host.querySelectorAll("[data-accept-project]").forEach((input) => { value.accepted = input.checked; });
    if (Object.keys(value).length === 0 && step.component === "image-label") {
      Object.assign(value, this.response(stepId));
    }
    if (Object.keys(value).length === 0 && step.component === "information-card") {
      value.reviewed = true;
    }
    this.completed.add(stepId);
    this.services.stateManager.update((state) => ({ responses: { ...state.responses, [stepId]: value } }));
    this.persistProgress();
    this.autosaveAttempt();
    this.renderTaskNav();
  }

  /**
   * Saves, marks complete, persists progress, and refreshes current activity state.
   */
  saveCurrent() {
    const step = this.workflow.steps[this.currentIndex];
    if (!step || !step.id) {
      return;
    }
    this.saveStep(step.id);
    this.completed.add(step.id);
    this.persistProgress();
    this.autosaveAttempt();
    this.renderTaskNav();
    this.renderWidgets();
    this.updateProgress();
  }

  /**
   * Advances to the next workflow step when one exists.
   */
  next() {
    const steps = this.workflow && Array.isArray(this.workflow.steps) ? this.workflow.steps : [];
    if (this.currentIndex >= steps.length - 1) {
      return;
    }
    this.renderStep(this.currentIndex + 1);
  }

  /**
   * Returns to the previous workflow step when one exists.
   */
  previous() {
    if (this.currentIndex <= 0) {
      return;
    }
    this.renderStep(this.currentIndex - 1);
  }

  /**
   * Resolves a step's title with fallbacks for workflow steps lacking an explicit title.
   */
  getStepTitle(step) {
    if (!step) {
      return "";
    }
    if (step.title) {
      return step.title;
    }
    if (step.label) {
      return step.label;
    }
    if (step.name) {
      return step.name;
    }

    const activity = (this.content && this.content.activities && this.content.activities[step.id]) || {};
    if (activity.title) {
      return activity.title;
    }

    if (this.rubric && Array.isArray(this.rubric.criteria)) {
      const criteria = this.rubric.criteria.find((c) => c.id === step.id);
      if (criteria && criteria.title) {
        return criteria.title;
      }
    }

    if (step.id === "submit") {
      return "Submission";
    }

    return this.title(step.id || "");
  }

  /**
   * Renders task navigation for desktop and mobile lists.
   */
  renderTaskNav() {
    const steps = this.workflow && Array.isArray(this.workflow.steps) ? this.workflow.steps : [];
    const setupSaved = (this.services.stateManager.getState() || {}).student?.saved;
    const setupItem = `<li><button class="task-button" type="button" data-edit-student-setup><span class="task-icon is-${setupSaved ? "completed" : "pending"}"><i class="bi ${setupSaved ? "bi-person-check-fill text-success" : "bi-person"}" aria-hidden="true"></i></span><span>Student Details</span><small>${setupSaved ? "Saved" : "Setup"}</small></button></li>`;

    const stepsHtml = steps.map((step, index) => {
      const status = this.completed.has(step.id) ? "completed" : index === this.currentIndex ? "current" : "pending";
      const icon = status === "completed" ? "bi-check2" : status === "current" ? "bi-arrow-right" : "bi-circle";
      const title = this.getStepTitle(step);
      return `<li><button class="task-button ${status === "current" ? "is-current" : ""}" type="button" data-step-index="${index}"><span class="task-icon is-${status}"><i class="bi ${icon}" aria-hidden="true"></i></span><span>${this.escape(title)}</span><small>${this.title(status)}</small></button></li>`;
    }).join("");

    const html = setupItem + stepsHtml;

    const taskList = document.querySelector("[data-task-list]");
    const mobileTaskList = document.querySelector("[data-mobile-task-list]");
    if (taskList) {
      taskList.innerHTML = html;
    }
    if (mobileTaskList) {
      mobileTaskList.innerHTML = html;
    }
    document.querySelectorAll("[data-step-index]").forEach((button) => button.addEventListener("click", () => this.renderStep(Number(button.dataset.stepIndex))));
    document.querySelectorAll("[data-edit-student-setup]").forEach((button) => button.addEventListener("click", () => {
      this.returnStepIndex = this.currentIndex;
      const state = this.services.stateManager.getState() || {};
      const mode = state.settings?.attemptMode || "individual";
      this.renderStudentForm(mode);
    }));
  }

  /**
   * Renders sidebar widgets with current state and progress.
   */
  renderWidgets() {
    const state = this.services.stateManager.getState();
    const progress = this.progress();
    const widgetList = document.querySelector("[data-widget-list]");
    const widgets = Array.isArray(this.content.widgets) ? this.content.widgets : [];
    if (widgetList) {
      widgetList.innerHTML = widgets.map((widget) => `<article class="workbench-widget card-${widget.cardType}"><h3><i class="bi ${widget.icon}" aria-hidden="true"></i>${this.escape(widget.title)}</h3>${this.widget(widget, state, progress)}</article>`).join("");
    }
    document.querySelectorAll("[data-widget-progress-bar]").forEach((bar) => { bar.style.width = `${progress}%`; });
  }

  /**
   * Returns widget markup for the requested widget definition.
   */
  widget(widget, state, progress) {
    if (widget.id === "progress") {
      return `<p>Overall Progress: ${progress}%</p><div class="progress mini-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" data-widget-progress-bar></div></div><p class="mt-2">Current Activity: ${this.escape((this.workflow.steps[this.currentIndex] || {}).title || "Setup")}</p>`;
    }
    if (widget.id === "responses") {
      return `<p>${Object.keys(state.responses || {}).length} response records saved.</p>`;
    }
    if (widget.id === "calculator" || widget.cardType === "calculator" || widget.url) {
      const toolUrl = widget.url || "tools/Shaft Design Calculator.html";
      const toolText = widget.buttonText || "Launch Shaft Design Calculator";
      const cleanText = (widget.text || "").replace(/<[^>]*>/g, '');
      return `
        <p class="mb-2 text-muted small">${this.escape(cleanText)}</p>
        <a href="${this.escape(toolUrl)}" target="_blank" class="btn btn-warning btn-sm w-100 fw-bold text-dark d-inline-flex align-items-center justify-content-center gap-2 shadow-sm py-2">
          <i class="bi bi-calculator-fill fs-6" aria-hidden="true"></i>
          ${this.escape(toolText)}
        </a>
      `;
    }
    return `<p>${this.escape(widget.text || "")}</p>`;
  }

  /**
   * Renders assignment metadata in the workbench header.
   */
  renderHeader() {
    this.setText("[data-workbench-title]", this.config.title);
    this.setText("[data-course-code]", this.config.subject);
    this.setText("[data-course-name]", this.config.courseName);

    const state = this.services.stateManager.getState();
    const facultyName = (state.student && state.student.facultyName) || "Unknown / Unassigned Faculty";
    const facultyId = (state.student && state.student.facultyId) || "UNKNOWN";

    const facultyContextEl = document.querySelector("[data-faculty-context]");
    if (facultyContextEl) {
      facultyContextEl.textContent = `Faculty: ${facultyName}${facultyId !== "UNKNOWN" ? ` (${facultyId})` : ""}`;
    }
  }

  /**
   * Synchronizes the persistent Assignment_Faculty_Selection record with Google Sheets.
   */
  async syncAssignmentFacultySelection() {
    const state = this.services.stateManager.getState();
    const student = state.student || {};
    const attemptId = state.attemptId || student.attemptId;
    const studentId = student.rollNumber || student.rollNo || student.email || student.name || "STU-ANONYMOUS";
    const collegeId = student.collegeId || "COL001";
    const facultyId = student.facultyId || "UNKNOWN";
    const assignmentId = (this.config && this.config.id) || this.assignmentSlug;

    if (!attemptId) return;

    const endpoint = window.MEILP?.googleSheetsConfig?.submissionWebAppUrl;
    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "createAssignmentFacultySelection",
          attemptId,
          studentId,
          collegeId,
          facultyId,
          assignmentId,
          selectedAt: new Date().toISOString(),
          startedAt: new Date().toISOString()
        })
      });
    } catch (e) {
      // Safe offline ignore
    }
  }

  /**
   * Updates visible progress indicators.
   */
  updateProgress() {
    const progress = this.progress();
    const headerProgress = document.querySelector("[data-header-progress]");
    const taskProgressLabel = document.querySelector("[data-task-progress-label]");
    if (headerProgress) {
      headerProgress.innerHTML = `<i class="bi bi-activity" aria-hidden="true"></i> ${progress}%`;
    }
    if (taskProgressLabel) {
      taskProgressLabel.textContent = `Activity ${this.currentIndex + 1} of ${this.workflow.steps.length}`;
    }
  }

  /**
   * Calculates progress across learning activities only.
   */
  progress() {
    const learningSteps = this.workflow.steps.filter((step) => step.component !== "submission-summary");
    if (!learningSteps.length) {
      return 0;
    }
    const completedLearning = learningSteps.filter((step) => this.completed.has(step.id)).length;
    return Math.round((completedLearning / learningSteps.length) * 100);
  }

  /**
   * Restores completed task IDs from the saved draft or state manager.
   */
  restoreAttempt() {
    const draft = this.submissionEngine.loadDraft();
    const state = this.services.stateManager.getState();
    const completed = draft && Array.isArray(draft.completedTaskIds)
      ? draft.completedTaskIds
      : state.progress.completedTaskIds || [];
    this.completed = new Set(completed);
  }

  /**
   * Persists completion progress in StateManager.
   */
  persistProgress() {
    const completedTaskIds = Array.from(this.completed);
    this.services.stateManager.update((state) => ({
      progress: {
        ...state.progress,
        completedTaskIds,
        percentage: this.progress()
      }
    }));
  }

  /**
   * Autosaves the current attempt snapshot through SubmissionEngine.
   */
  autosaveAttempt() {
    if (!this.config || !this.workflow || !this.content || !this.rubric) {
      return;
    }

    this.submissionEngine.autosaveDraft({
      assignmentSlug: this.assignmentSlug,
      completedTaskIds: Array.from(this.completed),
      state: this.services.stateManager.getState()
    });
  }

  /**
   * Builds the SubmissionEngine context from current runner state.
   */
  submissionContext(state = this.services.stateManager.getState()) {
    return {
      assignmentSlug: this.assignmentSlug,
      config: this.config,
      workflow: this.workflow,
      content: this.content,
      rubric: this.rubric,
      state,
      completedTaskIds: Array.from(this.completed)
    };
  }

  /**
   * Binds submission and retry controls to SubmissionEngine actions.
   */
  bindSubmissionActions(host) {
    const submitButton = host.querySelector("[data-submit-challenge]");
    const retryButton = host.querySelector("[data-retry-submissions]");
    const message = host.querySelector("[data-submission-message]");

    if (submitButton) {
      submitButton.addEventListener("click", async () => {
        submitButton.disabled = true;
        message.textContent = "Submitting to Google Sheets...";
        const result = await this.submissionEngine.submit(this.submissionContext());
        message.textContent = result.message;
        if (result.ok || result.queued) {
          this.renderSubmission(host);
          return;
        }
        submitButton.disabled = false;
        if (result.errors && result.errors.length) {
          message.textContent = result.errors.join(" ");
        }
      });
    }

    if (retryButton) {
      retryButton.addEventListener("click", async () => {
        retryButton.disabled = true;
        message.textContent = "Retrying queued submissions...";
        const result = await this.submissionEngine.retryQueue();
        message.textContent = result.message;
        this.renderSubmission(host);
      });
    }

    const reportButtons = host.querySelectorAll("[data-generate-student-report]");
    reportButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.openStudentReportModal());
    });

    const editInfoButtons = host.querySelectorAll("[data-edit-student-info-btn]");
    editInfoButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.returnStepIndex = this.currentIndex;
        const state = this.services.stateManager.getState() || {};
        const mode = state.settings?.attemptMode || "individual";
        this.renderStudentForm(mode);
      });
    });

    const resetButtons = host.querySelectorAll("[data-reset-assignment-btn]");
    resetButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.resetAssignment());
    });
  }

  /**
   * Builds a standard workbench card.
   */
  card(type, title, body, items) {
    let itemsHtml = "";
    if (Array.isArray(items) && items.length) {
      itemsHtml = `<ul>${items.map((item) => {
        const text = typeof item === "object" ? (item.label || item.title || item.value || JSON.stringify(item)) : item;
        return `<li>${this.escape(text)}</li>`;
      }).join("")}</ul>`;
    }
    return `<section class="workbench-card card-${type}"><h3>${this.escape(title)}</h3>${body ? `<p>${this.escape(body)}</p>` : ""}${itemsHtml}</section>`;
  }

  /**
   * Builds a student information form field.
   */
  field(field, savedValue) {
    let value = savedValue || "";
    if (!value && field.auto === "academicYear") {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0 is Jan, 5 is June
      value = month >= 5 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
    }
    const readonlyAttr = field.readonly ? "readonly tabindex='-1'" : "";

    if (field.name === "collegeName" || field.type === "select") {
      const options = field.options || window.MEILP.colleges || [];
      const placeholder = field.placeholder || "Select your College / Institution";
      return `<div><label class="form-label">${this.escape(field.label)}</label><select class="form-select" name="${this.escape(field.name)}" ${field.required ? "required" : ""}><option value="" disabled ${!value ? "selected" : ""}>${this.escape(placeholder)}</option>${options.map((opt) => `<option value="${this.escape(opt)}" ${opt === value ? "selected" : ""}>${this.escape(opt)}</option>`).join("")}</select><div class="invalid-feedback" data-error-for="${this.escape(field.name)}"></div></div>`;
    }

    return `<div><label class="form-label">${this.escape(field.label)}</label><input class="form-control" name="${this.escape(field.name)}" type="text" value="${this.escape(value)}" ${field.required ? "required" : ""} ${readonlyAttr}><div class="invalid-feedback" data-error-for="${this.escape(field.name)}"></div></div>`;
  }

  /**
   * Collects and validates student information fields.
   */
  collectFields(scope, fields) {
    const value = {};
    const errors = {};
    fields.forEach((field) => {
      const input = scope.querySelector(`[name="${field.name}"]`);
      if (!input) {
        return;
      }
      const text = input.value.trim();
      value[field.name] = text;
      if (field.required && !text) errors[field.name] = `${field.label} is required.`;
      if (field.numeric && text && !/^\d+$/.test(text)) errors[field.name] = `${field.label} must be numeric.`;
      if (field.nameOnly && text && !/^[A-Za-z][A-Za-z ]*$/.test(text)) errors[field.name] = `${field.label} should contain alphabetic characters only.`;
      const feedback = scope.querySelector(`[data-error-for="${field.name}"]`);
      input.classList.toggle("is-invalid", Boolean(errors[field.name]));
      input.classList.toggle("is-valid", !errors[field.name] && Boolean(text));
      if (feedback) {
        feedback.textContent = errors[field.name] || "";
      }
    });
    return { valid: Object.keys(errors).length === 0, value };
  }

  /**
   * Mounts a rendered component and safely destroys the previous active component.
   */
  mount(component, host) {
    this.destroyActiveComponent();
    this.activeComponent = component;
    host.append(component.render());
  }

  /**
   * Returns a saved response by activity ID.
   */
  response(id) {
    return this.services.stateManager.getState().responses[id] || {};
  }

  /**
   * Updates the current activity heading.
   */
  setActivity(kicker, title) {
    this.setText("[data-activity-kicker]", kicker);
    this.setText("[data-activity-title]", title);
  }

  /**
   * Updates the workbench breadcrumb.
   */
  setBreadcrumb(current) {
    const items = ["Home", "Mechanical Engineering", this.config ? this.config.subject : "PCC303-MEC", "Assignment", current];
    const breadcrumb = document.querySelector("[data-workbench-breadcrumb]");
    if (breadcrumb) {
      breadcrumb.innerHTML = items.map((item, index) => `<li class="breadcrumb-item ${index === items.length - 1 ? "active" : ""}">${this.escape(item)}</li>`).join("");
    }
  }

  /**
   * Applies the persisted workbench theme.
   */
  applyTheme() {
    this.setTheme(this.services.stateManager.getState().settings.theme || "light");
  }

  /**
   * Toggles the workbench theme.
   */
  toggleTheme() {
    this.setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  /**
   * Sets and persists the workbench theme.
   */
  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    this.services.stateManager.update((state) => ({ settings: { ...state.settings, theme } }));
    const icon = document.querySelector("[data-workbench-theme-toggle] i");
    if (icon) {
      icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    }
  }

  /**
   * Prepends a card to the current activity host.
   */
  prependCard(type, title, body) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.card(type, title, body);
    const host = this.host();
    if (host && wrapper.firstElementChild) {
      host.prepend(wrapper.firstElementChild);
    }
  }

  /**
   * Renders assignment JSON loading diagnostics.
   */
  renderLoadError() {
    this.setActivity("Configuration Error", "Challenge could not load");
    const missingFiles = this.missingJsonFiles.length ? this.missingJsonFiles : this.assignmentJsonFiles;
    const host = this.host();
    if (!host) {
      return;
    }
    host.innerHTML = `
      <section class="workbench-card card-error">
        <h3>Missing Configuration</h3>
        <p>The assignment JSON files could not be loaded.</p>
        <ul>
          <li><strong>Assignment slug:</strong> ${this.escape(this.assignmentSlug)}</li>
          <li><strong>Missing JSON files:</strong> ${missingFiles.map((file) => this.escape(file)).join(", ")}</li>
          <li><strong>Debugging information:</strong> Verify the assignment folder exists, file names match exactly, JSON is valid, and browser developer tools do not show 404 or CORS errors.</li>
          <li><strong>Current hosting suggestion:</strong> Serve the workbench from a static host such as GitHub Pages, Netlify, or a local web server instead of opening the HTML file directly.</li>
        </ul>
      </section>`;
  }

  /**
   * Returns the current activity host element.
   */
  host() {
    return document.querySelector("[data-activity-host]");
  }

  /**
   * Safely writes text into an optional shell element.
   */
  setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value || "";
    }
  }

  /**
   * Updates the attempt-mode indicator when the shell exposes one.
   */
  setAttemptModeLabel(mode) {
    const label = document.querySelector("[data-attempt-mode-label]");
    if (label) {
      label.innerHTML = `<i class="bi bi-person" aria-hidden="true"></i> ${this.title(mode)} Mode`;
    }
  }

  /**
   * Destroys the currently mounted component and clears its lifecycle handle.
   */
  destroyActiveComponent() {
    if (this.activeComponent && typeof this.activeComponent.destroy === "function") {
      this.activeComponent.destroy();
    }
    this.activeComponent = null;
  }

  /**
   * Releases runner-owned listeners and mounted component instances.
   */
  destroy() {
    this.destroyActiveComponent();
    this.unsubscribe.forEach((remove) => remove());
    this.unsubscribe = [];
  }

  /**
   * Converts identifiers into title case labels.
   */
  title(value) {
    return String(value).replaceAll("-", " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
  }

  /**
   * Escapes values for safe HTML output.
   */
  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value || "") : String(value || "");
  }
}
