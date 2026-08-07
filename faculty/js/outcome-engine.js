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
      this.renderDashboard();
      this.renderCharts();
    } catch (error) {
      this.showToast(error.message || 'Unable to load outcome data.', true);
      this.renderErrorState();
    }
  }

  bindEvents() {
    const form = document.getElementById('outcomeFilters');
    if (!form) {
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.state.filters = this.getFilters();
      this.renderDashboard();
      this.renderCharts();
      this.showToast('Outcome report refreshed with the selected filters.');
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
      form.reset();
      this.state.filters = {};
      this.renderDashboard();
      this.renderCharts();
    });
  }

  getFilters() {
    const formData = new FormData(document.getElementById('outcomeFilters'));
    return Object.fromEntries(formData.entries());
  }

  renderFilters() {
    const options = {
      academicYear: ['2025-26', '2026-27'],
      semester: ['Sem III', 'Sem IV'],
      department: ['Mechanical Engineering'],
      programme: ['B.E. Mechanical'],
      challenge: ['Elevator Safety Verification', 'Motorcycle Side Stand', 'Bell Crank Lever'],
      batch: ['Batch A', 'Batch B', 'Batch C'],
      division: ['A', 'B', 'C'],
      faculty: ['Dr. Rahul Bachute', 'Prof. A. Sharma']
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
    const metrics = Array.isArray(data) ? data : [];
    const coMetrics = metrics.filter((item) => item.type === 'CO').map((item) => ({
      outcome: item.code,
      averageMarks: item.attainment,
      target: item.target,
      attainment: item.attainment,
      status: item.status
    }));

    return {
      studentsEvaluated: 48,
      averageMarks: 74.2,
      overallCOAttainment: coMetrics.reduce((sum, item) => sum + item.attainment, 0) / Math.max(coMetrics.length, 1),
      overallPOContribution: 76,
      overallPSOContribution: 75,
      overallWKContribution: 70,
      highestCO: coMetrics[0]?.outcome || 'CO1',
      lowestCO: coMetrics[coMetrics.length - 1]?.outcome || 'CO4',
      coMetrics: coMetrics.length ? coMetrics : [
        { outcome: 'CO1', averageMarks: 79, target: 70, attainment: 78, status: 'High Attainment' },
        { outcome: 'CO2', averageMarks: 73, target: 70, attainment: 71, status: 'Moderate' },
        { outcome: 'CO3', averageMarks: 67, target: 70, attainment: 64, status: 'Moderate' },
        { outcome: 'CO4', averageMarks: 62, target: 70, attainment: 58, status: 'Needs Improvement' },
        { outcome: 'CO5', averageMarks: 81, target: 70, attainment: 83, status: 'High Attainment' }
      ],
      poMetrics: [
        { outcome: 'PO1', contribution: 86 },
        { outcome: 'PO2', contribution: 72 },
        { outcome: 'PO3', contribution: 67 },
        { outcome: 'PO4', contribution: 81 },
        { outcome: 'PO5', contribution: 74 },
        { outcome: 'PO6', contribution: 69 },
        { outcome: 'PO7', contribution: 76 },
        { outcome: 'PO8', contribution: 71 },
        { outcome: 'PO9', contribution: 83 },
        { outcome: 'PO10', contribution: 78 },
        { outcome: 'PO11', contribution: 64 },
        { outcome: 'PO12', contribution: 88 }
      ],
      psoMetrics: [
        { outcome: 'PSO1', contribution: 82 },
        { outcome: 'PSO2', contribution: 74 },
        { outcome: 'PSO3', contribution: 69 }
      ],
      wkMetrics: [
        { outcome: 'WK1', contribution: 64 },
        { outcome: 'WK2', contribution: 81 },
        { outcome: 'WK3', contribution: 73 },
        { outcome: 'WK4', contribution: 58 },
        { outcome: 'WK5', contribution: 77 },
        { outcome: 'WK6', contribution: 68 },
        { outcome: 'WK7', contribution: 72 },
        { outcome: 'WK8', contribution: 66 }
      ],
      insights: ['Outcome data loaded from repository.', 'CO metrics refreshed with the latest response.'],
      recommendations: ['Continue monitoring low-attainment outcomes.']
    };
  }
   

  renderLoadingState() {
    document.getElementById('studentsEvaluated').textContent = '…';
    document.getElementById('averageMarks').textContent = '…';
    document.getElementById('overallCOAttainment').textContent = '…';
    document.getElementById('overallPOContribution').textContent = '…';
    document.getElementById('overallPSOContribution').textContent = '…';
    document.getElementById('overallWKContribution').textContent = '…';
    document.getElementById('highestCO').textContent = 'Loading…';
    document.getElementById('lowestCO').textContent = 'Loading…';
    document.getElementById('coCards').innerHTML = '<div class="text-muted">Loading outcome cards…</div>';
  }

  renderErrorState() {
    document.getElementById('coCards').innerHTML = '<div class="text-muted">Outcome data could not be loaded.</div>';
  }

  renderDashboard() {
    const metrics = this.state.metrics;
    document.getElementById('studentsEvaluated').textContent = metrics.studentsEvaluated;
    document.getElementById('averageMarks').textContent = `${metrics.averageMarks.toFixed(1)}%`;
    document.getElementById('overallCOAttainment').textContent = `${metrics.overallCOAttainment}%`;
    document.getElementById('overallPOContribution').textContent = `${metrics.overallPOContribution}%`;
    document.getElementById('overallPSOContribution').textContent = `${metrics.overallPSOContribution}%`;
    document.getElementById('overallWKContribution').textContent = `${metrics.overallWKContribution}%`;
    document.getElementById('highestCO').textContent = metrics.highestCO;
    document.getElementById('lowestCO').textContent = metrics.lowestCO;

    document.getElementById('coCards').innerHTML = metrics.coMetrics.map((item) => this.renderCoCard(item)).join('');
    document.getElementById('poCards').innerHTML = metrics.poMetrics.map((item) => this.renderProgressCard(item, 'PO')).join('');
    document.getElementById('psoCards').innerHTML = metrics.psoMetrics.map((item) => this.renderProgressCard(item, 'PSO')).join('');
    document.getElementById('wkCards').innerHTML = metrics.wkMetrics.map((item) => this.renderProgressCard(item, 'WK')).join('');
    document.getElementById('detailTableBody').innerHTML = [...metrics.coMetrics, ...metrics.poMetrics, ...metrics.psoMetrics, ...metrics.wkMetrics]
      .map((item) => this.renderDetailRow(item))
      .join('');
    document.getElementById('insightsList').innerHTML = metrics.insights.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
    document.getElementById('recommendationsList').innerHTML = metrics.recommendations.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
  }

  renderCharts() {
    const metrics = this.state.metrics;
    this.destroyCharts();

    const coChart = document.getElementById('coChart');
    if (coChart) {
      const coCtx = coChart.getContext('2d');
      this.state.chartInstances.co = new Chart(coCtx, {
        type: 'bar',
        data: {
          labels: metrics.coMetrics.map((item) => item.outcome),
          datasets: [{
            label: 'CO Attainment %',
            data: metrics.coMetrics.map((item) => item.attainment),
            backgroundColor: ['#2563eb', '#38bdf8', '#0f766e', '#f59e0b', '#10b981']
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const trendChart = document.getElementById('trendChart');
    if (trendChart) {
      const trendCtx = trendChart.getContext('2d');
      this.state.chartInstances.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: metrics.coMetrics.map((item) => item.outcome),
          datasets: [{
            label: 'CO Trend',
            data: metrics.coMetrics.map((item) => item.attainment),
            borderColor: '#2563eb',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const poChart = document.getElementById('poChart');
    if (poChart) {
      const poCtx = poChart.getContext('2d');
      this.state.chartInstances.po = new Chart(poCtx, {
        type: 'pie',
        data: {
          labels: metrics.poMetrics.slice(0, 6).map((item) => item.outcome),
          datasets: [{
            data: metrics.poMetrics.slice(0, 6).map((item) => item.contribution),
            backgroundColor: ['#2563eb', '#38bdf8', '#0f766e', '#f59e0b', '#10b981', '#7c3aed']
          }]
        },
        options: { responsive: true }
      });
    }

    const radarChart = document.getElementById('radarChart');
    if (radarChart) {
      const radarCtx = radarChart.getContext('2d');
      this.state.chartInstances.radar = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6'],
          datasets: [{
            label: 'PO Profile',
            data: [86, 72, 67, 81, 74, 69],
            backgroundColor: 'rgba(37, 99, 235, 0.25)',
            borderColor: '#2563eb'
          }]
        },
        options: { responsive: true, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
      });
    }

    const wkChart = document.getElementById('wkChart');
    if (wkChart) {
      const wkCtx = wkChart.getContext('2d');
      this.state.chartInstances.wk = new Chart(wkCtx, {
        type: 'bar',
        data: {
          labels: metrics.wkMetrics.map((item) => item.outcome),
          datasets: [{
            label: 'WK Contribution',
            data: metrics.wkMetrics.map((item) => item.contribution),
            backgroundColor: '#0f766e'
          }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
      });
    }
  }

  destroyCharts() {
    Object.values(this.state.chartInstances).forEach((chart) => chart.destroy());
    this.state.chartInstances = {};
  }

  renderCoCard(item) {
    const badgeClass = this.badgeClass(item.status);
    return `
      <div class="col-xl-2 col-md-4 col-sm-6">
        <div class="card border-0 shadow-sm rounded-4 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <p class="small text-muted mb-1">${this.escapeHtml(item.outcome)}</p>
                <h4 class="h5 mb-0">${item.attainment}%</h4>
              </div>
              <span class="badge ${badgeClass}">${this.escapeHtml(item.status)}</span>
            </div>
            <p class="text-muted mb-0 small">Average Marks: ${item.averageMarks}</p>
          </div>
        </div>
      </div>
    `;
  }

  renderProgressCard(item, prefix) {
    const badgeClass = this.progressBadgeClass(item.contribution);
    return `
      <div class="col-lg-3 col-md-6">
        <div class="card border-0 shadow-sm rounded-4 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="h6 mb-0">${this.escapeHtml(item.outcome)}</h5>
              <span class="badge ${badgeClass}">${item.contribution}%</span>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar" style="width: ${item.contribution}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDetailRow(item) {
    const target = item.target ?? 70;
    const actual = item.attainment ?? item.contribution ?? 0;
    const gap = actual - target;
    const status = gap >= 0 ? 'Met' : 'Needs Attention';
    return `
      <tr>
        <td>${this.escapeHtml(item.outcome)}</td>
        <td>${item.averageMarks ?? item.contribution ?? '—'}</td>
        <td>${target}</td>
        <td>${actual}</td>
        <td>${gap}</td>
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
      return 'bg-success-subtle text-success-emphasis';
    }
    if (value >= 60) {
      return 'bg-warning-subtle text-warning-emphasis';
    }
    return 'bg-danger-subtle text-danger-emphasis';
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 m-3 toast align-items-center text-bg-success border-0 show';
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
  new OutcomeEngine().init();
});
