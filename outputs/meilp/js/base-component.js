window.MEILP = window.MEILP || {};

/**
 * Base class for all future assignment components.
 * Subclasses must implement render() and can override lifecycle methods as
 * needed while keeping a consistent platform contract.
 */
class BaseComponent {
  /**
   * Creates a component with platform service references.
   */
  constructor({ config = {}, stateManager = null, eventBus = null } = {}) {
    this.config = config;
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.element = null;
  }

  /**
   * Renders this component. Subclasses must implement this method.
   */
  render() {
    throw new Error("BaseComponent.render must be implemented by subclasses.");
  }

  /**
   * Saves this component's value through StateManager.
   */
  save(value) {
    if (!this.stateManager || !this.config.id) {
      return value;
    }

    this.stateManager.update((state) => ({
      responses: {
        ...state.responses,
        [this.config.id]: value
      }
    }));

    if (this.eventBus) {
      this.eventBus.emit("component:saved", {
        componentId: this.config.id,
        value
      });
    }

    return value;
  }

  /**
   * Loads this component's saved value from StateManager.
   */
  load() {
    if (!this.stateManager || !this.config.id) {
      return null;
    }

    return this.stateManager.getState().responses[this.config.id] || null;
  }

  /**
   * Returns a validation result for this component.
   */
  validate() {
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Removes the rendered element and releases the DOM reference.
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

window.MEILP.BaseComponent = BaseComponent;
