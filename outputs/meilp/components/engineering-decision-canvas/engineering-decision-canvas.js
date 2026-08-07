window.MEILP = window.MEILP || {};

/**
 * Reusable material and design decision canvas for engineering review stations.
 */
class EngineeringDecisionCanvasComponent extends window.MEILP.BaseComponent {
  constructor(options = {}) {
    super(options);
    this.viewer = null;
  }

  static register(registry) {
    registry.register("engineering-decision-canvas", EngineeringDecisionCanvasComponent);
  }

  render() {
    const components = Array.isArray(this.config.components) ? this.config.components : [];
    const saved = this.load() || {};

    this.element = document.createElement("section");
    this.element.className = "meilp-component engineering-decision-canvas-component";
    this.element.innerHTML = `
      <div class="card component-card">
        <div class="card-header">
          <div>
            <span class="component-kicker">${this.escape(this.config.stationCode || "Decision Canvas")}</span>
            <h2>${this.escape(this.config.title || "Engineering Decision Canvas")}</h2>
          </div>
          <i class="bi bi-clipboard2-check" aria-hidden="true"></i>
        </div>
        <div class="card-body">
          ${this.renderReferenceImage()}
          <div class="decision-canvas-stack">
            ${components.map((component) => this.renderCanvas(component, saved[component.id] || {})).join("")}
          </div>
        </div>
      </div>
    `;

    this.renderReferenceViewer();
    this.bindAutosave();
    return this.element;
  }

  renderReferenceImage() {
    if (!this.config.image) {
      return "";
    }

    return `
      <div class="decision-canvas-reference" data-decision-reference-viewer></div>
    `;
  }

  renderReferenceViewer() {
    const host = this.element.querySelector("[data-decision-reference-viewer]");
    if (!host || !this.config.image || !window.MEILP.ImageViewerComponent) {
      return;
    }

    this.viewer = new window.MEILP.ImageViewerComponent({
      config: {
        id: `${this.config.id || "decisionCanvas"}ReferenceViewer`,
        title: this.config.imageTitle || this.config.title || "Engineering Reference Asset",
        figure: this.config.figure || "",
        description: this.config.imageDescription || "",
        image: this.config.image,
        alt: this.config.imageAlt || this.config.title || "Engineering reference asset",
        placeholderImage: this.config.placeholderImage,
        errorImage: this.config.errorImage,
        zoom: this.config.zoom !== false,
        fullscreen: this.config.fullscreen !== false
      },
      stateManager: this.stateManager,
      eventBus: this.eventBus
    });

    host.append(this.viewer.render());
  }

  renderCanvas(component, saved) {
    const name = component.name || component.label || component.id;
    const options = this.config.options || {};
    
    return `
      <fieldset class="decision-canvas mb-4 border-bottom pb-4" data-component-id="${this.escape(component.id)}">
        <legend class="d-none">${this.escape(component.id)} ${this.escape(name)}</legend>
        <div class="row">
          <div class="col-md-3 border-end pe-4 d-flex flex-column justify-content-center">
            <h4 class="text-primary mb-1">${this.escape(component.id)}</h4>
            <h3 class="mb-3">${this.escape(name)}</h3>
            <p class="text-muted small">Select the appropriate functional requirements and materials for this component.</p>
          </div>
          <div class="col-md-9 ps-4">
            <div class="row g-3">
              <div class="col-md-6">
                ${this.selectField("Function", "function", options.functions, saved.function)}
              </div>
              <div class="col-md-6">
                ${this.selectField("Loading", "loading", options.loadings, saved.loading)}
              </div>
              <div class="col-md-6">
                ${this.selectField("Service Environment", "serviceEnvironment", options.environments, saved.serviceEnvironment)}
              </div>
              <div class="col-md-6">
                ${this.textareaField("Required Material Properties", "requiredMaterialProperties", saved.requiredMaterialProperties, 1)}
              </div>
              <div class="col-md-6">
                ${this.selectField("Selected Material", "selectedMaterial", options.materials, saved.selectedMaterial)}
              </div>
              <div class="col-md-6">
                ${this.selectField("Alternative Material", "alternativeMaterial", options.materials, saved.alternativeMaterial, true)}
              </div>
              <div class="col-12 mt-3">
                ${this.textareaField("Engineering Justification", "engineeringJustification", saved.engineeringJustification, 3)}
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    `;
  }

  readonlyField(label, value) {
    return `
      <div class="decision-field">
        <label class="form-label">${this.escape(label)}</label>
        <input class="form-control" type="text" value="${this.escape(value)}" readonly>
      </div>
    `;
  }

  inputField(label, name, value = "", optional = false) {
    return `
      <div class="decision-field">
        <label class="form-label">${this.escape(label)}${optional ? " <span class=\"text-muted\">(optional)</span>" : ""}</label>
        <input class="form-control" type="text" data-decision-field="${this.escape(name)}" value="${this.escape(value)}">
      </div>
    `;
  }

  textareaField(label, name, value = "", rows = 3) {
    return `
      <div class="decision-field decision-field-wide">
        <label class="form-label">${this.escape(label)}</label>
        <textarea class="form-control" rows="${rows}" data-decision-field="${this.escape(name)}">${this.escape(value)}</textarea>
      </div>
    `;
  }

  selectField(label, name, options, value = "", optional = false) {
    if (!options || !Array.isArray(options) || options.length === 0) {
      return this.inputField(label, name, value, optional);
    }
    const escapedValue = this.escape(value);
    const optionsHtml = options.map(opt => {
      const escapedOpt = this.escape(opt);
      const selected = escapedValue === escapedOpt ? "selected" : "";
      return `<option value="${escapedOpt}" ${selected}>${escapedOpt || "-- Select --"}</option>`;
    }).join("");
    
    return `
      <div class="decision-field">
        <label class="form-label">${this.escape(label)}${optional ? " <span class=\"text-muted\">(optional)</span>" : ""}</label>
        <select class="form-select" data-decision-field="${this.escape(name)}">
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  bindAutosave() {
    this.element.querySelectorAll("[data-decision-field]").forEach((input) => {
      input.addEventListener("input", () => this.save(this.collect()));
      input.addEventListener("change", () => this.save(this.collect()));
    });
  }

  collect() {
    const value = {};
    this.element.querySelectorAll("[data-component-id]").forEach((canvas) => {
      const componentId = canvas.dataset.componentId;
      value[componentId] = {};
      canvas.querySelectorAll("[data-decision-field]").forEach((input) => {
        value[componentId][input.dataset.decisionField] = input.value.trim();
      });
    });
    return value;
  }

  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value || "") : String(value || "");
  }

  destroy() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
    super.destroy();
  }
}

window.MEILP.EngineeringDecisionCanvasComponent = EngineeringDecisionCanvasComponent;
window.MEILP.registerEngineeringDecisionCanvasComponent = EngineeringDecisionCanvasComponent.register;
