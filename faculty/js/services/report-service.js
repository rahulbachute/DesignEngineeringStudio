(function (global) {
  const service = {
    async getReports() {
      return global.DESRepository?.getReports?.() || [];
    }
  };

  global.DESReportService = service;
})(window);
