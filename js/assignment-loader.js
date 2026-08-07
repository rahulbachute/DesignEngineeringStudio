window.MEILP = window.MEILP || {};

/**
 * Loads and validates assignment configuration without hardcoding assignment
 * content. Future assignments live at assignments/<assignment-name>/config.json.
 */
class AssignmentLoader {
  constructor({ componentRegistry, eventBus = null, fetchJson }) {
    if (!componentRegistry) {
      throw new Error("AssignmentLoader requires a component registry.");
    }

    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.fetchJson = fetchJson || window.MEILP.fetchJson;
  }

  async load(assignmentName) {
    if (!assignmentName || typeof assignmentName !== "string") {
      return this.reportError("Assignment name is required.");
    }

    const path = `assignments/${assignmentName}/config.json`;
    const config = await this.fetchJson(path, null);
    if (!config) {
      return this.reportError(`Unable to load assignment configuration: ${path}`);
    }

    const validation = this.validate(config);
    if (!validation.valid) {
      return this.reportError("Assignment configuration is invalid.", validation.errors);
    }

    const structure = this.buildStructure(config);
    const missingComponents = this.findMissingComponents(structure);
    if (missingComponents.length > 0) {
      return this.reportError("Assignment requires unregistered components.", missingComponents);
    }

    this.emit("assignment:loaded", structure);
    return {
      ok: true,
      path,
      assignment: structure,
      errors: []
    };
  }

  validate(config) {
    const errors = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object.");
    }

    if (!config.title || typeof config.title !== "string") {
      errors.push("Configuration requires a string title.");
    }

    if (!Array.isArray(config.tasks)) {
      errors.push("Configuration requires a tasks array.");
    }

    (config.tasks || []).forEach((task, index) => {
      if (!task.id || typeof task.id !== "string") {
        errors.push(`Task ${index + 1} requires a string id.`);
      }

      if (!task.type || typeof task.type !== "string") {
        errors.push(`Task ${task.id || index + 1} requires a string type.`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  buildStructure(config) {
    return {
      id: config.id || this.slugify(config.title),
      title: config.title,
      description: config.description || "",
      version: config.version || "1.0.0",
      settings: config.settings || {},
      tasks: config.tasks.map((task, index) => ({
        id: task.id,
        type: task.type,
        title: task.title || `Task ${index + 1}`,
        order: index + 1,
        config: task.config || {},
        components: task.components || []
      }))
    };
  }

  findMissingComponents(assignment) {
    const requiredTypes = new Set();

    assignment.tasks.forEach((task) => {
      task.components.forEach((component) => {
        if (component.type) {
          requiredTypes.add(component.type);
        }
      });
    });

    return Array.from(requiredTypes).filter((type) => !this.componentRegistry.has(type));
  }

  reportError(message, errors = []) {
    const result = {
      ok: false,
      assignment: null,
      errors: [message, ...errors]
    };

    this.emit("assignment:error", result);
    return result;
  }

  emit(eventName, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, payload);
    }
  }

  slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

window.MEILP.AssignmentLoader = AssignmentLoader;
