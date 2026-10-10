class AnalyticsEngine {
  constructor() {
    this.state = {
      rawSubmissions: [],
      filteredSubmissions: [],
      backendSummary: null,
      metrics: null,
      chartInstances: {},
      loading: false,
      error: null,
      filters: {
        academicYear: '',
        semester: '',
        programme: '',
        department: '',
        faculty: '',
        batch: '',
        division: '',
        challenge: '',
        dateRange: ''
      }
    };
  }

  async init() {
    this.bindEvents();
    this.initFacultyInfo();
    this.renderFilters();
    await this.loadData();
  }

  initFacultyInfo() {
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const loggedIn = localStorage.getItem('loggedInFaculty') || user.facultyName || user.name || 'Faculty Member';
    const facultyName = (user.isGuest || loggedIn.toLowerCase() === 'guest')
      ? 'Guest Faculty'
      : (user.facultyName || user.name || loggedIn);

    const facSelect = document.getElementById('facultyFilter');
    if (facSelect && facultyName) {
      let optFound = false;
      for (let i = 0; i < facSelect.options.length; i++) {
        if (facSelect.options[i].value === facultyName) {
          facSelect.selectedIndex = i;
          optFound = true;
          break;
        }
      }
      if (!optFound) {
        const opt = document.createElement('option');
        opt.value = facultyName;
        opt.textContent = facultyName;
        opt.selected = true;
        facSelect.appendChild(opt);
      }
    }
  }

  bindEvents() {
    const form = document.getElementById('analyticsFilters');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.applyFiltersAndRender();
        this.showToast('Analytics refreshed for selected view.');
      });

      const resetBtn = document.getElementById('resetAnalyticsFilters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          form.reset();
          this.initFacultyInfo();
          this.applyFiltersAndRender();
          this.showToast('Analytics filters reset.');
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
        'EC-08 Shaft Drive Keys',
        'EC-09 Coupling Selection',
        'EC-10 Bicycle Cotter Joint',
        'EA-11 Tractor-Trailer Knuckle Joint',
        'EA-12 Motorcycle Helical Spring',
        'EA-13 Leaf Spring Design Verification',
        'EA-14 Spring Selection Comparative Study',
        'EA-15 Automobile Suspension System Analysis',
        'EA-16 Automotive Propeller Shaft Fatigue Design',
        'EA-17 Fatigue Analysis of a Connecting Rod',
        'EA-20 Flange Coupling Design Verification',
        'EA-21 Bench Vice Design Analysis',
        'EA-22 Mobile Scissor Lift Mechanism'
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

  getActiveFilters() {
    const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
    return {
      academicYear: getValue('academicYearFilter'),
      semester: getValue('semesterFilter'),
      programme: getValue('programmeFilter'),
      department: getValue('departmentFilter'),
      faculty: getValue('facultyFilter'),
      batch: getValue('batchFilter'),
      division: getValue('divisionFilter'),
      challenge: getValue('challengeFilter'),
      dateRange: getValue('dateRangeFilter')
    };
  }

  async loadData() {
    this.state.loading = true;
    this.state.error = null;
    this.renderLoadingState();

    try {
      const activeFilters = this.getActiveFilters();
      const result = await (window.DESAnalyticsService?.getAnalytics?.(activeFilters)
        || window.DESRepository?.getSubmissions?.(activeFilters)
        || []);

      let submissions = [];
      let summary = null;

      if (Array.isArray(result)) {
        submissions = result;
      } else if (result && typeof result === 'object') {
        submissions = Array.isArray(result.submissions) ? result.submissions : [];
        summary = result.summary || null;
      }

      this.state.rawSubmissions = submissions;
      this.state.backendSummary = summary;
      this.state.loading = false;

      if (!submissions || submissions.length === 0) {
        this.renderEmptyState();
        return;
      }

      this.applyFiltersAndRender();

    } catch (error) {
      console.error('Error loading analytics records:', error);
      this.state.loading = false;
      this.state.rawSubmissions = [];
      this.state.metrics = null;
      this.state.error = error && error.message ? error.message : 'Failed to retrieve authoritative analytics data from backend.';
      this.renderErrorState();
    }
  }

  renderLoadingState() {
    const courseDash = document.getElementById('courseDashboard');
    if (courseDash) {
      courseDash.innerHTML = `
        <div class="alert alert-secondary border-0 rounded-4 p-3 d-flex align-items-center shadow-sm">
          <div class="spinner-border spinner-border-sm me-3 text-primary" role="status"></div>
          <div>
            <strong>Loading Analytics:</strong> Fetching verified submission and evaluation records from backend repository...
          </div>
        </div>
      `;
    }
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
    this.destroyCharts();

    const courseDash = document.getElementById('courseDashboard');
    if (courseDash) {
      courseDash.innerHTML = `
        <div class="alert alert-danger border-0 rounded-4 p-4 text-center shadow-sm" id="analyticsErrorState">
          <i class="bi bi-exclamation-triangle-fill fs-2 text-danger mb-2 d-block"></i>
          <h5 class="fw-bold mb-2">Unable to Retrieve Backend Analytics Data</h5>
          <p class="text-muted mb-3" id="analyticsErrorMessage">${this.escapeHtml(this.state.error || 'A backend communication error occurred.')}</p>
          <button class="btn btn-sm btn-outline-danger px-3 rounded-pill" type="button" id="analyticsRetryBtn">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry Request
          </button>
        </div>
      `;
      const retryBtn = document.getElementById('analyticsRetryBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadData());
      }
    }

    ['totalStudents', 'totalChallenges', 'completedEvaluations', 'pendingEvaluations'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });
    ['averageMarks', 'overallCOAttainment', 'overallPOContribution', 'overallStudentPerformance'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Data unavailable';
    });

    ['academicStats', 'studentStats', 'challengeStats', 'facultyStats', 'outcomeStats'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '<div class="col-12 text-center text-muted py-3"><i class="bi bi-exclamation-circle me-1"></i>Analytics data unavailable due to backend error.</div>';
      }
    });

    const insightsEl = document.getElementById('insightsList');
    if (insightsEl) insightsEl.innerHTML = '<li class="list-group-item text-muted">Analytics unavailable.</li>';

    const recsEl = document.getElementById('recommendationsList');
    if (recsEl) recsEl.innerHTML = '<li class="list-group-item text-muted">Recommendations unavailable.</li>';
  }

  renderEmptyState() {
    this.destroyCharts();

    const courseDash = document.getElementById('courseDashboard');
    if (courseDash) {
      courseDash.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 text-center p-5" id="analyticsEmptyState">
          <i class="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
          <h5 class="fw-bold mb-1">No Submission Records Available</h5>
          <p class="text-muted mb-0">No genuine submissions were found for the current faculty view. Institutional metrics will populate once students submit coursework and evaluations are completed.</p>
        </div>
      `;
    }

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('totalStudents', '0');
    setTxt('totalChallenges', '0');
    setTxt('completedEvaluations', '0');
    setTxt('pendingEvaluations', '0');
    setTxt('averageMarks', 'No records available');
    setTxt('overallCOAttainment', 'Data unavailable');
    setTxt('overallPOContribution', 'Data unavailable');
    setTxt('overallStudentPerformance', 'No records available');

    this.renderStatGrid('academicStats', [
      { label: 'Average Marks', value: 'No records available' },
      { label: 'Median Marks', value: 'No records available' },
      { label: 'Highest Marks', value: 'No records available' },
      { label: 'Lowest Marks', value: 'No records available' },
      { label: 'Pass Percentage', value: 'No records available' },
      { label: 'Challenge Difficulty Index', value: 'Data unavailable' }
    ]);

    this.renderStatGrid('studentStats', [
      { label: 'Top Performing Students', value: 'No evaluated records available' },
      { label: 'Needs Improvement', value: 'No evaluated records available' },
      { label: 'Attendance', value: 'Data unavailable' },
      { label: 'Submission Timeliness', value: 'Data unavailable' },
      { label: 'Attempt Analysis', value: 'No records available' },
      { label: 'Learning Progress', value: 'Data unavailable' }
    ]);

    this.renderStatGrid('challengeStats', [
      { label: 'Most Attempted', value: 'No records available' },
      { label: 'Least Attempted', value: 'No records available' },
      { label: 'Highest Average Score', value: 'No records available' },
      { label: 'Lowest Average Score', value: 'No records available' },
      { label: 'Most Difficult', value: 'No records available' },
      { label: 'Completion Trend', value: 'Data unavailable' }
    ]);

    this.renderStatGrid('facultyStats', [
      { label: 'Evaluations Completed', value: '0' },
      { label: 'Pending Reviews', value: '0' },
      { label: 'Average Evaluation Time', value: 'Data unavailable' },
      { label: 'Marks Distribution', value: '0 reviewed / 0 pending' },
      { label: 'Faculty Activity Timeline', value: 'No evaluation activity recorded' }
    ]);

    this.renderStatGrid('outcomeStats', [
      { label: 'CO Trend', value: 'Data unavailable' },
      { label: 'PO Trend', value: 'Data unavailable' },
      { label: 'PSO Trend', value: 'Data unavailable' },
      { label: 'WK Trend', value: 'Data unavailable' }
    ], 'col-md-3');

    const insightsEl = document.getElementById('insightsList');
    if (insightsEl) insightsEl.innerHTML = '<li class="list-group-item text-muted">No submission records available for academic analysis.</li>';

    const recsEl = document.getElementById('recommendationsList');
    if (recsEl) recsEl.innerHTML = '<li class="list-group-item text-muted">No evaluation records available for academic recommendations.</li>';
  }

  applyFiltersAndRender() {
    const filters = this.getActiveFilters();
    let subs = Array.isArray(this.state.rawSubmissions) ? this.state.rawSubmissions : [];

    // Filter by division
    if (filters.division) {
      const cleanTarget = filters.division.replace(/^Division\s*/i, '').trim().toUpperCase();
      subs = subs.filter((s) => {
        const divCode = this.parseDivision(s);
        return !divCode || divCode === cleanTarget;
      });
    }

    // Filter by challenge
    if (filters.challenge) {
      const targetChallenge = filters.challenge.trim().toUpperCase();
      subs = subs.filter((s) => {
        const code = String(s.challengeId || '').trim().toUpperCase();
        const title = String(s.challenge || s.challengeTitle || '').trim().toUpperCase();
        return code === targetChallenge || title.includes(targetChallenge) || targetChallenge.includes(code);
      });
    }

    this.state.filteredSubmissions = subs;

    if (subs.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Live banner
    const totalCount = subs.length;
    const evaluatedCount = subs.filter(s => s.submissionStatus === 'Evaluated' || (s.facultyScore !== null && s.facultyScore !== undefined && s.facultyScore !== '')).length;
    const pendingCount = totalCount - evaluatedCount;

    const courseDash = document.getElementById('courseDashboard');
    if (courseDash) {
      courseDash.innerHTML = `
        <div class="alert alert-success border-0 rounded-4 p-3 d-flex justify-content-between align-items-center shadow-sm">
          <div class="d-flex align-items-center">
            <i class="bi bi-shield-check fs-4 text-success me-2"></i>
            <div>
              <strong>Authoritative Analytics:</strong> Derived from <strong>${totalCount}</strong> genuine submission record${totalCount === 1 ? '' : 's'} (${evaluatedCount} evaluated, ${pendingCount} pending).
            </div>
          </div>
          <span class="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-2">
            <i class="bi bi-check-circle me-1"></i>Live Backend Records
          </span>
        </div>
      `;
    }

    this.state.metrics = this.buildMetricsFromSubmissions(subs, this.state.backendSummary);
    this.renderDashboard();
    this.renderCharts();
  }

  parseDivision(sub) {
    const raw = String(sub.division || '').trim();
    if (raw) {
      const match = raw.match(/^(?:TE\s*Mechanical\s*[-—–]\s*)?(?:Div(?:ision)?\s*)?([A-Za-z0-9]+)$/i);
      if (match) return match[1].toUpperCase();
    }
    const roll = String(sub.prn || sub.rollNumber || sub.id || '').toUpperCase();
    if (roll.includes('TEA-') || roll.includes('-A') || roll.endsWith('A')) return 'A';
    if (roll.includes('TEB-') || roll.includes('-B') || roll.endsWith('B')) return 'B';
    if (roll.includes('TEC-') || roll.includes('-C') || roll.endsWith('C')) return 'C';
    if (roll.includes('TED-') || roll.includes('-D') || roll.endsWith('D')) return 'D';
    return '';
  }

  getSubmissionScore(sub) {
    const rawScore = (sub.facultyScore !== null && sub.facultyScore !== undefined && sub.facultyScore !== '')
      ? Number(sub.facultyScore)
      : ((sub.systemScore !== null && sub.systemScore !== undefined && sub.systemScore !== '')
        ? Number(sub.systemScore)
        : null);

    if (rawScore === null || isNaN(rawScore)) {
      return null;
    }

    let percentage;
    if (rawScore > 20) {
      percentage = Math.min(100, Math.max(0, rawScore));
    } else {
      // In DES assignments, standard max marks is 12
      percentage = Math.min(100, Math.max(0, (rawScore / 12) * 100));
    }

    return {
      rawScore,
      percentage: Number(percentage.toFixed(1))
    };
  }

  deduplicateSubmissions(submissions = []) {
    const map = new Map();
    submissions.forEach((s) => {
      const studentKey = String(s.prn || s.rollNumber || s.studentName || s.id || '').trim();
      const chKey = String(s.challengeId || s.challenge || '').trim();
      const groupKey = `${studentKey}___${chKey}`;
      const existing = map.get(groupKey);
      if (!existing) {
        map.set(groupKey, s);
      } else {
        const existingAttempt = Number(existing.attempt || 1);
        const currentAttempt = Number(s.attempt || 1);
        const existingTime = new Date(existing.submittedOn || existing.timestamp || 0).getTime();
        const currentTime = new Date(s.submittedOn || s.timestamp || 0).getTime();
        if (currentAttempt > existingAttempt || currentTime > existingTime) {
          map.set(groupKey, s);
        }
      }
    });
    return Array.from(map.values());
  }

  buildMetricsFromSubmissions(submissions = [], backendSummary = null) {
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return this.buildEmptyMetrics();
    }

    const uniqueStudents = new Set(submissions.map(s => s.prn || s.studentName).filter(Boolean));
    const uniqueChallenges = new Set(submissions.map(s => s.challengeId || s.challenge).filter(Boolean));

    const evaluatedSubs = submissions.filter(s => s.submissionStatus === 'Evaluated' || (s.facultyScore !== null && s.facultyScore !== undefined && s.facultyScore !== ''));
    const pendingSubs = submissions.filter(s => s.submissionStatus !== 'Evaluated' && (s.facultyScore === null || s.facultyScore === undefined || s.facultyScore === ''));

    const deduplicatedSubs = this.deduplicateSubmissions(submissions);
    const deduplicatedEvaluated = deduplicatedSubs.filter(s => s.submissionStatus === 'Evaluated' || (s.facultyScore !== null && s.facultyScore !== undefined && s.facultyScore !== ''));

    // Extract score percentages for evaluated records
    const evaluatedScores = deduplicatedEvaluated.map(s => this.getSubmissionScore(s)).filter(Boolean);

    // Summary calculations
    let avgMarks = null;
    let medianMarks = null;
    let highestMarks = null;
    let lowestMarks = null;
    let passPercentage = null;

    if (evaluatedScores.length > 0) {
      const sum = evaluatedScores.reduce((acc, curr) => acc + curr.percentage, 0);
      avgMarks = Number((sum / evaluatedScores.length).toFixed(1));

      const sortedPercentages = evaluatedScores.map(e => e.percentage).sort((a, b) => a - b);
      highestMarks = sortedPercentages[sortedPercentages.length - 1];
      lowestMarks = sortedPercentages[0];

      const mid = Math.floor(sortedPercentages.length / 2);
      medianMarks = (sortedPercentages.length % 2 !== 0)
        ? sortedPercentages[mid]
        : Number(((sortedPercentages[mid - 1] + sortedPercentages[mid]) / 2).toFixed(1));

      const passCount = sortedPercentages.filter(p => p >= 50.0).length;
      passPercentage = Number(((passCount / sortedPercentages.length) * 100).toFixed(1));
    }

    // Challenge difficulty index
    let difficultyIndex = 'Data unavailable';
    if (avgMarks !== null) {
      const diffVal = Number((1 - (avgMarks / 100)).toFixed(2));
      const label = diffVal < 0.3 ? 'Low / Accessible' : (diffVal <= 0.6 ? 'Moderate' : 'High / Challenging');
      difficultyIndex = `${diffVal} (${label})`;
    }

    // Grade distribution
    const gradeDistribution = {
      'A (80%+)': 0,
      'B (70-79%)': 0,
      'C (60-69%)': 0,
      'D (50-59%)': 0,
      'F (<50%)': 0
    };
    evaluatedScores.forEach((e) => {
      const p = e.percentage;
      if (p >= 80.0) gradeDistribution['A (80%+)']++;
      else if (p >= 70.0) gradeDistribution['B (70-79%)']++;
      else if (p >= 60.0) gradeDistribution['C (60-69%)']++;
      else if (p >= 50.0) gradeDistribution['D (50-59%)']++;
      else gradeDistribution['F (<50%)']++;
    });

    // Student performance rankings (genuine evaluated students only)
    const studentMap = new Map();
    deduplicatedEvaluated.forEach((s) => {
      const score = this.getSubmissionScore(s);
      if (!score) return;
      const key = String(s.prn || s.rollNumber || s.studentName || s.id || '').trim();
      const name = s.studentName || key;
      if (!studentMap.has(key)) {
        studentMap.set(key, { name, key, scores: [] });
      }
      studentMap.get(key).scores.push(score.percentage);
    });

    const studentRankings = [];
    studentMap.forEach((entry) => {
      if (entry.scores.length > 0) {
        const studentAvg = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
        studentRankings.push({
          name: entry.name,
          percentage: Number(studentAvg.toFixed(1))
        });
      }
    });
    studentRankings.sort((a, b) => b.percentage - a.percentage);

    let topPerformingStudents = ['No evaluated records available'];
    let studentsNeedingImprovement = ['No evaluated records available'];

    if (studentRankings.length > 0) {
      topPerformingStudents = studentRankings.slice(0, 3).map(s => `${s.name} (${s.percentage}%)`);

      const belowThreshold = studentRankings.filter(s => s.percentage < 60.0);
      if (belowThreshold.length > 0) {
        studentsNeedingImprovement = belowThreshold.slice(-3).reverse().map(s => `${s.name} (${s.percentage}%)`);
      } else if (studentRankings.length >= 2) {
        studentsNeedingImprovement = studentRankings.slice(-2).reverse().map(s => `${s.name} (${s.percentage}%)`);
      } else {
        studentsNeedingImprovement = ['None (all evaluated records \u2265 60%)'];
      }
    }

    // Attempt analysis
    const uniquePairs = new Set(submissions.map(s => `${s.prn || s.studentName}___${s.challengeId || s.challenge}`)).size;
    const avgAttempts = uniquePairs > 0 ? (submissions.length / uniquePairs).toFixed(1) : '0';
    const attemptAnalysis = `${avgAttempts} attempts per challenge`;

    // Challenge analytics & charts
    const challengeMap = new Map();
    submissions.forEach((s) => {
      const key = s.challengeId || s.challenge || 'Assignment';
      const title = s.challenge || s.challengeTitle || key;
      if (!challengeMap.has(key)) {
        challengeMap.set(key, { key, title, total: 0, evaluated: 0, scores: [] });
      }
      const entry = challengeMap.get(key);
      entry.total++;
      const score = this.getSubmissionScore(s);
      if (score) {
        entry.evaluated++;
        entry.scores.push(score.percentage);
      }
    });

    let mostAttempted = 'No records available';
    let leastAttempted = 'No records available';
    let highestAvgScore = 'No evaluated records available';
    let lowestAvgScore = 'No evaluated records available';
    let mostDifficult = 'No evaluated records available';

    let maxAtt = -1, minAtt = Infinity;
    let maxSc = -1, minSc = Infinity;

    const challengeCompletionChart = [];
    const performanceTrendChart = [];

    challengeMap.forEach((entry) => {
      if (entry.total > maxAtt) { maxAtt = entry.total; mostAttempted = `${entry.title} (${entry.total})`; }
      if (entry.total < minAtt) { minAtt = entry.total; leastAttempted = `${entry.title} (${entry.total})`; }

      const rate = entry.total > 0 ? Number(((entry.evaluated / entry.total) * 100).toFixed(1)) : 0;
      challengeCompletionChart.push({ label: entry.key, value: rate });

      if (entry.scores.length > 0) {
        const cAvg = Number((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(1));
        if (cAvg > maxSc) { maxSc = cAvg; highestAvgScore = `${entry.title} (${cAvg}%)`; }
        if (cAvg < minSc) { minSc = cAvg; lowestAvgScore = `${entry.title} (${cAvg}%)`; mostDifficult = entry.title; }
        performanceTrendChart.push({ label: entry.key, value: cAvg });
      }
    });

    // Faculty activity timeline & daily activity chart
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const facultyName = user.facultyName || user.name || 'Faculty';
    const activityTimeline = evaluatedSubs.slice(0, 5).map((s) => {
      const challengeTitle = s.challenge || s.challengeTitle || s.challengeId || 'Assignment';
      const studentName = s.studentName || 'Student';
      return `${facultyName} evaluated ${challengeTitle} (${studentName})`;
    });

    const dayCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let hasAnyDayActivity = false;

    evaluatedSubs.forEach((s) => {
      const dateVal = s.submittedOn || s.timestamp;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const name = dayNames[d.getDay()];
          dayCounts[name] = (dayCounts[name] || 0) + 1;
          hasAnyDayActivity = true;
        }
      }
    });

    const facultyActivityChart = hasAnyDayActivity
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ label: day, value: dayCounts[day] }))
      : [];

    // Data-driven insights & recommendations
    const insights = [];
    const recommendations = [];

    if (evaluatedScores.length > 0 && maxSc >= 0) {
      insights.push(`${highestAvgScore.split(' (')[0]} demonstrates the highest average attainment at ${maxSc}%.`);
      if (minSc <= 100 && minSc !== maxSc) {
        insights.push(`${lowestAvgScore.split(' (')[0]} has the lowest average score at ${minSc}%, indicating an area for remedial instruction.`);
        recommendations.push(`Schedule problem-solving tutorials for ${lowestAvgScore.split(' (')[0]} to reinforce difficult concepts.`);
      }
      if (pendingSubs.length > 0) {
        recommendations.push(`Complete evaluation for ${pendingSubs.length} pending submission(s) to finalize cohort academic attainment records.`);
      }
    } else if (submissions.length > 0) {
      insights.push(`${submissions.length} submission(s) recorded awaiting evaluation.`);
      recommendations.push(`Complete evaluations for pending submissions to compute attainment statistics.`);
    }

    return {
      totalStudents: uniqueStudents.size,
      totalChallenges: uniqueChallenges.size,
      completedEvaluations: evaluatedSubs.length,
      pendingEvaluations: pendingSubs.length,
      averageMarks: avgMarks,
      overallCOAttainment: backendSummary?.summary?.overallCOAttainment ?? null,
      overallPOContribution: backendSummary?.summary?.overallPOContribution ?? null,
      overallStudentPerformance: avgMarks,
      academicPerformance: {
        averageMarks: avgMarks,
        medianMarks: medianMarks,
        highestMarks: highestMarks,
        lowestMarks: lowestMarks,
        passPercentage: passPercentage,
        gradeDistribution: gradeDistribution,
        challengeDifficultyIndex: difficultyIndex
      },
      studentPerformance: {
        topPerformingStudents,
        studentsNeedingImprovement,
        attendance: null, // Honest state: not tracked in backend schema
        submissionTimeliness: null, // Honest state: assignment deadline not in submission schema
        attemptAnalysis,
        learningProgress: null // Honest state: term-long longitudinal progress not tracked in schema
      },
      challengeAnalytics: {
        mostAttempted,
        leastAttempted,
        highestAverageScore: highestAvgScore,
        lowestAverageScore: lowestAvgScore,
        mostDifficult,
        completionTrend: 'Data unavailable'
      },
      facultyAnalytics: {
        evaluationsCompleted: evaluatedSubs.length,
        pendingReviews: pendingSubs.length,
        averageEvaluationTime: 'Data unavailable', // Evaluation duration is not tracked in backend schema
        marksDistribution: { reviewed: evaluatedSubs.length, pending: pendingSubs.length },
        activityTimeline: activityTimeline.length > 0 ? activityTimeline : ['No evaluation activity recorded']
      },
      outcomeAnalytics: {
        coTrend: backendSummary?.outcomeAnalytics?.coTrend || [],
        poTrend: backendSummary?.outcomeAnalytics?.poTrend || [],
        psoTrend: backendSummary?.outcomeAnalytics?.psoTrend || [],
        wkTrend: backendSummary?.outcomeAnalytics?.wkTrend || [],
        heatmap: backendSummary?.outcomeAnalytics?.heatmap || []
      },
      charts: {
        gradeDistribution: evaluatedScores.length > 0 ? gradeDistribution : {},
        performanceTrend: performanceTrendChart,
        challengeCompletion: challengeCompletionChart,
        facultyActivity: facultyActivityChart,
        outcomeTrend: backendSummary?.charts?.outcomeTrend || [],
        heatmap: backendSummary?.charts?.heatmap || []
      },
      insights: insights.length > 0 ? insights : ['No submission records available for academic analysis.'],
      recommendations: recommendations.length > 0 ? recommendations : ['No evaluation records available for academic recommendations.']
    };
  }

  buildEmptyMetrics() {
    return {
      totalStudents: 0,
      totalChallenges: 0,
      completedEvaluations: 0,
      pendingEvaluations: 0,
      averageMarks: null,
      overallCOAttainment: null,
      overallPOContribution: null,
      overallStudentPerformance: null,
      academicPerformance: {
        averageMarks: null,
        medianMarks: null,
        highestMarks: null,
        lowestMarks: null,
        passPercentage: null,
        gradeDistribution: {},
        challengeDifficultyIndex: 'Data unavailable'
      },
      studentPerformance: {
        topPerformingStudents: ['No evaluated records available'],
        studentsNeedingImprovement: ['No evaluated records available'],
        attendance: null,
        submissionTimeliness: null,
        attemptAnalysis: 'No records available',
        learningProgress: null
      },
      challengeAnalytics: {
        mostAttempted: 'No records available',
        leastAttempted: 'No records available',
        highestAverageScore: 'No records available',
        lowestAverageScore: 'No records available',
        mostDifficult: 'No records available',
        completionTrend: 'Data unavailable'
      },
      facultyAnalytics: {
        evaluationsCompleted: 0,
        pendingReviews: 0,
        averageEvaluationTime: 'Data unavailable',
        marksDistribution: { reviewed: 0, pending: 0 },
        activityTimeline: ['No evaluation activity recorded']
      },
      outcomeAnalytics: {
        coTrend: [],
        poTrend: [],
        psoTrend: [],
        wkTrend: [],
        heatmap: []
      },
      charts: {
        gradeDistribution: {},
        performanceTrend: [],
        challengeCompletion: [],
        facultyActivity: [],
        outcomeTrend: [],
        heatmap: []
      },
      insights: ['No submission records available for academic analysis.'],
      recommendations: ['No evaluation records available for academic recommendations.']
    };
  }

  // Backward compatibility alias for legacy callers
  buildMetricsFromRepository(data = {}) {
    if (data && Array.isArray(data.submissions)) {
      return this.buildMetricsFromSubmissions(data.submissions, data.summary);
    }
    if (Array.isArray(data)) {
      return this.buildMetricsFromSubmissions(data, null);
    }
    return this.buildEmptyMetrics();
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
    setTxt('averageMarks', this.percent(metrics.averageMarks, 'No records available'));
    setTxt('overallCOAttainment', this.percent(metrics.overallCOAttainment, 'Data unavailable'));
    setTxt('overallPOContribution', this.percent(metrics.overallPOContribution, 'Data unavailable'));
    setTxt('overallStudentPerformance', this.percent(metrics.overallStudentPerformance, 'Data unavailable'));

    this.renderStatGrid('academicStats', [
      { label: 'Average Marks', value: this.percent(metrics.academicPerformance.averageMarks, 'No records available') },
      { label: 'Median Marks', value: this.percent(metrics.academicPerformance.medianMarks, 'No records available') },
      { label: 'Highest Marks', value: this.percent(metrics.academicPerformance.highestMarks, 'No records available') },
      { label: 'Lowest Marks', value: this.percent(metrics.academicPerformance.lowestMarks, 'No records available') },
      { label: 'Pass Percentage', value: this.percent(metrics.academicPerformance.passPercentage, 'No records available') },
      { label: 'Challenge Difficulty Index', value: this.metric(metrics.academicPerformance.challengeDifficultyIndex, 'Data unavailable') }
    ]);

    this.renderStatGrid('studentStats', [
      { label: 'Top Performing Students', value: this.joinList(metrics.studentPerformance.topPerformingStudents, ', ', 'No evaluated records available') },
      { label: 'Needs Improvement', value: this.joinList(metrics.studentPerformance.studentsNeedingImprovement, ', ', 'No evaluated records available') },
      { label: 'Attendance', value: this.percent(metrics.studentPerformance.attendance, 'Data unavailable') },
      { label: 'Submission Timeliness', value: this.percent(metrics.studentPerformance.submissionTimeliness, 'Data unavailable') },
      { label: 'Attempt Analysis', value: this.metric(metrics.studentPerformance.attemptAnalysis, 'No records available') },
      { label: 'Learning Progress', value: this.metric(metrics.studentPerformance.learningProgress, 'Data unavailable') }
    ]);

    this.renderStatGrid('challengeStats', [
      { label: 'Most Attempted', value: this.metric(metrics.challengeAnalytics.mostAttempted, 'No records available') },
      { label: 'Least Attempted', value: this.metric(metrics.challengeAnalytics.leastAttempted, 'No records available') },
      { label: 'Highest Average Score', value: this.metric(metrics.challengeAnalytics.highestAverageScore, 'No records available') },
      { label: 'Lowest Average Score', value: this.metric(metrics.challengeAnalytics.lowestAverageScore, 'No records available') },
      { label: 'Most Difficult', value: this.metric(metrics.challengeAnalytics.mostDifficult, 'No records available') },
      { label: 'Completion Trend', value: this.metric(metrics.challengeAnalytics.completionTrend, 'Data unavailable') }
    ]);

    this.renderStatGrid('facultyStats', [
      { label: 'Evaluations Completed', value: String(metrics.facultyAnalytics.evaluationsCompleted ?? 0) },
      { label: 'Pending Reviews', value: String(metrics.facultyAnalytics.pendingReviews ?? 0) },
      { label: 'Average Evaluation Time', value: this.metric(metrics.facultyAnalytics.averageEvaluationTime, 'Data unavailable') },
      { label: 'Marks Distribution', value: this.marksDistribution(metrics.facultyAnalytics.marksDistribution) },
      { label: 'Faculty Activity Timeline', value: this.joinList(metrics.facultyAnalytics.activityTimeline, '; ', 'No evaluation activity recorded') }
    ]);

    this.renderStatGrid('outcomeStats', [
      { label: 'CO Trend', value: this.joinList(metrics.outcomeAnalytics.coTrend, ' -> ', 'Data unavailable') },
      { label: 'PO Trend', value: this.joinList(metrics.outcomeAnalytics.poTrend?.slice(0, 6), ' -> ', 'Data unavailable') },
      { label: 'PSO Trend', value: this.joinList(metrics.outcomeAnalytics.psoTrend, ' -> ', 'Data unavailable') },
      { label: 'WK Trend', value: this.joinList(metrics.outcomeAnalytics.wkTrend, ' -> ', 'Data unavailable') }
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

    const m = this.state.metrics;

    // Grade distribution: doughnut chart only if there is at least one non-zero count
    const gradeObj = m.academicPerformance?.gradeDistribution || {};
    const gradeHasData = Object.values(gradeObj).some(val => Number(val) > 0);
    if (gradeHasData) {
      this.renderChart('gradeDistributionChart', 'doughnut', this.chartFromObject(gradeObj), 'Grades');
    }

    // Performance trend: line chart only if genuine points exist
    if (Array.isArray(m.charts?.performanceTrend) && m.charts.performanceTrend.length > 0) {
      this.renderChart('performanceTrendChart', 'line', this.chartFromArray(m.charts.performanceTrend), 'Performance Trend %');
    }

    // Challenge completion: bar chart only if genuine points exist
    if (Array.isArray(m.charts?.challengeCompletion) && m.charts.challengeCompletion.length > 0) {
      this.renderChart('challengeCompletionChart', 'bar', this.chartFromArray(m.charts.challengeCompletion), 'Completion Rate %');
    }

    // Faculty activity: bar chart only if genuine daily counts exist
    if (Array.isArray(m.charts?.facultyActivity) && m.charts.facultyActivity.length > 0) {
      this.renderChart('facultyActivityChart', 'bar', this.chartFromArray(m.charts.facultyActivity), 'Evaluations / Day');
    }

    // Outcome trend
    if (Array.isArray(m.charts?.outcomeTrend) && m.charts.outcomeTrend.length > 0) {
      this.renderChart('outcomeTrendChart', 'line', this.chartFromArray(m.charts.outcomeTrend), 'Outcome Trend %');
    }

    // Heatmap
    if (Array.isArray(m.charts?.heatmap) && m.charts.heatmap.length > 0) {
      this.renderChart('heatmapChart', 'bar', this.chartFromArray(m.charts.heatmap), 'Outcome Heatmap %');
    }
  }

  renderChart(id, type, chartData, label) {
    const ctx = document.getElementById(id);
    if (!ctx || !chartData.values || !chartData.values.length) {
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
    csvContent += `Total Students,${this.metric(m.totalStudents)}\n`;
    csvContent += `Total Challenges,${this.metric(m.totalChallenges)}\n`;
    csvContent += `Completed Evaluations,${this.metric(m.completedEvaluations)}\n`;
    csvContent += `Pending Evaluations,${this.metric(m.pendingEvaluations)}\n`;
    csvContent += `Average Marks,${this.percent(m.averageMarks, 'No records available')}\n`;
    csvContent += `Overall CO Attainment,${this.percent(m.overallCOAttainment, 'Data unavailable')}\n`;
    csvContent += `Overall PO Contribution,${this.percent(m.overallPOContribution, 'Data unavailable')}\n`;
    csvContent += `Overall Student Performance,${this.percent(m.overallStudentPerformance, 'Data unavailable')}\n\n`;

    csvContent += `Academic Performance Metric,Value\n`;
    csvContent += `Average Marks,${this.percent(m.academicPerformance.averageMarks, 'No records available')}\n`;
    csvContent += `Median Marks,${this.percent(m.academicPerformance.medianMarks, 'No records available')}\n`;
    csvContent += `Highest Marks,${this.percent(m.academicPerformance.highestMarks, 'No records available')}\n`;
    csvContent += `Lowest Marks,${this.percent(m.academicPerformance.lowestMarks, 'No records available')}\n`;
    csvContent += `Pass Percentage,${this.percent(m.academicPerformance.passPercentage, 'No records available')}\n`;
    csvContent += `Challenge Difficulty Index,${this.metric(m.academicPerformance.challengeDifficultyIndex, 'Data unavailable')}\n\n`;

    csvContent += `Student Performance Metric,Value\n`;
    csvContent += `Top Performing Students,"${this.joinList(m.studentPerformance.topPerformingStudents, ', ', 'No evaluated records available')}"\n`;
    csvContent += `Needs Improvement,"${this.joinList(m.studentPerformance.studentsNeedingImprovement, ', ', 'No evaluated records available')}"\n`;
    csvContent += `Attendance,${this.percent(m.studentPerformance.attendance, 'Data unavailable')}\n`;
    csvContent += `Submission Timeliness,${this.percent(m.studentPerformance.submissionTimeliness, 'Data unavailable')}\n`;
    csvContent += `Attempt Analysis,${this.metric(m.studentPerformance.attemptAnalysis, 'No records available')}\n`;
    csvContent += `Learning Progress,${this.metric(m.studentPerformance.learningProgress, 'Data unavailable')}\n\n`;

    csvContent += `Challenge Analytics,Value\n`;
    csvContent += `Most Attempted,${this.metric(m.challengeAnalytics.mostAttempted, 'No records available')}\n`;
    csvContent += `Least Attempted,${this.metric(m.challengeAnalytics.leastAttempted, 'No records available')}\n`;
    csvContent += `Highest Average Score,${this.metric(m.challengeAnalytics.highestAverageScore, 'No records available')}\n`;
    csvContent += `Lowest Average Score,${this.metric(m.challengeAnalytics.lowestAverageScore, 'No records available')}\n`;
    csvContent += `Most Difficult,${this.metric(m.challengeAnalytics.mostDifficult, 'No records available')}\n`;

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

  metric(value, fallback = 'Data unavailable') {
    if (value === null || value === undefined || value === '' || value === 'Data unavailable' || value === 'No records available' || value === 'Unavailable') {
      return fallback;
    }
    return String(value);
  }

  percent(value, fallback = 'Data unavailable') {
    if (value === null || value === undefined || value === '' || value === 'Data unavailable' || value === 'No records available' || value === 'Unavailable') {
      return fallback;
    }
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : String(value);
  }

  list(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  joinList(value, separator = ', ', fallback = 'Data unavailable') {
    if (!value) return fallback;
    const arr = Array.isArray(value) ? value : [value];
    const filtered = arr.filter(item => item !== null && item !== undefined && item !== '');
    return filtered.length > 0 ? filtered.join(separator) : fallback;
  }

  marksDistribution(value = {}) {
    const reviewed = value.reviewed ?? value.evaluated;
    const pending = value.pending;
    if (reviewed === undefined && pending === undefined) {
      return 'No records available';
    }
    return `${reviewed ?? 0} reviewed / ${pending ?? 0} pending`;
  }

  renderList(items) {
    if (!items || !items.length) {
      return '<li class="list-group-item text-muted">No records available</li>';
    }
    return items.map((item) => `<li class="list-group-item">${this.escapeHtml(item)}</li>`).join('');
  }

  showToast(message, isError = false) {
    if (typeof document === 'undefined') return;
    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show shadow-lg`;
    toast.style.zIndex = '9999';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body fw-bold">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
      window.setTimeout(() => toast.remove(), 3000);
    }
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsEngine().init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalyticsEngine };
}
