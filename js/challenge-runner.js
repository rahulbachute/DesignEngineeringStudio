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
    const [config, workflow, content, rubric] = await Promise.all([
      window.MEILP.fetchJson(files.config, null),
      window.MEILP.fetchJson(files.workflow, null),
      window.MEILP.fetchJson(files.content, null),
      window.MEILP.fetchJson(files.rubric, null)
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
    this.services.progressManager.startAssignment({ id: config.id, title: config.title, tasks: workflow.steps });
    this.restoreAttempt();
    this.bindEvents();
    this.applyTheme();
    this.renderHeader();
    const state = this.services.stateManager.getState();
    if (state.student.saved) {
      const mode = state.student.attemptMode || "individual";
      this.setAttemptModeLabel(mode);
      this.renderDashboard();
    } else {
      this.renderAttemptMode();
    }
  }

  /**
   * Wires shell controls and runner navigation events.
   */
  bindEvents() {
    const themeToggle = document.querySelector("[data-workbench-theme-toggle]");
    const helpButton = document.querySelector("[data-workbench-help]");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
    if (helpButton) {
      helpButton.addEventListener("click", () => this.prependCard("hint", "Help", "Use the task navigator and Save Draft button to move through the challenge."));
    }
    this.unsubscribe.push(this.services.eventBus.listen("navigate-next", () => this.next()));
    this.unsubscribe.push(this.services.eventBus.listen("navigate-previous", () => this.previous()));
    this.unsubscribe.push(this.services.eventBus.listen("navigate-home", () => this.renderDashboard()));
    this.unsubscribe.push(this.services.eventBus.listen("save-request", () => this.saveCurrent()));
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
    this.renderWidgets();
  }

  /**
   * Renders and validates the student or group setup form.
   */
  renderStudentForm(mode) {
    this.setActivity("Student Setup", mode === "group" ? "Group Information" : "Individual Information");
    this.setBreadcrumb("Student Information");
    const fields = Array.isArray(this.content.attemptMode && this.content.attemptMode[mode]) ? this.content.attemptMode[mode] : [];
    const host = this.host();
    host.innerHTML = `<section class="workbench-card"><h3>${mode === "group" ? "Group Details" : "Student Details"}</h3><form data-student-form novalidate><div class="student-form-grid">${fields.map((field) => this.field(field)).join("")}</div><div class="component-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-save" aria-hidden="true"></i> Save and Start</button></div></form></section>`;
    host.querySelector("[data-student-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const result = this.collectFields(host, fields);
      if (!result.valid) {
        return;
      }
      this.services.stateManager.update((state) => ({ student: { ...state.student, ...result.value, attemptMode: mode, saved: true } }));
      this.autosaveAttempt();
      this.renderDashboard();
    });
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
    this.setActivity(this.title(step.component), step.title);
    this.setBreadcrumb(step.title);
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
      config: { id: step.id, title: activity.title, image: activity.image, figure: activity.figure, description: activity.description, labels: activity.labels },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    this.mount(component, host);
  }

  /**
   * Renders a text response paired with an MCQ.
   */
  renderTextMcq(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = `${this.card("theory", activity.title, activity.prompt)}<section class="workbench-card card-student-response"><h3>Engineering Text Response</h3><textarea class="form-control" rows="6" data-response="text">${this.escape(saved.text || "")}</textarea></section><section class="workbench-card card-information"><h3>${this.escape(activity.mcq.question)}</h3>${activity.mcq.options.map((option) => `<label class="form-check"><input class="form-check-input" type="radio" name="mcq" value="${this.escape(option)}" ${saved.mcq === option ? "checked" : ""}> ${this.escape(option)}</label>`).join("")}</section>`;
    this.bindAutosave(step.id);
  }

  /**
   * Renders selection cards and justification input.
   */
  renderSelection(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = `${this.card("theory", activity.title, activity.prompt)}<section class="workbench-card"><div class="row g-3">${activity.options.map((option) => `<div class="col-md-6"><label class="attempt-option"><input class="form-check-input me-2" type="radio" name="selection" value="${this.escape(option.id)}" ${saved.selection === option.id ? "checked" : ""}><strong>${this.escape(option.title)}</strong><span>${this.escape(option.note)}</span></label></div>`).join("")}</div></section><section class="workbench-card card-student-response"><h3>Recommendation Justification</h3><textarea class="form-control" rows="5" data-response="justification">${this.escape(saved.justification || "")}</textarea></section>`;
    this.bindAutosave(step.id);
  }

  /**
   * Renders ranking inputs and safety justification.
   */
  renderRanking(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = `<section class="workbench-card"><h3>${this.escape(activity.title)}</h3><div class="student-form-grid">${activity.rankingItems.map((item) => `<div><label class="form-label">${this.escape(item)}</label><input class="form-control" type="number" min="1" max="${activity.rankingItems.length}" data-rank="${this.escape(item)}" value="${this.escape((saved.ranking || {})[item] || "")}"></div>`).join("")}</div></section><section class="workbench-card card-student-response"><h3>Safety Justification</h3><textarea class="form-control" rows="5" data-response="justification">${this.escape(saved.justification || "")}</textarea></section>`;
    this.bindAutosave(step.id);
  }

  /**
   * Renders calculation inputs for the activity.
   */
  renderCalculation(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = `${this.card("calculation", "Given Data", "", activity.given)}<section class="workbench-card"><h3>${this.escape(activity.title)}</h3><div class="student-form-grid">${activity.fields.map((field) => `<div><label class="form-label">${this.escape(field.label)}</label><input class="form-control" type="number" step="0.01" data-calc="${this.escape(field.id)}" placeholder="${this.escape(field.placeholder)}" value="${this.escape(saved[field.id] || "")}"></div>`).join("")}</div></section>`;
    this.bindAutosave(step.id);
  }

  /**
   * Renders recommendation options and justification input.
   */
  renderRecommendation(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = `<section class="workbench-card card-information"><h3>${this.escape(activity.title)}</h3>${activity.options.map((option) => `<label class="form-check"><input class="form-check-input" type="radio" name="decision" value="${this.escape(option)}" ${saved.decision === option ? "checked" : ""}> ${this.escape(option)}</label>`).join("")}</section><section class="workbench-card card-student-response"><h3>Engineering Justification</h3><textarea class="form-control" rows="6" data-response="justification">${this.escape(saved.justification || "")}</textarea></section>`;
    this.bindAutosave(step.id);
  }

  /**
   * Renders reflection questions and response fields.
   */
  renderReflection(host, step, activity) {
    const saved = this.response(step.id);
    host.innerHTML = activity.questions.map((question, index) => `<section class="workbench-card card-student-response"><h3>${this.escape(question)}</h3><textarea class="form-control" rows="4" data-reflection="q${index + 1}">${this.escape(saved[`q${index + 1}`] || "")}</textarea></section>`).join("");
    this.bindAutosave(step.id);
  }

  /**
   * Renders the submission summary, validation, and submission controls.
   */
  renderSubmission(host) {
    this.autosaveAttempt();
    const state = this.services.stateManager.getState();
    const payload = this.submissionEngine.buildPayload(this.submissionContext(state));
    const validation = this.submissionEngine.validateSubmissionPayload(payload);
    const status = this.submissionEngine.getStatus();
    const queueCount = this.submissionEngine.getQueue().length;
    host.innerHTML = `
      <section class="workbench-card card-result">
        <h3>Project Summary</h3>
        <p>${this.escape(this.content.activities.submit.body)}</p>
        <p><strong>Completion Status:</strong> ${this.completed.size} of ${this.workflow.steps.length - 1} activities completed.</p>
        <p><strong>Submission Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Google Sheets:</strong> ${this.googleSheets.isConfigured() ? "Configured" : "Endpoint not configured"}</p>
        <p><strong>Submission Status:</strong> <span data-submission-status>${this.escape(status.message || (status.submitted ? "Submitted" : "Ready for validation"))}</span></p>
      </section>
      ${validation.valid ? "" : `<section class="workbench-card card-warning"><h3>Submission Validation</h3><ul>${validation.errors.map((error) => `<li>${this.escape(error)}</li>`).join("")}</ul></section>`}
      <section class="workbench-card card-student-response">
        <h3>Submission Actions</h3>
        <p data-submission-message>${validation.valid ? "Review and submit the completed challenge package." : "Resolve the validation messages above before final submission."}</p>
        <div class="component-actions">
          <button class="btn btn-primary" type="button" data-submit-challenge ${validation.valid ? "" : "disabled"}><i class="bi bi-send-check" aria-hidden="true"></i> Submit to Google Sheets</button>
          <button class="btn btn-outline-primary" type="button" data-retry-submissions ${queueCount ? "" : "disabled"}><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Retry Queue (${queueCount})</button>
        </div>
      </section>
      <section class="workbench-card card-student-response"><h3>Responses Prepared for Submission</h3><pre class="mb-0">${this.escape(JSON.stringify(payload, null, 2))}</pre></section>`;
    this.bindSubmissionActions(host);
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
    this.services.stateManager.update((state) => ({ responses: { ...state.responses, [stepId]: value } }));
    this.autosaveAttempt();
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
    if (this.currentIndex >= this.workflow.steps.length - 1) {
      return;
    }
    this.saveCurrent();
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
   * Renders task navigation for desktop and mobile lists.
   */
  renderTaskNav() {
    const steps = this.workflow && Array.isArray(this.workflow.steps) ? this.workflow.steps : [];
    const html = steps.map((step, index) => {
      const status = this.completed.has(step.id) ? "completed" : index === this.currentIndex ? "current" : "pending";
      const icon = status === "completed" ? "bi-check2" : status === "current" ? "bi-arrow-right" : "bi-circle";
      return `<li><button class="task-button ${status === "current" ? "is-current" : ""}" type="button" data-step-index="${index}"><span class="task-icon is-${status}"><i class="bi ${icon}" aria-hidden="true"></i></span><span>${this.escape(step.title)}</span><small>${this.title(status)}</small></button></li>`;
    }).join("");
    const taskList = document.querySelector("[data-task-list]");
    const mobileTaskList = document.querySelector("[data-mobile-task-list]");
    if (taskList) {
      taskList.innerHTML = html;
    }
    if (mobileTaskList) {
      mobileTaskList.innerHTML = html;
    }
    document.querySelectorAll("[data-step-index]").forEach((button) => button.addEventListener("click", () => this.renderStep(Number(button.dataset.stepIndex))));
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
    return `<p>${this.escape(widget.text || "")}</p>`;
  }

  /**
   * Renders assignment metadata in the workbench header.
   */
  renderHeader() {
    this.setText("[data-workbench-title]", this.config.title);
    this.setText("[data-course-code]", this.config.subject);
    this.setText("[data-course-name]", this.config.courseName);
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
  }

  /**
   * Builds a standard workbench card.
   */
  card(type, title, body, items) {
    return `<section class="workbench-card card-${type}"><h3>${this.escape(title)}</h3>${body ? `<p>${this.escape(body)}</p>` : ""}${items ? `<ul>${items.map((item) => `<li>${this.escape(item)}</li>`).join("")}</ul>` : ""}</section>`;
  }

  /**
   * Builds a student information form field.
   */
  field(field) {
    return `<div><label class="form-label">${this.escape(field.label)}</label><input class="form-control" name="${this.escape(field.name)}" type="text" ${field.required ? "required" : ""}><div class="invalid-feedback" data-error-for="${this.escape(field.name)}"></div></div>`;
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
