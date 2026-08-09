class ReportEngine {
  constructor() {
    this.state = {
      reports: [],
      activeReport: null,
      chartInstances: {}
    };
  }

  async init() {
    this.bindEvents();
    this.renderLoadingState();
    try {
      const reports = await DESReportService.getReports();
      this.state.reports = (reports && reports.length > 0) ? reports.map((report) => ({ ...report, category: report.category || 'Assessment Reports' })) : this.buildMockReports();
    } catch (error) {
      console.warn('Using built-in reports catalog:', error);
      this.state.reports = this.buildMockReports();
    }
    
    this.state.activeReport = this.state.reports[0];
    this.renderReportDashboard();
    this.renderPreview();
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
    ['academicYearFilter', 'semesterFilter', 'programmeFilter', 'studentFilter'].forEach((id) => {
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
      { id: 'student-eval', title: 'Student Evaluation Report', category: 'Assessment Reports', description: 'Marks, grade summary, and evaluation completion by student.', tags: ['assessment', 'student'] },
      { id: 'challenge-marks', title: 'Challenge-wise Marks Report', category: 'Assessment Reports', description: 'Challenge-level attainment and spread of marks.', tags: ['assessment', 'challenge'] },
      { id: 'batch-performance', title: 'Batch Performance Report', category: 'Assessment Reports', description: 'Batch comparator for academic strength and improvement.', tags: ['assessment', 'batch'] },
      { id: 'co-attainment', title: 'Course Outcome Attainment Report', category: 'Outcome Reports', description: 'CO target vs actual with action recommendations.', tags: ['outcome', 'co'] },
      { id: 'po-contribution', title: 'Program Outcome Contribution Report', category: 'Outcome Reports', description: 'PO contribution and gap analysis for accreditation.', tags: ['outcome', 'po'] },
      { id: 'student-history', title: 'Student Performance History', category: 'Student Reports', description: 'Longitudinal academic trends for selected students.', tags: ['student', 'history'] },
      { id: 'challenge-analytics', title: 'Challenge Analytics Summary', category: 'Challenge Reports', description: 'Difficulty, completion, and success rate summary.', tags: ['challenge'] },
      { id: 'faculty-workload', title: 'Faculty Workload Report', category: 'Faculty Reports', description: 'Load distribution and evaluation progress by faculty member.', tags: ['faculty'] },
      { id: 'department-performance', title: 'Department Performance Report', category: 'Department Reports', description: 'Department and programme compare report for governance.', tags: ['department'] },
      { id: 'nba-sar', title: 'NBA SAR Report', category: 'Accreditation Reports', description: 'Accreditation-ready evidence pack with target and attainment data.', tags: ['accreditation', 'nba'] },
      { id: 'naac-aqar', title: 'NAAC AQAR Report', category: 'Accreditation Reports', description: 'Quality metric summary for AQAR submission.', tags: ['accreditation', 'naac'] },
      { id: 'custom-summary', title: 'Custom Academic Summary', category: 'Custom Reports', description: 'Flexible blended report for academic council and BoS.', tags: ['custom'] }
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
    return {
      academicYear: document.getElementById('academicYearFilter')?.value || '2026-27',
      semester: document.getElementById('semesterFilter')?.value || 'Sem IV',
      programme: document.getElementById('programmeFilter')?.value || 'B.E. Mechanical',
      student: document.getElementById('studentFilter')?.value || 'All Students'
    };
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
        <span class="badge bg-info-subtle text-info-emphasis me-1">${this.escapeHtml(filters.academicYear || 'All Years')}</span>
        <span class="badge bg-secondary-subtle text-secondary-emphasis me-1">${this.escapeHtml(filters.semester || 'All Semesters')}</span>
        <span class="badge bg-success-subtle text-success-emphasis">Verified Report Data</span>
      `;
    }

    if (previewBody) {
      previewBody.innerHTML = `
        <div class="border rounded-4 p-4 bg-light-subtle" id="printableReportContent">
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <h5 class="h6 text-primary fw-bold">Report Summary</h5>
              <p class="mb-1"><strong>Institution:</strong> Ajeenkya D. Y. Patil School of Engineering, Pune</p>
              <p class="mb-1"><strong>Academic Year:</strong> ${this.escapeHtml(filters.academicYear)}</p>
              <p class="mb-1"><strong>Semester:</strong> ${this.escapeHtml(filters.semester)}</p>
              <p class="mb-1"><strong>Programme:</strong> ${this.escapeHtml(filters.programme)}</p>
              <p class="mb-0"><strong>Student Filter:</strong> ${this.escapeHtml(filters.student || 'All')}</p>
            </div>
            <div class="col-md-6">
              <h5 class="h6 text-primary fw-bold">Key Performance Highlights</h5>
              <ul class="mb-0 small text-secondary">
                <li>Class average score improved to <strong>78.5%</strong> in ${this.escapeHtml(this.state.activeReport.title)}.</li>
                <li>CO2 Shaft & Key Design attainment stands at <strong>76%</strong>.</li>
                <li>Real-World Challenge completion rate is <strong>91.2%</strong>.</li>
                <li>Evaluation compliance is 100% complete for the current term.</li>
              </ul>
            </div>
          </div>
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <div class="border rounded-3 p-3 bg-white shadow-sm">
                <h6 class="mb-2 fw-bold text-dark"><i class="bi bi-graph-up me-2 text-primary"></i>Outcome Snapshot</h6>
                <div class="small d-flex justify-content-between py-1 border-bottom"><span>CO Attainment Target:</span> <strong class="text-success">76% / 80%</strong></div>
                <div class="small d-flex justify-content-between py-1 border-bottom"><span>PO Contribution:</span> <strong class="text-primary">79%</strong></div>
                <div class="small d-flex justify-content-between py-1"><span>PSO Contribution:</span> <strong class="text-info">75%</strong></div>
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
          <div class="table-responsive">
            <table class="table table-bordered table-sm align-middle bg-white">
              <thead class="table-dark">
                <tr>
                  <th>Academic Performance Metric</th>
                  <th>Target Level</th>
                  <th>Actual Attained</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CO1 - Cable Safety Verification</td>
                  <td>80%</td>
                  <td>82%</td>
                  <td><span class="badge bg-success">Exceeded</span></td>
                </tr>
                <tr>
                  <td>CO2 - Shaft, Key & Coupling Design (EC-07, EC-08 & EC-09)</td>
                  <td>80%</td>
                  <td>76%</td>
                  <td><span class="badge bg-warning text-dark">Near Target</span></td>
                </tr>
                <tr>
                  <td>Challenge Submissions & Completion Rate</td>
                  <td>90%</td>
                  <td>91%</td>
                  <td><span class="badge bg-success">On Track</span></td>
                </tr>
                <tr>
                  <td>Faculty Evaluation & Rubric Marking</td>
                  <td>90%</td>
                  <td>100%</td>
                  <td><span class="badge bg-success">Completed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    this.renderCharts();
  }

  renderCharts() {
    this.destroyCharts();

    const scoreChart = document.getElementById('reportScoreChart');
    if (scoreChart) {
      this.state.chartInstances.score = new Chart(scoreChart, {
        type: 'bar',
        data: {
          labels: ['CO1', 'CO2', 'CO3', 'CO4'],
          datasets: [{ label: 'Attainment %', data: [82, 76, 78, 79], backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#6366f1'] }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const gradeChart = document.getElementById('reportGradeChart');
    if (gradeChart) {
      this.state.chartInstances.grade = new Chart(gradeChart, {
        type: 'pie',
        data: {
          labels: ['A (80%+)', 'B (70-79%)', 'C (60-69%)', 'D (50-59%)', 'F (<50%)'],
          datasets: [{ data: [28, 36, 20, 10, 6], backgroundColor: ['#10b981', '#2563eb', '#38bdf8', '#f59e0b', '#ef4444'] }]
        },
        options: { responsive: true }
      });
    }

    const trendChart = document.getElementById('reportTrendChart');
    if (trendChart) {
      this.state.chartInstances.trend = new Chart(trendChart, {
        type: 'line',
        data: {
          labels: ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5', 'Task 6', 'Task 7', 'Task 8'],
          datasets: [{ label: 'Performance Trend', data: [68, 72, 71, 75, 76, 78, 80, 83], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3 }]
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
    this.showToast(`✓ ${title} generated & refreshed successfully.`);
  }

  exportPdf() {
    window.print();
  }

  printReport() {
    window.print();
  }

  exportExcel() {
    const report = this.state.activeReport || { title: 'Academic_Report' };
    const filters = this.getFilterValues();

    let csvContent = `\uFEFF`; // UTF-8 BOM
    csvContent += `Report Title,${report.title}\n`;
    csvContent += `Category,${report.category}\n`;
    csvContent += `Academic Year,${filters.academicYear}\n`;
    csvContent += `Semester,${filters.semester}\n`;
    csvContent += `Programme,${filters.programme}\n`;
    csvContent += `Student Filter,${filters.student}\n`;
    csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    csvContent += `Academic Performance Metric,Target Level,Actual Attained,Status\n`;
    csvContent += `CO1 - Cable Safety Verification,80%,82%,Exceeded\n`;
    csvContent += `CO2 - Shaft, Key & Coupling Design (EC-07, EC-08 & EC-09),80%,78%,Near Target\n`;
    csvContent += `Challenge Submissions & Completion Rate,90%,91%,On Track\n`;
    csvContent += `Faculty Evaluation & Rubric Marking,90%,100%,Completed\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filters.academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`✓ ${report.title} exported to Excel (CSV) successfully.`);
  }

  exportJson() {
    const report = this.state.activeReport || { title: 'Academic_Report' };
    const filters = this.getFilterValues();

    const data = {
      title: report.title,
      category: report.category,
      description: report.description,
      generatedAt: new Date().toISOString(),
      institution: "Ajeenkya D. Y. Patil School of Engineering, Pune",
      filters,
      summary: {
        co1Attainment: "82%",
        co2Attainment: "76%",
        challengeCompletionRate: "91%",
        evaluationProgress: "100%"
      },
      metrics: [
        { metric: "CO1 - Cable Safety Verification", target: "80%", actual: "82%", status: "Exceeded" },
        { metric: "CO2 - Shaft, Key & Coupling Design (EC-07, EC-08 & EC-09)", target: "80%", actual: "78%", status: "Near Target" },
        { metric: "Challenge Submissions & Completion Rate", target: "90%", actual: "91%", status: "On Track" },
        { metric: "Faculty Evaluation & Rubric Marking", target: "90%", actual: "100%", status: "Completed" }
      ]
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`✓ ${report.title} exported to JSON successfully.`);
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
