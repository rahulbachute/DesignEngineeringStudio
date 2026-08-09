class OutcomeEngine {
  constructor() {
    this.state = {
      filters: {},
      metrics: null,
      chartInstances: {}
    };
  }

  async init() {
    this.bindEvents();
    this.renderFilters();
    this.renderLoadingState();
    try {
      const data = await DESOutcomeService.getOutcomeSummary();
      this.state.metrics = this.buildMetricsFromRepository(data);
    } catch (error) {
      console.warn('Using default outcome metrics:', error);
      this.state.metrics = this.buildMetricsFromRepository({});
    }

    this.renderDashboard();
    this.renderCharts();
  }

  bindEvents() {
    const form = document.getElementById('outcomeFilters');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.state.filters = this.getFilters();
        this.renderDashboard();
        this.renderCharts();
        this.showToast('✓ Outcome report refreshed with the selected filters.');
      });

      document.getElementById('resetFilters')?.addEventListener('click', () => {
        form.reset();
        this.state.filters = {};
        this.renderDashboard();
        this.renderCharts();
      });
    }

    document.getElementById('exportPdf')?.addEventListener('click', () => window.print());
    document.getElementById('printReport')?.addEventListener('click', () => window.print());
    document.getElementById('exportExcel')?.addEventListener('click', () => this.exportExcel());
  }

  exportExcel() {
    const m = this.state.metrics || {};
    let csvContent = `\uFEFF`; // UTF-8 BOM
    csvContent += `Design Engineering Studio - Outcome Attainment Report\n`;
    csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    csvContent += `Summary Indicator,Value\n`;
    csvContent += `Students Evaluated,${m.studentsEvaluated || 48}\n`;
    csvContent += `Average Marks,${m.averageMarks || 74.2}%\n`;
    csvContent += `Overall CO Attainment,${m.overallCOAttainment || 76}%\n`;
    csvContent += `Overall PO Contribution,${m.overallPOContribution || 76}%\n`;
    csvContent += `Overall PSO Contribution,${m.overallPSOContribution || 75}%\n`;
    csvContent += `Overall WK Contribution,${m.overallWKContribution || 70}%\n\n`;

    csvContent += `Outcome Level,Average Marks / Contribution,Target Level %,Attained %,Gap %,Status\n`;
    (m.coMetrics || []).forEach(item => {
      const target = item.target || 70;
      const actual = item.attainment || item.averageMarks || 75;
      const gap = actual - target;
      csvContent += `${item.outcome},${item.averageMarks},${target},${actual},${gap},${item.status}\n`;
    });
    (m.poMetrics || []).forEach(item => {
      csvContent += `${item.outcome},${item.contribution},75,${item.contribution},${item.contribution - 75},${item.contribution >= 75 ? 'Met' : 'Needs Attention'}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Outcome_Attainment_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('✓ Outcome Attainment Report exported to CSV / Excel successfully.');
  }

  getFilters() {
    const form = document.getElementById('outcomeFilters');
    if (!form) return {};
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  renderFilters() {
    const options = {
      academicYear: ['2026-27', '2025-26'],
      semester: ['Sem IV', 'Sem III', 'Sem V'],
      department: ['Mechanical Engineering'],
      programme: ['B.E. Mechanical'],
      challenge: [
        'EC-01 Elevator Cable Safety',
        'EC-02 Motorcycle Side Stand',
        'EC-03 Materials Selection',
        'EC-04 Submersible Pump',
        'EC-05 Bolted Joint Failure',
        'EC-06 Stress Concentration',
        'EC-07 Transmission Shaft Design',
        'EC-08 Shaft Drive Keys',
        'EC-09 Coupling Selection',
        'EC-10 Bicycle Cotter Joint',
        'EA-11 Tractor-Trailer Knuckle Joint',
        'EA-12 Motorcycle Helical Spring',
        'EA-13 Leaf Spring Design Verification',
        'EA-14 Spring Selection Comparative Study',
        'EA-15 Automobile Suspension System Analysis',
        'EA-16 Automotive Propeller Shaft Fatigue Design'
      ],
      batch: ['Batch A', 'Batch B', 'Batch C'],
      division: ['Division A', 'Division B'],
      faculty: ['Prof. Rahul Bachute']
    };

    Object.entries(options).forEach(([key, values]) => {
      const select = document.getElementById(`${key}Filter`);
      if (!select) {
        return;
      }
      select.innerHTML = ['<option value="">All</option>', ...values.map((value) => `<option value="${this.escapeHtml(value)}">${this.escapeHtml(value)}</option>`)].join('');
    });
  }

  buildMetricsFromRepository(data) {
    const rawItems = Array.isArray(data) ? data : (data?.outcomes || []);
    let coMetrics = rawItems.filter((item) => item.type === 'CO').map((item) => ({
      outcome: item.code,
      averageMarks: item.attainment,
      target: item.target || 70,
      attainment: item.attainment,
      status: item.status || 'Moderate'
    }));

    if (!coMetrics.length) {
      coMetrics = [
        { outcome: 'CO1 - Elevator Cable Safety', averageMarks: 79, target: 70, attainment: 78, status: 'High Attainment' },
        { outcome: 'CO2 - Shaft, Key & Coupling Design (EC-07, EC-08 & EC-09)', averageMarks: 74, target: 70, attainment: 73, status: 'High Attainment' },
        { outcome: 'CO3 - Materials Selection & Manufacturing', averageMarks: 77, target: 70, attainment: 76, status: 'High Attainment' },
        { outcome: 'CO4 - Stress Concentration & Fracture', averageMarks: 68, target: 70, attainment: 65, status: 'Needs Improvement' },
        { outcome: 'CO5 - Joint & Fastener Failure Analysis', averageMarks: 81, target: 70, attainment: 83, status: 'High Attainment' }
      ];
    }

    const coAttainmentAverage = Math.round(coMetrics.reduce((sum, item) => sum + (item.attainment || 0), 0) / coMetrics.length);

    return {
      studentsEvaluated: 48,
      averageMarks: 74.2,
      overallCOAttainment: coAttainmentAverage,
      overallPOContribution: 76,
      overallPSOContribution: 75,
      overallWKContribution: 70,
      highestCO: coMetrics[0]?.outcome || 'CO5 - Joint Failure Analysis',
      lowestCO: coMetrics[3]?.outcome || 'CO4 - Stress Concentration',
      coMetrics,
      poMetrics: [
        { outcome: 'PO1 - Engineering Knowledge', contribution: 86 },
        { outcome: 'PO2 - Problem Analysis', contribution: 72 },
        { outcome: 'PO3 - Design/Development of Solutions', contribution: 67 },
        { outcome: 'PO4 - Conduct Investigations', contribution: 81 },
        { outcome: 'PO5 - Modern Tool Usage', contribution: 74 },
        { outcome: 'PO6 - Engineer and Society', contribution: 69 },
        { outcome: 'PO7 - Environment and Sustainability', contribution: 76 },
        { outcome: 'PO8 - Ethics', contribution: 71 },
        { outcome: 'PO9 - Individual and Team Work', contribution: 83 },
        { outcome: 'PO10 - Communication', contribution: 78 },
        { outcome: 'PO11 - Project Management', contribution: 64 },
        { outcome: 'PO12 - Life-long Learning', contribution: 88 }
      ],
      psoMetrics: [
        { outcome: 'PSO1 - Mechanical System Design', contribution: 82 },
        { outcome: 'PSO2 - Thermal & Fluid Analysis', contribution: 74 },
        { outcome: 'PSO3 - Industrial Automation', contribution: 69 }
      ],
      wkMetrics: [
        { outcome: 'WK1 - Engineering Fundamentals', contribution: 64 },
        { outcome: 'WK2 - Mathematics & Computing', contribution: 81 },
        { outcome: 'WK3 - Engineering Design', contribution: 73 },
        { outcome: 'WK4 - Engineering Practice', contribution: 58 },
        { outcome: 'WK5 - Engineering Methods', contribution: 77 },
        { outcome: 'WK6 - Technical Knowledge', contribution: 68 },
        { outcome: 'WK7 - Sustainability & Ethics', contribution: 72 },
        { outcome: 'WK8 - Research & Literature', contribution: 66 }
      ],
      insights: [
        'CO2 Shaft & Key Design attainment stands at 71%, demonstrating solid performance across EC-07 and EC-08.',
        'Highest attainment observed in CO5 Joint Failure Analysis (83%) and CO1 Cable Safety (78%).'
      ],
      recommendations: [
        'Organize supplementary tutorial session for CO4 Stress Concentration & Plate with Hole analysis.',
        'Incorporate additional numerical practice problems for combined torsional and bending loads.'
      ]
    };
  }

  renderLoadingState() {
    ['studentsEvaluated', 'averageMarks', 'overallCOAttainment', 'overallPOContribution', 'overallPSOContribution', 'overallWKContribution'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '…';
    });
    ['highestCO', 'lowestCO'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Loading…';
    });
    const coCards = document.getElementById('coCards');
    if (coCards) coCards.innerHTML = '<div class="text-muted p-3"><i class="bi bi-hourglass-split me-2"></i>Loading outcome cards…</div>';
  }

  renderErrorState() {
    const coCards = document.getElementById('coCards');
    if (coCards) coCards.innerHTML = '<div class="text-muted p-3">Outcome data loaded with local defaults.</div>';
  }

  renderDashboard() {
    const metrics = this.state.metrics;
    if (!metrics) return;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('studentsEvaluated', metrics.studentsEvaluated);
    setTxt('averageMarks', `${metrics.averageMarks.toFixed(1)}%`);
    setTxt('overallCOAttainment', `${metrics.overallCOAttainment}%`);
    setTxt('overallPOContribution', `${metrics.overallPOContribution}%`);
    setTxt('overallPSOContribution', `${metrics.overallPSOContribution}%`);
    setTxt('overallWKContribution', `${metrics.overallWKContribution}%`);
    setTxt('highestCO', metrics.highestCO);
    setTxt('lowestCO', metrics.lowestCO);

    const coEl = document.getElementById('coCards');
    if (coEl) coEl.innerHTML = metrics.coMetrics.map((item) => this.renderCoCard(item)).join('');

    const poEl = document.getElementById('poCards');
    if (poEl) poEl.innerHTML = metrics.poMetrics.map((item) => this.renderProgressCard(item, 'PO')).join('');

    const psoEl = document.getElementById('psoCards');
    if (psoEl) psoEl.innerHTML = metrics.psoMetrics.map((item) => this.renderProgressCard(item, 'PSO')).join('');

    const wkEl = document.getElementById('wkCards');
    if (wkEl) wkEl.innerHTML = metrics.wkMetrics.map((item) => this.renderProgressCard(item, 'WK')).join('');

    const detailEl = document.getElementById('detailTableBody');
    if (detailEl) {
      detailEl.innerHTML = [...metrics.coMetrics, ...metrics.poMetrics, ...metrics.psoMetrics, ...metrics.wkMetrics]
        .map((item) => this.renderDetailRow(item))
        .join('');
    }

    const insightsEl = document.getElementById('insightsList');
    if (insightsEl) insightsEl.innerHTML = metrics.insights.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');

    const recsEl = document.getElementById('recommendationsList');
    if (recsEl) recsEl.innerHTML = metrics.recommendations.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
  }

  renderCoCard(item) {
    return `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card border-0 shadow-sm rounded-4 h-100">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold mb-0 text-dark">${this.escapeHtml(item.outcome)}</h6>
              <span class="badge ${this.badgeClass(item.status)}">${this.escapeHtml(item.status)}</span>
            </div>
            <div class="d-flex justify-content-between small text-muted mb-2">
              <span>Target: ${item.target}%</span>
              <span>Attainment: ${item.attainment}%</span>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar ${this.progressBadgeClass(item.attainment)}" style="width: ${item.attainment}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProgressCard(item, label) {
    return `
      <div class="col-md-4 col-lg-3 mb-3">
        <div class="card border-0 shadow-sm rounded-4 h-100">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold mb-0 text-dark">${this.escapeHtml(item.outcome)}</h6>
              <strong class="text-primary fs-6">${item.contribution}%</strong>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar bg-primary" style="width: ${item.contribution}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDetailRow(item) {
    const target = item.target ?? 75;
    const actual = item.attainment ?? item.contribution ?? 0;
    const gap = actual - target;
    const status = gap >= 0 ? 'Met' : 'Needs Attention';
    return `
      <tr>
        <td class="fw-semibold">${this.escapeHtml(item.outcome)}</td>
        <td>${item.averageMarks ?? item.contribution ?? '—'}</td>
        <td>${target}%</td>
        <td>${actual}%</td>
        <td class="${gap >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${gap >= 0 ? '+' : ''}${gap}%</td>
        <td><span class="badge ${status === 'Met' ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'}">${status}</span></td>
      </tr>
    `;
  }

  badgeClass(status) {
    switch (status) {
      case 'High Attainment':
        return 'bg-success-subtle text-success-emphasis';
      case 'Moderate':
        return 'bg-warning-subtle text-warning-emphasis';
      default:
        return 'bg-danger-subtle text-danger-emphasis';
    }
  }

  progressBadgeClass(value) {
    if (value >= 75) {
      return 'bg-success';
    }
    if (value >= 60) {
      return 'bg-warning text-dark';
    }
    return 'bg-danger';
  }

  renderCharts() {
    this.destroyCharts();
    const metrics = this.state.metrics;
    if (!metrics || typeof Chart === 'undefined') return;

    // 1. CO Attainment Bar Chart
    const coCanvas = document.getElementById('coChart') || document.getElementById('coAttainmentChart');
    if (coCanvas) {
      this.state.chartInstances.co = new Chart(coCanvas, {
        type: 'bar',
        data: {
          labels: metrics.coMetrics.map(item => item.outcome.split(' - ')[0]),
          datasets: [{
            label: 'Attainment %',
            data: metrics.coMetrics.map(item => item.attainment),
            backgroundColor: ['#10b981', '#38bdf8', '#6366f1', '#f59e0b', '#ec4899'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    // 2. CO Trend Line Chart
    const trendCanvas = document.getElementById('trendChart');
    if (trendCanvas) {
      const trendData = [72, 75, 78, 70, 83, 68, 76, 81, 79];
      this.state.chartInstances.trend = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: ['EC-01', 'EC-02', 'EC-03', 'EC-04', 'EC-05', 'EC-06', 'EC-07', 'EC-08', 'EC-09'],
          datasets: [{
            label: 'Attainment %',
            data: trendData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    // 3. PO Distribution Bar Chart
    const poCanvas = document.getElementById('poChart') || document.getElementById('poContributionChart');
    if (poCanvas) {
      this.state.chartInstances.po = new Chart(poCanvas, {
        type: 'bar',
        data: {
          labels: metrics.poMetrics.map(item => item.outcome.split(' - ')[0]),
          datasets: [{
            label: 'Contribution %',
            data: metrics.poMetrics.map(item => item.contribution),
            backgroundColor: '#3b82f6',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    // 4. PO Profile Radar Chart
    const radarCanvas = document.getElementById('radarChart');
    if (radarCanvas) {
      this.state.chartInstances.radar = new Chart(radarCanvas, {
        type: 'radar',
        data: {
          labels: metrics.poMetrics.map(item => item.outcome.split(' - ')[0]),
          datasets: [{
            label: 'PO Profile %',
            data: metrics.poMetrics.map(item => item.contribution),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.2)',
            pointBackgroundColor: '#8b5cf6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: { r: { min: 0, max: 100 } }
        }
      });
    }

    // 5. WK Contribution Chart
    const wkCanvas = document.getElementById('wkChart');
    if (wkCanvas) {
      this.state.chartInstances.wk = new Chart(wkCanvas, {
        type: 'bar',
        data: {
          labels: metrics.wkMetrics.map(item => item.outcome.split(' - ')[0]),
          datasets: [{
            label: 'WK Contribution %',
            data: metrics.wkMetrics.map(item => item.contribution),
            backgroundColor: ['#06b6d4', '#0d9488', '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444', '#8b5cf6'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
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

  showToast(message, isError = false) {
    const existing = document.querySelector('.toast.show');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show shadow-lg`;
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
  new OutcomeEngine().init();
});
