class DashboardEngine {
  constructor() {
    this.elements = {
      activeChallenges: document.getElementById('activeChallenges'),
      studentSubmissions: document.getElementById('studentSubmissions'),
      pendingEvaluations: document.getElementById('pendingEvaluations'),
      completedEvaluations: document.getElementById('completedEvaluations'),
      averageMarks: document.getElementById('averageMarks'),
      coAttainment: document.getElementById('coAttainment'),
      dashboardStatus: document.getElementById('dashboardStatus'),
      recentList: document.getElementById('dashboardRecentList'),
      insights: document.getElementById('dashboardInsights')
    };
  }

  async init() {
    this.renderLoadingState();
    try {
      const data = await DESDashboardService.getDashboard();
      this.render(data);
    } catch (error) {
      this.showError(error.message || 'Unable to load dashboard data.');
    }
  }

  renderLoadingState() {
    this.elements.dashboardStatus.textContent = 'Loading dashboard data…';
    this.elements.activeChallenges.textContent = '…';
    this.elements.studentSubmissions.textContent = '…';
    this.elements.pendingEvaluations.textContent = '…';
    this.elements.completedEvaluations.textContent = '…';
    this.elements.averageMarks.textContent = '…';
    this.elements.coAttainment.textContent = '…';
  }

  render(data) {
    this.elements.activeChallenges.textContent = data.activeChallenges ?? 0;
    this.elements.studentSubmissions.textContent = data.studentSubmissions ?? 0;
    this.elements.pendingEvaluations.textContent = data.pendingEvaluations ?? 0;
    this.elements.completedEvaluations.textContent = data.completedEvaluations ?? 0;
    this.elements.averageMarks.textContent = `${data.averageMarks ?? 0}%`;
    this.elements.coAttainment.textContent = `${data.coAttainment ?? 0}%`;
    this.elements.dashboardStatus.textContent = 'Repository-backed dashboard loaded successfully.';

    this.elements.recentList.innerHTML = (data.recentSubmissions || []).map((entry) => `
      <div class="list-group-item px-0">
        <div class="d-flex justify-content-between gap-3">
          <div>
            <strong>${this.escapeHtml(entry.studentName)}</strong>
            <div class="small text-muted">${this.escapeHtml(entry.challenge)}</div>
          </div>
          <span class="badge bg-info-subtle text-info-emphasis">${this.escapeHtml(entry.status)}</span>
        </div>
      </div>
    `).join('');

    this.elements.insights.innerHTML = [
      'Repository-first data access enabled.',
      'Mock data is now served through a single façade.',
      'Future Google Sheets and ERP integration can slot in without UI changes.'
    ].map((item) => `<li class="list-group-item px-0">${this.escapeHtml(item)}</li>`).join('');
  }

  showError(message) {
    this.elements.dashboardStatus.textContent = message;
    this.elements.recentList.innerHTML = '<div class="text-muted">Unable to load recent submissions.</div>';
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
  new DashboardEngine().init();
});
