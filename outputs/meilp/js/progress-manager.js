window.MEILP = window.MEILP || {};

/**
 * Tracks assignment progress from the active assignment structure.
 * Future badge and certificate logic should extend this service, not components.
 */
class ProgressManager {
  /**
   * Creates a progress manager backed by StateManager.
   */
  constructor(stateManager, eventBus = null) {
    if (!stateManager) {
      throw new Error("ProgressManager requires a state manager.");
    }

    this.stateManager = stateManager;
    this.eventBus = eventBus;
  }

  /**
   * Starts assignment progress tracking from the provided task list.
   */
  startAssignment(assignment) {
    const safeAssignment = assignment && typeof assignment === "object" ? assignment : {};
    const tasks = Array.isArray(safeAssignment.tasks) ? safeAssignment.tasks : [];
    const firstTaskId = tasks.length > 0 ? tasks[0].id : null;

    return this.stateManager.update({
      assignment: safeAssignment,
      progress: {
        currentTaskId: firstTaskId,
        completedTaskIds: [],
        percentage: 0
      }
    });
  }

  /**
   * Sets the currently active task ID.
   */
  setCurrentTask(taskId) {
    const nextState = this.stateManager.update((state) => ({
      progress: {
        ...state.progress,
        currentTaskId: taskId
      }
    }));

    this.emitProgress(nextState.progress);
    return nextState.progress;
  }

  /**
   * Marks a task as complete and recalculates percentage.
   */
  markTaskComplete(taskId) {
    const nextState = this.stateManager.update((state) => {
      const completed = new Set(state.progress.completedTaskIds);
      completed.add(taskId);
      const tasks = Array.isArray(state.assignment.tasks) ? state.assignment.tasks : [];
      const percentage = this.calculatePercentage(completed.size, tasks.length);

      return {
        progress: {
          ...state.progress,
          completedTaskIds: Array.from(completed),
          percentage
        }
      };
    });

    this.emitProgress(nextState.progress);
    return nextState.progress;
  }

  /**
   * Calculates completion percentage from counts.
   */
  calculatePercentage(completedCount, totalCount) {
    if (!totalCount) {
      return 0;
    }

    return Math.round((completedCount / totalCount) * 100);
  }

  /**
   * Returns current progress state.
   */
  getProgress() {
    return this.stateManager.getState().progress;
  }

  /**
   * Emits a progress update event when EventBus is present.
   */
  emitProgress(progress) {
    if (this.eventBus) {
      this.eventBus.emit("progress:updated", progress);
    }
  }
}

window.MEILP.ProgressManager = ProgressManager;
