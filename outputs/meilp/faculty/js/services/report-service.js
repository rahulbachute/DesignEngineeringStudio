(function (global) {
  const service = {
    async getReports(filters = {}) {
      if (global.DESRepository?.getReports) {
        const repoReports = await global.DESRepository.getReports(filters);
        if (Array.isArray(repoReports) && repoReports.length > 0) {
          return repoReports;
        }
      }
      return global.DESRepository?.getSubmissions?.(filters) || [];
    },

    async getSubmissions(filters = {}) {
      return global.DESRepository?.getSubmissions?.(filters) || [];
    },

    getCatalog() {
      return [
        { id: 'student-eval', title: 'Student Evaluation Report', category: 'Assessment Reports', description: 'Comprehensive student-wise marks sheet, rubrics breakdown, and faculty remarks for the class.', tags: ['assessment', 'student', 'evaluation'] },
        { id: 'challenge-marks', title: 'Challenge-wise Marks Report', category: 'Assessment Reports', description: 'Challenge-level attainment and spread of marks across assignments.', tags: ['assessment', 'challenge'] },
        { id: 'batch-performance', title: 'Batch Performance Report', category: 'Assessment Reports', description: 'Batch comparator for academic strength, pass percentages, and progress.', tags: ['assessment', 'batch'] },
        { id: 'co-attainment', title: 'Course Outcome Attainment Report', category: 'Outcome Reports', description: 'CO target vs actual attainment with continuous quality improvement actions.', tags: ['outcome', 'co'] },
        { id: 'po-contribution', title: 'Program Outcome Contribution Report', category: 'Outcome Reports', description: 'PO & PSO contribution and gap analysis for NBA/NAAC accreditation.', tags: ['outcome', 'po'] },
        { id: 'student-history', title: 'Student Performance History', category: 'Student Reports', description: 'Longitudinal academic trends and multi-assignment progression.', tags: ['student', 'history'] },
        { id: 'challenge-analytics', title: 'Challenge Analytics Summary', category: 'Challenge Reports', description: 'Difficulty index, completion rates, and learning gain summary.', tags: ['challenge'] },
        { id: 'faculty-workload', title: 'Faculty Workload Report', category: 'Faculty Reports', description: 'Evaluation progress and assessment workload distribution.', tags: ['faculty'] },
        { id: 'department-performance', title: 'Department Performance Report', category: 'Department Reports', description: 'Department-wide metrics and comparative analysis.', tags: ['department'] },
        { id: 'nba-sar', title: 'NBA SAR Report', category: 'Accreditation Reports', description: 'Accreditation-ready evidence pack with criterion attainment data.', tags: ['accreditation', 'nba'] },
        { id: 'naac-aqar', title: 'NAAC AQAR Report', category: 'Accreditation Reports', description: 'Quality metric summary for AQAR annual academic reports.', tags: ['accreditation', 'naac'] },
        { id: 'custom-summary', title: 'Custom Academic Summary', category: 'Custom Reports', description: 'Flexible summary report for Academic Council and Board of Studies.', tags: ['custom'] }
      ];
    }
  };

  global.DESReportService = service;
})(window);
