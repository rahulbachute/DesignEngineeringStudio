window.MEILP = window.MEILP || {};

/**
 * Single source of truth for platform runtime state.
 * State persistence goes through StorageService; localStorage is never accessed
 * directly by application modules.
 */
class StateManager {
  /**
   * Creates a persisted state manager with default platform state.
   */
  constructor(storage, initialState = {}) {
    if (!storage) {
      throw new Error("StateManager requires a storage service.");
    }

    this.storage = storage;
    this.storageKey = "platform-state";
    this.defaultState = {
      student: {},
      assignment: {},
      responses: {},
      progress: {
        currentTaskId: null,
        completedTaskIds: [],
        percentage: 0
      },
      settings: {}
    };
    this.state = this.mergeState(this.defaultState, this.safeRead(initialState));
    this.persist();
  }

  /**
   * Merges a partial state object without dropping known nested branches.
   */
  mergeState(base, patch) {
    const safePatch = patch && typeof patch === "object" ? patch : {};
    return {
      ...base,
      ...safePatch,
      student: { ...base.student, ...(safePatch.student || {}) },
      assignment: { ...base.assignment, ...(safePatch.assignment || {}) },
      responses: { ...base.responses, ...(safePatch.responses || {}) },
      progress: { ...base.progress, ...(safePatch.progress || {}) },
      settings: { ...base.settings, ...(safePatch.settings || {}) }
    };
  }

  /**
   * Returns a defensive copy of the current state.
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Replaces state with a normalized state object.
   */
  setState(nextState) {
    this.state = this.mergeState(this.defaultState, nextState || {});
    this.persist();
    return this.getState();
  }

  /**
   * Applies a state patch or updater callback.
   */
  update(updater) {
    const patch = typeof updater === "function" ? updater(this.getState()) : updater;
    this.state = this.mergeState(this.state, patch || {});
    this.persist();
    return this.getState();
  }

  /**
   * Restores default state and persists it.
   */
  reset() {
    this.state = this.mergeState(this.defaultState, {});
    this.persist();
    return this.getState();
  }

  /**
   * Persists the current state, returning false if browser storage rejects it.
   */
  persist() {
    try {
      this.storage.set(this.storageKey, this.state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads persisted state with malformed JSON and storage failures isolated.
   */
  safeRead(fallback) {
    try {
      return this.storage.get(this.storageKey, fallback);
    } catch {
      return fallback;
    }
  }
}

window.MEILP.StateManager = StateManager;
