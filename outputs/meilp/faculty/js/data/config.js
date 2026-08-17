(function (global) {
  const appMode = 'LIVE';
  const config = {
    appName: 'DES Faculty Workspace',
    version: '1.0.0',
    buildNumber: 'RC1',
    appMode,
    apiBaseUrl: 'https://script.google.com/macros/s/AKfycbzAnnjAXquy00NQ1fXFhI45IdkcZ0SQiL-mGmf7B_Z-_0uXLg6lah8VYNRi9JYbXgtD/exec',
    timeout: 30000,
    retryCount: 2,
    retryDelay: 700,
    mockMode: false,
    defaultRole: 'faculty',
    loggingEnabled: true,
    endpoints: {
      getDashboard: 'analytics',
      getChallenges: 'getChallenges',
      getChallenge: 'getChallenge',
      getSubmissions: 'submissions',
      getSubmission: 'submission',
      saveEvaluation: 'saveEvaluation',
      updateEvaluation: 'updateEvaluation',
      getOutcomeSummary: 'getOutcomeSummary',
      getAnalytics: 'analytics',
      generateReport: 'generateReport',
      getStudents: 'getStudents',
      getFaculty: 'getFaculty',
      getActivities: 'getActivities',
      getRubrics: 'getRubrics',
      getSettings: 'getSettings'
    }
  };

  global.DESConfig = config;
})(window);
