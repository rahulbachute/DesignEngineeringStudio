(function (global) {
  const service = {
    async getAnalytics(filters = {}) {
      if (!global.DESRepository) {
        throw new Error('DESRepository is unavailable.');
      }

      // Authoritative retrieval of genuine submissions for authenticated faculty
      const submissions = await global.DESRepository.getSubmissions(filters);

      // Optional backend aggregate metrics
      let summary = null;
      try {
        summary = await global.DESRepository.getAnalytics();
      } catch (err) {
        summary = null;
      }

      return {
        submissions: Array.isArray(submissions) ? submissions : [],
        summary: summary || null
      };
    },

    async getSubmissions(filters = {}) {
      return global.DESRepository?.getSubmissions?.(filters) || [];
    }
  };

  global.DESAnalyticsService = service;
})(window);
