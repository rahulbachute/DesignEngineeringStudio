(function (global) {
  const config = global.DESConfig || {};
  const service = {
    async getDashboard() {
      const payload = { action: 'getDashboard' };
      const response = await global.DESRepository?.getDashboard?.();
      return response || { activeChallenges: 0, studentSubmissions: 0, pendingEvaluations: 0, completedEvaluations: 0, averageMarks: 0, coAttainment: 0, recentSubmissions: [] };
    }
  };

  global.DESDashboardService = service;
})(window);
