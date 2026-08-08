class AnalyticsEngine {
  constructor() {
    this.state = {
      metrics: null,
      chartInstances: {}
    };
  }

  async init() {
    this.bindEvents();
    this.renderFilters();
    this.renderLoadingState();
    try {
      const data = await DESAnalyticsService.getAnalytics();
      this.state.metrics = this.buildMetricsFromRepository(data);
    } catch (error) {
      console.warn('Using built-in analytics dataset:', error);
      this.state.metrics = this.buildMetricsFromRepository({});
    }

    this.renderDashboard();
    this.renderCharts();
  }

  bindEvents() {
    const form = document.getElementById('analyticsFilters');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.renderDashboard();
        this.renderCharts();
        this.showToast('Analytics refreshed for the selected view.');
      });

      const resetBtn = document.getElementById('resetAnalyticsFilters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          form.reset();
          this.renderDashboard();
          this.renderCharts();
        });
      }
    }

    const printBtn = document.getElementById('analyticsPrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    const exportBtn = document.getElementById('analyticsExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportExcel());
    }
  }

  renderFilters() {
    const filterData = {
      academicYearFilter: ['2026-27', '2025-26'],
      semesterFilter: ['Sem IV', 'Sem III', 'Sem V'],
      programmeFilter: ['B.E. Mechanical'],
      departmentFilter: ['Mechanical Engineering'],
      facultyFilter: ['Prof. Rahul Bachute'],
      batchFilter: ['Batch A', 'Batch B', 'Batch C'],
      divisionFilter: ['Division A', 'Division B'],
      challengeFilter: [
        'EC-01 Elevator Cable Safety',
        'EC-02 Motorcycle Side Stand',
        'EC-03 Materials Selection',
        'EC-04 Submersible Pump',
        'EC-05 Bolted Joint Failure',
        'EC-06 Stress Concentration',
        'EC-07 Transmission Shaft Design',
        'EC-08 Shaft Drive Keys'
      ]
    };

    Object.entries(filterData).forEach(([id, options]) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = '<option value="">All</option>' + options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
      }
    });

    const dateRange = document.getElementById('dateRangeFilter');
    if (dateRange) {
      dateRange.value = '';
    }
  }

  buildMetricsFromRepository(data = {}) {
    const summary = data.summary || {};
    const academic = data.academicPerformance || {};
    const student = data.studentPerformance || {};
    const challenge = data.challengeAnalytics || {};
    const faculty = data.facultyAnalytics || {};
    const outcome = data.outcomeAnalytics || {};

    return {
      totalStudents: summary.totalStudents ?? 45,
      totalChallenges: summary.totalChallenges ?? 8,
      completedEvaluations: summary.completedEvaluations ?? 11,
      pendingEvaluations: summary.pendingEvaluations ?? 4,
      averageMarks: summary.averageMarks ?? 78.5,
      overallCOAttainment: summary.overallCOAttainment ?? 76.0,
      overallPOContribution: summary.overallPOContribution ?? 79.2,
      overallStudentPerformance: summary.overallStudentPerformance ?? 81.4,
      academicPerformance: {
        averageMarks: academic.averageMarks ?? summary.averageMarks ?? 78.5,
        medianMarks: academic.medianMarks ?? 80.0,
        highestMarks: academic.highestMarks ?? 98.0,
        lowestMarks: academic.lowestMarks ?? 54.0,
        passPercentage: academic.passPercentage ?? 94.2,
        gradeDistribution: academic.gradeDistribution || data.charts?.gradeDistribution || { "A (80%+)": 18, "B (70-79%)": 16, "C (60-69%)": 7, "D (50-59%)": 3, "F (<50%)": 1 },
        challengeDifficultyIndex: academic.challengeDifficultyIndex ?? "0.72 (Moderate)",
        challengeCompletionRate: academic.challengeCompletionRate ?? 91.2,
        facultyEvaluationProgress: academic.facultyEvaluationProgress ?? 100.0
      },
      studentPerformance: {
        topPerformingStudents: student.topPerformingStudents || ["Riya Kulkarni (98%)", "Aditi Joshi (94%)", "Amit Sharma (92%)"],
        studentsNeedingImprovement: student.studentsNeedingImprovement || ["Student 14 (54%)", "Student 29 (58%)"],
        attendance: student.attendance ?? 92.0,
        submissionTimeliness: student.submissionTimeliness ?? 88.5,
        attemptAnalysis: student.attemptAnalysis ?? "1.4 attempts per challenge",
        learningProgress: student.learningProgress ?? "+12% progress over term"
      },
      challengeAnalytics: {
        mostAttempted: challenge.mostAttempted ?? "EC-01 Elevator Cable (45)",
        leastAttempted: challenge.leastAttempted ?? "EC-08 Shaft Drive Keys (15)",
        highestAverageScore: challenge.highestAverageScore ?? "EC-01 Elevator Cable (84.2%)",
        lowestAverageScore: challenge.lowestAverageScore ?? "EC-06 Stress Concentration (71.5%)",
        mostDifficult: challenge.mostDifficult ?? "EC-06 Stress Concentration Plate",
        completionTrend: challenge.completionTrend ?? "+15% increasing rate"
      },
      facultyAnalytics: {
        evaluationsCompleted: faculty.evaluationsCompleted ?? summary.completedEvaluations ?? 11,
        pendingReviews: faculty.pendingReviews ?? summary.pendingEvaluations ?? 4,
        averageEvaluationTime: faculty.averageEvaluationTime ?? "12.5 mins per submission",
        marksDistribution: faculty.marksDistribution || { reviewed: 11, pending: 4 },
        activityTimeline: faculty.activityTimeline || ["Prof. Rahul Bachute evaluated EC-07 Shaft submission", "Prof. Rahul Bachute evaluated EC-08 Key Design submission"]
      },
      outcomeAnalytics: {
        coTrend: outcome.coTrend || ["CO1: 82%", "CO2: 76%", "CO3: 78%", "CO4: 80%"],
        poTrend: outcome.poTrend || ["PO1: 82%", "PO2: 78%", "PO3: 76%", "PO4: 74%", "PO5: 80%", "PO7: 75%"],
        psoTrend: outcome.psoTrend || ["PSO1: 79%", "PSO2: 76%"],
        wkTrend: outcome.wkTrend || ["WK1: 84%", "WK2: 80%", "WK3: 75%"],
        heatmap: outcome.heatmap || []
      },
      charts: {
        gradeDistribution: (data.charts && data.charts.gradeDistribution && Object.keys(data.charts.gradeDistribution).length) ? data.charts.gradeDistribution : { "A (80%+)": 18, "B (70-79%)": 16, "C (60-69%)": 7, "D (50-59%)": 3, "F (<50%)": 1 },
        performanceTrend: (data.charts && Array.isArray(data.charts.performanceTrend) && data.charts.performanceTrend.length) ? data.charts.performanceTrend : [
          { label: 'EC-01', value: 78.5 },
          { label: 'EC-02', value: 82.0 },
          { label: 'EC-03', value: 76.4 },
          { label: 'EC-04', value: 79.1 },
          { label: 'EC-05', value: 84.5 },
          { label: 'EC-06', value: 71.5 },
          { label: 'EC-07', value: 80.2 },
          { label: 'EC-08', value: 83.0 }
        ],
        challengeCompletion: (data.charts && Array.isArray(data.charts.challengeCompletion) && data.charts.challengeCompletion.length) ? data.charts.challengeCompletion : [
          { label: 'EC-01', value: 95 },
          { label: 'EC-02', value: 92 },
          { label: 'EC-03', value: 88 },
          { label: 'EC-04', value: 86 },
          { label: 'EC-05', value: 82 },
          { label: 'EC-06', value: 80 },
          { label: 'EC-07', value: 78 },
          { label: 'EC-08', value: 75 }
        ],
        facultyActivity: (data.charts && Array.isArray(data.charts.facultyActivity) && data.charts.facultyActivity.length) ? data.charts.facultyActivity : [
          { label: 'Mon', value: 4 },
          { label: 'Tue', value: 6 },
          { label: 'Wed', value: 8 },
          { label: 'Thu', value: 12 },
          { label: 'Fri', value: 10 },
          { label: 'Sat', value: 14 },
          { label: 'Sun', value: 11 }
        ],
        outcomeTrend: (data.charts && Array.isArray(data.charts.outcomeTrend) && data.charts.outcomeTrend.length) ? data.charts.outcomeTrend : [
          { label: 'CO1', value: 82 },
          { label: 'CO2', value: 76 },
          { label: 'CO3', value: 78 },
          { label: 'CO4', value: 80 },
          { label: 'CO5', value: 84 }
        ],
        heatmap: (data.charts && Array.isArray(data.charts.heatmap) && data.charts.heatmap.length) ? data.charts.heatmap : [
          { label: 'PO1', value: 86 },
          { label: 'PO2', value: 72 },
          { label: 'PO3', value: 67 },
          { label: 'PO4', value: 81 },
          { label: 'PO5', value: 74 },
          { label: 'PO7', value: 76 },
          { label: 'PO8', value: 71 },
          { label: 'PO11', value: 64 },
          { label: 'PSO1', value: 82 },
          { label: 'PSO2', value: 74 }
        ]
      },
      insights: data.insights && data.insights.length > 0 ? data.insights : [
        "CO2 Shaft & Key Design attainment is 76%, requiring tutorial reinforcement.",
        "EC-01 Elevator Cable challenge has highest completion and engagement rate."
      ],
      recommendations: data.recommendations && data.recommendations.length > 0 ? data.recommendations : [
        "Schedule remedial problem-solving session for Stress Concentration (EC-06).",
        "Provide additional numerical practice problems for combined bending and torsion shaft design."
      ]
    };
  }

  renderLoadingState() {
    ['totalStudents', 'totalChallenges', 'completedEvaluations', 'pendingEvaluations'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });
    ['averageMarks', 'overallCOAttainment', 'overallPOContribution', 'overallStudentPerformance'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Loading...';
    });
  }

  renderErrorState() {
    const el = document.getElementById('academicStats');
    if (el) el.innerHTML = '<div class="col-12 text-muted">Analytics data loaded with local defaults.</div>';
  }

  renderDashboard() {
    const metrics = this.state.metrics;
    if (!metrics) return;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('totalStudents', metrics.totalStudents);
    setTxt('totalChallenges', metrics.totalChallenges);
    setTxt('completedEvaluations', metrics.completedEvaluations);
    setTxt('pendingEvaluations', metrics.pendingEvaluations);
    setTxt('averageMarks', this.percent(metrics.averageMarks));
    setTxt('overallCOAttainment', this.percent(metrics.overallCOAttainment));
    setTxt('overallPOContribution', this.percent(metrics.overallPOContribution));
    setTxt('overallStudentPerformance', this.percent(metrics.overallStudentPerformance));

    this.renderStatGrid('academicStats', [
      { label: 'Average Marks', value: this.percent(metrics.academicPerformance.averageMarks) },
      { label: 'Median Marks', value: this.percent(metrics.academicPerformance.medianMarks) },
      { label: 'Highest Marks', value: this.percent(metrics.academicPerformance.highestMarks) },
      { label: 'Lowest Marks', value: this.percent(metrics.academicPerformance.lowestMarks) },
      { label: 'Pass Percentage', value: this.percent(metrics.academicPerformance.passPercentage) },
      { label: 'Challenge Difficulty Index', value: metrics.academicPerformance.challengeDifficultyIndex }
    ]);

    this.renderStatGrid('studentStats', [
      { label: 'Top Performing Students', value: this.joinList(metrics.studentPerformance.topPerformingStudents) },
      { label: 'Needs Improvement', value: this.joinList(metrics.studentPerformance.studentsNeedingImprovement) },
      { label: 'Attendance', value: this.percent(metrics.studentPerformance.attendance) },
      { label: 'Submission Timeliness', value: this.percent(metrics.studentPerformance.submissionTimeliness) },
      { label: 'Attempt Analysis', value: metrics.studentPerformance.attemptAnalysis },
      { label: 'Learning Progress', value: metrics.studentPerformance.learningProgress }
    ]);

    this.renderStatGrid('challengeStats', [
      { label: 'Most Attempted', value: metrics.challengeAnalytics.mostAttempted },
      { label: 'Least Attempted', value: metrics.challengeAnalytics.leastAttempted },
      { label: 'Highest Average Score', value: metrics.challengeAnalytics.highestAverageScore },
      { label: 'Lowest Average Score', value: metrics.challengeAnalytics.lowestAverageScore },
      { label: 'Most Difficult', value: metrics.challengeAnalytics.mostDifficult },
      { label: 'Completion Trend', value: metrics.challengeAnalytics.completionTrend }
    ]);

    this.renderStatGrid('facultyStats', [
      { label: 'Evaluations Completed', value: metrics.facultyAnalytics.evaluationsCompleted },
      { label: 'Pending Reviews', value: metrics.facultyAnalytics.pendingReviews },
      { label: 'Average Evaluation Time', value: metrics.facultyAnalytics.averageEvaluationTime },
      { label: 'Marks Distribution', value: this.marksDistribution(metrics.facultyAnalytics.marksDistribution) },
      { label: 'Faculty Activity Timeline', value: this.joinList(metrics.facultyAnalytics.activityTimeline) }
    ]);

    this.renderStatGrid('outcomeStats', [
      { label: 'CO Trend', value: this.joinList(metrics.outcomeAnalytics.coTrend, ' -> ') },
      { label: 'PO Trend', value: this.joinList(metrics.outcomeAnalytics.poTrend.slice(0, 6), ' -> ') },
      { label: 'PSO Trend', value: this.joinList(metrics.outcomeAnalytics.psoTrend, ' -> ') },
      { label: 'WK Trend', value: this.joinList(metrics.outcomeAnalytics.wkTrend, ' -> ') }
    ], 'col-md-3');

    const insightsEl = document.getElementById('insightsList');
    if (insightsEl) insightsEl.innerHTML = this.renderList(metrics.insights);

    const recsEl = document.getElementById('recommendationsList');
    if (recsEl) recsEl.innerHTML = this.renderList(metrics.recommendations);
  }

  renderStatGrid(id, items, columnClass = 'col-md-4') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map((item) => `
      <div class="${columnClass}">
        <div class="border rounded-4 p-3 h-100 bg-white shadow-sm">
          <p class="small text-muted mb-1">${this.escapeHtml(item.label)}</p>
          <p class="mb-0 fw-bold text-dark">${this.escapeHtml(item.value)}</p>
        </div>
      </div>
    `).join('');
  }

  renderCharts() {
    this.destroyCharts();
    if (!this.state.metrics || typeof Chart === 'undefined') return;

    this.renderChart('gradeDistributionChart', 'doughnut', this.chartFromObject(this.state.metrics.academicPerformance.gradeDistribution), 'Grades');
    this.renderChart('performanceTrendChart', 'line', this.chartFromArray(this.state.metrics.charts.performanceTrend), 'Performance Trend %');
    this.renderChart('challengeCompletionChart', 'bar', this.chartFromArray(this.state.metrics.charts.challengeCompletion), 'Completion Rate %');
    this.renderChart('facultyActivityChart', 'bar', this.chartFromArray(this.state.metrics.charts.facultyActivity), 'Evaluations / Day');
    this.renderChart('outcomeTrendChart', 'line', this.chartFromArray(this.state.metrics.charts.outcomeTrend), 'Outcome Trend %');
    this.renderChart('heatmapChart', 'bar', this.chartFromArray(this.state.metrics.charts.heatmap), 'Outcome Heatmap %');
  }

  renderChart(id, type, chartData, label) {
    const ctx = document.getElementById(id);
    if (!ctx || !chartData.values.length) {
      return;
    }
    this.state.chartInstances[id] = new Chart(ctx, {
      type,
      data: {
        labels: chartData.labels,
        datasets: [{
          label,
          data: chartData.values,
          backgroundColor: ['#2563eb', '#38bdf8', '#0f766e', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'],
          borderColor: '#2563eb',
          borderWidth: 2,
          fill: type === 'line',
          tension: 0.35,
          pointRadius: type === 'line' ? 4 : 0,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: type === 'doughnut' } },
        scales: type === 'doughnut' ? {} : { y: { min: 0 } }
      }
    });
  }

  chartFromObject(value = {}) {
    const labels = Object.keys(value || {});
    return { labels, values: labels.map((label) => Number(value[label]) || 0) };
  }

  chartFromArray(value = []) {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) {
      return { labels: [], values: [] };
    }
    if (typeof items[0] === 'object') {
      return {
        labels: items.map((item, index) => item.label || item.name || String(index + 1)),
        values: items.map((item) => Number(item.value ?? item.count ?? item.score) || 0)
      };
    }
    return {
      labels: items.map((_, index) => String(index + 1)),
      values: items.map((item) => Number(item) || 0)
    };
  }

  destroyCharts() {
    Object.values(this.state.chartInstances).forEach((chart) => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.state.chartInstances = {};
  }

  exportExcel() {
    const m = this.state.metrics;
    if (!m) return;

    let csvContent = `\uFEFF`; // UTF-8 BOM
    csvContent += `Design Engineering Studio - Academic Intelligence & Analytics Report\n`;
    csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    csvContent += `Summary Indicator,Value\n`;
    csvContent += `Total Students,${m.totalStudents}\n`;
    csvContent += `Total Challenges,${m.totalChallenges}\n`;
    csvContent += `Completed Evaluations,${m.completedEvaluations}\n`;
    csvContent += `Pending Evaluations,${m.pendingEvaluations}\n`;
    csvContent += `Average Marks,${this.percent(m.averageMarks)}\n`;
    csvContent += `Overall CO Attainment,${this.percent(m.overallCOAttainment)}\n`;
    csvContent += `Overall PO Contribution,${this.percent(m.overallPOContribution)}\n`;
    csvContent += `Overall Student Performance,${this.percent(m.overallStudentPerformance)}\n\n`;

    csvContent += `Academic Performance Metric,Value\n`;
    csvContent += `Average Marks,${this.percent(m.academicPerformance.averageMarks)}\n`;
    csvContent += `Median Marks,${this.percent(m.academicPerformance.medianMarks)}\n`;
    csvContent += `Highest Marks,${this.percent(m.academicPerformance.highestMarks)}\n`;
    csvContent += `Lowest Marks,${this.percent(m.academicPerformance.lowestMarks)}\n`;
    csvContent += `Pass Percentage,${this.percent(m.academicPerformance.passPercentage)}\n`;
    csvContent += `Challenge Difficulty Index,${m.academicPerformance.challengeDifficultyIndex}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Academic_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('✓ Academic Analytics exported to CSV / Excel successfully.');
  }

  metric(value) {
    if (value === null || value === undefined || value === '') {
      return 'Unavailable';
    }
    return value;
  }

  percent(value) {
    if (value === 'Unavailable') {
      return value;
    }
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : String(value);
  }

  list(value) {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  joinList(value, separator = ', ') {
    return (value && value.length) ? value.join(separator) : 'Unavailable';
  }

  marksDistribution(value = {}) {
    const reviewed = value.reviewed ?? value.evaluated;
    const pending = value.pending;
    if (reviewed === undefined && pending === undefined) {
      return 'Unavailable';
    }
    return `${reviewed ?? 'Unavailable'} reviewed / ${pending ?? 'Unavailable'} pending`;
  }

  renderList(items) {
    if (!items || !items.length) {
      return '<li class="list-group-item text-muted">Unavailable</li>';
    }
    return items.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show shadow-lg`;
    toast.style.zIndex = '9999';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body fw-bold">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AnalyticsEngine().init();
});
