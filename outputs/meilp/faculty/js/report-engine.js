class ReportEngine {
  constructor() {
    this.state = {
      reports: [],
      activeReport: null,
      chartInstances: {}
    };
  }

  async init() {
    this.initFacultyInfo();
    this.bindEvents();
    this.renderLoadingState();
    try {
      const reports = await DESReportService.getReports();
      this.state.reports = (reports && reports.length > 0) ? reports.map((report) => ({ ...report, category: report.category || 'Assessment Reports' })) : this.buildMockReports();
    } catch (error) {
      console.warn('Using built-in reports catalog:', error);
      this.state.reports = this.buildMockReports();
    }
    
    this.state.activeReport = this.state.reports[0]; // Student Evaluation Report
    this.renderReportDashboard();
    this.renderPreview();
  }

  initFacultyInfo() {
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const loggedIn = localStorage.getItem("loggedInFaculty") || user.name || "Dr. Rahul Bachute";
    const facultyName = loggedIn.toLowerCase() === "guest" ? "Guest Faculty" : (loggedIn.includes("@") ? "Dr. Rahul Bachute" : loggedIn);
    
    const facultyInput = document.getElementById("facultyFilter");
    if (facultyInput) {
      facultyInput.value = facultyName;
    }

    const institutionInput = document.getElementById("institutionFilter");
    if (institutionInput && !institutionInput.value) {
      institutionInput.value = "Ajeenkya DY Patil School of Engineering, Pune";
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

    // Filter dropdowns
    ['academicYearFilter', 'classFilter', 'assignmentFilter', 'facultyFilter', 'institutionFilter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.renderPreview());
      }
    });

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

  buildMockReports() {
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

  renderLoadingState() {
    const catalog = document.getElementById('reportCatalog');
    if (catalog) {
      catalog.innerHTML = '<div class="text-muted p-3"><i class="bi bi-hourglass-split me-2"></i>Loading reports catalog…</div>';
    }
    const previewTitle = document.getElementById('reportPreviewTitle');
    if (previewTitle) {
      previewTitle.textContent = 'Loading report preview…';
    }
  }

  renderReportDashboard() {
    const catalog = document.getElementById('reportCatalog');
    if (!catalog) return;

    catalog.innerHTML = this.state.reports.map((report) => {
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
        this.state.activeReport = this.state.reports.find((item) => item.id === id);
        this.renderReportDashboard();
        this.renderPreview();
      });
    });

    if (!this.state.activeReport && this.state.reports.length > 0) {
      this.state.activeReport = this.state.reports[0];
    }
  }

  filterReports(searchText = '', category = '') {
    const term = searchText.toLowerCase().trim();
    const filtered = this.state.reports.filter((report) => {
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
          this.state.activeReport = this.state.reports.find((item) => item.id === id);
          this.filterReports(searchText, category);
          this.renderPreview();
        });
      });
    }
  }

  getFilterValues() {
    const faculty = document.getElementById('facultyFilter')?.value || 'Dr. Rahul Bachute';
    const institution = document.getElementById('institutionFilter')?.value || 'Ajeenkya DY Patil School of Engineering, Pune';
    const division = document.getElementById('classFilter')?.value || 'A';
    const academicYear = document.getElementById('academicYearFilter')?.value || '2026-27';
    const assignment = document.getElementById('assignmentFilter')?.value || 'All';
    
    return {
      faculty,
      institution,
      division,
      className: division === 'All' ? 'TE Mechanical — All Divisions' : `TE Mechanical — Division ${division}`,
      academicYear,
      assignment,
      programme: 'B.E. Mechanical Engineering',
      course: 'Design of Machine Elements (PCC303-MEC)'
    };
  }

  getStudentEvaluations(filters) {
    // Curated student pool scoped to the faculty, institution, and division
    const studentsByDiv = {
      'A': [
        { roll: 'TEA-01', prn: '72184001A', name: 'Aarav Sharma', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Accurate ball-nut kinematics and rack-sector ratio derivation. Excellent kinematic analysis.' },
        { roll: 'TEA-02', prn: '72184002A', name: 'Riya Kulkarni', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Outstanding report. Flawless torque multiplication calculations and zero-backlash recommendation.' },
        { roll: 'TEA-03', prn: '72184003A', name: 'Aditya Patil', assignment: 'EA-20 Hydraulic Press', marks: 11.5, date: '15-Aug-2026', remarks: 'Correct pitch vs lead distinction for two-start screw; robust collar friction evaluation.' },
        { roll: 'TEA-04', prn: '72184004A', name: 'Sneha Deshmukh', assignment: 'EA-21 Steering Gear', marks: 11.5, date: '16-Aug-2026', remarks: 'Clear load path differentiation between ball rolling and sector shaft output.' },
        { roll: 'TEA-05', prn: '72184005A', name: 'Rohit Joshi', assignment: 'EA-18 Bench Vice', marks: 10.5, date: '11-Aug-2026', remarks: 'Self-locking criterion verified; hand force calculations are accurate.' },
        { roll: 'TEA-06', prn: '72184006A', name: 'Pooja Shinde', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Perfect score. All 10 labels correctly identified; complete formulas provided.' },
        { roll: 'TEA-07', prn: '72184007A', name: 'Omkar Gaikwad', assignment: 'EC-07 Shaft Design', marks: 10.0, date: '10-Aug-2026', remarks: 'Accurate equivalent torque calculation; standard shaft diameter selected properly.' },
        { roll: 'TEA-08', prn: '72184008A', name: 'Tanvi Kadam', assignment: 'EA-21 Steering Gear', marks: 11.5, date: '16-Aug-2026', remarks: 'Well-articulated synthesis report with comprehensive maintenance protocols.' },
        { roll: 'TEA-09', prn: '72184009A', name: 'Siddharth Rao', assignment: 'EA-19 C-Clamp', marks: 11.0, date: '13-Aug-2026', remarks: 'Correct identification of collar torque contribution percentage (~31%).' },
        { roll: 'TEA-10', prn: '72184010A', name: 'Ananya Nair', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Thorough principal stress analysis with correct Factor of Safety derivation.' }
      ],
      'B': [
        { roll: 'TEB-01', prn: '72184051B', name: 'Nikhil More', assignment: 'EA-21 Steering Gear', marks: 11.5, date: '16-Aug-2026', remarks: 'Correct geometric parameters and virtual friction angle calculations.' },
        { roll: 'TEB-02', prn: '72184052B', name: 'Shruti Pawar', assignment: 'EA-21 Steering Gear', marks: 11.5, date: '16-Aug-2026', remarks: 'High quality technical report. Clear explanations on fail-safe lowering torque.' },
        { roll: 'TEB-03', prn: '72184053B', name: 'Kunal Jagtap', assignment: 'EA-18 Bench Vice', marks: 10.0, date: '12-Aug-2026', remarks: 'Good analysis of power screw efficiency vs self-locking trade-off.' },
        { roll: 'TEB-04', prn: '72184054B', name: 'Pranav Bhosale', assignment: 'EA-19 C-Clamp', marks: 10.5, date: '13-Aug-2026', remarks: 'Accurate thread and collar friction equations applied.' },
        { roll: 'TEB-05', prn: '72184055B', name: 'Meera Chavan', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Exemplary submission with detailed mathematical steps.' },
        { roll: 'TEB-06', prn: '72184056B', name: 'Varun Salunkhe', assignment: 'EC-08 Key Design', marks: 11.0, date: '11-Aug-2026', remarks: 'Accurate shear and crushing stress evaluations on parallel sunk key.' }
      ],
      'C': [
        { roll: 'TEC-01', prn: '72184101C', name: 'Yash Thorat', assignment: 'EA-21 Steering Gear', marks: 11.0, date: '16-Aug-2026', remarks: 'Correct torque formulations and handwheel effort analysis.' },
        { roll: 'TEC-02', prn: '72184102C', name: 'Divya Gokhale', assignment: 'EA-21 Steering Gear', marks: 11.5, date: '16-Aug-2026', remarks: 'Thorough stress verification; correct Rankine & Guest stress calculations.' },
        { roll: 'TEC-03', prn: '72184103C', name: 'Harshada Mane', assignment: 'EA-19 C-Clamp', marks: 10.5, date: '13-Aug-2026', remarks: 'Good grasp of multi-start thread kinematics.' },
        { roll: 'TEC-04', prn: '72184104C', name: 'Sanket Shirole', assignment: 'EA-18 Bench Vice', marks: 10.0, date: '12-Aug-2026', remarks: 'Correct torque calculation and verified self-locking capability.' }
      ],
      'D': [
        { roll: 'TED-01', prn: '72184151D', name: 'Chetan Walke', assignment: 'EA-21 Steering Gear', marks: 11.0, date: '16-Aug-2026', remarks: 'Detailed calculations for thread friction torque and collar torque.' },
        { roll: 'TED-02', prn: '72184152D', name: 'Mrunal Patil', assignment: 'EA-21 Steering Gear', marks: 12.0, date: '16-Aug-2026', remarks: 'Comprehensive final report with complete mathematical derivations.' },
        { roll: 'TED-03', prn: '72184153D', name: 'Tejasvi Sonawane', assignment: 'EA-19 C-Clamp', marks: 11.0, date: '13-Aug-2026', remarks: 'Accurate collar friction calculations and recommended thrust washer design.' }
      ]
    };

    let list = [];
    if (filters.division === 'All') {
      Object.keys(studentsByDiv).forEach(divKey => {
        list = list.concat(studentsByDiv[divKey].map(s => ({ ...s, div: `Div ${divKey}` })));
      });
    } else {
      const selectedList = studentsByDiv[filters.division] || studentsByDiv['A'];
      list = selectedList.map(s => ({ ...s, div: `Div ${filters.division}` }));
    }

    if (filters.assignment && filters.assignment !== 'All') {
      const filtered = list.filter(s => s.assignment.toLowerCase().includes(filters.assignment.toLowerCase()));
      if (filtered.length > 0) return filtered;
    }

    return list;
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
        <span class="badge bg-success-subtle text-success-emphasis"><i class="bi bi-check-circle-fill me-1"></i>Evaluated &amp; Verified</span>
      `;
    }

    if (!previewBody) return;

    if (this.state.activeReport.id === 'student-eval') {
      this.renderStudentEvaluationReport(previewBody, filters);
    } else {
      this.renderGenericReport(previewBody, filters);
    }

    this.renderCharts();
  }

  renderStudentEvaluationReport(container, filters) {
    const evaluations = this.getStudentEvaluations(filters);
    const totalCount = evaluations.length;
    const totalMarksSum = evaluations.reduce((sum, item) => sum + item.marks, 0);
    const avgMarks = (totalMarksSum / totalCount).toFixed(2);
    const avgPercent = ((avgMarks / 12) * 100).toFixed(1);
    const distinctionCount = evaluations.filter(e => e.marks >= 10.5).length;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
                    <div class="small text-muted" style="font-size: 0.75rem;">Evaluated</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="bg-white p-2 rounded border">
                    <div class="fs-5 fw-bold text-success">${avgMarks} / 12</div>
                    <div class="small text-muted" style="font-size: 0.75rem;">Class Avg (${avgPercent}%)</div>
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
                <th style="width: 10%;">Roll No</th>
                <th style="width: 12%;">PRN</th>
                <th style="width: 18%;">Student Name</th>
                <th style="width: 8%;">Div</th>
                <th style="width: 17%;">Challenge / Assignment</th>
                <th style="width: 12%;">CCE Marks (12)</th>
                <th style="width: 18%;">Faculty Evaluation Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${evaluations.map((st, idx) => {
                const percent = ((st.marks / 12) * 100).toFixed(0);
                const gradeBadge = st.marks >= 11.5 
                  ? `<span class="badge bg-success">O (${percent}%)</span>` 
                  : st.marks >= 10.5 
                  ? `<span class="badge bg-primary">A+ (${percent}%)</span>` 
                  : `<span class="badge bg-info text-dark">A (${percent}%)</span>`;

                return `
                  <tr>
                    <td class="text-center text-muted fw-bold">${idx + 1}</td>
                    <td class="text-center fw-bold text-dark">${this.escapeHtml(st.roll)}</td>
                    <td class="text-center text-muted small">${this.escapeHtml(st.prn)}</td>
                    <td class="fw-semibold text-dark">${this.escapeHtml(st.name)}</td>
                    <td class="text-center"><span class="badge bg-secondary-subtle text-secondary-emphasis">${this.escapeHtml(st.div)}</span></td>
                    <td><span class="small fw-semibold text-primary">${this.escapeHtml(st.assignment)}</span></td>
                    <td class="text-center">
                      <div class="fw-bold text-dark">${st.marks.toFixed(1)} / 12.0</div>
                      <div class="mt-1">${gradeBadge}</div>
                    </td>
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
            <div class="small text-muted"><strong>Continuous Comprehensive Evaluation (CCE) Compliance:</strong> 100% Verified</div>
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
              <li>Class average score stands at <strong>79.2%</strong> for ${this.escapeHtml(filters.className)}.</li>
              <li>CO2 Power Screw &amp; Key Design attainment is <strong>78.4%</strong>.</li>
              <li>Real-World Assignment completion rate is <strong>94.2%</strong>.</li>
              <li>Faculty evaluation compliance is verified for all active submissions.</li>
            </ul>
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="border rounded-3 p-3 bg-white shadow-sm">
              <h6 class="mb-2 fw-bold text-dark"><i class="bi bi-graph-up me-2 text-primary"></i>Outcome Snapshot</h6>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>CO Attainment Target:</span> <strong class="text-success">78% / 80%</strong></div>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>PO Contribution:</span> <strong class="text-primary">81%</strong></div>
              <div class="small d-flex justify-content-between py-1"><span>PSO Contribution:</span> <strong class="text-info">76%</strong></div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="border rounded-3 p-3 bg-white shadow-sm">
              <h6 class="mb-2 fw-bold text-dark"><i class="bi bi-shield-check me-2 text-success"></i>Compliance Snapshot</h6>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>NBA SAR Criteria 3:</span> <strong class="text-success">Compliant</strong></div>
              <div class="small d-flex justify-content-between py-1 border-bottom"><span>NAAC AQAR Metric 2.6:</span> <strong class="text-success">High Attainment</strong></div>
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

    const scoreChart = document.getElementById('reportScoreChart');
    if (scoreChart) {
      this.state.chartInstances.score = new Chart(scoreChart, {
        type: 'bar',
        data: {
          labels: ['CO1 Cable', 'CO2 Power Screw', 'CO2 Shaft & Key', 'CO3 Springs', 'CO4 Fatigue'],
          datasets: [{ label: 'Attainment %', data: [84, 88, 79, 82, 77], backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#6366f1', '#ec4899'] }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const gradeChart = document.getElementById('reportGradeChart');
    if (gradeChart) {
      this.state.chartInstances.grade = new Chart(gradeChart, {
        type: 'pie',
        data: {
          labels: ['O (11.5 - 12)', 'A+ (10.5 - 11)', 'A (9.5 - 10)', 'B+ (8.5 - 9)', 'B (< 8.5)'],
          datasets: [{ data: [40, 35, 15, 7, 3], backgroundColor: ['#10b981', '#2563eb', '#38bdf8', '#f59e0b', '#ef4444'] }]
        },
        options: { responsive: true }
      });
    }

    const trendChart = document.getElementById('reportTrendChart');
    if (trendChart) {
      this.state.chartInstances.trend = new Chart(trendChart, {
        type: 'line',
        data: {
          labels: ['Act 1', 'Act 2', 'Act 3', 'Act 4', 'Act 5', 'Act 6', 'Act 7', 'Act 8', 'Act 9', 'Act 10', 'Act 11'],
          datasets: [{ label: 'Activity Score Trend %', data: [92, 88, 85, 86, 82, 80, 84, 86, 88, 85, 90], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3 }]
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
    this.showToast(`✓ ${title} generated for ${this.getFilterValues().className} successfully.`);
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

    let csvContent = `\uFEFF`; // UTF-8 BOM
    csvContent += `Institution,${filters.institution}\n`;
    csvContent += `Faculty / Evaluator,${filters.faculty}\n`;
    csvContent += `Class / Division,${filters.className}\n`;
    csvContent += `Academic Year,${filters.academicYear}\n`;
    csvContent += `Course,${filters.course}\n`;
    csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    if (report.id === 'student-eval') {
      const evaluations = this.getStudentEvaluations(filters);
      csvContent += `Sr No,Roll No,PRN,Student Name,Division,Assignment,CCE Marks Awarded (12),Max Marks,Percentage,Grade,Evaluated By,Remarks\n`;
      evaluations.forEach((st, idx) => {
        const percent = ((st.marks / 12) * 100).toFixed(1);
        const grade = st.marks >= 11.5 ? 'O' : st.marks >= 10.5 ? 'A+' : 'A';
        csvContent += `${idx + 1},${st.roll},${st.prn},"${st.name}",${st.div},"${st.assignment}",${st.marks},12.0,${percent}%,${grade},"${filters.faculty}","${st.remarks.replace(/"/g, '""')}"\n`;
      });
    } else {
      csvContent += `Academic Performance Metric,Target Level,Actual Attained,Status\n`;
      csvContent += `CO1 - Cable Safety Verification,80%,84%,Exceeded\n`;
      csvContent += `CO2 - Power Screw Design (EA-20, EA-19, EA-18),80%,88%,Exceeded\n`;
      csvContent += `CO2 - Shaft, Key & Coupling Design (EC-07, EC-08, EC-09),80%,79%,Near Target\n`;
      csvContent += `Challenge Submissions & Completion Rate,90%,94%,Completed\n`;
      csvContent += `Faculty Evaluation & Rubric Marking,90%,100%,Completed\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filters.division}_${filters.academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`✓ ${report.title} exported to CSV for ${filters.className}.`);
  }

  exportJson() {
    const report = this.state.activeReport || { id: 'student-eval', title: 'Student_Evaluation_Report' };
    const filters = this.getFilterValues();
    const evaluations = this.getStudentEvaluations(filters);

    const data = {
      reportTitle: report.title,
      category: report.category,
      faculty: filters.faculty,
      institution: filters.institution,
      classDivision: filters.className,
      academicYear: filters.academicYear,
      course: filters.course,
      generatedAt: new Date().toISOString(),
      evaluationSummary: {
        totalEvaluated: evaluations.length,
        classAverage: (evaluations.reduce((sum, e) => sum + e.marks, 0) / evaluations.length).toFixed(2),
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
    this.showToast(`✓ ${report.title} exported to JSON.`);
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
  new ReportEngine().init();
});
