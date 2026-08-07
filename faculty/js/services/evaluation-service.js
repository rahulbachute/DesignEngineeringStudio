(function (global) {
  const service = {
    async getSubmission(id) {
      return global.DESRepository?.getSubmission?.(id) || null;
    },

    async saveEvaluation(payload) {
      return global.DESRepository?.saveEvaluation?.(payload) || { ok: false, message: 'Evaluation save failed.' };
    },

    async updateEvaluation(payload) {
      return global.DESRepository?.updateEvaluation?.(payload) || { ok: false, message: 'Evaluation update failed.' };
    }
  };

  global.DESEvaluationService = service;
})(window);
