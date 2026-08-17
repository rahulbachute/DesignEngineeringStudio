window.addEventListener("DOMContentLoaded", () => {
  const app = new WorkbenchDemo();
  app.start();
});

class WorkbenchDemo {
  constructor() {
    this.storage = new window.MEILP.StorageService("meilp-workbench-demo");
    this.engine = new window.MEILP.PlatformEngine({
      storage: this.storage,
      config: window.MEILP.platformConfig
    });
    this.services = this.engine.getServices();
    window.MEILP.registerAllComponents(this.services.componentRegistry);

    this.assignment = {
      id: "workbench-standard",
      title: "Assignment Workbench",
      courseCode: "PCC303-MEC",
      courseName: "Mechanical Engineering",
      estimatedTime: "45 min",
      tasks: [
        { id: "overview", title: "Assignment Overview", type: "overview" },
        { id: "introduction", title: "Introduction", type: "introduction" },
        { id: "student-information", title: "Student Information", type: "student-information" },
        { id: "task-1", title: "Task 1", type: "image-viewer" },
        { id: "task-2", title: "Task 2", type: "activity" },
        { id: "task-3", title: "Task 3", type: "activity" },
        { id: "task-4", title: "Task 4", type: "activity" },
        { id: "reflection", title: "Reflection", type: "response" },
        { id: "submit", title: "Submit", type: "submit" }
      ],
      widgets: [
        { id: "progress", title: "Progress Summary", icon: "bi-graph-up", cardType: "information" },
        { id: "responses", title: "Current Responses", icon: "bi-card-checklist", cardType: "student-response" },
        { id: "hint", title: "Engineering Hint", icon: "bi-lightbulb", cardType: "hint", text: "Use the activity panel as the single source for task work." },
        { id: "note", title: "Important Note", icon: "bi-exclamation-triangle", cardType: "warning", text: "Save a draft before moving between major activities." },
        { id: "outcome", title: "Learning Outcome", icon: "bi-bullseye", cardType: "theory", text: "Outcomes are configurable per assignment." },
        { id: "co", title: "CO Mapping", icon: "bi-diagram-2", cardType: "information", text: "Course outcome mapping appears here." },
        { id: "time", title: "Time Remaining", icon: "bi-clock", cardType: "calculation", text: "Future timed attempts will update this widget." },
        { id: "assistant", title: "AI Assistant", icon: "bi-stars", cardType: "information", text: "Future feedback tools can be mounted here." }
      ]
    };

    this.currentTaskIndex = 0;
    this.completedTaskIds = new Set();
    this.activeComponent = null;
  }

  start() {
    this.engine.start();
    this.services.progressManager.startAssignment(this.assignment);
    this.services.eventBus.emit("assignment-loaded", this.assignment);
    this.applyStoredTheme();
    this.bindEvents();
    this.renderStaticMeta();
    this.renderTaskNavigation();
    this.renderWidgets();
    this.renderAttemptMode();
  }

  bindEvents() {
    document.querySelector("[data-workbench-theme-toggle]").addEventListener("click", () => this.toggleTheme());
    document.querySelector("[data-workbench-help]").addEventListener("click", () => {
      this.services.eventBus.emit("workbench-help-requested", { taskId: this.getCurrentTask().id });
      this.renderHelpNotice();
    });

    this.services.eventBus.listen("student-info-saved", () => {
      this.completedTaskIds.add("student-information");
      this.moveToTask("task-1");
    });
    this.services.eventBus.listen("navigate-next", () => this.goNext());
    this.services.eventBus.listen("navigate-previous", () => this.goPrevious());
    this.services.eventBus.listen("navigate-home", () => this.moveToTask("overview"));
    this.services.eventBus.listen("save-request", () => this.saveDraft());
  }

  renderStaticMeta() {
    document.querySelector("[data-workbench-title]").textContent = this.assignment.title;
    document.querySelector("[data-course-code]").textContent = this.assignment.courseCode;
    document.querySelector("[data-course-name]").textContent = this.assignment.courseName;
  }

  renderAttemptMode() {
    this.setActivityHeader("Attempt Setup", "Choose Attempt Mode");
    this.setBreadcrumb("Choose Attempt Mode");
    const host = this.getActivityHost();
    host.innerHTML = `
      <section class="workbench-card card-information">
        <h3>Choose Attempt Mode</h3>
        <p class="text-muted mb-3">Select how this attempt should be recorded before starting the assignment workflow.</p>
        <div class="attempt-grid">
          <label class="attempt-option">
            <input class="form-check-input me-2" type="radio" name="attemptMode" value="individual" checked>
            <strong>Individual</strong>
            <span>Use one student record for this attempt.</span>
          </label>
          <label class="attempt-option">
            <input class="form-check-input me-2" type="radio" name="attemptMode" value="group">
            <strong>Group</strong>
            <span>Use group details and multiple student names.</span>
          </label>
        </div>
        <div class="component-actions">
          <button class="btn btn-primary" type="button" data-start-attempt>
            <i class="bi bi-play-fill" aria-hidden="true"></i>
            Continue
          </button>
        </div>
      </section>
    `;
    host.querySelector("[data-start-attempt]").addEventListener("click", () => {
      const mode = host.querySelector("[name='attemptMode']:checked").value;
      this.saveAttemptMode(mode);
      this.renderStudentInformation(mode);
    });
    this.updateProgressDisplay(0);
  }

  saveAttemptMode(mode) {
    this.services.stateManager.update((state) => ({
      settings: {
        ...state.settings,
        attemptMode: mode
      }
    }));
    document.querySelector("[data-attempt-mode-label]").innerHTML = `<i class="bi bi-person" aria-hidden="true"></i> ${this.toTitle(mode)} Mode`;
  }

  renderStudentInformation(mode) {
    this.moveToTask("student-information", false);
    this.setActivityHeader("Student Setup", mode === "individual" ? "Individual Information" : "Group Information");
    this.setBreadcrumb("Student Information");
    const host = this.getActivityHost();
    host.innerHTML = "";
    const card = document.createElement("section");
    card.className = "workbench-card";
    card.innerHTML = `
      <h3>${mode === "individual" ? "Individual Attempt Details" : "Group Attempt Details"}</h3>
      <form novalidate data-attempt-form>
        <div class="student-form-grid">${this.getAttemptFields(mode).map((field) => this.renderFormField(field)).join("")}</div>
        <div class="component-actions">
          <button class="btn btn-primary" type="submit"><i class="bi bi-save" aria-hidden="true"></i> Save Student Information</button>
          <button class="btn btn-outline-danger" type="button" data-reset-attempt><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</button>
        </div>
      </form>
    `;
    host.append(card);
    this.populateAttemptForm(mode, card);
    card.querySelector("[data-attempt-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveStudentInfo(mode, card);
    });
    card.querySelector("[data-reset-attempt]").addEventListener("click", () => this.resetAttemptForm(card));
    this.renderNavigationComponent(host);
  }

  getAttemptFields(mode) {
    const shared = [
      { name: "collegeName", label: "College / Institution", required: true, type: "select", options: window.MEILP.colleges },
      { name: "division", label: "Division", required: true },
      { name: "className", label: "Class", required: true },
      { name: "academicYear", label: "Academic Year", required: true }
    ];
    if (mode === "individual") {
      return [
        { name: "rollNumber", label: "Roll Number", required: true, numeric: true },
        { name: "studentName", label: "Student Name", required: true, nameOnly: true },
        ...shared
      ];
    }
    return [
      { name: "groupNumber", label: "Group Number", required: true, numeric: true },
      { name: "groupName", label: "Group Name", required: false },
      ...shared,
      { name: "student1", label: "Student 1", required: true, nameOnly: true },
      { name: "student2", label: "Student 2", required: true, nameOnly: true },
      { name: "student3", label: "Student 3", required: true, nameOnly: true },
      { name: "student4", label: "Student 4", required: true, nameOnly: true }
    ];
  }

  renderFormField(field) {
    if (field.type === "select" || field.name === "collegeName") {
      const options = field.options || window.MEILP.colleges || [];
      return `
        <div>
          <label class="form-label" for="attempt-${field.name}">${field.label}</label>
          <select class="form-select" id="attempt-${field.name}" name="${field.name}" ${field.required ? "required" : ""}>
            <option value="" disabled selected>Select your College / Institution</option>
            ${options.map((opt) => `<option value="${this.escape(opt)}">${this.escape(opt)}</option>`).join("")}
          </select>
          <div class="invalid-feedback" data-error-for="${field.name}"></div>
        </div>
      `;
    }
    return `
      <div>
        <label class="form-label" for="attempt-${field.name}">${field.label}</label>
        <input class="form-control" id="attempt-${field.name}" name="${field.name}" type="text" autocomplete="off" ${field.required ? "required" : ""}>
        <div class="invalid-feedback" data-error-for="${field.name}"></div>
      </div>
    `;
  }

  populateAttemptForm(mode, card) {
    const saved = this.services.stateManager.getState().student || {};
    this.getAttemptFields(mode).forEach((field) => {
      const input = card.querySelector(`[name="${field.name}"]`);
      if (input && saved[field.name]) {
        input.value = saved[field.name];
      }
    });
  }

  saveStudentInfo(mode, card) {
    const fields = this.getAttemptFields(mode);
    const value = {};
    const errors = {};
    fields.forEach((field) => {
      const input = card.querySelector(`[name="${field.name}"]`);
      const fieldValue = input.value.trim();
      value[field.name] = fieldValue;
      if (field.required && !fieldValue) {
        errors[field.name] = `${field.label} is required.`;
      } else if (field.numeric && fieldValue && !/^\d+$/.test(fieldValue)) {
        errors[field.name] = `${field.label} must be numeric.`;
      } else if (field.nameOnly && fieldValue && !/^[A-Za-z][A-Za-z ]*$/.test(fieldValue)) {
        errors[field.name] = `${field.label} should contain alphabetic characters only.`;
      }
    });
    this.showAttemptValidation(card, fields, errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.services.stateManager.update((state) => ({
      student: {
        ...state.student,
        ...value,
        attemptMode: mode,
        saved: true
      }
    }));
    this.services.eventBus.emit("student-info-saved", { mode, value });
  }

  showAttemptValidation(card, fields, errors) {
    fields.forEach((field) => {
      const input = card.querySelector(`[name="${field.name}"]`);
      const feedback = card.querySelector(`[data-error-for="${field.name}"]`);
      const message = errors[field.name] || "";
      input.classList.toggle("is-invalid", Boolean(message));
      input.classList.toggle("is-valid", !message && Boolean(input.value.trim()));
      feedback.textContent = message;
    });
  }

  resetAttemptForm(card) {
    card.querySelectorAll("input").forEach((input) => {
      input.value = "";
      input.classList.remove("is-valid", "is-invalid");
    });
    card.querySelectorAll("[data-error-for]").forEach((feedback) => {
      feedback.textContent = "";
    });
  }

  moveToTask(taskId, render = true) {
    const index = this.assignment.tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      return;
    }
    this.currentTaskIndex = index;
    const task = this.getCurrentTask();
    this.services.progressManager.setCurrentTask(task.id);
    if (render) {
      this.renderCurrentTask();
    }
    this.renderTaskNavigation();
    this.renderWidgets();
    this.updateProgressDisplay();
  }

  renderCurrentTask() {
    const task = this.getCurrentTask();
    this.setActivityHeader(this.toTitle(task.type), task.title);
    this.setBreadcrumb(task.title);
    const host = this.getActivityHost();
    host.innerHTML = "";
    if (task.id === "student-information") {
      const mode = this.services.stateManager.getState().settings.attemptMode || "individual";
      this.renderStudentInformation(mode);
      return;
    }
    if (task.type === "image-viewer") {
      this.renderImageViewerTask(host);
    } else {
      this.renderGenericTask(host, task);
    }
    this.renderNavigationComponent(host);
  }

  renderImageViewerTask(host) {
    const viewer = this.services.componentRegistry.create("image-viewer", {
      config: {
        id: "workbenchImageViewer",
        title: "Image Viewer Placeholder",
        figure: "Workbench Figure",
        description: "A configurable component slot for assignment media.",
        image: "assets/images/generic-engineering-diagram.svg",
        placeholderImage: "assets/images/image-placeholder.svg",
        errorImage: "assets/images/image-error.svg",
        zoom: true,
        fullscreen: true
      },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    this.mountComponent(viewer, host);
  }

  renderGenericTask(host, task) {
    host.innerHTML = `
      <section class="workbench-card card-information">
        <h3>${window.MEILP.escapeHtml(task.title)}</h3>
        <p>This center panel is a configurable component slot. Future assignments can mount reusable components here without changing the Workbench architecture.</p>
      </section>
      <section class="workbench-card card-student-response">
        <h3>Student Response Card</h3>
        <textarea class="form-control" rows="5" data-generic-response placeholder="Configurable response area"></textarea>
      </section>
    `;
    const response = host.querySelector("[data-generic-response]");
    response.value = this.services.stateManager.getState().responses[task.id] || "";
    response.addEventListener("input", () => {
      this.services.stateManager.update((state) => ({
        responses: {
          ...state.responses,
          [task.id]: response.value
        }
      }));
      this.renderWidgets();
    });
  }

  renderNavigationComponent(host) {
    const nav = this.services.componentRegistry.create("assignment-navigation", {
      config: { id: "workbenchNavigation" },
      stateManager: this.services.stateManager,
      eventBus: this.services.eventBus
    });
    host.append(nav.render());
  }

  mountComponent(component, host) {
    if (this.activeComponent && this.activeComponent.destroy) {
      this.activeComponent.destroy();
    }
    this.activeComponent = component;
    host.append(component.render());
  }

  goNext() {
    const task = this.getCurrentTask();
    this.completedTaskIds.add(task.id);
    const nextIndex = Math.min(this.assignment.tasks.length - 1, this.currentTaskIndex + 1);
    this.currentTaskIndex = nextIndex;
    this.services.progressManager.markTaskComplete(task.id);
    this.renderCurrentTask();
    this.renderTaskNavigation();
    this.renderWidgets();
    this.updateProgressDisplay();
  }

  goPrevious() {
    this.currentTaskIndex = Math.max(0, this.currentTaskIndex - 1);
    this.renderCurrentTask();
    this.renderTaskNavigation();
    this.updateProgressDisplay();
  }

  saveDraft() {
    const task = this.getCurrentTask();
    this.completedTaskIds.add(task.id);
    this.services.progressManager.markTaskComplete(task.id);
    this.renderTaskNavigation();
    this.renderWidgets();
    this.updateProgressDisplay();
  }

  renderTaskNavigation() {
    const html = this.assignment.tasks.map((task, index) => this.renderTaskButton(task, index)).join("");
    document.querySelector("[data-task-list]").innerHTML = html;
    document.querySelector("[data-mobile-task-list]").innerHTML = html;
    document.querySelectorAll("[data-task-id]").forEach((button) => {
      button.addEventListener("click", () => this.moveToTask(button.dataset.taskId));
    });
  }

  renderTaskButton(task, index) {
    const status = this.getTaskStatus(task, index);
    const icon = status === "completed" ? "bi-check2" : status === "current" ? "bi-arrow-right" : "bi-circle";
    return `
      <li>
        <button class="task-button ${status === "current" ? "is-current" : ""}" type="button" data-task-id="${task.id}">
          <span class="task-icon is-${status}"><i class="bi ${icon}" aria-hidden="true"></i></span>
          <span>${window.MEILP.escapeHtml(task.title)}</span>
          <small>${this.toTitle(status)}</small>
        </button>
      </li>
    `;
  }

  getTaskStatus(task, index) {
    if (this.completedTaskIds.has(task.id)) {
      return "completed";
    }
    if (index === this.currentTaskIndex) {
      return "current";
    }
    return "pending";
  }

  renderWidgets() {
    const state = this.services.stateManager.getState();
    const progress = this.getProgressPercent();
    document.querySelector("[data-widget-list]").innerHTML = this.assignment.widgets.map((widget) => {
      return `
        <article class="workbench-widget card-${widget.cardType}">
          <h3><i class="bi ${widget.icon}" aria-hidden="true"></i>${widget.title}</h3>
          ${this.renderWidgetBody(widget, state, progress)}
        </article>
      `;
    }).join("");
    this.updateWidgetProgressBars(progress);
  }

  renderWidgetBody(widget, state, progress) {
    if (widget.id === "progress") {
      return `
        <p>Overall Progress: ${progress}%</p>
        <div class="progress mini-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" data-widget-progress-bar></div>
        </div>
        <p class="mt-2">Current Task: ${window.MEILP.escapeHtml(this.getCurrentTask().title)}</p>
        <p>Total Tasks: ${this.assignment.tasks.length}</p>
        <p>Estimated Time: ${this.assignment.estimatedTime}</p>
      `;
    }
    if (widget.id === "responses") {
      const responseCount = Object.keys(state.responses || {}).filter((key) => state.responses[key]).length;
      return `<p>${responseCount} response areas contain saved draft data.</p>`;
    }
    return `<p>${window.MEILP.escapeHtml(widget.text || "")}</p>`;
  }

  updateWidgetProgressBars(progress) {
    document.querySelectorAll("[data-widget-progress-bar]").forEach((bar) => {
      bar.style.width = `${progress}%`;
    });
  }

  updateProgressDisplay(value = null) {
    const progress = value === null ? this.getProgressPercent() : value;
    document.querySelector("[data-header-progress]").innerHTML = `<i class="bi bi-activity" aria-hidden="true"></i> ${progress}%`;
    document.querySelector("[data-task-progress-label]").textContent = `Task ${this.currentTaskIndex + 1} of ${this.assignment.tasks.length}`;
  }

  getProgressPercent() {
    return Math.round((this.completedTaskIds.size / this.assignment.tasks.length) * 100);
  }

  setActivityHeader(kicker, title) {
    document.querySelector("[data-activity-kicker]").textContent = kicker;
    document.querySelector("[data-activity-title]").textContent = title;
  }

  setBreadcrumb(currentTask) {
    const items = ["Home", "Mechanical Engineering", this.assignment.courseCode, "Assignment", currentTask];
    document.querySelector("[data-workbench-breadcrumb]").innerHTML = items.map((item, index) => {
      const active = index === items.length - 1;
      return `<li class="breadcrumb-item ${active ? "active" : ""}" ${active ? "aria-current='page'" : ""}>${window.MEILP.escapeHtml(item)}</li>`;
    }).join("");
  }

  applyStoredTheme() {
    const theme = this.services.stateManager.getState().settings.theme || "light";
    this.setTheme(theme);
  }

  toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
  }

  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    this.services.stateManager.update((state) => ({
      settings: {
        ...state.settings,
        theme
      }
    }));
    const icon = document.querySelector("[data-workbench-theme-toggle] i");
    icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  }

  renderHelpNotice() {
    const host = this.getActivityHost();
    const notice = document.createElement("section");
    notice.className = "workbench-card card-hint";
    notice.innerHTML = "<h3>Help</h3><p>Workbench help is configurable and can be replaced by assignment-specific guidance in future sprints.</p>";
    host.prepend(notice);
  }

  getActivityHost() {
    return document.querySelector("[data-activity-host]");
  }

  getCurrentTask() {
    return this.assignment.tasks[this.currentTaskIndex];
  }

  toTitle(value) {
    return String(value)
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
