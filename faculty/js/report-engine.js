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
      this.state.reports = (reports || []).map((report) => ({ ...report, category: report.category || 'Assessment Reports' }));
      this.renderReportDashboard();
      this.renderPreview();
      this.renderCharts();
    } catch (error) {
      this.showToast(error.message || 'Unable to load reports.', true);
      this.state.reports = this.buildMockReports();
      this.renderReportDashboard();
      this.renderPreview();
      this.renderCharts();
    }
  }

  bindEvents() {
    document.getElementById('reportSearch').addEventListener('input', (event) => this.filterReports(event.target.value));
    document.getElementById('reportCategoryFilter').addEventListener('change', (event) => this.filterReports(document.getElementById('reportSearch').value, event.target.value));
    document.getElementById('generateReportBtn').addEventListener('click', () => this.generateSelectedReport());
    document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportPlaceholder('PDF'));
    document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportPlaceholder('Excel'));
    document.getElementById('printReportBtn').addEventListener('click', () => window.print());
    document.getElementById('downloadJsonBtn').addEventListener('click', () => this.exportPlaceholder('JSON'));
    document.getElementById('downloadCsvBtn').addEventListener('click', () => this.exportPlaceholder('CSV'));
  }

  buildMockReports() {
    return [
      { id: 'student-eval', title: 'Student Evaluation Report', category: 'Assessment Reports', description: 'Marks, grade summary, and evaluation completion by student.', tags: ['assessment', 'student'] },
      { id: 'challenge-marks', title: 'Challenge-wise Marks Report', category: 'Assessment Reports', description: 'Challenge-level attainment and spread of marks.', tags: ['assessment', 'challenge'] },
      { id: 'batch-performance', title: 'Batch Performance Report', category: 'Assessment Reports', description: 'Batch comparator for academic strength and improvement.', tags: ['assessment', 'batch'] },
      { id: 'co-attainment', title: 'Course Outcome Attainment Report', category: 'Outcome Reports', description: 'CO target vs actual with action recommendations.', tags: ['outcome', 'cob'] },
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
      catalog.innerHTML = '<div class="text-muted">Loading reports from the repository…</div>';
    }
    const previewTitle = document.getElementById('reportPreviewTitle');
    if (previewTitle) {
      previewTitle.textContent = 'Loading report preview…';
    }
  }

  renderReportDashboard() {
    const catalog = document.getElementById('reportCatalog');
    if (!catalog) {
      return;
    }
    catalog.innerHTML = this.state.reports.map((report) => `
      <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-start" data-report-id="${report.id}">
        <span>
          <strong>${this.escapeHtml(report.title)}</strong>
          <div class="small text-muted mt-1">${this.escapeHtml(report.description)}</div>
        </span>
        <span class="badge rounded-pill bg-light text-dark">${this.escapeHtml(report.category)}</span>
      </button>
    `).join('');

    catalog.querySelectorAll('[data-report-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.state.activeReport = this.state.reports.find((item) => item.id === button.getAttribute('data-report-id'));
        this.renderPreview();
      });
    });

    if (!this.state.activeReport) {
      this.state.activeReport = this.state.reports[0];
    }
  }

  filterReports(searchText = '', category = '') {
    const term = searchText.toLowerCase();
    const filtered = this.state.reports.filter((report) => {
      const matchesTerm = !term || report.title.toLowerCase().includes(term) || report.description.toLowerCase().includes(term) || report.tags.some((tag) => tag.includes(term));
      const matchesCategory = !category || report.category === category;
      return matchesTerm && matchesCategory;
    });

    const catalog = document.getElementById('reportCatalog');
    if (catalog) {
      catalog.innerHTML = filtered.map((report) => `
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-start" data-report-id="${report.id}">
          <span>
            <strong>${this.escapeHtml(report.title)}</strong>
            <div class="small text-muted mt-1">${this.escapeHtml(report.description)}</div>
          </span>
          <span class="badge rounded-pill bg-light text-dark">${this.escapeHtml(report.category)}</span>
        </button>
      `).join('');

      catalog.querySelectorAll('[data-report-id]').forEach((button) => {
        button.addEventListener('click', () => {
          this.state.activeReport = this.state.reports.find((item) => item.id === button.getAttribute('data-report-id'));
          this.renderPreview();
        });
      });
    }
  }

  renderPreview() {
    const previewTitle = document.getElementById('reportPreviewTitle');
    const previewMeta = document.getElementById('reportPreviewMeta');
    const previewBody = document.getElementById('reportPreviewBody');

    if (!this.state.activeReport) {
      return;
    }

    previewTitle.textContent = this.state.activeReport.title;
    previewMeta.innerHTML = `
      <span class="badge bg-primary-subtle text-primary-emphasis">${this.escapeHtml(this.state.activeReport.category)}</span>
      <span class="badge bg-secondary-subtle text-secondary-emphasis">Mock Data</span>
      <span class="badge bg-success-subtle text-success-emphasis">Future-ready</span>
    `;

    previewBody.innerHTML = `
      <div class="border rounded-4 p-4 bg-light-subtle">
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <h5 class="h6">Report Summary</h5>
            <p class="mb-1"><strong>Institution:</strong> Ajeenkya D. Y. Patil School of Engineering</p>
            <p class="mb-1"><strong>Academic Year:</strong> 2026-27</p>
            <p class="mb-1"><strong>Semester:</strong> Sem IV</p>
            <p class="mb-0"><strong>Generated By:</strong> DES Faculty Workspace</p>
          </div>
          <div class="col-md-6">
            <h5 class="h6">Key Highlights</h5>
            <ul class="mb-0">
              <li>Average marks improved by 6.4% over the previous cycle.</li>
              <li>CO2 attainment remains below target and requires intervention.</li>
              <li>Practical challenge engagement is stronger than theoretical tasks.</li>
            </ul>
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="border rounded-3 p-3">
              <h6 class="mb-2">Outcome Snapshot</h6>
              <div class="small text-muted">CO attainment: 76%</div>
              <div class="small text-muted">PO contribution: 79%</div>
              <div class="small text-muted">PSO contribution: 75%</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="border rounded-3 p-3">
              <h6 class="mb-2">Compliance Snapshot</h6>
              <div class="small text-muted">NBA alignment: Strong</div>
              <div class="small text-muted">NAAC quality metrics: Stable</div>
              <div class="small text-muted">Academic audit readiness: Good</div>
            </div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CO2 Attainment</td>
                <td>80%</td>
                <td>72%</td>
                <td><span class="badge bg-danger-subtle text-danger-emphasis">Gap</span></td>
              </tr>
              <tr>
                <td>Challenge Completion</td>
                <td>90%</td>
                <td>91%</td>
                <td><span class="badge bg-success-subtle text-success-emphasis">On Track</span></td>
              </tr>
              <tr>
                <td>Evaluation Progress</td>
                <td>90%</td>
                <td>84%</td>
                <td><span class="badge bg-warning-subtle text-warning-emphasis">Needs Attention</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

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
          datasets: [{ label: 'Attainment', data: [82, 72, 78, 79], backgroundColor: ['#2563eb', '#ef4444', '#10b981', '#f59e0b'] }]
        },
        options: { responsive: true }
      });
    }

    const gradeChart = document.getElementById('reportGradeChart');
    if (gradeChart) {
      this.state.chartInstances.grade = new Chart(gradeChart, {
        type: 'pie',
        data: {
          labels: ['A', 'B', 'C', 'D', 'F'],
          datasets: [{ data: [24, 36, 22, 10, 8], backgroundColor: ['#2563eb', '#38bdf8', '#0f766e', '#f59e0b', '#ef4444'] }]
        },
        options: { responsive: true }
      });
    }

    const trendChart = document.getElementById('reportTrendChart');
    if (trendChart) {
      this.state.chartInstances.trend = new Chart(trendChart, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [{ label: 'Performance Trend', data: [68, 70, 71, 74, 76, 78, 81], borderColor: '#0f766e', fill: true, tension: 0.3 }]
        },
        options: { responsive: true }
      });
    }
  }

  destroyCharts() {
    Object.values(this.state.chartInstances).forEach((chart) => chart.destroy());
    this.state.chartInstances = {};
  }

  generateSelectedReport() {
    const title = this.state.activeReport ? this.state.activeReport.title : 'Selected Report';
    this.showToast(`${title} generated successfully.`);
  }

  exportPlaceholder(format) {
    this.showToast(`${format} export prepared. Placeholder download will be connected in a future live integration.`);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 m-3 toast align-items-center text-bg-dark border-0 show';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2400);
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
  new ReportEngine().init();
});
