window.MEILP = window.MEILP || {};

/**
 * Reusable image labeling component. Marker coordinates and fields come from
 * configuration, while student responses are stored through StateManager.
 */
class ImageLabelComponent extends window.MEILP.BaseComponent {
  /**
   * Creates an image-label activity component.
   */
  constructor(options = {}) {
    super(options);
    this.labels = Array.isArray(this.config.labels) ? this.config.labels : [];
    this.options = Array.isArray(this.config.options) ? this.config.options : [];
    this.activityType = this.config.activityType || "image-label";
    this.viewer = null;
    this.inputHandlers = [];
    this.startedAt = new Date().toISOString();
    this.attemptNumber = 0;
  }

  /**
   * Registers this component with the platform component registry.
   */
  static register(registry) {
    registry.register("image-label", ImageLabelComponent);
  }

  /**
   * Renders the image, markers, response controls, and actions.
   */
  render() {
    this.element = document.createElement("section");
    this.element.className = "meilp-component image-label-component";
    this.element.innerHTML = `
      <div class="card component-card">
        <div class="card-header">
          <div>
            <span class="component-kicker">Image Labeling</span>
            <h2>${this.escape(this.config.title || "Identify the Components")}</h2>
          </div>
          <i class="bi bi-tags" aria-hidden="true"></i>
        </div>
        <div class="card-body">
          <div data-label-viewer></div>
          <div class="label-input-panel">
            <div class="table-responsive">
              <table class="table align-middle label-table">
                <thead>
                  <tr>
                    <th scope="col">Component</th>
                    <th scope="col">Select Component</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.labels.map((label, index) => this.renderRow(label, index)).join("")}
                </tbody>
              </table>
            </div>
            <div class="component-actions">
              <button class="btn btn-primary" type="button" data-label-save>
                <i class="bi bi-save" aria-hidden="true"></i>
                Save
              </button>
              <button class="btn btn-outline-primary" type="button" data-label-reset>
                <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderViewer();
    this.bindEvents();
    this.setValue(this.load());
    this.validate();
    return this.element;
  }

  /**
   * Renders the image viewer used by this labeling component.
   */
  renderViewer() {
    this.viewer = new window.MEILP.ImageViewerComponent({
      config: {
        id: `${this.config.id || "imageLabel"}Viewer`,
        title: this.config.imageTitle || this.config.title || "Label Image",
        figure: this.config.figure || "",
        description: this.config.description || "",
        image: this.config.image,
        placeholderImage: this.config.placeholderImage,
        errorImage: this.config.errorImage,
        zoom: this.config.zoom !== false,
        fullscreen: this.config.fullscreen !== false
      },
      stateManager: this.stateManager,
      eventBus: this.eventBus
    });

    const viewerHost = this.element.querySelector("[data-label-viewer]");
    if (!viewerHost) {
      return;
    }
    viewerHost.append(this.viewer.render());
    this.addMarkers();
  }

  /**
   * Adds passive numeric markers over the image viewer.
   */
  addMarkers() {
    const stage = this.viewer.getStageElement();
    if (!stage) {
      return;
    }
    const markerLayer = document.createElement("div");
    markerLayer.className = "label-marker-layer";
    markerLayer.setAttribute("aria-hidden", "true");

    this.labels.forEach((label, index) => {
      let x = label.x;
      let y = label.y;
      if (x === undefined && label.left !== undefined) x = parseFloat(label.left);
      if (y === undefined && label.top !== undefined) y = parseFloat(label.top);

      if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
        return;
      }
      const marker = document.createElement("span");
      marker.className = "label-marker";
      marker.textContent = String(this.getComponentNumber(label, index));
      marker.style.left = `${Number(x)}%`;
      marker.style.top = `${Number(y)}%`;
      markerLayer.append(marker);
    });

    stage.append(markerLayer);
  }

  /**
   * Builds one table row for a label target.
   */
  renderRow(label, index = 0) {
    const id = this.getLabelId(label, index);
    const componentNumber = this.getComponentNumber(label, index);
    const options = this.getOptions(label);
    const input = options.length
      ? `
          <select
            class="form-select"
            name="${this.escape(id)}"
            aria-label="Component ${this.escape(componentNumber)} selection"
            data-label-input
          >
            <option value="">Select Component</option>
            ${options.map((option) => `<option value="${this.escape(option)}">${this.escape(option)}</option>`).join("")}
          </select>
        `
      : `
          <input
            class="form-control"
            type="text"
            name="${this.escape(id)}"
            aria-label="Component ${this.escape(componentNumber)} response"
            placeholder="${this.escape(label.placeholder || "Component name")}"
            autocomplete="off"
            data-label-input
          >
        `;
    return `
      <tr>
        <th scope="row">Component ${this.escape(componentNumber)}</th>
        <td>
          ${input}
          <div class="invalid-feedback" data-label-error-for="${this.escape(id)}"></div>
        </td>
        <td><span class="label-status" data-label-status-for="${this.escape(id)}">Missing</span></td>
      </tr>
    `;
  }

  /**
   * Wires action buttons and autosave input listeners.
   */
  bindEvents() {
    const saveButton = this.element.querySelector("[data-label-save]");
    const resetButton = this.element.querySelector("[data-label-reset]");
    if (saveButton) {
      saveButton.addEventListener("click", () => this.save());
    }
    if (resetButton) {
      resetButton.addEventListener("click", () => this.reset());
    }

    this.element.querySelectorAll("[data-label-input]").forEach((input) => {
      const handler = () => {
        this.save(false);
        this.validate();
        this.emit("label-updated", {
          componentId: this.config.id,
          value: this.getValue()
        });
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
      this.inputHandlers.push({ input, handler });
    });
  }

  /**
   * Saves current answers to StateManager.
   */
  save(emitSaved = true) {
    if (emitSaved) {
      this.attemptNumber += 1;
    } else if (this.attemptNumber === 0) {
      this.attemptNumber = 1;
    }

    const value = this.getValue();
    if (this.stateManager) {
      this.stateManager.update((state) => ({
        responses: {
          ...state.responses,
          [this.config.id]: value
        }
      }));
    }

    if (emitSaved) {
      const validation = this.validate();
      this.emit("label-saved", {
        componentId: this.config.id,
        value,
        validation
      });
    }

    return value;
  }

  /**
   * Loads a previously saved response.
   */
  load() {
    if (!this.stateManager || !this.config.id) {
      return {};
    }
    const saved = this.stateManager.getState().responses[this.config.id] || {};
    if (saved.startedAt) {
      this.startedAt = saved.startedAt;
    }
    if (saved.attemptNumber) {
      this.attemptNumber = Number(saved.attemptNumber) || 0;
    }
    return saved;
  }

  /**
   * Validates that every label has a response.
   */
  validate() {
    const value = this.getRawValue();
    const errors = {};

    this.labels.forEach((label, index) => {
      const id = this.getLabelId(label, index);
      const answer = (value[id] || "").trim();

      if (!answer) {
        errors[id] = "Missing";
      }
    });

    this.renderValidation(errors);
    const result = {
      valid: Object.keys(errors).length === 0,
      errors
    };
    this.emit("validation-complete", {
      componentId: this.config.id,
      ...result
    });
    return result;
  }

  /**
   * Returns the complete saved value without changing the response schema.
   */
  getValue() {
    const rawAnswers = this.getRawValue();
    const timestamp = new Date().toISOString();
    const timeTakenSeconds = this.getTimeTakenSeconds();
    const componentResponses = this.labels.map((label, index) => {
      const id = this.getLabelId(label, index);
      const studentAnswer = rawAnswers[id] || "";
      const correctAnswer = label.correctAnswer || "";
      return {
        componentNumber: this.getComponentNumber(label, index),
        studentAnswer,
        correctAnswer,
        correct: correctAnswer ? this.normalize(studentAnswer) === this.normalize(correctAnswer) : null,
        timestamp,
        attemptNumber: this.attemptNumber || 1,
        timeTakenSeconds,
        feedback: label.feedback || ""
      };
    });

    return {
      activityType: this.activityType,
      activityId: this.config.id,
      startedAt: this.startedAt,
      updatedAt: timestamp,
      attemptNumber: this.attemptNumber || 1,
      timeTakenSeconds,
      answers: rawAnswers,
      componentResponses,
      validation: this.buildValidation(rawAnswers)
    };
  }

  /**
   * Reads current form controls into a flat answer object.
   */
  getRawValue() {
    return this.labels.reduce((result, label, index) => {
      const id = this.getLabelId(label, index);
      const input = this.element.querySelector(`[name="${id}"]`);
      result[id] = input ? input.value.trim() : "";
      return result;
    }, {});
  }

  /**
   * Applies saved answers to current controls.
   */
  setValue(value = {}) {
    const answers = this.extractAnswers(value);
    this.labels.forEach((label, index) => {
      const id = this.getLabelId(label, index);
      const input = this.element.querySelector(`[name="${id}"]`);
      if (input) {
        input.value = answers[id] || "";
      }
    });
    this.validate();
  }

  /**
   * Clears all answers and persists the empty state.
   */
  reset() {
    const emptyValue = this.labels.reduce((result, label, index) => {
      result[this.getLabelId(label, index)] = "";
      return result;
    }, {});
    this.setValue(emptyValue);
    this.save(false);
    this.emit("label-reset", {
      componentId: this.config.id
    });
  }

  /**
   * Serializes the component state for diagnostics and submission.
   */
  serialize() {
    const value = this.getValue();
    return {
      componentId: this.config.id,
      value,
      validation: this.validate(),
      labels: this.labels.map((label, index) => {
        let x = label.x;
        let y = label.y;
        if (x === undefined && label.left !== undefined) x = parseFloat(label.left);
        if (y === undefined && label.top !== undefined) y = parseFloat(label.top);
        
        return {
          id: this.getLabelId(label, index),
          componentNumber: this.getComponentNumber(label, index),
          x: x,
          y: y,
          correctAnswer: label.correctAnswer || ""
        };
      })
    };
  }

  /**
   * Renders validation state beside every response control.
   */
  renderValidation(errors) {
    const rawValue = this.getRawValue();
    this.labels.forEach((label, index) => {
      const id = this.getLabelId(label, index);
      const input = this.element.querySelector(`[name="${id}"]`);
      const status = this.element.querySelector(`[data-label-status-for="${id}"]`);
      const feedback = this.element.querySelector(`[data-label-error-for="${id}"]`);
      const answer = rawValue[id] || "";
      const correctAnswer = label.correctAnswer || "";
      const isCorrect = answer && correctAnswer && this.normalize(answer) === this.normalize(correctAnswer);
      const message = errors[id] || (correctAnswer ? (isCorrect ? "Correct" : "Incorrect") : "Valid");

      if (!input || !status || !feedback) {
        return;
      }
      input.classList.toggle("is-invalid", Boolean(errors[id]));
      input.classList.toggle("is-valid", !errors[id] && Boolean(input.value.trim()));
      status.textContent = message;
      status.classList.toggle("is-valid-status", message === "Valid" || message === "Correct");
      status.classList.toggle("is-missing-status", message !== "Valid" && message !== "Correct");
      feedback.textContent = errors[id] || "";
    });
  }

  /**
   * Returns the stable answer key for a label.
   */
  getLabelId(label, index) {
    return `component${this.getComponentNumber(label, index)}`;
  }

  /**
   * Returns the user-visible component number for a label.
   */
  getComponentNumber(label, index) {
    return label.componentNumber || label.id || index + 1;
  }

  /**
   * Returns label-specific dropdown options or component defaults.
   */
  getOptions(label) {
    return Array.isArray(label.options) ? label.options : this.options;
  }

  /**
   * Extracts flat answers from all supported saved response shapes.
   */
  extractAnswers(value = {}) {
    if (value.answers && typeof value.answers === "object") {
      return value.answers;
    }

    if (Array.isArray(value.componentResponses)) {
      return value.componentResponses.reduce((result, response) => {
        result[`component${response.componentNumber}`] = response.studentAnswer || "";
        return result;
      }, {});
    }

    return value;
  }

  /**
   * Builds a compact validation object for persisted responses.
   */
  buildValidation(rawAnswers = this.getRawValue()) {
    const missing = this.labels
      .map((label, index) => this.getLabelId(label, index))
      .filter((id) => !String(rawAnswers[id] || "").trim());

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Calculates elapsed interaction time in seconds.
   */
  getTimeTakenSeconds() {
    const started = Date.parse(this.startedAt);
    if (Number.isNaN(started)) {
      return 0;
    }
    return Math.max(0, Math.round((Date.now() - started) / 1000));
  }

  /**
   * Normalizes answers for case-insensitive matching.
   */
  normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  /**
   * Emits an event through EventBus when available.
   */
  emit(eventName, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, payload);
    }
  }

  /**
   * Escapes text for safe HTML output.
   */
  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value) : String(value);
  }

  /**
   * Removes listeners and child component resources.
   */
  destroy() {
    this.inputHandlers.forEach(({ input, handler }) => {
      input.removeEventListener("input", handler);
      input.removeEventListener("change", handler);
    });
    this.inputHandlers = [];
    if (this.viewer) {
      this.viewer.destroy();
    }
    super.destroy();
  }
}

window.MEILP.ImageLabelComponent = ImageLabelComponent;
window.MEILP.registerImageLabelComponent = ImageLabelComponent.register;
