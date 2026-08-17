window.MEILP = window.MEILP || {};

/**
 * Composes the Sprint 1 platform engine services.
 * The engine is generic and contains no assignment-specific content.
 */
class PlatformEngine {
  constructor({ storage, config }) {
    this.storage = storage;
    this.config = config;
    this.eventBus = new window.MEILP.EventBus();
    this.stateManager = new window.MEILP.StateManager(storage, {
      settings: {
        theme: config.defaultTheme
      }
    });
    this.componentRegistry = new window.MEILP.ComponentRegistry();
    this.progressManager = new window.MEILP.ProgressManager(this.stateManager, this.eventBus);
    this.assignmentLoader = new window.MEILP.AssignmentLoader({
      componentRegistry: this.componentRegistry,
      eventBus: this.eventBus,
      fetchJson: window.MEILP.fetchJson
    });
    this.router = new window.MEILP.Router({
      eventBus: this.eventBus,
      routes: {
        home: () => this.eventBus.emit("view:home"),
        assignment: (params) => this.loadAssignment(params.name),
        task: (params) => this.openTask(params.taskId),
        summary: () => this.eventBus.emit("view:summary", this.stateManager.getState()),
        submit: () => this.eventBus.emit("view:submit", this.stateManager.getState())
      }
    });
  }

  start() {
    this.router.start();
    this.eventBus.emit("engine:ready", this.getServices());
  }

  getServices() {
    return {
      assignmentLoader: this.assignmentLoader,
      componentRegistry: this.componentRegistry,
      eventBus: this.eventBus,
      progressManager: this.progressManager,
      router: this.router,
      stateManager: this.stateManager
    };
  }

  async loadAssignment(name) {
    const result = await this.assignmentLoader.load(name);
    if (result.ok) {
      this.progressManager.startAssignment(result.assignment);
    }
    return result;
  }

  openTask(taskId) {
    if (taskId) {
      this.progressManager.setCurrentTask(taskId);
    }
    this.eventBus.emit("view:task", {
      taskId,
      state: this.stateManager.getState()
    });
  }
}

window.MEILP.PlatformEngine = PlatformEngine;
