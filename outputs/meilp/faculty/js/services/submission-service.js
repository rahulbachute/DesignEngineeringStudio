(function (global) {
  const service = {
    async getSubmissions() {
      return global.DESRepository?.getSubmissions?.() || [];
    },

    async getInstituteSubmissions(filters = {}) {
      return global.DESRepository?.getInstituteSubmissions?.(filters) || [];
    },

    async getSubmission(id) {
      return global.DESRepository?.getSubmission?.(id) || null;
    },

    async getInstituteSubmissionDetail(id) {
      return global.DESRepository?.getInstituteSubmissionDetail?.(id) || null;
    },

    async saveEvaluation(payload) {
      return global.DESRepository?.saveEvaluation?.(payload) || { ok: false, message: 'Evaluation save failed.' };
    }
  };

  global.DESSubmissionService = service;
})(window);
