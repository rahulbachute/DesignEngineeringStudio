(function (global) {
  const service = {
    async getAnalytics() {
      return global.DESRepository?.getAnalytics?.() || { summary: {}, insights: [], recommendations: [] };
    }
  };

  global.DESAnalyticsService = service;
})(window);
