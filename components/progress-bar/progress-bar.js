window.MEILP = window.MEILP || {};

/**
 * Displays assignment progress without knowing assignment content.
 * It reacts to EventBus messages and reads normalized progress state.
 */
class ProgressBarComponent extends window.MEILP.BaseComponent {
  constructor(options = {}) {
    super(options);
    this.unsubscribe = [];
    this.progress = {
      currentTask: 0,
      totalTasks: 0,
      percentage: 0,
      active: false
    };
  }

  static register(registry) {
    registry.register("progress-bar", ProgressBarComponent);
  }

  render() {
    this.element = document.createElement("section");
    this.element.className = "meilp-component progress-bar-component";
    this.element.innerHTML = `
      <div class="card component-card">
        <div class="card-body">
          <div class="progress-summary">
            <div>
              <span class="component-kicker">Progress</span>
              <h2 data-progress-task-label>Task 0 of 0</h2>
            </div>
            <strong data-progress-percentage>0%</strong>
          </div>
          <div class="progress meilp-progress" role="progressbar" aria-label="Assignment progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="progress-bar progress-bar-striped progress-bar-animated" data-progress-bar></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.refreshFromState();
    return this.element;
  }

  bindEvents() {
    if (!this.eventBus) {
      return;
    }

    this.unsubscribe.push(this.eventBus.listen("progress-updated", (payload) => this.updateProgress(payload)));
    this.unsubscribe.push(this.eventBus.listen("progress:updated", (payload) => this.updateProgress(payload)));
    this.unsubscribe.push(this.eventBus.listen("assignment-loaded", (payload) => this.handleAssignmentLoaded(payload)));
    this.unsubscribe.push(this.eventBus.listen("assignment:loaded", (payload) => this.handleAssignmentLoaded(payload)));
    this.unsubscribe.push(this.eventBus.listen("student-info-saved", () => {
      this.progress.active = true;
      this.renderProgress();
    }));
  }

  handleAssignmentLoaded(assignment) {
    const totalTasks = Array.isArray(assignment.tasks) ? assignment.tasks.length : 0;
    this.updateProgress({
      currentTask: totalTasks > 0 ? 1 : 0,
      totalTasks,
      percentage: 0,
      active: totalTasks > 0
    });
  }

  updateProgress(payload = {}) {
    const currentTask = payload.currentTask || this.resolveCurrentTaskIndex(payload.currentTaskId);
    const totalTasks = payload.totalTasks || this.resolveTotalTasks();
    const percentage = typeof payload.percentage === "number"
      ? payload.percentage
      : this.calculatePercentage(currentTask, totalTasks);

    this.progress = {
      currentTask,
      totalTasks,
      percentage,
      active: payload.active !== undefined ? payload.active : this.progress.active
    };

    this.renderProgress();
  }

  refreshFromState() {
    if (!this.stateManager) {
      this.renderProgress();
      return;
    }

    const state = this.stateManager.getState();
    const tasks = state.assignment.tasks || [];
    const currentTask = this.resolveCurrentTaskIndex(state.progress.currentTaskId, tasks);
    this.updateProgress({
      currentTask,
      totalTasks: tasks.length,
      percentage: state.progress.percentage || 0,
      active: Boolean(state.student.saved)
    });
  }

  renderProgress() {
    if (!this.element) {
      return;
    }

    const safePercentage = Math.max(0, Math.min(100, this.progress.percentage || 0));
    const taskLabel = this.element.querySelector("[data-progress-task-label]");
    const percentageLabel = this.element.querySelector("[data-progress-percentage]");
    const progress = this.element.querySelector(".meilp-progress");
    const bar = this.element.querySelector("[data-progress-bar]");

    taskLabel.textContent = `Task ${this.progress.currentTask || 0} of ${this.progress.totalTasks || 0}`;
    percentageLabel.textContent = this.config.showPercentage === false ? "" : `${safePercentage}%`;
    progress.setAttribute("aria-valuenow", String(safePercentage));
    bar.style.width = `${safePercentage}%`;
    bar.classList.toggle("bg-success", safePercentage === 100);
    this.element.classList.toggle("component-inactive", !this.progress.active);
  }

  resolveCurrentTaskIndex(taskId, tasks = null) {
    const assignmentTasks = tasks || this.getAssignmentTasks();
    if (!taskId || assignmentTasks.length === 0) {
      return assignmentTasks.length > 0 ? 1 : 0;
    }

    const index = assignmentTasks.findIndex((task) => task.id === taskId);
    return index >= 0 ? index + 1 : 1;
  }

  resolveTotalTasks() {
    return this.getAssignmentTasks().length;
  }

  getAssignmentTasks() {
    if (!this.stateManager) {
      return [];
    }

    return this.stateManager.getState().assignment.tasks || [];
  }

  calculatePercentage(currentTask, totalTasks) {
    if (!totalTasks) {
      return 0;
    }

    return Math.round((currentTask / totalTasks) * 100);
  }

  destroy() {
    this.unsubscribe.forEach((remove) => remove());
    this.unsubscribe = [];
    super.destroy();
  }
}

window.MEILP.ProgressBarComponent = ProgressBarComponent;
window.MEILP.registerProgressBarComponent = ProgressBarComponent.register;
