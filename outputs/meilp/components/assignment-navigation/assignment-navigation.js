window.MEILP = window.MEILP || {};

/**
 * Emits navigation intent events without directly changing routes or pages.
 */
class AssignmentNavigationComponent extends window.MEILP.BaseComponent {
  /**
   * Creates assignment navigation controls.
   */
  constructor(options = {}) {
    super(options);
    this.unsubscribe = [];
    this.state = {
      currentTask: 0,
      totalTasks: 0,
      canSave: false
    };
  }

  /**
   * Registers this component with the platform component registry.
   */
  static register(registry) {
    registry.register("assignment-navigation", AssignmentNavigationComponent);
  }

  /**
   * Renders navigation controls and syncs initial state.
   */
  render() {
    this.element = document.createElement("section");
    this.element.className = "meilp-component assignment-navigation-component";
    this.element.innerHTML = `
      <div class="component-toolbar" aria-label="Assignment navigation">
        <button class="btn btn-outline-primary" type="button" data-nav-home>
          <i class="bi bi-house" aria-hidden="true"></i>
          Home
        </button>
        <div class="nav-step-controls">
          <button class="btn btn-outline-primary" type="button" data-nav-previous>
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Previous
          </button>
          <button class="btn btn-primary" type="button" data-nav-save>
            <i class="bi bi-save" aria-hidden="true"></i>
            Save
          </button>
          <button class="btn btn-primary" type="button" data-nav-next>
            Next
            <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.refreshFromState();
    return this.element;
  }

  /**
   * Wires button handlers and state synchronization events.
   */
  bindEvents() {
    const homeButton = this.element.querySelector("[data-nav-home]");
    const previousButton = this.element.querySelector("[data-nav-previous]");
    const saveButton = this.element.querySelector("[data-nav-save]");
    const nextButton = this.element.querySelector("[data-nav-next]");
    if (homeButton) {
      homeButton.addEventListener("click", () => this.emit("navigate-home"));
    }
    if (previousButton) {
      previousButton.addEventListener("click", () => this.emit("navigate-previous"));
    }
    if (saveButton) {
      saveButton.addEventListener("click", () => this.emit("save-request"));
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => this.emit("navigate-next"));
    }

    if (!this.eventBus) {
      return;
    }

    this.unsubscribe.push(this.eventBus.listen("progress-updated", (payload) => this.updateState(payload)));
    this.unsubscribe.push(this.eventBus.listen("progress:updated", (payload) => this.updateState(payload)));
    this.unsubscribe.push(this.eventBus.listen("assignment-loaded", (payload) => this.handleAssignmentLoaded(payload)));
    this.unsubscribe.push(this.eventBus.listen("assignment:loaded", (payload) => this.handleAssignmentLoaded(payload)));
    this.unsubscribe.push(this.eventBus.listen("student-info-saved", () => {
      this.state.canSave = true;
      this.updateButtons();
    }));
    this.unsubscribe.push(this.eventBus.listen("student-info-reset", () => {
      this.state.canSave = false;
      this.updateButtons();
    }));
  }

  /**
   * Initializes state from assignment-loaded events.
   */
  handleAssignmentLoaded(assignment) {
    const totalTasks = Array.isArray(assignment.tasks) ? assignment.tasks.length : 0;
    this.updateState({
      currentTask: totalTasks > 0 ? 1 : 0,
      totalTasks
    });
  }

  /**
   * Updates local navigation state from progress payloads.
   */
  updateState(payload = {}) {
    this.state.currentTask = payload.currentTask || this.resolveCurrentTaskIndex(payload.currentTaskId);
    this.state.totalTasks = payload.totalTasks || this.resolveTotalTasks();
    this.updateButtons();
  }

  /**
   * Refreshes navigation state from StateManager.
   */
  refreshFromState() {
    if (!this.stateManager) {
      this.updateButtons();
      return;
    }

    const state = this.stateManager.getState();
    this.state.canSave = Boolean(state.student.saved);
    this.updateState({
      currentTask: this.resolveCurrentTaskIndex(state.progress.currentTaskId),
      totalTasks: this.resolveTotalTasks()
    });
  }

  /**
   * Enables or disables buttons based on current navigation state.
   */
  updateButtons() {
    if (!this.element) {
      return;
    }

    const previousButton = this.element.querySelector("[data-nav-previous]");
    const saveButton = this.element.querySelector("[data-nav-save]");
    const nextButton = this.element.querySelector("[data-nav-next]");

    if (previousButton) {
      previousButton.disabled = this.state.currentTask <= 1;
    }
    if (saveButton) {
      saveButton.disabled = !this.state.canSave;
    }
    if (nextButton) {
      nextButton.disabled = this.state.totalTasks === 0 || this.state.currentTask >= this.state.totalTasks;
    }
  }

  /**
   * Emits a navigation event through EventBus.
   */
  emit(eventName) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, {
        componentId: this.config.id,
        currentTask: this.state.currentTask,
        totalTasks: this.state.totalTasks
      });
    }
  }

  /**
   * Resolves a task ID to a one-based task index.
   */
  resolveCurrentTaskIndex(taskId) {
    const tasks = this.getAssignmentTasks();
    if (!taskId || tasks.length === 0) {
      return tasks.length > 0 ? 1 : 0;
    }

    const index = tasks.findIndex((task) => task.id === taskId);
    return index >= 0 ? index + 1 : 1;
  }

  /**
   * Returns the total task count.
   */
  resolveTotalTasks() {
    return this.getAssignmentTasks().length;
  }

  /**
   * Reads assignment tasks from StateManager.
   */
  getAssignmentTasks() {
    if (!this.stateManager) {
      return [];
    }

    return this.stateManager.getState().assignment.tasks || [];
  }

  /**
   * Unsubscribes event listeners and removes the component.
   */
  destroy() {
    this.unsubscribe.forEach((remove) => {
      if (typeof remove === "function") {
        remove();
      }
    });
    this.unsubscribe = [];
    super.destroy();
  }
}

window.MEILP.AssignmentNavigationComponent = AssignmentNavigationComponent;
window.MEILP.registerAssignmentNavigationComponent = AssignmentNavigationComponent.register;
