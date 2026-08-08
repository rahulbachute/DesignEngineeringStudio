class SubmissionsBrowser {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.sortField = 'submittedOn';
    this.sortDirection = 'desc';
    this.elements = {
      form: document.getElementById('submissionFilters'),
      tableBody: document.getElementById('submissionTableBody'),
      pagination: document.getElementById('paginationControls'),
      summary: document.getElementById('submissionSummary'),
      challengeFilter: document.getElementById('challengeFilter'),
      branchFilter: document.getElementById('branchFilter'),
      divisionFilter: document.getElementById('divisionFilter'),
      studentNameFilter: document.getElementById('studentNameFilter'),
      prnFilter: document.getElementById('prnFilter'),
      statusFilter: document.getElementById('statusFilter'),
      attemptFilter: document.getElementById('attemptFilter'),
      dateFromFilter: document.getElementById('dateFromFilter'),
      dateToFilter: document.getElementById('dateToFilter'),
      resetButton: document.getElementById('resetFilters'),
      detailsModal: document.getElementById('submissionDetailsModal'),
      detailsContent: document.getElementById('submissionDetailsContent'),
      launchEvaluationButton: document.getElementById('launchEvaluationButton'),
      evaluationModal: document.getElementById('evaluationWorkspaceModal'),
      evaluationContent: document.getElementById('evaluationWorkspaceContent'),
      saveEvaluationButton: document.getElementById('saveEvaluationButton')
    };
  }

  init() {
    this.bindEvents();
    this.showLoadingState();
    this.loadData();
  }

  async loadData() {
    try {
      const items = await DESSubmissionService.getSubmissions();
      this.data = items.map((item) => (item instanceof SubmissionModel ? item : new SubmissionModel(item)));
      this.populateFilters();
      this.applyFilters();
    } catch (error) {
      this.showError(error.message || 'Unable to load submissions from the data layer.');
    }
  }

  bindEvents() {
    this.elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.currentPage = 1;
      this.applyFilters();
    });

    this.elements.resetButton.addEventListener('click', () => {
      this.elements.form.reset();
      this.currentPage = 1;
      this.applyFilters();
    });

    document.querySelectorAll('[data-sort]').forEach((button) => {
      button.addEventListener('click', () => {
        const field = button.dataset.sort;
        if (this.sortField === field) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDirection = 'desc';
        }
        this.applyFilters();
      });
    });

    this.elements.tableBody.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) {
        return;
      }

      const record = this.data.find((item) => String(item.id) === String(actionButton.dataset.id));
      if (!record) {
        return;
      }

      const action = actionButton.dataset.action;
      if (action === 'view') {
        this.openDetailsModal(record);
      } else if (action === 'evaluate') {
        this.openEvaluationModal(record);
      } else if (action === 'export') {
        this.exportSubmissionPdf(record);
      }
    });

    this.elements.launchEvaluationButton.addEventListener('click', () => {
      const record = this.currentDetailsRecord;
      if (record) {
        this.openEvaluationModal(record);
      }
    });

    this.elements.saveEvaluationButton.addEventListener('click', async () => {
      if (window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest") {
        this.showPlaceholderNotice('Guest users cannot perform evaluation. Saving is disabled.');
        return;
      }

      if (!this.currentDetailsRecord) {
        this.showPlaceholderNotice('Select a submission before saving evaluation.');
        return;
      }

      try {
        this.elements.saveEvaluationButton.disabled = true;
        const payload = this.buildEvaluationPayload(this.currentDetailsRecord);
        payload.evaluatedBy = localStorage.getItem("loggedInFaculty") || "unknown";
        const result = await DESSubmissionService.saveEvaluation(payload);
        this.assertEvaluationSaved(result);
        this.markRecordEvaluated(payload);
        const modalInstance = bootstrap.Modal.getInstance(this.elements.evaluationModal);
        if (modalInstance) {
          modalInstance.hide();
        }
        this.renderTable();
        this.showPlaceholderNotice('Evaluation submitted and saved to Faculty_Evaluation.');
      } catch (error) {
        this.showPlaceholderNotice(error.message || 'Evaluation save failed.');
      } finally {
        this.elements.saveEvaluationButton.disabled = false;
      }
    });

    this.elements.pagination.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-page]');
      if (!button) {
        return;
      }

      const pageNumber = Number(button.dataset.page);
      if (!Number.isNaN(pageNumber)) {
        this.currentPage = pageNumber;
        this.renderTable();
        this.renderPagination();
      }
    });
  }

  populateFilters() {
    const challenges = [...new Set(this.data.map((item) => item.challenge))].sort();
    const branches = [...new Set(this.data.map((item) => item.branch))].sort();
    const divisions = [...new Set(this.data.map((item) => item.division))].sort();

    this.populateSelect(this.elements.challengeFilter, challenges, 'All Challenges');
    this.populateSelect(this.elements.branchFilter, branches, 'All Branches');
    this.populateSelect(this.elements.divisionFilter, divisions, 'All Divisions');
  }

  populateSelect(selectElement, values, placeholder) {
    const fragment = document.createDocumentFragment();
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    fragment.appendChild(placeholderOption);

    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      fragment.appendChild(option);
    });

    selectElement.innerHTML = '';
    selectElement.appendChild(fragment);
  }

  applyFilters() {
    const filters = this.getFilters();

    this.filteredData = this.data.filter((item) => {
      const challengeMatch = !filters.challenge || item.challenge === filters.challenge;
      const branchMatch = !filters.branch || item.branch === filters.branch;
      const divisionMatch = !filters.division || item.division === filters.division;
      const studentMatch = !filters.studentName || item.studentName.toLowerCase().includes(filters.studentName.toLowerCase());
      const prnMatch = !filters.prn || item.prn.toLowerCase().includes(filters.prn.toLowerCase());
      const statusMatch = !filters.status || item.submissionStatus === filters.status;
      const attemptMatch = !filters.attempt || String(item.attempt) === filters.attempt;
      const dateFromMatch = !filters.dateFrom || new Date(item.submittedOn) >= new Date(filters.dateFrom);
      const dateToMatch = !filters.dateTo || new Date(item.submittedOn) <= new Date(filters.dateTo);

      return challengeMatch && branchMatch && divisionMatch && studentMatch && prnMatch && statusMatch && attemptMatch && dateFromMatch && dateToMatch;
    });

    this.filteredData.sort((left, right) => {
      const leftValue = left[this.sortField];
      const rightValue = right[this.sortField];
      if (this.sortField === 'submittedOn') {
        const leftDate = new Date(leftValue);
        const rightDate = new Date(rightValue);
        return this.sortDirection === 'asc' ? leftDate - rightDate : rightDate - leftDate;
      }

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return this.sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue));
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPage = Math.min(this.currentPage, Math.max(1, Math.ceil(this.filteredData.length / this.pageSize) || 1));
    this.renderSummary();
    this.renderTable();
    this.renderPagination();
  }

  getFilters() {
    const formData = new FormData(this.elements.form);
    return {
      challenge: formData.get('challenge') || '',
      branch: formData.get('branch') || '',
      division: formData.get('division') || '',
      studentName: formData.get('studentName') || '',
      prn: formData.get('prn') || '',
      status: formData.get('status') || '',
      attempt: formData.get('attempt') || '',
      dateFrom: formData.get('dateFrom') || '',
      dateTo: formData.get('dateTo') || ''
    };
  }

  renderSummary() {
    const total = this.filteredData.length;
    const from = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage * this.pageSize, total);
    this.elements.summary.textContent = total === 0 ? 'No submissions match the current filters.' : `Showing ${from}-${to} of ${total} submissions`;
  }

  showLoadingState() {
    this.elements.summary.textContent = 'Loading submissions from the repository...';
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-muted py-4">
          <div class="d-flex justify-content-center align-items-center gap-2">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span>Loading submissions...</span>
          </div>
        </td>
      </tr>
    `;
    this.elements.pagination.innerHTML = '';
  }

  showError(message) {
    this.elements.summary.textContent = message;
    this.elements.tableBody.innerHTML = `<tr><td colspan="11" class="text-center text-muted py-4">${this.escapeHtml(message)}</td></tr>`;
  }

  renderTable() {
    const start = (this.currentPage - 1) * this.pageSize;
    const pageItems = this.filteredData.slice(start, start + this.pageSize);

    if (!pageItems.length) {
      this.elements.tableBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4">No submissions available for the selected view.</td></tr>';
      return;
    }

    this.elements.tableBody.innerHTML = pageItems.map((item) => `
      <tr>
        <td>${this.escapeHtml(item.studentName)}</td>
        <td>${this.escapeHtml(item.prn)}</td>
        <td>${this.escapeHtml(item.branch)}</td>
        <td>${this.escapeHtml(item.division)}</td>
        <td>${this.escapeHtml(item.challenge)}</td>
        <td>${item.attempt}</td>
        <td>${this.escapeHtml(item.submittedOn)}</td>
        <td><span class="badge ${this.statusBadgeClass(item.submissionStatus)}">${this.escapeHtml(item.submissionStatus)}</span></td>
        <td>${item.systemScore !== null ? item.systemScore : 'N/A'}</td>
        <td>${item.facultyScore !== null ? item.facultyScore : 'N/A'}</td>
        <td>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="view" data-id="${item.id}">View Submission</button>
            <button type="button" class="btn btn-outline-info btn-sm" data-action="evaluate" data-id="${item.id}">Start Evaluation</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="export" data-id="${item.id}">Export PDF</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderPagination() {
    const totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    const items = [];

    items.push(`
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${Math.max(1, this.currentPage - 1)}">Previous</button>
      </li>
    `);

    for (let page = 1; page <= totalPages; page += 1) {
      items.push(`
        <li class="page-item ${page === this.currentPage ? 'active' : ''}">
          <button class="page-link" type="button" data-page="${page}">${page}</button>
        </li>
      `);
    }

    items.push(`
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${Math.min(totalPages, this.currentPage + 1)}">Next</button>
      </li>
    `);

    this.elements.pagination.innerHTML = items.join('');
  }

  async openDetailsModal(record) {
    this.currentDetailsRecord = record;
    this.elements.detailsContent.innerHTML = this.loadingMarkup('Loading full submission payload...');
    const modal = new bootstrap.Modal(this.elements.detailsModal);
    modal.show();

    const detailRecord = await this.loadSubmissionDetail(record);
    this.currentDetailsRecord = detailRecord;
    this.elements.detailsContent.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-6">
          <div class="border rounded-4 p-3 h-100">
            <h4 class="h6 text-uppercase text-muted">Student Information</h4>
            <p class="mb-1"><strong>Name:</strong> ${this.escapeHtml(detailRecord.studentName)}</p>
            <p class="mb-1"><strong>PRN:</strong> ${this.escapeHtml(detailRecord.prn)}</p>
            <p class="mb-1"><strong>Branch:</strong> ${this.escapeHtml(detailRecord.branch)}</p>
            <p class="mb-0"><strong>Division:</strong> ${this.escapeHtml(detailRecord.division)}</p>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="border rounded-4 p-3 h-100">
            <h4 class="h6 text-uppercase text-muted">Challenge Information</h4>
            <p class="mb-1"><strong>Challenge:</strong> ${this.escapeHtml(detailRecord.challenge)}</p>
            <p class="mb-1"><strong>Submission Date:</strong> ${this.escapeHtml(detailRecord.submittedOn)}</p>
            <p class="mb-1"><strong>Attempt Number:</strong> ${detailRecord.attempt}</p>
            <p class="mb-0"><strong>Time Taken:</strong> ${this.escapeHtml(detailRecord.timeTaken)}</p>
          </div>
        </div>
        <div class="col-12">
          <div class="border rounded-4 p-3">
            <h4 class="h6 text-uppercase text-muted">Activity Summary</h4>
            <p class="mb-2"><strong>Submission Status:</strong> <span class="badge ${this.statusBadgeClass(detailRecord.submissionStatus)}">${this.escapeHtml(detailRecord.submissionStatus)}</span></p>
            <ul class="list-group list-group-flush">${this.renderActivityList(detailRecord.activities)}</ul>
          </div>
        </div>
      </div>
    `;
  }

  async openEvaluationModal(record) {
    this.currentDetailsRecord = record;
    this.elements.evaluationContent.innerHTML = this.loadingMarkup('Loading full submission for evaluation...');
    const modal = new bootstrap.Modal(this.elements.evaluationModal);
    modal.show();

    const isGuest = window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";
    if (this.elements.saveEvaluationButton) {
      this.elements.saveEvaluationButton.disabled = isGuest;
    }

    const detailRecord = await this.loadSubmissionDetail(record);
    this.currentDetailsRecord = detailRecord;
    const activities = this.evaluationActivities(detailRecord);
    const maxMarks = this.totalMaxMarks(activities);
    const suggestedMarks = this.totalSuggestedMarks(activities);
    const initialTotal = this.hasFacultyMarks(activities) ? this.totalFacultyMarks(activities) : suggestedMarks;
    const disabledAttr = isGuest ? 'disabled readonly' : '';

    this.elements.evaluationContent.innerHTML = `
      <div class="row g-4" data-evaluation-form>
        ${isGuest ? `
        <div class="col-12">
          <div class="alert alert-warning border-0 shadow-sm mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-shield-exclamation text-warning fs-5"></i>
            <span><strong>Guest Mode:</strong> You are exploring evaluation in read-only mode. Saving evaluations is disabled.</span>
          </div>
        </div>` : ''}
        <div class="col-lg-6">
          <label class="form-label">Student Name</label>
          <input class="form-control" type="text" value="${this.escapeHtml(detailRecord.studentName)}" readonly />
        </div>
        <div class="col-lg-6">
          <label class="form-label">Challenge</label>
          <input class="form-control" type="text" value="${this.escapeHtml(detailRecord.challenge)}" readonly />
        </div>
        <div class="col-12">
          <label class="form-label">Step-wise Faculty Marks</label>
          <div class="border rounded-4 p-3">
            <ul class="list-group list-group-flush">
              ${activities.map((activity) => `
                <li class="list-group-item px-0">
                  <div class="row g-3 align-items-start">
                    <div class="col-lg-7">
                      <strong>${this.escapeHtml(activity.name)}</strong>
                      <p class="mb-0 text-muted">${this.escapeHtml(this.summarizeActivityResponse(activity.response))}</p>
                    </div>
                    <div class="col-sm-3 col-lg-2">
                      <label class="form-label small text-muted">Max</label>
                      <input class="form-control form-control-sm" type="text" value="${Number(activity.maxMarks) || 0}" readonly />
                    </div>
                    <div class="col-sm-4 col-lg-3">
                      <label class="form-label small text-muted">Faculty Marks</label>
                      <input class="form-control form-control-sm" type="number" min="0" max="${Number(activity.maxMarks) || 0}" step="0.5" value="${this.initialFacultyMarks(activity)}" data-eval-marks data-activity-id="${this.escapeHtml(activity.id)}" ${disabledAttr} />
                    </div>
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        <div class="col-md-4">
          <label class="form-label">Maximum Marks</label>
          <input class="form-control" type="text" value="${maxMarks}" readonly data-eval-max />
        </div>
        <div class="col-md-4">
          <label class="form-label">System Suggested Marks</label>
          <input class="form-control" type="text" value="${suggestedMarks}" readonly />
        </div>
        <div class="col-md-4">
          <label class="form-label">Faculty Total</label>
          <input class="form-control" type="text" value="${initialTotal}" readonly data-eval-total />
        </div>
        <div class="col-12">
          <label class="form-label">Remarks</label>
          <textarea class="form-control" rows="3" placeholder="${isGuest ? 'Disabled in Guest mode' : 'Add remarks for the evaluation workflow.'}" data-eval-remarks ${disabledAttr}></textarea>
        </div>
      </div>
    `;
    this.elements.evaluationContent.querySelectorAll('[data-eval-marks]').forEach((input) => {
      input.addEventListener('input', () => this.updateEvaluationTotals());
    });
    this.updateEvaluationTotals();
  }

  buildEvaluationPayload(record) {
    const activities = this.evaluationActivities(record);
    const marksInputs = Array.from(this.elements.evaluationContent.querySelectorAll('[data-eval-marks]'));
    const remarks = this.elements.evaluationContent.querySelector('[data-eval-remarks]')?.value || '';
    const rubricScores = {};
    const evaluatedActivities = activities.map((activity) => {
      const input = marksInputs.find((item) => item.dataset.activityId === String(activity.id));
      const maxMarks = Number(activity.maxMarks) || 0;
      const marks = Number(input?.value || 0);
      if (marks < 0 || marks > maxMarks) {
        throw new Error(`Marks for ${activity.name} must be between 0 and ${maxMarks}.`);
      }
      rubricScores[activity.id || activity.name] = marks;
      return {
        id: activity.id,
        name: activity.name,
        response: activity.response,
        maxMarks,
        facultyMarks: marks
      };
    });
    const totalMarks = marksInputs.reduce((sum, input) => sum + Number(input.value || 0), 0);
    const maxMarks = this.totalMaxMarks(activities);
    const percentage = maxMarks ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
    const currentUser = window.DESAuth?.getCurrentUser?.() || {};

    return {
      submissionId: record.id,
      facultyName: currentUser.name || 'Faculty',
      facultyEmail: currentUser.email || '',
      evaluation: {
        activities: evaluatedActivities,
        totalMarks,
        maxMarks,
        percentage,
        evaluatedAt: new Date().toISOString(),
        rubricScores: rubricScores
      },
      feedback: remarks,
      remarks,
      rubricScores,
      totalMarks,
      maxMarks,
      percentage,
      status: 'Evaluated'
    };
  }

  updateEvaluationTotals() {
    const total = Array.from(this.elements.evaluationContent.querySelectorAll('[data-eval-marks]'))
      .reduce((sum, input) => sum + Number(input.value || 0), 0);
    const totalInput = this.elements.evaluationContent.querySelector('[data-eval-total]');
    if (totalInput) {
      totalInput.value = Number(total.toFixed(2));
    }
  }

  assertEvaluationSaved(result) {
    if (!result || result.success === false || result.ok === false || result.error) {
      throw new Error(result?.error || result?.message || 'Evaluation save failed.');
    }
  }

  async exportSubmissionPdf(record) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showPlaceholderNotice('Allow pop-ups to generate the PDF.');
      return;
    }
    printWindow.document.write('<!DOCTYPE html><title>Preparing PDF</title><p>Preparing submission report...</p>');
    const detailRecord = await this.loadSubmissionDetail(record);
    this.mergeLocalEvaluation(detailRecord);
    printWindow.document.open();
    printWindow.document.write(this.buildPdfHtml(detailRecord));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  buildPdfHtml(record) {
    const generatedAt = new Date().toLocaleString();
    const activities = this.evaluationActivities(record);
    const totalMaxMarks = this.totalMaxMarks(activities);
    const totalFacultyMarks = this.totalFacultyMarks(activities);
    const percentage = totalMaxMarks ? Number(((totalFacultyMarks / totalMaxMarks) * 100).toFixed(2)) : 0;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${this.escapeHtml(record.studentName)} - ${this.escapeHtml(record.challenge)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            .meta { color: #4b5563; font-size: 12px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-top: 16px; }
            .label { color: #4b5563; font-size: 12px; text-transform: uppercase; }
            @media print { body { margin: 18mm; } button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Design Engineering Studio Submission Report</h1>
          <div class="meta">Generated ${this.escapeHtml(generatedAt)}</div>
          <div class="grid">
            ${this.pdfMeta('Student Name', record.studentName)}
            ${this.pdfMeta('PRN', record.prn)}
            ${this.pdfMeta('Division', record.division)}
            ${this.pdfMeta('Challenge', record.challenge)}
            ${this.pdfMeta('Submission ID', record.id)}
            ${this.pdfMeta('Submitted On', record.submittedOn)}
            ${this.pdfMeta('Attempt', record.attempt)}
            ${this.pdfMeta('Status', record.submissionStatus)}
            ${this.pdfMeta('Faculty Marks', totalFacultyMarks || '')}
            ${this.pdfMeta('Max Marks', totalMaxMarks || '')}
            ${this.pdfMeta('Percentage', totalMaxMarks ? `${percentage}%` : '')}
          </div>
          <h2>Step-wise Evaluation</h2>
          <table>
            <thead><tr><th>Step</th><th>Response</th><th>Max Marks</th><th>Faculty Marks</th></tr></thead>
            <tbody>
              ${activities.map((activity) => `
                <tr>
                  <td>${this.escapeHtml(activity.name)}</td>
                  <td>${this.escapeHtml(activity.response)}</td>
                  <td>${Number(activity.maxMarks) || 0}</td>
                  <td>${this.formatMarks(activity.facultyMarks)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  pdfMeta(label, value) {
    return `<div><div class="label">${this.escapeHtml(label)}</div><strong>${this.escapeHtml(value ?? '')}</strong></div>`;
  }

  renderActivityList(activities = []) {
    if (!activities.length) {
      return '<li class="list-group-item px-0 text-muted">No activity responses are available.</li>';
    }
    return activities.map((activity) => `
      <li class="list-group-item px-0">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <strong>${this.escapeHtml(activity.name)}</strong>
            <p class="mb-0 text-muted">${this.escapeHtml(activity.response)}</p>
          </div>
          <span class="badge bg-light text-dark">${Number(activity.maxMarks) || 0} marks</span>
        </div>
      </li>
    `).join('');
  }

  evaluationActivities(record = {}) {
    if (Array.isArray(record.evaluationActivities) && record.evaluationActivities.length) {
      return record.evaluationActivities.map((activity, index) => ({
        ...activity,
        id: activity.id || `activity-${index + 1}`,
        response: this.summarizeActivityResponse(activity.response ?? activity.studentResponse ?? activity.answers ?? activity),
        maxMarks: Number(activity.maxMarks) || 0,
        systemSuggestedMarks: Number(activity.systemSuggestedMarks) || 0,
        facultyMarks: activity.facultyMarks ?? null
      }));
    }

    const savedEvaluation = record.rawPayload?.facultyEvaluation || {};
    const savedRubricScores = savedEvaluation.rubricScores || {};
    const rawActivityResponses = record.rawPayload?.submissionData?.activityResponses;
    const sourceActivities = Array.isArray(record.activities) && record.activities.length
      ? record.activities
      : this.activitiesFromRawPayload(rawActivityResponses);
    const activities = Array.isArray(sourceActivities) ? sourceActivities.filter((activity) => activity.name || activity.response || Number(activity.maxMarks)) : [];
    if (activities.length) {
      const fallbackTotal = Number(record.rawPayload?.challengeMetadata?.cceMarks) || Number(record.maxMarks) || 0;
      const fallbackStepMarks = fallbackTotal ? Number((fallbackTotal / activities.length).toFixed(2)) : 1;
      return activities.map((activity, index) => ({
        ...activity,
        id: activity.id || `activity-${index + 1}`,
        maxMarks: Number(activity.maxMarks) || fallbackStepMarks,
        systemSuggestedMarks: Number(activity.systemSuggestedMarks) || 0,
        facultyMarks: activity.facultyMarks ?? savedRubricScores[activity.id] ?? savedRubricScores[activity.name] ?? null
      }));
    }

    const cceMarks = Number(savedEvaluation.maxMarks) || Number(record.rawPayload?.challengeMetadata?.cceMarks) || Number(record.maxMarks) || 100;
    
    // DEBUG OUTPUT
    const debugKeys = record.rawPayload ? Object.keys(record.rawPayload).join(', ') : 'none';
    const rowKeys = record.rawRow ? Object.keys(record.rawRow).join(', ') : 'none';
    const hasSubmissionData = record.rawPayload?.submissionData ? 'yes' : 'no';
    const activityResponsesType = record.rawPayload?.submissionData?.activityResponses ? (Array.isArray(record.rawPayload.submissionData.activityResponses) ? 'array' : typeof record.rawPayload.submissionData.activityResponses) : 'undefined';
    const debugError = record.rawPayload?.debugError || 'none';
    const rawPayloadKeysMsg = `[DEBUG: error=${debugError} | payloadKeys: ${debugKeys} | rowKeys: ${rowKeys} | hasSubmissionData: ${hasSubmissionData}]`;

    return [{
      id: 'overall',
      name: 'Overall Evaluation',
      response: 'Step responses were not available in the loaded record. Enter the total faculty marks for this submission. ' + rawPayloadKeysMsg,
      maxMarks: cceMarks,
      systemSuggestedMarks: Number(record.facultyScore) || Number(savedEvaluation.totalMarks) || 0,
      facultyMarks: record.facultyScore ?? savedEvaluation.totalMarks ?? null
    }];
  }

  renderEvaluationPanel() {
    const container = document.getElementById('evaluationActivitiesContainer');
    if (!container) return;
    const activities = this.evaluationActivities(this.currentDetailsRecord);
    
    if (!activities.length) {
      if (!container.innerHTML.includes('alert-warning') || container.innerHTML.includes('Step responses were not available')) {
         container.innerHTML = `
          <div class="alert alert-warning">
            Step responses were not available in the loaded record. Enter the total faculty marks for this submission.
            <br><br>
            <small>DEBUG: activities length is 0. rawPayload keys: ${this.currentDetailsRecord && this.currentDetailsRecord.rawPayload ? Object.keys(this.currentDetailsRecord.rawPayload).join(', ') : 'none'}</small>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = activities.map((activity) => `
      <div class="activity-card mb-4 border rounded-3 p-3">
        <h5 class="activity-title">${this.escapeHtml(activity.name)}</h5>
        <div class="mb-3 text-muted">
          <label class="form-label mb-1 fw-bold">Student Response:</label>
          <div class="p-2 bg-light rounded text-dark">${this.escapeHtml(activity.response)}</div>
        </div>
        <div class="row align-items-center">
          <div class="col-sm-4 text-secondary mb-2 mb-sm-0">Max Marks: <strong>${activity.maxMarks}</strong></div>
          <div class="col-sm-4 text-secondary mb-2 mb-sm-0">System Score: <strong>${activity.systemSuggestedMarks || '—'}</strong></div>
          <div class="col-sm-4">
            <label class="visually-hidden">Faculty Score</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text">Score</span>
              <input type="number" class="form-control faculty-score-input" data-activity-id="${this.escapeHtml(activity.id)}" value="${activity.facultyMarks !== null ? activity.facultyMarks : ''}" max="${activity.maxMarks}" min="0">
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  activitiesFromRawPayload(activityResponses = []) {
    if (!Array.isArray(activityResponses)) {
      return [];
    }
    return activityResponses.map((activity, index) => ({
      id: activity.id || activity.activityId || `activity-${index + 1}`,
      name: activity.title || activity.name || activity.activityTitle || activity.activityId || `Activity ${index + 1}`,
      response: this.summarizeActivityResponse(activity.response ?? activity.studentResponse ?? activity.answers ?? activity),
      maxMarks: Number(activity.maxMarks ?? activity.marks ?? activity.cceMarks ?? 0),
      systemSuggestedMarks: Number(activity.systemSuggestedMarks ?? activity.suggestedMarks ?? 0),
      facultyMarks: activity.facultyMarks ?? null
    }));
  }

  summarizeActivityResponse(value) {
    if (value === undefined || value === null || value === '') {
      return 'No response recorded.';
    }
    let currentValue = value;
    let parseAttempts = 0;
    while (typeof currentValue === 'string' && parseAttempts < 3) {
      try {
        let toParse = currentValue.replace(/&quot;/g, '"');
        const parsed = JSON.parse(toParse);
        if (parsed && typeof parsed === 'object') {
          return this.summarizeActivityResponse(parsed);
        }
        currentValue = parsed;
      } catch (e) {
        break;
      }
      parseAttempts++;
    }
    
    if (typeof currentValue === 'string') {
      return currentValue;
    }
    value = currentValue;
    if (Array.isArray(value)) {
      return value.map((item) => this.summarizeActivityResponse(item)).join('; ');
    }
    if (typeof value === 'object') {
      if (value.studentAnswer !== undefined && value.studentAnswer !== '') {
        return this.summarizeActivityResponse(value.studentAnswer);
      }
      if (value.text !== undefined && value.text !== '') {
        return this.summarizeActivityResponse(value.text);
      }
      if (value.justification !== undefined && value.justification !== '') {
        return this.summarizeActivityResponse(value.justification);
      }
      if (value.answers && typeof value.answers === 'object') {
        return Object.entries(value.answers).map(([key, answer]) => `${key}: ${answer}`).join('; ');
      }
      if (Array.isArray(value.componentResponses)) {
        return value.componentResponses.map((item) => `${item.componentNumber}: ${item.studentAnswer || ''}`).join('; ');
      }
      const entries = Object.entries(value)
        .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
        .map(([key, val]) => {
          let readableKey = key.replace(/([A-Z])/g, ' $1').trim();
          readableKey = readableKey.charAt(0).toUpperCase() + readableKey.slice(1);
          let readableVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val;
          if (typeof val === 'object') {
            readableVal = JSON.stringify(val);
          }
          return `${readableKey}: ${readableVal}`;
        });
      
      return entries.length > 0 ? entries.join(' | ') : 'No data';
    }
    return String(value);
  }

  totalMaxMarks(activities = []) {
    return activities.reduce((total, activity) => total + (Number(activity.maxMarks) || 0), 0);
  }

  totalSuggestedMarks(activities = []) {
    return activities.reduce((total, activity) => total + (Number(activity.systemSuggestedMarks) || 0), 0);
  }

  totalFacultyMarks(activities = []) {
    return activities.reduce((total, activity) => total + (Number(activity.facultyMarks) || 0), 0);
  }

  hasFacultyMarks(activities = []) {
    return activities.some((activity) => activity.facultyMarks !== null && activity.facultyMarks !== undefined && activity.facultyMarks !== '');
  }

  initialFacultyMarks(activity = {}) {
    const savedMarks = activity.facultyMarks;
    if (savedMarks !== null && savedMarks !== undefined && savedMarks !== '') {
      return Number(savedMarks) || 0;
    }
    return Number(activity.systemSuggestedMarks) || 0;
  }

  formatMarks(value) {
    return value === null || value === undefined || value === '' ? '' : this.escapeHtml(value);
  }

  markRecordEvaluated(payload) {
    const submissionId = payload.submissionId;
    this.data.forEach((item) => {
      if (String(item.id) === String(submissionId)) {
        item.submissionStatus = 'Evaluated';
        item.facultyScore = payload.totalMarks;
        item.evaluationActivities = payload.evaluation.activities;
        item.evaluationRemarks = payload.remarks;
        item.evaluationPercentage = payload.percentage;
      }
    });
    this.filteredData.forEach((item) => {
      if (String(item.id) === String(submissionId)) {
        item.submissionStatus = 'Evaluated';
        item.facultyScore = payload.totalMarks;
        item.evaluationActivities = payload.evaluation.activities;
        item.evaluationRemarks = payload.remarks;
        item.evaluationPercentage = payload.percentage;
      }
    });
  }

  mergeLocalEvaluation(record) {
    const localRecord = this.data.find((item) => String(item.id) === String(record.id));
    if (!localRecord) {
      return;
    }
    if (Array.isArray(localRecord.evaluationActivities)) {
      record.evaluationActivities = localRecord.evaluationActivities;
      record.activities = localRecord.evaluationActivities;
    }
    if (localRecord.facultyScore !== null && localRecord.facultyScore !== undefined) {
      record.facultyScore = localRecord.facultyScore;
      record.submissionStatus = localRecord.submissionStatus || record.submissionStatus;
    }
  }

  async loadSubmissionDetail(record) {
    try {
      const detail = await DESSubmissionService.getSubmission(record.id);
      return detail ? (detail instanceof SubmissionModel ? detail : new SubmissionModel(detail)) : record;
    } catch (error) {
      console.error('[DES] Failed to load submission details:', error);
      record.rawPayload = record.rawPayload || {};
      record.rawPayload.debugError = error.message;
      return record;
    }
  }

  loadingMarkup(message) {
    return `
      <div class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
        ${this.escapeHtml(message)}
      </div>
    `;
  }

  showPlaceholderNotice(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-info alert-dismissible fade show mt-3';
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `${this.escapeHtml(message)}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    const target = this.elements.tableBody.closest('.card-body');
    target.prepend(alert);
    setTimeout(() => {
      alert.remove();
    }, 2800);
  }

  statusBadgeClass(status) {
    const classes = {
      Submitted: 'bg-success-subtle text-success-emphasis',
      'Under Review': 'bg-info-subtle text-info-emphasis',
      Evaluated: 'bg-primary-subtle text-primary-emphasis',
      Returned: 'bg-warning-subtle text-warning-emphasis'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary-emphasis';
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
  new SubmissionsBrowser().init();
});
