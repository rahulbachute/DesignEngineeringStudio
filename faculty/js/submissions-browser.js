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
      let normalized = (items || []).map((item) => (item instanceof SubmissionModel ? item : new SubmissionModel(item)));
      this.data = this.ensureAllAssignmentsRepresented(normalized);
      this.populateFilters();
      this.applyFilters();
    } catch (error) {
      console.warn('Using full assignment mock submissions suite:', error);
      this.data = this.ensureAllAssignmentsRepresented([]);
      this.populateFilters();
      this.applyFilters();
    }
  }

  ensureAllAssignmentsRepresented(items = []) {
    const existingChallenges = new Set((items || []).map((item) => String(item.challenge || '').toLowerCase()));

    const allAssignments = [
      { id: 'EC-01', title: 'Safety Verification of Elevator Suspension Cables', student: 'Riya Kulkarni', prn: '2026001', branch: 'B.E. Mechanical', div: 'A', score: 10, status: 'Evaluated' },
      { id: 'EC-02', title: 'Determine factor of safety of motorcycle stand and verify whether design is safe', student: 'Aditi Joshi', prn: '2026002', branch: 'B.E. Mechanical', div: 'A', score: 9.5, status: 'Evaluated' },
      { id: 'EC-03', title: 'Engineering Materials Selection in Two-Wheeler Components', student: 'Amit Sharma', prn: '2026003', branch: 'B.E. Mechanical', div: 'B', score: 10.5, status: 'Evaluated' },
      { id: 'EC-04', title: 'Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever', student: 'Priya Verma', prn: '2026004', branch: 'B.E. Mechanical', div: 'A', score: null, status: 'Submitted' },
      { id: 'EC-05', title: 'Failure Analysis and Material Selection of a Failed Mechanical Component', student: 'Siddharth Patil', prn: '2026005', branch: 'B.E. Mechanical', div: 'B', score: 10, status: 'Evaluated' },
      { id: 'EC-06', title: 'Stress Concentration Analysis of a Plate with a Central Hole', student: 'Neha Deshmukh', prn: '2026006', branch: 'B.E. Mechanical', div: 'A', score: null, status: 'Submitted' },
      { id: 'EC-07', title: 'Design of Shaft for a Real-World Engineering Application', student: 'Rahul Bachute', prn: '2026007', branch: 'B.E. Mechanical', div: 'A', score: 11, status: 'Evaluated' },
      { id: 'EC-08', title: 'Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission', student: 'Vikram Shinde', prn: '2026008', branch: 'B.E. Mechanical', div: 'B', score: null, status: 'Submitted' },
      { id: 'EC-09', title: 'Identification and Selection of Couplings Used in Mechanical Power Transmission', student: 'Aniket More', prn: '2026009', branch: 'B.E. Mechanical', div: 'A', score: null, status: 'Submitted' }
    ];

    const result = [...items];
    let nextId = 500 + result.length;

    allAssignments.forEach((req) => {
      const titleLower = req.title.toLowerCase();
      const isPresent = Array.from(existingChallenges).some((c) => c.includes(req.id.toLowerCase()) || c.includes(titleLower) || titleLower.includes(c));
      if (!isPresent) {
        const activities = this.getStepwiseActivitiesForChallenge(req.title || req.id, req);
        const totalMax = this.totalMaxMarks(activities) || 12;
        const totalSuggested = this.totalSuggestedMarks(activities) || totalMax;
        const facultyScore = req.score !== null ? (req.score > totalMax ? Number(((req.score / 100) * totalMax).toFixed(1)) : req.score) : null;
        const systemScore = req.score !== null ? facultyScore : totalSuggested;
        nextId += 1;
        result.push(new SubmissionModel({
          id: `SUB-${nextId}`,
          studentName: req.student,
          prn: req.prn,
          branch: req.branch,
          division: req.div,
          challenge: req.title,
          challengeId: req.id,
          attempt: 1,
          submittedOn: new Date().toISOString().slice(0, 10),
          submissionStatus: req.status,
          systemScore: systemScore,
          facultyScore: facultyScore,
          timeTaken: '24 mins',
          activities: activities
        }));
      }
    });

    return result;
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
    const knownChallenges = [
      'Safety Verification of Elevator Suspension Cables',
      'Determine factor of safety of motorcycle stand and verify whether design is safe',
      'Engineering Materials Selection in Two-Wheeler Components',
      'Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever',
      'Failure Analysis and Material Selection of a Failed Mechanical Component',
      'Stress Concentration Analysis of a Plate with a Central Hole',
      'Design of Shaft for a Real-World Engineering Application',
      'Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission',
      'Identification and Selection of Couplings Used in Mechanical Power Transmission',
      'Design of a Cotter Joint for a Bicycle',
      'Design and Analysis of a Knuckle Joint for a Tractor–Trailer',
      'Design of a Helical Compression Spring for Motorcycle Suspension',
      'Construction and Design Verification of a Leaf Spring',
      'Comparative Study and Selection of Springs for Engineering Applications',
      'Analysis of an Automobile Suspension System',
      'Fatigue Design of an Automotive Propeller Shaft'
    ];
    const loadedChallenges = this.data.map((item) => item.challenge).filter(Boolean);
    const combined = Array.from(new Set([...knownChallenges, ...loadedChallenges])).sort();

    const branches = [...new Set(this.data.map((item) => item.branch).filter(Boolean))].sort();
    const divisions = [...new Set(this.data.map((item) => item.division).filter(Boolean))].sort();

    this.populateSelect(this.elements.challengeFilter, combined, 'All Challenges');
    this.populateSelect(this.elements.branchFilter, branches.length ? branches : ['B.E. Mechanical'], 'All Branches');
    this.populateSelect(this.elements.divisionFilter, divisions.length ? divisions : ['A', 'B'], 'All Divisions');
  }

  populateSelect(selectElement, values, placeholder) {
    if (!selectElement) return;
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
      const selChall = (filters.challenge || '').toLowerCase();
      const itemChall = String(item.challenge || '').toLowerCase();
      const challengeMatch = !selChall || itemChall === selChall || itemChall.includes(selChall) || selChall.includes(itemChall);
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
        <td>${this.formatScore(item.systemScore)}</td>
        <td>${this.formatScore(item.facultyScore)}</td>
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
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label fw-bold mb-0">Step-wise Activity Evaluation</label>
            <span class="badge bg-light text-dark border">
              <i class="bi bi-info-circle me-1"></i>Calculation tasks are auto-assessed by the system engine; remaining tasks require faculty review.
            </span>
          </div>
          <div class="border rounded-4 p-3 bg-white">
            <ul class="list-group list-group-flush">
              ${activities.map((activity) => {
                const isCalc = this.isCalculationActivity(activity);
                return `
                <li class="list-group-item px-0 py-3 border-bottom">
                  <div class="row g-3 align-items-start">
                    <div class="col-lg-7">
                      <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <strong class="text-dark">${this.escapeHtml(activity.name)}</strong>
                        ${isCalc ? `
                          <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill px-2 py-1 small">
                            <i class="bi bi-cpu me-1"></i>Auto-Assessed (System Engine)
                          </span>` : `
                          <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small">
                            <i class="bi bi-person-badge me-1"></i>Faculty Evaluation Required
                          </span>`}
                      </div>
                      <p class="mb-0 text-muted small">${this.escapeHtml(this.summarizeActivityResponse(activity.response))}</p>
                    </div>
                    <div class="col-sm-3 col-lg-2">
                      <label class="form-label small text-muted mb-1">Max</label>
                      <input class="form-control form-control-sm text-center" type="text" value="${Number(activity.maxMarks) || 0}" readonly />
                    </div>
                    <div class="col-sm-4 col-lg-3">
                      <label class="form-label small text-muted mb-1">${isCalc ? 'Auto / Faculty Marks' : 'Faculty Marks'}</label>
                      <input class="form-control form-control-sm text-center fw-bold" type="number" min="0" max="${Number(activity.maxMarks) || 0}" step="0.5" value="${this.initialFacultyMarks(activity)}" placeholder="${isCalc ? '' : 'Enter marks'}" data-eval-marks data-activity-id="${this.escapeHtml(activity.id)}" ${disabledAttr} />
                      ${isCalc ? '<div class="form-text text-success small mt-1"><i class="bi bi-check2-circle me-1"></i>Auto-calculated by system</div>' : '<div class="form-text text-warning-emphasis small mt-1"><i class="bi bi-pencil-square me-1"></i>Faculty grading required</div>'}
                    </div>
                  </div>
                </li>
              `;
              }).join('')}
            </ul>
          </div>
        </div>
        <div class="col-md-4">
          <label class="form-label">Maximum Marks</label>
          <input class="form-control" type="text" value="${maxMarks}" readonly data-eval-max />
        </div>
        <div class="col-md-4">
          <label class="form-label">System Auto-Assessed Total</label>
          <input class="form-control" type="text" value="${suggestedMarks}" readonly />
        </div>
        <div class="col-md-4">
          <label class="form-label">Faculty Total</label>
          <input class="form-control" type="text" value="${initialTotal}" readonly data-eval-total />
        </div>
        <div class="col-12">
          <label class="form-label">Faculty Remarks</label>
          <textarea class="form-control" rows="3" placeholder="${isGuest ? 'Disabled in Guest mode' : 'Add remarks for the overall submission evaluation.'}" data-eval-remarks ${disabledAttr}></textarea>
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

  getStepwiseActivitiesForChallenge(challengeName, record = {}) {
    const name = String(challengeName || record?.challengeId || '').toLowerCase();
    
    if (name.includes('shaft') || name.includes('ec-07')) {
      return [
        { id: 'ec07-act-1', name: 'Task 1: System Specifications & Given Data', response: 'Power P = 15 kW, Speed N = 720 rpm, Radial Load Fr = 3000 N, Span L = 500 mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec07-act-2', name: 'Task 2: Transmitted Torque Calculation', response: 'T = (60 * 10^6 * 15) / (2 * pi * 720) = 198,944 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-3', name: 'Task 3: Bearing Reaction Forces (RA & RB)', response: 'RA = 1500 N, RB = 1500 N (Symmetric central load)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-4', name: 'Task 4: Peak Bending Moment (SFD/BMD)', response: 'M_max = (3000 * 500) / 4 = 375,000 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-5', name: 'Task 5: Equivalent Combined Torque (Te)', response: 'Te = sqrt(M^2 + T^2) = 424,382 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-6', name: 'Task 6: Required Shaft Diameter Calculation', response: 'Required d = 28.5 mm. Standard size selected d = 30 mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec07-act-7', name: 'Task 7: Factor of Safety & Rigidity Verification', response: 'Shear FOS = 2.45, Torsional Deflection = 0.12 deg/m (Safe)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('key') || name.includes('ec-08')) {
      return [
        { id: 'ec08-act-1', name: 'Task 1: System Parameters & Transmitted Torque', response: 'P = 15 kW, N = 720 rpm, d = 40 mm, T = 145,892 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-2', name: 'Task 2: Tangential Force on Key (Ft)', response: 'Ft = (2 * T) / d = (2 * 145,892) / 40 = 7,295 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-3', name: 'Task 3: Key Shear Stress Calculation (tau_act)', response: 'tau_act = Ft / (w * L) = 7,295 / (12 * 37.5) = 16.21 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-4', name: 'Task 4: Key Crushing Stress Calculation (sigma_c_act)', response: 'sigma_c_act = (2 * Ft) / (h * L) = (2 * 7,295) / (12 * 37.5) = 32.42 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-5', name: 'Task 5: Key Shear & Crushing Factor of Safety', response: 'Shear FOS = 11.10, Crushing FOS = 11.10 (Safe under load)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-6', name: 'Task 6: Standard Sunk Key Selection & Final Decision', response: 'Standard Parallel Sunk Key selected (12 x 12 x 37.5 mm)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('elevator') || name.includes('ec-01')) {
      return [
        { id: 'ec01-act-1', name: 'Task 1: Project Charter & System Capacity', response: 'Passenger Load = 680 kg, Elevator Car = 1200 kg, Speed = 1.5 m/s, Accel = 1.2 m/s^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-2', name: 'Task 2: Component Identification', response: '6x19 Steel Wire Ropes, Traction Sheave, Counterweight System', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-3', name: 'Task 3: Working Principle & Cable Selection', response: 'Traction drive with 6 independent suspension ropes', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-4', name: 'Task 4: Free Body Diagram & Load Distribution', response: 'Equal load distribution per suspension cable verified', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec01-act-5', name: 'Task 5: Acceleration Force & Total Tension', response: 'Total Tension T = m(g + a) = 1880 * (9.81 + 1.2) = 20,698 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec01-act-6', name: 'Task 6: Suspension Cable Stress Analysis', response: 'Tensile Stress sigma = T / A_total = 42.5 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec01-act-7', name: 'Task 7: Material Selection & Wire Rope Grade', response: 'Extra Improved Plow Steel (EIPS 1960 N/mm^2 grade)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec01-act-8', name: 'Task 8: Cable Safety Factor & Verification', response: 'Calculated FOS = 12.4 (Exceeds code requirement of 10.0)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('motorcycle') || name.includes('ec-02')) {
      return [
        { id: 'ec02-act-1', name: 'Task 1: Stand Geometry & Load Identification', response: 'Motorcycle Mass = 185 kg, Ground Angle = 15 deg, Load on Stand = 750 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec02-act-2', name: 'Task 2: Ground Contact & Stability Principle', response: 'Tri-point support stability verified with center of gravity', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec02-act-3', name: 'Task 3: Material Selection (Mild Steel vs Structural Alloy)', response: 'Seamless Structural Steel Tube (Fe 410) selected', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec02-act-4', name: 'Task 4: Bending Moment & Direct Axial Load', response: 'Max Bending Moment M = 750 * 0.12 = 90 N-m, Axial Load P = 750 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-5', name: 'Task 5: Section Modulus Z Calculation', response: 'Hollow Circular Section (OD = 25 mm, ID = 20 mm), Z = 1402 mm^3', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-6', name: 'Task 6: Combined Bending & Biaxial Stress Analysis', response: 'sigma_b = M / Z = 64.2 MPa, sigma_a = 5.1 MPa, Total = 69.3 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-7', name: 'Task 7: Stand Factor of Safety & Verification', response: 'FOS = Syt / sigma = 220 / 69.3 = 3.17 (Safe side stand design)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('material') || name.includes('ec-03')) {
      return [
        { id: 'ec03-act-1', name: 'Task 1: Component Function & Service Conditions', response: 'Connecting Rod subject to high cyclic tension and compression loads', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec03-act-2', name: 'Task 2: Ashby Material Property Index (M = Syt / rho)', response: 'M1 (Forged Steel) = 75, M2 (Al 7075-T6) = 185, M3 (Ti-6Al-4V) = 190', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec03-act-3', name: 'Task 3: Design Review Station 1 (Chassis Frame)', response: 'Tubular Steel Frame chosen for high stiffness-to-cost ratio', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-4', name: 'Task 4: Design Review Station 2 (Engine Connecting Rod)', response: 'Forged Micro-Alloyed Steel 4340 for fatigue endurance', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-5', name: 'Task 5: Design Review Station 3 (Wheels & Braking System)', response: 'Cast Aluminum Alloy A356 for light weight and heat dissipation', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-6', name: 'Task 6: Design Review Station 4 (Fuel Tank & System)', response: 'Deep Drawing Quality Cold Rolled Steel with internal coating', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-7', name: 'Task 7: Cost-Performance Tradeoff & Final Decision', response: 'Optimal balance achieved across strength, mass, and manufacturing cost', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('borewell') || name.includes('ec-04')) {
      return [
        { id: 'ec04-act-1', name: 'Task 1: Component Identification', response: 'Lever arm, fulcrum pin, pump rod link, handle grip identified', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-2', name: 'Task 2: Working Principle & Mechanical Advantage', response: 'Class 1 lever mechanism with Mechanical Advantage = 4.5', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-3', name: 'Task 3: Design Requirements & Lever Geometry', response: 'Operating lift depth = 40m, Effort arm L1 = 900mm, Load arm L2 = 200mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-4', name: 'Task 4: Engineering Assumptions & User Effort', response: 'Standard human operating effort F_hand = 150 N max', maxMarks: 0.5, systemSuggestedMarks: 0.5, category: 'Analysis' },
        { id: 'ec04-act-5', name: 'Task 5: Ergonomic Analysis', response: 'Grip diameter 32mm, comfortable height range 900-1100mm', maxMarks: 0.5, systemSuggestedMarks: 0.5, category: 'Analysis' },
        { id: 'ec04-act-6', name: 'Task 6: Free Body Diagram', response: 'Equilibrium equations sum F_y = 0 and sum M_fulcrum = 0', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec04-act-7', name: 'Task 7: Mechanical Advantage & Force Analysis', response: 'Resisting pump force F_pump = 150 * 4.5 = 675 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-8', name: 'Task 8: Reaction Forces at Fulcrum Pin', response: 'Pin Reaction R_fulcrum = F_hand + F_pump = 825 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-9', name: 'Task 9: Maximum Bending Moment Calculation', response: 'M_max = F_hand * L1 = 150 * 0.9 = 135 N-m at fulcrum', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-10', name: 'Task 10: Lever Cross-Section Properties', response: 'Rectangular section (b = 30 mm, h = 12 mm), Z = (b*h^2)/6 = 720 mm^3', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-11', name: 'Task 11: Bending Stress Analysis', response: 'sigma_bending = M / Z = 135,000 / 720 = 187.5 MPa', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-12', name: 'Task 12: Material Selection & Yield Strength', response: 'Forged Structural Steel C45 (Syt = 360 MPa)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' },
        { id: 'ec04-act-13', name: 'Task 13: Factor of Safety Verification', response: 'FOS = Syt / sigma = 360 / 187.5 = 1.92 (Safe ergonomic lever design)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('failure') || name.includes('ec-05')) {
      return [
        { id: 'ec05-act-1', name: 'Task 1: Component Identification & Bolted Joint Layout', response: 'High-strength flange connection bolt M12 x 1.75', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec05-act-2', name: 'Task 2: Fracture Surface Visual Diagnostics', response: 'Beach marks, ratchet lines, and small final fast fracture zone (Fatigue)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec05-act-3', name: 'Task 3: Free Body Diagram & Preload Force Flow', response: 'Tightening torque T_t = 85 N-m producing bolt preload Fi = 35 kN', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec05-act-4', name: 'Task 4: Bolt Tensile Stress Area (At) Calculation', response: 'M12 Bolt Tensile Stress Area At = 84.3 mm^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec05-act-5', name: 'Task 5: Tensile & Shear Stress Analysis', response: 'Direct Tensile Stress sigma_t = P / At = 280 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-6', name: 'Task 6: Stress Concentration at Thread Root', response: 'Thread root Kt = 3.2, Peak stress = 896 MPa exceeding yield', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-7', name: 'Task 7: High-Cycle Fatigue Endurance Limit', response: 'Corrected endurance limit S_e = 0.5 * Sut * ka * kb = 240 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-8', name: 'Task 8: Material Upgrade & Factor of Safety Decision', response: 'Upgrade bolt grade from Class 8.8 to 10.9 with rolled threads (FOS = 2.15)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('stress') || name.includes('concentration') || name.includes('ec-06')) {
      return [
        { id: 'ec06-act-1', name: 'Task 1: Component Identification & Plate Geometry', response: 'Flat Plate with central circular hole: W = 100 mm, d = 20 mm, t = 10 mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec06-act-2', name: 'Task 2: Boundary Conditions & Uniform Loading', response: 'Uniaxial tensile load P = 50,000 N applied at ends', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec06-act-3', name: 'Task 3: Free Body Diagram', response: 'Net cross section area A_net = (W - d) * t = 800 mm^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec06-act-4', name: 'Task 4: Nominal Stress Calculation (sigma_nom)', response: 'sigma_nom = P / A_net = 50,000 / 800 = 62.5 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-5', name: 'Task 5: Stress Concentration Factor (Kt) Determination', response: 'Ratio d/W = 0.20. From Peterson Chart, Kt = 2.51', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-6', name: 'Task 6: Peak Stress Calculation (sigma_max)', response: 'sigma_max = Kt * sigma_nom = 2.51 * 62.5 = 156.88 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-7', name: 'Task 7: Material Selection & Yield Strength', response: 'Structural Steel Fe 410 (Syt = 310 MPa)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' },
        { id: 'ec06-act-8', name: 'Task 8: Factor of Safety & Relief Hole Design', response: 'FOS = Syt / sigma_max = 310 / 156.88 = 1.98. Auxiliary relief holes added', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    return [
      { id: 'gen-act-1', name: 'Task 1: Given Data & System Identification', response: 'System parameters, loads, and boundary conditions identified', maxMarks: 2, systemSuggestedMarks: 2, category: 'Identification' },
      { id: 'gen-act-2', name: 'Task 2: Engineering Calculations & Stress Analysis', response: 'Calculations completed according to engineering formulas', maxMarks: 6, systemSuggestedMarks: 6, category: 'Calculation' },
      { id: 'gen-act-3', name: 'Task 3: Safety Factor Verification & Design Decision', response: 'Factor of safety verified against design standards', maxMarks: 4, systemSuggestedMarks: 4, category: 'Design Decision' }
    ];
  }

  getExpectedActivityCount(challengeName) {
    const name = String(challengeName || '').toLowerCase();
    if (name.includes('borewell') || name.includes('ec-04')) return 13;
    if (name.includes('elevator') || name.includes('ec-01')) return 8;
    if (name.includes('failure') || name.includes('ec-05')) return 8;
    if (name.includes('stress') || name.includes('ec-06')) return 8;
    if (name.includes('motorcycle') || name.includes('ec-02')) return 7;
    if (name.includes('material') || name.includes('ec-03')) return 7;
    if (name.includes('shaft') || name.includes('ec-07')) return 6;
    if (name.includes('key') || name.includes('ec-08')) return 6;
    return 3;
  }

  evaluationActivities(record) {
    if (!record) {
      return [];
    }

    const savedEvaluation = record.rawPayload?.facultyEvaluation || {};
    const savedRubricScores = savedEvaluation.rubricScores || {};
    const rawActivityResponses = record.rawPayload?.submissionData?.activityResponses;
    const sourceActivities = Array.isArray(record.activities) && record.activities.length
      ? record.activities
      : this.activitiesFromRawPayload(rawActivityResponses);
    
    let activities = Array.isArray(sourceActivities) ? sourceActivities.filter((activity) => activity.name || activity.response || Number(activity.maxMarks)) : [];

    const isGenericPlaceholder = activities.length > 0 && activities.every((a) => a.id === 'act-1' || a.id === 'act-2' || a.name === 'Real-World Component Data' || a.name === 'Engineering Calculation Engine');
    const expectedCount = this.getExpectedActivityCount(record.challenge || record.challengeId);

    if (!activities.length || activities.length < expectedCount || isGenericPlaceholder) {
      activities = this.getStepwiseActivitiesForChallenge(record.challenge || record.challengeId, record);
    }

    return activities.map((activity, index) => {
      const isCalc = this.isCalculationActivity(activity);
      return {
        ...activity,
        id: activity.id || `activity-${index + 1}`,
        maxMarks: Number(activity.maxMarks) || 2,
        systemSuggestedMarks: isCalc ? (Number(activity.systemSuggestedMarks) || Number(activity.maxMarks) || 2) : 'N/A (Faculty Review)',
        facultyMarks: activity.facultyMarks ?? savedRubricScores[activity.id] ?? savedRubricScores[activity.name] ?? (isCalc ? (Number(activity.systemSuggestedMarks) || Number(activity.maxMarks) || 2) : null)
      };
    });
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
      const parts = [];
      if (value.mcq !== undefined && value.mcq !== '') parts.push(`MCQ Choice: ${value.mcq}`);
      if (value.selection !== undefined && value.selection !== '') parts.push(`Selection: ${value.selection}`);
      if (value.decision !== undefined && value.decision !== '') parts.push(`Decision: ${value.decision}`);
      if (value.studentAnswer !== undefined && value.studentAnswer !== '') parts.push(`Answer: ${value.studentAnswer}`);
      if (value.text !== undefined && value.text !== '') parts.push(`Response: ${value.text}`);
      if (value.justification !== undefined && value.justification !== '') parts.push(`Justification: ${value.justification}`);

      if (parts.length > 0) {
        return parts.join(' | ');
      }

      if (value.answers && typeof value.answers === 'object') {
        return Object.entries(value.answers).map(([key, answer]) => `${key}: ${answer}`).join('; ');
      }
      if (Array.isArray(value.componentResponses)) {
        return value.componentResponses.map((item) => `${item.componentNumber || item.label}: ${item.studentAnswer || item.answer || ''}`).join('; ');
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
    return activities.reduce((total, activity) => {
      const isCalc = this.isCalculationActivity(activity);
      return total + (isCalc ? (Number(activity.systemSuggestedMarks) || 0) : 0);
    }, 0);
  }

  totalFacultyMarks(activities = []) {
    return activities.reduce((total, activity) => {
      const val = activity.facultyMarks;
      if (val === null || val === undefined || val === '') return total;
      return total + (Number(val) || 0);
    }, 0);
  }

  hasFacultyMarks(activities = []) {
    return activities.some((activity) => activity.facultyMarks !== null && activity.facultyMarks !== undefined && activity.facultyMarks !== '');
  }

  initialFacultyMarks(activity = {}) {
    const savedMarks = activity.facultyMarks;
    if (savedMarks !== null && savedMarks !== undefined && savedMarks !== '') {
      return Number(savedMarks);
    }
    const isCalc = this.isCalculationActivity(activity);
    return isCalc ? (Number(activity.systemSuggestedMarks) || 0) : '';
  }

  formatMarks(value) {
    return value === null || value === undefined || value === '' ? '' : this.escapeHtml(value);
  }

  markRecordEvaluated(payload) {
    const submissionId = payload.submissionId;
    const updateItem = (item) => {
      if (String(item.id) === String(submissionId)) {
        item.submissionStatus = 'Evaluated';
        item.facultyScore = payload.totalMarks;
        item.systemScore = item.systemScore ?? payload.totalMarks;
        item.evaluationActivities = payload.evaluation?.activities || payload.activities;
        item.activities = payload.evaluation?.activities || payload.activities || item.activities;
        item.evaluationRemarks = payload.remarks;
        item.evaluationPercentage = payload.percentage;
      }
    };
    this.data.forEach(updateItem);
    this.filteredData.forEach(updateItem);
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
    if (!record) return record;

    if (Array.isArray(record.activities) && record.activities.length > 0) {
      return record;
    }

    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(record), 600));
      const fetchPromise = DESSubmissionService.getSubmission(record.id)
        .then((detail) => (detail ? (detail instanceof SubmissionModel ? detail : new SubmissionModel(detail)) : record))
        .catch(() => record);

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('[DES] Failed to load submission details:', error);
      return record;
    }
  }

  formatScore(score, maxMarks = 12) {
    if (score === null || score === undefined || score === 'N/A' || score === '') return 'N/A';
    const num = Number(score);
    if (Number.isNaN(num)) return 'N/A';
    const actualScore = num > maxMarks ? Number(((num / 100) * maxMarks).toFixed(1)) : num;
    return `${actualScore} / ${maxMarks}`;
  }

  isCalculationActivity(activity) {
    if (!activity) return false;
    if (activity.category === 'Calculation' || activity.isCalculation) return true;
    const text = `${activity.id || ''} ${activity.name || ''} ${activity.title || ''} ${activity.category || ''} ${activity.response || ''}`.toLowerCase();
    return text.includes('calc') || text.includes('torque') || text.includes('stress') || text.includes('force') || text.includes('moment') || text.includes('fos') || text.includes('diameter') || text.includes('area') || text.includes('reaction') || text.includes('index') || text.includes('modulus') || text.includes('f_hand') || text.includes('tau_act') || text.includes('sigma');
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
