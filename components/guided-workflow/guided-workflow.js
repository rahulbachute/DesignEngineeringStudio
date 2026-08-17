window.MEILP = window.MEILP || {};

/**
 * Guided Workflow Component
 * Allows students to progress step-by-step through calculations, gating progression on validation.
 */
class GuidedWorkflowComponent extends window.MEILP.BaseComponent {
  constructor(options = {}) {
    super(options);
    // Determine steps array. In content.json this is passed via this.config.steps
    this.steps = this.config.steps || [];
    this.given = this.config.given || [];
    this.savedState = this.load() || {};
  }

  /**
   * Escapes values for safe HTML output.
   */
  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value || "") : String(value || "");
  }

  static register(registry) {
    registry.register("guided-workflow", GuidedWorkflowComponent);
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "meilp-component guided-workflow-component";

    let givenHtml = '';
    if (this.given.length > 0) {
      givenHtml = `
        <section class="workbench-card card-calculation">
          <h3>Given Data</h3>
          <ul>
            ${this.given.map(item => `<li>${this.escape(item)}</li>`).join('')}
          </ul>
        </section>
      `;
    }

    this.element.innerHTML = `
      ${givenHtml}
      <section class="workbench-card">
        <h3>${this.escape(this.config.title || "Guided Engineering Workflow")}</h3>
        <div class="guided-workflow-steps"></div>
      </section>
    `;

    this.renderSteps();
    return this.element;
  }

  renderSteps() {
    const container = this.element.querySelector('.guided-workflow-steps');
    container.innerHTML = '';

    this.steps.forEach((step, index) => {
      const isLocked = false;
      const stepState = this.savedState[step.id] || {};
      const isCompleted = stepState.value && stepState.value.trim() !== '';

      const stepEl = document.createElement('div');
      stepEl.className = `guided-step mb-4 p-3 border rounded`;
      
      let inputHtml = '';
      if (step.type === 'numeric') {
        inputHtml = `<input type="number" step="any" class="form-control guided-input" data-step-id="${this.escape(step.id)}" value="${this.escape(stepState.value || '')}">`;
      } else {
        inputHtml = `<textarea class="form-control guided-input" rows="3" data-step-id="${this.escape(step.id)}">${this.escape(stepState.value || '')}</textarea>`;
      }

      let statusHtml = '';
      let buttonHtml = '';

      // If it's the last step and it's completed, allow students to still see it's done
      stepEl.innerHTML = `
        <div class="step-header d-flex justify-content-between align-items-center mb-2">
          <h4 class="h5 mb-0">${this.escape(step.title)}</h4>
          ${isLocked ? '<i class="bi bi-lock"></i>' : (isCompleted ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>' : '')}
        </div>
        <div class="step-body ${isLocked ? 'd-none' : ''}">
          <div class="step-formula text-muted mb-3 p-2 bg-light rounded"><small><strong>Formula/Guide:</strong> ${this.escape(step.formula)}</small></div>
          <label class="form-label fw-bold">${this.escape(step.label)}</label>
          ${inputHtml}
          ${statusHtml}
          ${buttonHtml}
        </div>
      `;

      container.appendChild(stepEl);
    });

    // Bind enter key just to prevent form submission or similar if needed
    container.querySelectorAll('.guided-input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      });
      // Autosave value typing without validating
      input.addEventListener('input', (e) => {
        const stepId = e.target.dataset.stepId;
        if (!this.savedState[stepId]) {
          this.savedState[stepId] = {};
        }
        this.savedState[stepId].value = e.target.value;
        this.save(this.savedState);
      });
    });
  }

  validateStep(index) {
    // Legacy method, unused now that check answer button is removed.
  }

  collect() {
    return this.savedState;
  }
}

window.MEILP.GuidedWorkflowComponent = GuidedWorkflowComponent;
if (window.MEILP.registerGuidedWorkflowComponent === undefined) {
    window.MEILP.registerGuidedWorkflowComponent = function(registry) {
        registry.register("guided-workflow", GuidedWorkflowComponent);
    };
}
