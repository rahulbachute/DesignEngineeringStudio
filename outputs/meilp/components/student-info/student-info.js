window.MEILP = window.MEILP || {};

/**
 * Collects reusable student and faculty information before an assignment begins.
 * The component stores normalized data through StateManager and never accesses
 * browser storage directly.
 */
class StudentInformationComponent extends window.MEILP.BaseComponent {
  constructor(options = {}) {
    super(options);
    this.fields = [
      { name: "collegeName", label: "College / Institution", type: "select", options: window.MEILP.colleges, validator: "required" },
      { name: "groupNumber", label: "Group Number", type: "number", validator: "numeric" },
      { name: "division", label: "Division", type: "text", validator: "required" },
      { name: "batch", label: "Batch", type: "text", validator: "required" },
      { name: "student1", label: "Student 1", type: "text", validator: "name" },
      { name: "student2", label: "Student 2", type: "text", validator: "name" },
      { name: "student3", label: "Student 3", type: "text", validator: "name" },
      { name: "student4", label: "Student 4", type: "text", validator: "name" },
      { name: "facultyName", label: "Faculty Name", type: "text", validator: "name" },
      { name: "assignmentDate", label: "Assignment Date", type: "date", validator: "required" }
    ];
    this.inputHandlers = [];
  }

  static register(registry) {
    registry.register("student-info", StudentInformationComponent);
  }

  render() {
    this.element = document.createElement("section");
    this.element.className = "meilp-component student-info-component";
    this.element.innerHTML = `
      <div class="card component-card">
        <div class="card-header">
          <div>
            <span class="component-kicker">Student Setup</span>
            <h2>${this.escape(this.config.title || "Student Information")}</h2>
          </div>
          <i class="bi bi-person-vcard" aria-hidden="true"></i>
        </div>
        <div class="card-body">
          <form novalidate data-student-info-form>
            <div class="row g-3">
              ${this.fields.map((field) => this.renderField(field)).join("")}
            </div>
            <div class="component-actions">
              <button class="btn btn-primary" type="submit">
                <i class="bi bi-save" aria-hidden="true"></i>
                Save
              </button>
              <button class="btn btn-outline-primary" type="button" data-reset-student-info>
                <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    this.populateForm(this.loadStudentInfo());
    return this.element;
  }

  renderField(field) {
    const columnClass = field.name.startsWith("student") ? "col-md-6" : "col-md-4";
    if (field.type === "select" || field.name === "collegeName") {
      const options = field.options || window.MEILP.colleges || [];
      return `
        <div class="${columnClass}">
          <label class="form-label" for="${this.getFieldId(field.name)}">${field.label}</label>
          <select
            class="form-select"
            id="${this.getFieldId(field.name)}"
            name="${field.name}"
            required
            data-student-info-input
          >
            <option value="" disabled selected>Select your College / Institution</option>
            ${options.map((opt) => `<option value="${this.escape(opt)}">${this.escape(opt)}</option>`).join("")}
          </select>
          <div class="invalid-feedback" data-error-for="${field.name}"></div>
        </div>
      `;
    }
    return `
      <div class="${columnClass}">
        <label class="form-label" for="${this.getFieldId(field.name)}">${field.label}</label>
        <input
          class="form-control"
          id="${this.getFieldId(field.name)}"
          name="${field.name}"
          type="${field.type}"
          autocomplete="off"
          required
          data-student-info-input
        >
        <div class="invalid-feedback" data-error-for="${field.name}"></div>
      </div>
    `;
  }

  bindEvents() {
    const form = this.element.querySelector("[data-student-info-form]");
    const resetButton = this.element.querySelector("[data-reset-student-info]");
    const inputs = Array.from(this.element.querySelectorAll("[data-student-info-input]"));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSave();
    });

    resetButton.addEventListener("click", () => this.resetStudentInfo());

    inputs.forEach((input) => {
      const handler = () => this.handleAutoSave();
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
      this.inputHandlers.push({ input, handler });
    });
  }

  handleAutoSave() {
    const value = this.getFormData();
    this.saveStudentInfo(value, false);
    this.emit("student-info-updated", {
      componentId: this.config.id,
      value
    });
  }

  handleSave() {
    const result = this.validate();
    if (!result.valid) {
      this.showValidation(result.errors);
      return false;
    }

    const value = this.getFormData();
    this.saveStudentInfo(value, true);
    this.clearValidation();
    this.emit("student-info-saved", {
      componentId: this.config.id,
      value
    });
    return true;
  }

  saveStudentInfo(value, markSaved) {
    if (!this.stateManager) {
      return value;
    }

    this.stateManager.update((state) => ({
      student: {
        ...state.student,
        ...value,
        saved: markSaved || state.student.saved || false,
        updatedAt: new Date().toISOString()
      },
      responses: {
        ...state.responses,
        [this.config.id]: value
      }
    }));

    return value;
  }

  loadStudentInfo() {
    if (!this.stateManager) {
      return {};
    }

    const state = this.stateManager.getState();
    return {
      ...(state.responses[this.config.id] || {}),
      ...(state.student || {})
    };
  }

  populateForm(values) {
    this.fields.forEach((field) => {
      const input = this.element.querySelector(`[name="${field.name}"]`);
      if (input && Object.prototype.hasOwnProperty.call(values, field.name)) {
        input.value = values[field.name];
      }
    });
  }

  resetStudentInfo() {
    const emptyValue = this.fields.reduce((result, field) => {
      result[field.name] = "";
      return result;
    }, {});

    this.populateForm(emptyValue);
    this.clearValidation();

    if (this.stateManager) {
      this.stateManager.update((state) => ({
        student: {
          ...emptyValue,
          saved: false,
          updatedAt: new Date().toISOString()
        },
        responses: {
          ...state.responses,
          [this.config.id]: emptyValue
        }
      }));
    }

    this.emit("student-info-reset", {
      componentId: this.config.id
    });
  }

  getFormData() {
    return this.fields.reduce((result, field) => {
      const input = this.element.querySelector(`[name="${field.name}"]`);
      result[field.name] = input ? input.value.trim() : "";
      return result;
    }, {});
  }

  validate() {
    const data = this.getFormData();
    const errors = {};
    const namePattern = /^[A-Za-z][A-Za-z ]*$/;

    this.fields.forEach((field) => {
      const value = data[field.name];
      if (!value) {
        errors[field.name] = `${field.label} is required.`;
        return;
      }

      if (field.validator === "numeric" && !/^\d+$/.test(value)) {
        errors[field.name] = `${field.label} must be numeric.`;
      }

      if (field.validator === "name" && !namePattern.test(value)) {
        errors[field.name] = `${field.label} should contain alphabetic characters only.`;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  showValidation(errors) {
    this.fields.forEach((field) => {
      const input = this.element.querySelector(`[name="${field.name}"]`);
      const feedback = this.element.querySelector(`[data-error-for="${field.name}"]`);
      const message = errors[field.name] || "";

      input.classList.toggle("is-invalid", Boolean(message));
      input.classList.toggle("is-valid", !message && Boolean(input.value.trim()));
      feedback.textContent = message;
    });
  }

  clearValidation() {
    this.element.querySelectorAll(".is-invalid, .is-valid").forEach((input) => {
      input.classList.remove("is-invalid", "is-valid");
    });
    this.element.querySelectorAll("[data-error-for]").forEach((feedback) => {
      feedback.textContent = "";
    });
  }

  getFieldId(name) {
    return `${this.config.id || "student-info"}-${name}`;
  }

  emit(eventName, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, payload);
    }
  }

  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value) : String(value);
  }

  destroy() {
    this.inputHandlers.forEach(({ input, handler }) => {
      input.removeEventListener("input", handler);
      input.removeEventListener("change", handler);
    });
    this.inputHandlers = [];
    super.destroy();
  }
}

window.MEILP.StudentInformationComponent = StudentInformationComponent;
window.MEILP.registerStudentInformationComponent = StudentInformationComponent.register;
