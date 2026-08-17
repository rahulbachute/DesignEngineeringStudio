window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.googleSheets = {
  async fetchDashboardData(config) {
    if (!config.googleSheetsWebAppUrl) {
      return this.fetchSampleData(config.sampleDataUrl, config.embeddedSampleData);
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), config.requestTimeoutMs);
      const response = await fetch(config.googleSheetsWebAppUrl, { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) {
        throw new Error("Google Sheets response was not successful.");
      }
      return await response.json();
    } catch (error) {
      console.warn("Falling back to sample analytics data.", error);
      return this.fetchSampleData(config.sampleDataUrl, config.embeddedSampleData);
    }
  },

  async fetchSampleData(url, fallback) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Sample analytics data could not be loaded.");
      }
      return response.json();
    } catch {
      return fallback;
    }
  }
};
