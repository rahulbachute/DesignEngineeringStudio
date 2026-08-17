window.MEILP = window.MEILP || {};

/**
 * Registry for reusable assignment components.
 * Sprint 2 components will register a type and constructor here.
 */
class ComponentRegistry {
  constructor() {
    this.components = new Map();
  }

  register(type, ComponentClass) {
    if (!type || typeof type !== "string") {
      throw new Error("ComponentRegistry.register requires a component type.");
    }

    if (typeof ComponentClass !== "function") {
      throw new TypeError("ComponentRegistry.register requires a component class.");
    }

    this.components.set(type, ComponentClass);
  }

  has(type) {
    return this.components.has(type);
  }

  create(type, options = {}) {
    const ComponentClass = this.components.get(type);
    if (!ComponentClass) {
      throw new Error(`Component type is not registered: ${type}`);
    }

    return new ComponentClass(options);
  }

  list() {
    return Array.from(this.components.keys());
  }
}

window.MEILP.ComponentRegistry = ComponentRegistry;
