window.addEventListener("DOMContentLoaded", () => {
  window.DESAnalytics.dashboard.init();
});

window.DESAnalytics.dashboard = {
  model: null,

  async init() {
    window.DESAnalytics.theme.init();
    window.DESAnalytics.ui.bindViewSwitch();
    this.bindActions();
    await this.load();
  },

  async load() {
    const rawData = await window.DESAnalytics.googleSheets.fetchDashboardData(window.DESAnalytics.config);
    this.model = window.DESAnalytics.analytics.buildModel(rawData);
    window.DESAnalytics.ui.render(this.model);
    window.DESAnalytics.charts.render(this.model, window.DESAnalytics.config);
  },

  bindActions() {
    document.querySelector("[data-refresh-dashboard]").addEventListener("click", () => this.load());
    document.querySelector("[data-download-report]").addEventListener("click", () => this.downloadReport());
    document.querySelector("[data-print-dashboard]").addEventListener("click", () => window.print());
  },

  downloadReport() {
    if (!this.model) {
      return;
    }
    const csv = window.DESAnalytics.analytics.toCsv(this.model);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.model.student.rollNumber}-progress-report.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};
