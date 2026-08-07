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
      this.renderDashboard();
      this.renderCharts();
    } catch (error) {
      this.showToast(error.message || 'Unable to load analytics data.', true);
      this.renderErrorState();
    }
  }

  bindEvents() {
    const form = document.getElementById('analyticsFilters');
    if (!form) {
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.renderDashboard();
      this.renderCharts();
      this.showToast('Analytics refreshed for the selected view.');
    });

    document.getElementById('resetAnalyticsFilters').addEventListener('click', () => {
      form.reset();
      this.renderDashboard();
      this.renderCharts();
    });
  }

  renderFilters() {
    [
      'academicYearFilter',
      'semesterFilter',
      'programmeFilter',
      'departmentFilter',
      'facultyFilter',
      'batchFilter',
      'divisionFilter',
      'challengeFilter'
    ].forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = '<option value="">All</option>';
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
      totalStudents: this.metric(summary.totalStudents),
      totalChallenges: this.metric(summary.totalChallenges),
      completedEvaluations: this.metric(summary.completedEvaluations),
      pendingEvaluations: this.metric(summary.pendingEvaluations),
      averageMarks: this.metric(summary.averageMarks),
      overallCOAttainment: this.metric(summary.overallCOAttainment),
      overallPOContribution: this.metric(summary.overallPOContribution),
      overallStudentPerformance: this.metric(summary.overallStudentPerformance),
      academicPerformance: {
        averageMarks: this.metric(academic.averageMarks ?? summary.averageMarks),
        medianMarks: this.metric(academic.medianMarks),
        highestMarks: this.metric(academic.highestMarks),
        lowestMarks: this.metric(academic.lowestMarks),
        passPercentage: this.metric(academic.passPercentage),
        gradeDistribution: academic.gradeDistribution || data.charts?.gradeDistribution || {},
        challengeDifficultyIndex: this.metric(academic.challengeDifficultyIndex),
        challengeCompletionRate: this.metric(academic.challengeCompletionRate),
        facultyEvaluationProgress: this.metric(academic.facultyEvaluationProgress)
      },
      studentPerformance: {
        topPerformingStudents: this.list(student.topPerformingStudents),
        studentsNeedingImprovement: this.list(student.studentsNeedingImprovement),
        attendance: this.metric(student.attendance),
        submissionTimeliness: this.metric(student.submissionTimeliness),
        attemptAnalysis: this.metric(student.attemptAnalysis),
        learningProgress: this.metric(student.learningProgress)
      },
      challengeAnalytics: {
        mostAttempted: this.metric(challenge.mostAttempted),
        leastAttempted: this.metric(challenge.leastAttempted),
        highestAverageScore: this.metric(challenge.highestAverageScore),
        lowestAverageScore: this.metric(challenge.lowestAverageScore),
        mostDifficult: this.metric(challenge.mostDifficult),
        completionTrend: this.metric(challenge.completionTrend)
      },
      facultyAnalytics: {
        evaluationsCompleted: this.metric(faculty.evaluationsCompleted ?? summary.completedEvaluations),
        pendingReviews: this.metric(faculty.pendingReviews ?? summary.pendingEvaluations),
        averageEvaluationTime: this.metric(faculty.averageEvaluationTime),
        marksDistribution: faculty.marksDistribution || {},
        activityTimeline: this.list(faculty.activityTimeline)
      },
      outcomeAnalytics: {
        coTrend: this.list(outcome.coTrend),
        poTrend: this.list(outcome.poTrend),
        psoTrend: this.list(outcome.psoTrend),
        wkTrend: this.list(outcome.wkTrend),
        heatmap: this.list(outcome.heatmap)
      },
      charts: data.charts || {},
      insights: this.list(data.insights),
      recommendations: this.list(data.recommendations)
    };
  }

  renderLoadingState() {
    ['totalStudents', 'totalChallenges', 'completedEvaluations', 'pendingEvaluations'].forEach((id) => {
      document.getElementById(id).textContent = '...';
    });
    ['averageMarks', 'overallCOAttainment', 'overallPOContribution', 'overallStudentPerformance'].forEach((id) => {
      document.getElementById(id).textContent = 'Loading...';
    });
  }

  renderErrorState() {
    document.getElementById('academicStats').innerHTML = '<div class="col-12 text-muted">Analytics data could not be loaded.</div>';
  }

  renderDashboard() {
    const metrics = this.state.metrics;
    document.getElementById('totalStudents').textContent = metrics.totalStudents;
    document.getElementById('totalChallenges').textContent = metrics.totalChallenges;
    document.getElementById('completedEvaluations').textContent = metrics.completedEvaluations;
    document.getElementById('pendingEvaluations').textContent = metrics.pendingEvaluations;
    document.getElementById('averageMarks').textContent = this.percent(metrics.averageMarks);
    document.getElementById('overallCOAttainment').textContent = this.percent(metrics.overallCOAttainment);
    document.getElementById('overallPOContribution').textContent = this.percent(metrics.overallPOContribution);
    document.getElementById('overallStudentPerformance').textContent = this.percent(metrics.overallStudentPerformance);

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

    document.getElementById('insightsList').innerHTML = this.renderList(metrics.insights);
    document.getElementById('recommendationsList').innerHTML = this.renderList(metrics.recommendations);
  }

  renderStatGrid(id, items, columnClass = 'col-md-4') {
    document.getElementById(id).innerHTML = items.map((item) => `
      <div class="${columnClass}">
        <div class="border rounded-4 p-3 h-100">
          <p class="small text-muted mb-1">${this.escapeHtml(item.label)}</p>
          <p class="mb-0">${this.escapeHtml(item.value)}</p>
        </div>
      </div>
    `).join('');
  }

  renderCharts() {
    this.destroyCharts();
    this.renderChart('gradeDistributionChart', 'doughnut', this.chartFromObject(this.state.metrics.academicPerformance.gradeDistribution), 'Grades');
    this.renderChart('performanceTrendChart', 'line', this.chartFromArray(this.state.metrics.charts.performanceTrend), 'Marks Trend');
    this.renderChart('challengeCompletionChart', 'bar', this.chartFromArray(this.state.metrics.charts.challengeCompletion), 'Completion Rate');
    this.renderChart('facultyActivityChart', 'bar', this.chartFromArray(this.state.metrics.charts.facultyActivity), 'Reviews');
    this.renderChart('outcomeTrendChart', 'radar', this.chartFromArray(this.state.metrics.charts.outcomeTrend), 'Outcome Balance');
    this.renderChart('heatmapChart', 'bar', this.chartFromArray(this.state.metrics.charts.heatmap), 'Heatmap');
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
          backgroundColor: ['#2563eb', '#38bdf8', '#0f766e', '#f59e0b', '#ef4444', '#10b981'],
          borderColor: '#2563eb',
          fill: type === 'line',
          tension: 0.3
        }]
      },
      options: { responsive: true }
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
    Object.values(this.state.chartInstances).forEach((chart) => chart.destroy());
    this.state.chartInstances = {};
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
    return value.length ? value.join(separator) : 'Unavailable';
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
    if (!items.length) {
      return '<li class="list-group-item text-muted">Unavailable</li>';
    }
    return items.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2400);
  }

  escapeHtml(value) {
    return String(value)
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
