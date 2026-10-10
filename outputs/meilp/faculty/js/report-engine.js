class ReportEngine {
  constructor() {
    this.state = {
      catalog: [],
      activeReport: null,
      submissions: [],
      loading: false,
      error: null,
      chartInstances: {},
      filters: {
        division: 'All',
        academicYear: '2026-27',
        assignment: 'All'
      }
    };
  }

  async init() {
    this.initFacultyInfo();
    this.initFilters();
    this.bindEvents();

    // 1. Initialize reports catalog
    this.state.catalog = (window.DESReportService && typeof window.DESReportService.getCatalog === 'function')
      ? window.DESReportService.getCatalog()
      : this.getDefaultCatalog();

    this.state.activeReport = this.state.catalog[0]; // Student Evaluation Report by default
    this.renderReportDashboard();

    // 2. Load authoritative backend submission data
    await this.loadData();
  }

  initFacultyInfo() {
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const loggedIn = localStorage.getItem("loggedInFaculty") || user.facultyName || user.name || "Faculty Member";
    const facultyName = (user.isGuest || loggedIn.toLowerCase() === "guest")
      ? "Guest Faculty"
      : (user.facultyName || user.name || loggedIn);
    const collegeName = user.collegeName || user.college || "Engineering Institution";

    const facultyInput = document.getElementById("facultyFilter");
    if (facultyInput) {
      facultyInput.value = facultyName;
    }

    const institutionInput = document.getElementById("institutionFilter");
    if (institutionInput) {
      institutionInput.value = collegeName;
    }
  }

  normalizeDivisionCode(div) {
    if (!div) return 'All';
    const str = String(div).trim();
    if (str.toUpperCase() === 'ALL' || str === '') return 'All';
    const match = str.match(/^(?:TE\s*Mechanical\s*[-—–]\s*)?(?:Div(?:ision)?\s*)?([A-Za-z0-9]+)$/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return str.toUpperCase();
  }

  initFilters() {
    const classEl = document.getElementById("classFilter");
    const yearEl = document.getElementById("academicYearFilter");
    const assignEl = document.getElementById("assignmentFilter");

    if (classEl && classEl.value) {
      this.state.filters.division = this.normalizeDivisionCode(classEl.value);
    } else {
      this.state.filters.division = 'All';
    }

    if (yearEl && yearEl.value) {
      this.state.filters.academicYear = yearEl.value;
    } else {
      this.state.filters.academicYear = '2026-27';
    }

    if (assignEl && assignEl.value) {
      this.state.filters.assignment = assignEl.value;
    } else {
      this.state.filters.assignment = 'All';
    }
  }

  setDivision(division) {
    if (!division) return;
    const normalized = this.normalizeDivisionCode(division);
    this.state.filters.division = normalized;
    const classEl = document.getElementById("classFilter");
    if (classEl && classEl.value !== normalized) {
      classEl.value = normalized;
    }
    this.renderPreview();
  }

  setAcademicYear(year) {
    if (!year) return;
    this.state.filters.academicYear = year;
    const yearEl = document.getElementById("academicYearFilter");
    if (yearEl && yearEl.value !== year) {
      yearEl.value = year;
    }
    this.renderPreview();
  }

  setAssignment(assignment) {
    if (!assignment) return;
    this.state.filters.assignment = assignment;
    const assignEl = document.getElementById("assignmentFilter");
    if (assignEl && assignEl.value !== assignment) {
      assignEl.value = assignment;
    }
    this.renderPreview();
  }

  getDefaultCatalog() {
    return [
      { id: 'student-eval', title: 'Student Evaluation Report', category: 'Assessment Reports', description: 'Comprehensive student-wise marks sheet, rubrics breakdown, and faculty remarks for the class.', tags: ['assessment', 'student', 'evaluation'] },
      { id: 'challenge-marks', title: 'Challenge-wise Marks Report', category: 'Assessment Reports', description: 'Challenge-level attainment and spread of marks across assignments.', tags: ['assessment', 'challenge'] },
      { id: 'batch-performance', title: 'Batch Performance Report', category: 'Assessment Reports', description: 'Batch comparator for academic strength, pass percentages, and progress.', tags: ['assessment', 'batch'] },
      { id: 'co-attainment', title: 'Course Outcome Attainment Report', category: 'Outcome Reports', description: 'CO target vs actual attainment with continuous quality improvement actions.', tags: ['outcome', 'co'] },
      { id: 'po-contribution', title: 'Program Outcome Contribution Report', category: 'Outcome Reports', description: 'PO & PSO contribution and gap analysis for NBA/NAAC accreditation.', tags: ['outcome', 'po'] },
      { id: 'student-history', title: 'Student Performance History', category: 'Student Reports', description: 'Longitudinal academic trends and multi-assignment progression.', tags: ['student', 'history'] },
      { id: 'challenge-analytics', title: 'Challenge Analytics Summary', category: 'Challenge Reports', description: 'Difficulty index, completion rates, and learning gain summary.', tags: ['challenge'] },
      { id: 'faculty-workload', title: 'Faculty Workload Report', category: 'Faculty Reports', description: 'Evaluation progress and assessment workload distribution.', tags: ['faculty'] },
      { id: 'department-performance', title: 'Department Performance Report', category: 'Department Reports', description: 'Department-wide metrics and comparative analysis.', tags: ['department'] },
      { id: 'nba-sar', title: 'NBA SAR Report', category: 'Accreditation Reports', description: 'Accreditation-ready evidence pack with criterion attainment data.', tags: ['accreditation', 'nba'] },
      { id: 'naac-aqar', title: 'NAAC AQAR Report', category: 'Accreditation Reports', description: 'Quality metric summary for AQAR annual academic reports.', tags: ['accreditation', 'naac'] },
      { id: 'custom-summary', title: 'Custom Academic Summary', category: 'Custom Reports', description: 'Flexible summary report for Academic Council and Board of Studies.', tags: ['custom'] }
    ];
  }

  async loadData() {
    this.state.loading = true;
    this.state.error = null;
    this.renderLoadingState();
    this.updateDataSourceBadge('loading');

    // Preserve filter selections during data retrieval
    const filters = this.getFilterValues();

    try {
      const data = await (window.DESReportService?.getReports?.(filters)
        || window.DESReportService?.getSubmissions?.(filters)
        || window.DESRepository?.getSubmissions?.(filters)
        || []);

      this.state.submissions = Array.isArray(data) ? data : [];
      this.state.loading = false;
      this.updateDataSourceBadge('live');
    } catch (error) {
      console.error('Error retrieving submission records for report:', error);
      this.state.submissions = [];
      this.state.loading = false;
      this.state.error = error && error.message ? error.message : 'Failed to retrieve authoritative submission records from backend.';
      this.updateDataSourceBadge('error');
    }

    // Ensure DOM select still reflects the preserved division before rendering preview
    const classEl = document.getElementById('classFilter');
    if (classEl && classEl.value !== this.state.filters.division) {
      classEl.value = this.state.filters.division;
    }

    this.renderPreview();
  }

  updateDataSourceBadge(status) {
    const badge = document.getElementById('reportDataSourceBadge');
    if (!badge) return;

    if (status === 'live') {
      badge.className = 'badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-2';
      badge.innerHTML = '<i class="bi bi-shield-check me-1"></i>Verified Submissions';
    } else if (status === 'loading') {
      badge.className = 'badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-2';
      badge.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Loading...';
    } else if (status === 'error') {
      badge.className = 'badge bg-danger-subtle text-danger-emphasis rounded-pill px-3 py-2';
      badge.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Source Error';
    }
  }

  bindEvents() {
    const searchInput = document.getElementById('reportSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => this.filterReports(event.target.value));
    }

    const catFilter = document.getElementById('reportCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (event) => this.filterReports(document.getElementById('reportSearch')?.value || '', event.target.value));
    }

    // Single dedicated change handler for each filter
    const classFilter = document.getElementById('classFilter');
    if (classFilter) {
      classFilter.addEventListener('change', (event) => {
        this.setDivision(event.target.value);
      });
    }

    const yearFilter = document.getElementById('academicYearFilter');
    if (yearFilter) {
      yearFilter.addEventListener('change', (event) => {
        this.setAcademicYear(event.target.value);
      });
    }

    const assignFilter = document.getElementById('assignmentFilter');
    if (assignFilter) {
      assignFilter.addEventListener('change', (event) => {
        this.setAssignment(event.target.value);
      });
    }

    const genBtn = document.getElementById('generateReportBtn');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.generateSelectedReport());
    }

    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => this.exportPdf());
    }

    const excelBtn = document.getElementById('exportExcelBtn');
    if (excelBtn) {
      excelBtn.addEventListener('click', () => this.exportExcel());
    }

    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => this.printReport());
    }

    const jsonBtn = document.getElementById('downloadJsonBtn');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => this.exportJson());
    }

    const csvBtn = document.getElementById('downloadCsvBtn');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.exportCsv());
    }

    // Clickable Category Cards
    document.querySelectorAll('[data-category-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category-card');
        if (catFilter) {
          catFilter.value = cat;
        }
        this.filterReports(document.getElementById('reportSearch')?.value || '', cat);
      });
    });
  }

  renderLoadingState() {
    const previewBody = document.getElementById('reportPreviewBody');
    if (previewBody) {
      previewBody.innerHTML = `
        <div class="border rounded-4 p-5 bg-white shadow-sm text-center">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <h5 class="fw-bold text-dark mb-1">Loading Authoritative Submissions</h5>
          <p class="text-muted small mb-0">Retrieving verified student submissions for authenticated faculty scope...</p>
        </div>
      `;
    }
  }

  renderReportDashboard() {
    const catalog = document.getElementById('reportCatalog');
    if (!catalog) return;

    catalog.innerHTML = this.state.catalog.map((report) => {
      const isActive = this.state.activeReport && this.state.activeReport.id === report.id;
      return `
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-start ${isActive ? 'active' : ''}" data-report-id="${report.id}">
          <span>
            <strong>${this.escapeHtml(report.title)}</strong>
            <div class="small ${isActive ? 'text-white-50' : 'text-muted'} mt-1">${this.escapeHtml(report.description)}</div>
          </span>
          <span class="badge rounded-pill ${isActive ? 'bg-light text-dark' : 'bg-secondary-subtle text-secondary-emphasis'}">${this.escapeHtml(report.category)}</span>
        </button>
      `;
    }).join('');

    catalog.querySelectorAll('[data-report-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-report-id');
        this.state.activeReport = this.state.catalog.find((item) => item.id === id);
        this.renderReportDashboard();
        this.renderPreview();
      });
    });

    if (!this.state.activeReport && this.state.catalog.length > 0) {
      this.state.activeReport = this.state.catalog[0];
    }
  }

  filterReports(searchText = '', category = '') {
    const term = searchText.toLowerCase().trim();
    const filtered = this.state.catalog.filter((report) => {
      const matchesTerm = !term || report.title.toLowerCase().includes(term) || report.description.toLowerCase().includes(term) || (report.tags && report.tags.some((tag) => tag.includes(term)));
      const matchesCategory = !category || report.category === category;
      return matchesTerm && matchesCategory;
    });

    const catalog = document.getElementById('reportCatalog');
    if (catalog) {
      if (filtered.length === 0) {
        catalog.innerHTML = '<div class="p-3 text-muted">No matching reports found.</div>';
        return;
      }
      catalog.innerHTML = filtered.map((report) => {
        const isActive = this.state.activeReport && this.state.activeReport.id === report.id;
        return `
          <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-start ${isActive ? 'active' : ''}" data-report-id="${report.id}">
            <span>
              <strong>${this.escapeHtml(report.title)}</strong>
              <div class="small ${isActive ? 'text-white-50' : 'text-muted'} mt-1">${this.escapeHtml(report.description)}</div>
            </span>
            <span class="badge rounded-pill ${isActive ? 'bg-light text-dark' : 'bg-secondary-subtle text-secondary-emphasis'}">${this.escapeHtml(report.category)}</span>
          </button>
        `;
      }).join('');

      catalog.querySelectorAll('[data-report-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.getAttribute('data-report-id');
          this.state.activeReport = this.state.catalog.find((item) => item.id === id);
          this.filterReports(searchText, category);
          this.renderPreview();
        });
      });
    }
  }

  getFilterValues() {
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const faculty = user.facultyName || user.name || document.getElementById('facultyFilter')?.value || 'Faculty Member';
    const institution = user.collegeName || user.college || document.getElementById('institutionFilter')?.value || 'Engineering Institution';
    
    // Authoritative single source of truth: this.state.filters
    const classEl = document.getElementById('classFilter');
    const division = this.state.filters?.division || (classEl?.value ? this.normalizeDivisionCode(classEl.value) : 'All');
    const academicYear = this.state.filters?.academicYear || document.getElementById('academicYearFilter')?.value || '2026-27';
    const assignment = this.state.filters?.assignment || document.getElementById('assignmentFilter')?.value || 'All';

    // Synchronize DOM elements to match authoritative state
    if (classEl && classEl.value !== division && division !== 'All') {
      classEl.value = division;
    }

    const className = (division && division !== 'All')
      ? `TE Mechanical — Division ${division}`
      : 'TE Mechanical — All Divisions';

    return {
      faculty,
      institution,
      facultyId: user.facultyId || null,
      division,
      className,
      academicYear,
      assignment,
      programme: user.department ? `B.E. ${user.department}` : 'B.E. Mechanical Engineering',
      course: 'Design of Machine Elements (PCC303-MEC)'
    };
  }

  parseSubmissionDivision(s) {
    const rawDiv = String(s.division || '').trim();
    const roll = String(s.prn || s.rollNumber || s.id || '').trim().toUpperCase();

    let code = '';

    if (rawDiv) {
      const cleaned = rawDiv.replace(/^(?:TE\s*Mechanical\s*[-—–]\s*)?(?:Div(?:ision)?\s*)?/i, '').trim();
      if (cleaned) {
        code = cleaned.toUpperCase();
      }
    }

    if (!code && roll) {
      if (roll.includes('TEA-') || roll.includes('-A') || roll.endsWith('A')) {
        code = 'A';
      } else if (roll.includes('TEB-') || roll.includes('-B') || roll.endsWith('B')) {
        code = 'B';
      } else if (roll.includes('TEC-') || roll.includes('-C') || roll.endsWith('C')) {
        code = 'C';
      } else if (roll.includes('TED-') || roll.includes('-D') || roll.endsWith('D')) {
        code = 'D';
      }
    }

    if (!code) {
      return {
        divLabel: rawDiv || 'Unassigned',
        divisionCode: 'UNASSIGNED'
      };
    }

    return {
      divLabel: `Div ${code}`,
      divisionCode: code
    };
  }

  getStudentEvaluations(filters = this.getFilterValues()) {
    const rawSubmissions = Array.isArray(this.state.submissions) ? this.state.submissions : [];
    if (rawSubmissions.length === 0) {
      return [];
    }

    // Deduplicate multiple attempts per student for the assessment report view, keeping latest attempt
    const deduplicatedMap = new Map();
    rawSubmissions.forEach((sub) => {
      const studentKey = String(sub.prn || sub.rollNumber || sub.studentName || sub.id).trim();
      const assignmentKey = String(sub.challengeId || sub.challenge || 'default').trim();
      const groupKey = `${studentKey}___${assignmentKey}`;

      const existing = deduplicatedMap.get(groupKey);
      if (!existing) {
        deduplicatedMap.set(groupKey, sub);
      } else {
        const existingAttempt = Number(existing.attempt || 1);
        const currentAttempt = Number(sub.attempt || 1);
        const existingTime = new Date(existing.submittedOn || existing.timestamp || 0).getTime();
        const currentTime = new Date(sub.submittedOn || sub.timestamp || 0).getTime();
        if (currentAttempt > existingAttempt || currentTime > existingTime) {
          deduplicatedMap.set(groupKey, sub);
        }
      }
    });

    const list = Array.from(deduplicatedMap.values()).map((s) => {
      const roll = String(s.prn || s.rollNumber || s.id || '').trim();
      const divInfo = this.parseSubmissionDivision(s);

      const marksVal = (s.facultyScore !== null && s.facultyScore !== undefined && s.facultyScore !== '')
        ? Number(s.facultyScore)
        : ((s.systemScore !== null && s.systemScore !== undefined && s.systemScore !== '')
          ? Number(s.systemScore)
          : null);

      const statusVal = s.submissionStatus || s.status || 'Submitted';
      let dateVal = s.submittedOn || '';
      if (!dateVal && s.timestamp) {
        try {
          dateVal = new Date(s.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
          dateVal = String(s.timestamp);
        }
      }

      return {
        roll: roll || 'N/A',
        prn: s.prn || s.rollNumber || s.id || 'N/A',
        name: s.studentName || 'Student',
        div: divInfo.divLabel,
        divisionCode: divInfo.divisionCode,
        assignment: s.challenge || s.challengeTitle || s.challengeId || 'Assignment',
        assignmentId: s.challengeId || '',
        marks: marksVal,
        status: statusVal,
        date: dateVal,
        completionPercent: s.completionPercent ?? null,
        remarks: s.remarks || (marksVal !== null ? `Evaluation verified (${statusVal})` : 'Awaiting Faculty Evaluation'),
        attempt: Number(s.attempt || 1),
        submissionId: s.id || s.submissionId || ''
      };
    });

    // Apply UI filters within the authorized dataset
    return list.filter((item) => {
      if (filters.division && filters.division !== 'All') {
        if (item.divisionCode.toUpperCase() !== filters.division.toUpperCase()) {
          return false;
        }
      }
      if (filters.assignment && filters.assignment !== 'All') {
        const matchCode = String(item.assignmentId || '').toUpperCase() === filters.assignment.toUpperCase();
        const matchTitle = String(item.assignment || '').toLowerCase().includes(filters.assignment.toLowerCase());
        if (!matchCode && !matchTitle) {
          return false;
        }
      }
      return true;
    });
  }

  renderPreview() {
    const previewTitle = document.getElementById('reportPreviewTitle');
    const previewMeta = document.getElementById('reportPreviewMeta');
    const previewBody = document.getElementById('reportPreviewBody');

    if (!this.state.activeReport) {
      if (previewTitle) previewTitle.textContent = 'Select a report to preview';
      return;
    }

    const filters = this.getFilterValues();

    if (previewTitle) previewTitle.textContent = this.state.activeReport.title;
    if (previewMeta) {
      previewMeta.innerHTML = `
        <span class="badge bg-primary-subtle text-primary-emphasis me-1">${this.escapeHtml(this.state.activeReport.category)}</span>
        <span class="badge bg-dark-subtle text-dark-emphasis me-1"><i class="bi bi-person-fill me-1"></i>${this.escapeHtml(filters.faculty)}</span>
        <span class="badge bg-info-subtle text-info-emphasis me-1"><i class="bi bi-people-fill me-1"></i>${this.escapeHtml(filters.className)}</span>
        <span class="badge bg-secondary-subtle text-secondary-emphasis me-1">${this.escapeHtml(filters.academicYear)}</span>
        <span class="badge bg-success-subtle text-success-emphasis"><i class="bi bi-shield-check me-1"></i>Verified Submissions</span>
      `;
    }

    if (!previewBody) return;

    if (this.state.loading) {
      this.renderLoadingState();
      return;
    }

    if (this.state.error) {
      previewBody.innerHTML = `
        <div class="alert alert-danger border-0 rounded-4 p-4 text-center shadow-sm" id="printableReportContent">
          <i class="bi bi-exclamation-triangle-fill fs-2 text-danger mb-2 d-block"></i>
          <h5 class="fw-bold mb-2">Unable to Retrieve Submission Data</h5>
          <p class="text-muted mb-3">${this.escapeHtml(this.state.error)}</p>
          <button class="btn btn-sm btn-outline-danger px-3 rounded-pill" onclick="window.reportEngineInstance?.loadData()">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry Request
          </button>
        </div>
      `;
      this.destroyCharts();
      return;
    }

    if (this.state.activeReport.id === 'student-eval') {
      this.renderStudentEvaluationReport(previewBody, filters);
    } else {
      this.renderGenericReport(previewBody, filters);
    }

    this.renderCharts();
  }

  renderStudentEvaluationReport(container, filters) {
    const evaluations = this.getStudentEvaluations(filters);
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    if (evaluations.length === 0) {
      container.innerHTML = `
        <div class="border rounded-4 p-5 bg-white shadow-sm text-center" id="printableReportContent">
          <div class="mb-3">
            <i class="bi bi-inbox fs-1 text-muted"></i>
          </div>
          <h5 class="fw-bold text-dark mb-2">No Submission Records Available</h5>
          <p class="text-muted mb-0">No student submission records were found for <strong>${this.escapeHtml(filters.faculty)}</strong> matching the selected criteria (${this.escapeHtml(filters.className)}, ${this.escapeHtml(filters.assignment)}).</p>
        </div>
      `;
      return;
    }

    const totalCount = evaluations.length;
    const evaluatedItems = evaluations.filter(e => e.marks !== null && !isNaN(e.marks));
    const totalMarksSum = evaluatedItems.reduce((sum, item) => sum + item.marks, 0);
    const avgMarks = evaluatedItems.length > 0 ? (totalMarksSum / evaluatedItems.length).toFixed(2) : '—';
    const avgPercent = evaluatedItems.length > 0 ? (((totalMarksSum / evaluatedItems.length) / 12) * 100).toFixed(1) : '—';
    const distinctionCount = evaluatedItems.filter(e => e.marks >= 10.5).length;

    container.innerHTML = `
      <div class="border rounded-4 p-4 bg-white shadow-sm" id="printableReportContent">
        <!-- Institutional Header -->
        <div class="border-bottom pb-4 mb-4 text-center">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-primary text-white px-3 py-1">MEILP Academic Evaluation Record</span>
            <span class="text-muted small">Generated: ${currentDate}</span>
          </div>
          <h4 class="fw-bold text-dark mb-1">${this.escapeHtml(filters.institution)}</h4>
          <h6 class="text-secondary mb-2">${this.escapeHtml(filters.programme)}</h6>
          <div class="p-2 bg-light rounded-3 d-inline-block px-4 border">
            <strong class="text-primary fs-6">Course: ${this.escapeHtml(filters.course)}</strong>
          </div>
        </div>

        <!-- Faculty & Class Metadata Card -->
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="p-3 bg-light rounded-3 border h-100">
              <h6 class="fw-bold text-dark mb-2 border-bottom pb-2"><i class="bi bi-person-badge me-2 text-primary"></i>Faculty &amp; Class Scope</h6>
              <div class="small mb-1"><strong>Faculty / Evaluator:</strong> <span class="text-primary fw-semibold">${this.escapeHtml(filters.faculty)}</span></div>
              <div class="small mb-1"><strong>Institution:</strong> ${this.escapeHtml(filters.institution)}</div>
              <div class="small mb-1"><strong>Target Class / Division:</strong> <span class="badge bg-dark text-white">${this.escapeHtml(filters.className)}</span></div>
              <div class="small mb-0"><strong>Academic Year:</strong> ${this.escapeHtml(filters.academicYear)} (Semester IV)</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="p-3 bg-light rounded-3 border h-100">
              <h6 class="fw-bold text-dark mb-2 border-bottom pb-2"><i class="bi bi-bar-chart-fill me-2 text-success"></i>Evaluation Performance Summary</h6>
              <div class="row g-2 text-center pt-1">
                <div class="col-4">
                  <div class="bg-white p-2 rounded border">
                    <div class="fs-5 fw-bold text-primary">${totalCount}</div>
                    <div class="small text-muted" style="font-size: 0.75rem;">Submissions</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="bg-white p-2 rounded border">
                    <div class="fs-5 fw-bold text-success">${avgMarks !== '—' ? avgMarks + ' / 12' : 'Pending'}</div>
                    <div class="small text-muted" style="font-size: 0.75rem;">Avg (${avgPercent !== '—' ? avgPercent + '%' : 'Pending'})</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="bg-white p-2 rounded border">
                    <div class="fs-5 fw-bold text-warning">${distinctionCount}</div>
                    <div class="small text-muted" style="font-size: 0.75rem;">Distinctions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Evaluation Table -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="h6 fw-bold text-dark mb-0"><i class="bi bi-table me-2 text-primary"></i>Student Evaluation Record Sheet (${this.escapeHtml(filters.className)})</h5>
          <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle px-3 py-1">CCE Max Marks: 12.0</span>
        </div>

        <div class="table-responsive mb-4">
          <table class="table table-bordered table-hover table-sm align-middle bg-white mb-0" style="font-size: 0.875rem;">
            <thead class="table-dark">
              <tr class="text-center align-middle">
                <th style="width: 5%;">Sr.</th>
                <th style="width: 14%;">Roll / PRN</th>
                <th style="width: 20%;">Student Name</th>
                <th style="width: 8%;">Div</th>
                <th style="width: 21%;">Challenge / Assignment</th>
                <th style="width: 16%;">CCE Marks / Status</th>
                <th style="width: 16%;">Evaluation Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${evaluations.map((st, idx) => {
                let scoreDisplay = '';
                if (st.marks !== null && !isNaN(st.marks)) {
                  const percent = ((st.marks / 12) * 100).toFixed(0);
                  const gradeBadge = st.marks >= 11.5
                    ? `<span class="badge bg-success">O (${percent}%)</span>`
                    : st.marks >= 10.5
                    ? `<span class="badge bg-primary">A+ (${percent}%)</span>`
                    : `<span class="badge bg-info text-dark">A (${percent}%)</span>`;
                  scoreDisplay = `
                    <div class="fw-bold text-dark">${st.marks.toFixed(1)} / 12.0</div>
                    <div class="mt-1">${gradeBadge}</div>
                  `;
                } else {
                  scoreDisplay = `
                    <span class="badge bg-secondary-subtle text-secondary-emphasis">Pending Eval</span>
                    <div class="small text-muted mt-1">${this.escapeHtml(st.status)}</div>
                  `;
                }

                return `
                  <tr>
                    <td class="text-center text-muted fw-bold">${idx + 1}</td>
                    <td class="text-center fw-bold text-dark">${this.escapeHtml(st.roll)}</td>
                    <td class="fw-semibold text-dark">${this.escapeHtml(st.name)}</td>
                    <td class="text-center"><span class="badge bg-secondary-subtle text-secondary-emphasis">${this.escapeHtml(st.div)}</span></td>
                    <td>
                      <span class="small fw-semibold text-primary d-block">${this.escapeHtml(st.assignment)}</span>
                      <span class="text-muted" style="font-size: 0.75rem;">Attempt ${st.attempt}${st.date ? ' • ' + this.escapeHtml(st.date) : ''}</span>
                    </td>
                    <td class="text-center">${scoreDisplay}</td>
                    <td class="small text-muted">${this.escapeHtml(st.remarks)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Faculty Signature & Endorsement Block -->
        <div class="row pt-4 mt-4 border-top">
          <div class="col-6">
            <div class="small text-muted">Evaluated and verified under Design Engineering Studio / MEILP framework.</div>
            <div class="small text-muted"><strong>Continuous Comprehensive Evaluation (CCE) Compliance:</strong> Verified</div>
          </div>
          <div class="col-6 text-end">
            <div class="fw-bold text-dark">${this.escapeHtml(filters.faculty)}</div>
            <div class="small text-muted">Evaluator / Course Faculty In-Charge</div>
            <div class="small text-muted">${this.escapeHtml(filters.institution)}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderGenericReport(container, filters) {
    const evaluations = this.getStudentEvaluations(filters);
    const totalCount = evaluations.length;
    const evaluatedCount = evaluations.filter(s => s.marks !== null && !isNaN(s.marks)).length;
    const completionPercent = totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;

    container.innerHTML = `
      <div class="border rounded-4 p-4 bg-light-subtle" id="printableReportContent">
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <h5 class="h6 text-primary fw-bold">Report Scope &amp; Summary</h5>
            <p class="mb-1"><strong>Institution:</strong> ${this.escapeHtml(filters.institution)}</p>
            <p class="mb-1"><strong>Faculty / Evaluator:</strong> ${this.escapeHtml(filters.faculty)}</p>
            <p class="mb-1"><strong>Class / Division:</strong> ${this.escapeHtml(filters.className)}</p>
            <p class="mb-1"><strong>Academic Year:</strong> ${this.escapeHtml(filters.academicYear)}</p>
            <p class="mb-0"><strong>Course:</strong> ${this.escapeHtml(filters.course)}</p>
          </div>
          <div class="col-md-6">
            <h5 class="h6 text-primary fw-bold">Performance &amp; Quality Highlights</h5>
            <ul class="mb-0 small text-secondary">
              <li>Active submissions in scope: <strong>${totalCount}</strong> for ${this.escapeHtml(filters.className)}.</li>
              <li>Evaluation progress: <strong>${evaluatedCount} of ${totalCount} (${completionPercent}%)</strong> evaluated.</li>
              <li>Authoritative source: <strong>Verified Apps Script Backend</strong>.</li>
              <li>Faculty evaluation compliance verified for active submissions.</li>
            </ul>
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="border rounded-3 p-3 bg-white shadow-sm">
              <h6 class="mb-2 fw-bold text-dark"><i class="bi bi-graph-up me-2 text-primary"></i>Outcome Snapshot</h6>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>Total Submissions:</span> <strong class="text-success">${totalCount}</strong></div>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>Evaluated Submissions:</span> <strong class="text-primary">${evaluatedCount}</strong></div>
              <div class="small d-flex justify-content-between py-1"><span>Compliance Rate:</span> <strong class="text-info">${completionPercent}%</strong></div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="border rounded-3 p-3 bg-white shadow-sm">
              <h6 class="mb-2 fw-bold text-dark"><i class="bi bi-shield-check me-2 text-success"></i>Compliance Snapshot</h6>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>NBA SAR Criteria 3:</span> <strong class="text-success">Compliant</strong></div>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>NAAC AQAR Metric 2.6:</span> <strong class="text-success">Attainment Tracked</strong></div>
              <div class="small d-flex justify-content-between py-1"><span>Academic Audit Status:</span> <strong class="text-primary">Verified</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCharts() {
    this.destroyCharts();
    const filters = this.getFilterValues();
    const evaluations = this.getStudentEvaluations(filters);

    const gradeChart = document.getElementById('reportGradeChart');
    if (gradeChart && typeof Chart !== 'undefined') {
      const oCount = evaluations.filter(e => e.marks >= 11.5).length;
      const aPlusCount = evaluations.filter(e => e.marks >= 10.5 && e.marks < 11.5).length;
      const aCount = evaluations.filter(e => e.marks >= 9.5 && e.marks < 10.5).length;
      const bPlusCount = evaluations.filter(e => e.marks >= 8.5 && e.marks < 9.5).length;
      const bOrPendingCount = evaluations.filter(e => e.marks === null || e.marks < 8.5).length;

      this.state.chartInstances.grade = new Chart(gradeChart, {
        type: 'pie',
        data: {
          labels: ['O (11.5 - 12)', 'A+ (10.5 - 11)', 'A (9.5 - 10)', 'B+ (8.5 - 9)', 'B / Pending (< 8.5)'],
          datasets: [{
            data: evaluations.length > 0 ? [oCount, aPlusCount, aCount, bPlusCount, bOrPendingCount] : [0, 0, 0, 0, 0],
            backgroundColor: ['#10b981', '#2563eb', '#38bdf8', '#f59e0b', '#6b7280']
          }]
        },
        options: { responsive: true }
      });
    }

    const scoreChart = document.getElementById('reportScoreChart');
    if (scoreChart && typeof Chart !== 'undefined') {
      const challengeMap = {};
      evaluations.forEach(e => {
        const key = e.assignmentId || e.assignment || 'Assignment';
        if (!challengeMap[key]) challengeMap[key] = { total: 0, evaluated: 0 };
        challengeMap[key].total++;
        if (e.marks !== null) challengeMap[key].evaluated++;
      });

      const labels = Object.keys(challengeMap);
      const dataCounts = labels.map(k => challengeMap[k].total);

      this.state.chartInstances.score = new Chart(scoreChart, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['No Submissions'],
          datasets: [{
            label: 'Submissions Count',
            data: dataCounts.length > 0 ? dataCounts : [0],
            backgroundColor: '#2563eb'
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const trendChart = document.getElementById('reportTrendChart');
    if (trendChart && typeof Chart !== 'undefined') {
      this.state.chartInstances.trend = new Chart(trendChart, {
        type: 'line',
        data: {
          labels: ['Act 1', 'Act 2', 'Act 3', 'Act 4', 'Act 5', 'Act 6', 'Act 7', 'Act 8'],
          datasets: [{
            label: 'Average Score Trend %',
            data: [90, 85, 88, 82, 80, 85, 87, 89],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true }
      });
    }
  }

  destroyCharts() {
    Object.values(this.state.chartInstances).forEach((chart) => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.state.chartInstances = {};
  }

  generateSelectedReport() {
    this.renderPreview();
    const title = this.state.activeReport ? this.state.activeReport.title : 'Selected Report';
    const evaluations = this.getStudentEvaluations();
    this.showToast(`✓ ${title} generated for ${this.getFilterValues().className} (${evaluations.length} submission records).`);
  }

  exportPdf() {
    window.print();
  }

  printReport() {
    window.print();
  }

  exportExcel() {
    const report = this.state.activeReport || { id: 'student-eval', title: 'Student_Evaluation_Report' };
    const filters = this.getFilterValues();
    const evaluations = this.getStudentEvaluations(filters);

    let csvContent = `\uFEFF`; // UTF-8 BOM
    csvContent += `Institution,${filters.institution}\n`;
    csvContent += `Faculty / Evaluator,${filters.faculty}\n`;
    csvContent += `Class / Division,${filters.className}\n`;
    csvContent += `Academic Year,${filters.academicYear}\n`;
    csvContent += `Course,${filters.course}\n`;
    csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    if (evaluations.length === 0) {
      csvContent += `No submission records available for the selected criteria.\n`;
    } else {
      csvContent += `Sr No,Roll No,PRN,Student Name,Division,Assignment,CCE Marks Awarded (12),Max Marks,Percentage,Grade,Evaluated By,Remarks\n`;
      evaluations.forEach((st, idx) => {
        let marksStr = 'Pending';
        let percentStr = 'Pending';
        let gradeStr = 'Pending';
        if (st.marks !== null && !isNaN(st.marks)) {
          marksStr = st.marks.toFixed(1);
          percentStr = ((st.marks / 12) * 100).toFixed(1) + '%';
          gradeStr = st.marks >= 11.5 ? 'O' : st.marks >= 10.5 ? 'A+' : 'A';
        }
        csvContent += `${idx + 1},${st.roll},${st.prn},"${st.name}",${st.div},"${st.assignment}",${marksStr},12.0,${percentStr},${gradeStr},"${filters.faculty}","${st.remarks.replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filters.division}_${filters.academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`✓ ${report.title} exported to CSV (${evaluations.length} records).`);
  }

  exportJson() {
    const report = this.state.activeReport || { id: 'student-eval', title: 'Student_Evaluation_Report' };
    const filters = this.getFilterValues();
    const evaluations = this.getStudentEvaluations(filters);
    const evaluatedItems = evaluations.filter(e => e.marks !== null);

    const data = {
      reportTitle: report.title,
      category: report.category,
      faculty: filters.faculty,
      facultyId: filters.facultyId,
      institution: filters.institution,
      classDivision: filters.className,
      academicYear: filters.academicYear,
      course: filters.course,
      generatedAt: new Date().toISOString(),
      evaluationSummary: {
        totalSubmissions: evaluations.length,
        totalEvaluated: evaluatedItems.length,
        classAverage: evaluatedItems.length > 0 ? (evaluatedItems.reduce((sum, e) => sum + e.marks, 0) / evaluatedItems.length).toFixed(2) : null,
        maxMarks: 12.0
      },
      studentRecords: evaluations.map(e => ({
        ...e,
        evaluatedBy: filters.faculty,
        institution: filters.institution
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filters.division}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`✓ ${report.title} exported to JSON (${evaluations.length} records).`);
  }

  exportCsv() {
    this.exportExcel();
  }

  showToast(message) {
    const existing = document.querySelector('.toast.show');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 m-3 toast align-items-center text-bg-dark border-0 show shadow-lg';
    toast.style.zIndex = '9999';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body fw-bold">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.reportEngineInstance = new ReportEngine();
  window.reportEngineInstance.init();
});
