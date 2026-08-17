(function (global) {
  const service = {
    async getSubmissions() {
      return global.DESRepository?.getSubmissions?.() || [];
    },

    async getSubmission(id) {
      return global.DESRepository?.getSubmission?.(id) || null;
    },

    async saveEvaluation(payload) {
      return global.DESRepository?.saveEvaluation?.(payload) || { ok: false, message: 'Evaluation save failed.' };
    }
  };

  global.DESSubmissionService = service;
})(window);
