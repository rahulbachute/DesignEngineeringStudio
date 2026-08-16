(function (global) {
  const service = {
    async getOutcomeSummary() {
      return global.DESRepository?.getOutcomeData?.() || [];
    }
  };

  global.DESOutcomeService = service;
})(window);
