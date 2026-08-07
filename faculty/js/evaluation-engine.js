class EvaluationEngine {
  constructor() {
    this.currentEvaluation = this.createEmptyEvaluation();
    this.activityState = [];
    this.isLoading = false;
    this.facultyName = window.DESAuth?.getCurrentUser?.().name || 'Faculty';

    this.elements = {
      header: document.getElementById('evaluationHeader'),
      activities: document.getElementById('activityEvaluationList'),
      summary: document.getElementById('summaryPanel'),
      acceptAllButton: document.getElementById('acceptAllSuggestedMarks'),
      resetButton: document.getElementById('resetToSystemMarks'),
      saveButton: document.getElementById('saveEvaluation'),
      submitButton: document.getElementById('submitFinalEvaluation'),
      backButton: document.getElementById('backToSubmissions')
    };
  }

  async init() {
    this.bindEvents();
    this.renderLoadingState();
    try {
      const submissionId = this.getSubmissionIdFromUrl();
      if (!submissionId) {
        if (this.elements.activities) {
          this.elements.activities.innerHTML = `
            <div class="alert alert-info text-center my-5 p-5 border-0 shadow-sm rounded-4">
              <i class="bi bi-person-lines-fill fs-1 d-block mb-3 text-primary"></i>
              <h4>No Student Selected</h4>
              <p class="text-muted">You have accessed the Evaluation Engine directly. To view or evaluate students, please go to the <strong>Student Submissions</strong> page.</p>
              <a href="submissions.html" class="btn btn-primary mt-3 px-4 py-2">Go to Student Submissions</a>
            </div>
          `;
        }
        if (this.elements.saveButton) this.elements.saveButton.disabled = true;
        if (this.elements.submitButton) this.elements.submitButton.disabled = true;
        this.renderHeader();
        this.renderSummary();
        return;
      }

      const submission = await DESEvaluationService.getSubmission(submissionId);
      if (submission) {
        this.currentEvaluation = this.createEvaluationFromSubmission(submission);
        this.activityState = this.createActivityState(this.currentEvaluation.activities);
      }
      this.renderHeader();
      this.renderActivities();
      this.renderSummary();
    } catch (error) {
      this.showToast(error.message || 'Unable to load evaluation details.', true);
    }
  }

  createEmptyEvaluation() {
    return {
      studentName: '',
      prn: '',
      branch: '',
      division: '',
      challengeName: '',
      attemptNumber: 1,
      submissionDate: '',
      timeTaken: '',
      submissionStatus: 'No Submission Selected',
      submissionId: '',
      activities: []
    };
  }

  getSubmissionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('submissionId') || params.get('id') || '';
  }

  createEvaluationFromSubmission(submission) {
    return {
      studentName: submission.studentName,
      prn: submission.prn,
      branch: submission.branch,
      division: submission.division,
      challengeName: submission.challenge,
      attemptNumber: submission.attempt,
      submissionDate: submission.submittedOn,
      timeTaken: submission.timeTaken,
      submissionStatus: submission.submissionStatus,
      submissionId: submission.id,
      activities: (submission.activities || []).map((activity) => ({
        ...activity,
        title: activity.name,
        evaluationType: activity.category || 'Activity',
        subType: activity.category || 'Response',
        studentResponse: activity.response,
        correctAnswer: activity.correctAnswer || 'Unavailable',
        systemSuggestedMarks: activity.systemSuggestedMarks || 0,
        category: activity.category || 'Activity'
      }))
    };
  }

  createActivityState(activities) {
    return activities.map((activity) => ({
      ...activity,
      facultyMarks: activity.systemSuggestedMarks,
      reason: '',
      isModified: false,
      timestamp: new Date().toISOString(),
      facultyName: this.facultyName
    }));
  }

  bindEvents() {
    this.elements.activities.addEventListener('input', (event) => {
      const input = event.target.closest('[data-activity-input]');
      if (!input) {
        return;
      }

      const activityId = input.dataset.activityId;
      const activity = this.activityState.find((item) => item.id === activityId);
      if (!activity) {
        return;
      }

      const value = Number(input.value);
      if (!Number.isNaN(value)) {
        activity.facultyMarks = value;
        activity.isModified = value !== activity.systemSuggestedMarks;
        if (!activity.isModified) {
          activity.reason = '';
        }
        this.renderSummary();
        this.renderActivityCard(activityId);
      }
    });

    this.elements.activities.addEventListener('change', (event) => {
      const reasonField = event.target.closest('[data-reason-input]');
      if (!reasonField) {
        return;
      }

      const activityId = reasonField.dataset.activityId;
      const activity = this.activityState.find((item) => item.id === activityId);
      if (!activity) {
        return;
      }

      activity.reason = reasonField.value;
      this.renderSummary();
    });

    this.elements.acceptAllButton.addEventListener('click', () => {
      this.activityState.forEach((activity) => {
        activity.facultyMarks = activity.systemSuggestedMarks;
        activity.isModified = false;
        activity.reason = '';
      });
      this.renderActivities();
      this.renderSummary();
      this.showToast('All suggested marks accepted.');
    });

    this.elements.resetButton.addEventListener('click', () => {
      this.activityState.forEach((activity) => {
        activity.facultyMarks = activity.systemSuggestedMarks;
        activity.isModified = false;
        activity.reason = '';
      });
      this.renderActivities();
      this.renderSummary();
      this.showToast('Marks reset to system suggestions.');
    });

    this.elements.saveButton.addEventListener('click', async () => {
      try {
        await this.persistEvaluation('Draft');
        this.showToast('Evaluation saved through the repository layer.');
      } catch (error) {
        this.showToast(error.message || 'Evaluation save failed.', true);
      }
    });

    this.elements.submitButton.addEventListener('click', async () => {
      const validation = this.validateEvaluation();
      if (!validation.valid) {
        this.showToast(validation.message, true);
        return;
      }

      const confirmed = window.confirm('Submit final evaluation? This will mark the submission as evaluated.');
      if (confirmed) {
        try {
          await this.persistEvaluation('Evaluated');
          this.currentEvaluation.submissionStatus = 'Evaluated';
          this.renderHeader();
          this.showToast('Final evaluation submitted successfully.');
        } catch (error) {
          this.showToast(error.message || 'Final evaluation save failed.', true);
        }
      }
    });

    this.elements.backButton.addEventListener('click', () => {
      window.history.back();
    });
  }

  renderLoadingState() {
    if (this.elements.header) {
      this.elements.header.innerHTML = '<div class="text-muted">Loading evaluation details from the repository...</div>';
    }
    if (this.elements.activities) {
      this.elements.activities.innerHTML = '<div class="text-muted">Preparing activities...</div>';
    }
  }

  async persistEvaluation(status) {
    if (!this.currentEvaluation.submissionId) {
      throw new Error('No submission is selected for evaluation.');
    }

    const payload = this.buildEvaluationPayload(status);
    payload.evaluatedBy = localStorage.getItem("loggedInFaculty") || "unknown";
    const result = await DESEvaluationService.saveEvaluation(payload);
    if (!result || result.success === false || result.ok === false || result.error) {
      throw new Error(result?.error || result?.message || 'Evaluation save failed.');
    }
    return result;
  }

  buildEvaluationPayload(status) {
    const facultyMarks = this.activityState.map((activity) => ({
      id: activity.id,
      activityId: activity.id,
      name: activity.title || activity.name,
      marks: Number(activity.facultyMarks) || 0,
      facultyMarks: Number(activity.facultyMarks) || 0,
      maxMarks: Number(activity.maxMarks) || 0,
      reason: activity.reason || ''
    }));
    const totalMarks = facultyMarks.reduce((sum, activity) => sum + activity.marks, 0);
    const maxMarks = facultyMarks.reduce((sum, activity) => sum + activity.maxMarks, 0);
    const percentage = maxMarks ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
    const rubricScores = facultyMarks.reduce((scores, activity) => {
      scores[activity.id || activity.name] = activity.marks;
      return scores;
    }, {});
    const currentUser = window.DESAuth?.getCurrentUser?.() || {};

    return {
      submissionId: this.currentEvaluation.submissionId,
      facultyName: currentUser.name || this.facultyName || 'Faculty',
      facultyEmail: currentUser.email || '',
      facultyMarks,
      evaluation: {
        activities: facultyMarks,
        totalMarks,
        maxMarks,
        percentage,
        evaluatedAt: new Date().toISOString()
      },
      rubricScores,
      totalMarks,
      maxMarks,
      percentage,
      remarks: this.collectRemarks(),
      feedback: this.collectRemarks(),
      status
    };
  }

  collectRemarks() {
    return this.activityState
      .filter((activity) => String(activity.reason || '').trim())
      .map((activity) => `${activity.title || activity.name}: ${activity.reason}`)
      .join('\n');
  }

  renderHeader() {
    this.elements.header.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Student Name</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.studentName)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">PRN</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.prn)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Branch / Division</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.branch)} · ${this.escapeHtml(this.currentEvaluation.division)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Submission Status</p>
            <span class="badge bg-warning-subtle text-warning-emphasis">${this.escapeHtml(this.currentEvaluation.submissionStatus)}</span>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Challenge</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.challengeName)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Attempt Number</p>
            <h5 class="mb-0">${this.currentEvaluation.attemptNumber}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Submission Date</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.submissionDate)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Time Taken</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.timeTaken)}</h5>
          </div>
        </div>
      </div>
    `;
  }

  renderActivities() {
    if (!this.activityState.length) {
      this.elements.activities.innerHTML = '<div class="text-muted">No activity responses are available for evaluation.</div>';
      return;
    }
    this.elements.activities.innerHTML = this.activityState.map((activity) => this.renderActivityCardMarkup(activity)).join('');
  }

  renderActivityCardMarkup(activity) {
    const facultyMarks = activity.facultyMarks ?? activity.systemSuggestedMarks;
    const modified = activity.isModified;
    const reasonMarkup = modified ? `
      <div class="mt-3">
        <label class="form-label">Modification Reason</label>
        <textarea class="form-control" rows="2" data-reason-input data-activity-id="${activity.id}" placeholder="Reason is required when marks are changed">${this.escapeHtml(activity.reason || '')}</textarea>
      </div>
    ` : '';

    return `
      <div class="card border-0 shadow-sm rounded-4 mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-2">
                <h4 class="h5 mb-0">${this.escapeHtml(activity.title)}</h4>
                <span class="badge bg-primary-subtle text-primary-emphasis">${this.escapeHtml(activity.evaluationType)}</span>
                <span class="badge bg-secondary-subtle text-secondary-emphasis">${this.escapeHtml(activity.subType)}</span>
                ${modified ? '<span class="badge bg-warning-subtle text-warning-emphasis">Modified by Faculty</span>' : ''}
              </div>
              <p class="text-muted mb-0">Maximum Marks: ${activity.maxMarks}</p>
            </div>
            <div class="text-md-end">
              <p class="small text-muted mb-1">System Suggested Marks</p>
              <h5 class="mb-0">${activity.systemSuggestedMarks}/${activity.maxMarks}</h5>
            </div>
          </div>

          <div class="row g-4">
            <div class="col-lg-6">
              <div class="border rounded-4 p-3 h-100">
                <p class="text-muted small mb-2">Student Response</p>
                <p class="mb-0">${this.escapeHtml(activity.studentResponse)}</p>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="border rounded-4 p-3 h-100">
                <p class="text-muted small mb-2">Correct Answer</p>
                <p class="mb-0">${this.escapeHtml(activity.correctAnswer)}</p>
              </div>
            </div>
          </div>

          <div class="row g-4 mt-1">
            <div class="col-md-4">
              <label class="form-label">System Suggested Marks</label>
              <input class="form-control" type="text" value="${activity.systemSuggestedMarks}" readonly />
            </div>
            <div class="col-md-4">
              <label class="form-label">Faculty Marks</label>
              <input class="form-control" type="number" min="0" max="${activity.maxMarks}" value="${facultyMarks}" data-activity-input data-activity-id="${activity.id}" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Faculty Remarks</label>
              <textarea class="form-control" rows="2" placeholder="Optional remarks"></textarea>
            </div>
          </div>

          ${reasonMarkup}
        </div>
      </div>
    `;
  }

  renderActivityCard(activityId) {
    const activity = this.activityState.find((item) => item.id === activityId);
    if (!activity) {
      return;
    }

    const cardMarkup = this.renderActivityCardMarkup(activity);
    const existingCard = this.elements.activities.querySelector(`[data-activity-id="${activityId}"]`);
    if (existingCard) {
      existingCard.outerHTML = cardMarkup;
    }
  }

  renderSummary() {
    const totalMax = this.activityState.reduce((sum, activity) => sum + activity.maxMarks, 0);
    const facultyTotal = this.activityState.reduce((sum, activity) => sum + Number(activity.facultyMarks || 0), 0);
    const systemTotal = this.activityState.reduce((sum, activity) => sum + activity.systemSuggestedMarks, 0);
    const percentage = totalMax > 0 ? Math.round((facultyTotal / totalMax) * 100) : 0;
    const grade = this.calculateGrade(percentage);

    this.elements.summary.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h3 class="h5 mb-2">Evaluation Summary</h3>
              <p class="text-muted mb-0">Faculty remains the final authority for all marks and remarks.</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge bg-primary-subtle text-primary-emphasis">Maximum Marks ${totalMax}</span>
              <span class="badge bg-secondary-subtle text-secondary-emphasis">System Total ${systemTotal}</span>
              <span class="badge bg-success-subtle text-success-emphasis">Faculty Total ${facultyTotal}</span>
              <span class="badge bg-info-subtle text-info-emphasis">${percentage}%</span>
              <span class="badge bg-dark-subtle text-dark-emphasis">${grade}</span>
            </div>
          </div>
          <div class="progress mt-3" role="progressbar" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width: ${percentage}%;"></div>
          </div>
          <div class="row g-3 mt-2">
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Evaluation Status</p>
                <h6 class="mb-0">${this.currentEvaluation.submissionStatus}</h6>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Audit Trail Entries</p>
                <h6 class="mb-0">${this.activityState.filter((activity) => activity.isModified).length}</h6>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Faculty Name</p>
                <h6 class="mb-0">${this.escapeHtml(this.facultyName)}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  validateEvaluation() {
    const missingReasons = this.activityState.filter((activity) => activity.isModified && !activity.reason.trim());
    if (missingReasons.length) {
      return {
        valid: false,
        message: 'Please provide a modification reason for every overridden mark.'
      };
    }

    const invalidMarks = this.activityState.filter((activity) => Number(activity.facultyMarks) < 0 || Number(activity.facultyMarks) > activity.maxMarks);
    if (invalidMarks.length) {
      return {
        valid: false,
        message: 'Faculty marks cannot be negative or exceed the maximum marks.'
      };
    }

    const incomplete = this.activityState.some((activity) => Number.isNaN(Number(activity.facultyMarks)) || Number(activity.facultyMarks) === 0);
    if (incomplete) {
      return {
        valid: false,
        message: 'All activities must be evaluated before submission.'
      };
    }

    return {
      valid: true,
      message: 'Ready to submit.'
    };
  }

  calculateGrade(percentage) {
    if (percentage >= 90) {
      return 'A+';
    }
    if (percentage >= 80) {
      return 'A';
    }
    if (percentage >= 70) {
      return 'B+';
    }
    if (percentage >= 60) {
      return 'B';
    }
    if (percentage >= 50) {
      return 'C';
    }
    if (percentage >= 40) {
      return 'D';
    }
    return 'F';
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EvaluationEngine().init();
});
