(function (global) {
  const config = global.DESConfig || {};
  const cacheStore = global.DESCache ? global.DESCache.createStore(config.cacheExpiryMs) : null;
  const logger = global.DESLogger ? global.DESLogger('Repository', config) : console;

  class Repository {
    constructor() {
      this.cache = cacheStore;
      this.logger = logger;
    }

    async getSubmissions() {
      return this.cached('submissions', async () => {
        const response = await this.request('submissions');
        if (!this.hasListPayload(response, 'submissions')) {
          throw new Error('The configured Apps Script endpoint did not return a submissions list. Deploy a faculty read API or update DESConfig.apiBaseUrl.');
        }
        return this.extractList(response, 'submissions')
          .map((row) => this.normalizeSubmission(row))
          .filter((submission) => !this.isBlankSubmission(submission));
      });
    }

    async getSubmission(id) {
      const submissionId = String(id || '').trim();
      if (!submissionId) {
        return null;
      }

      return this.cached(`submission:${submissionId}`, async () => {
        const response = await this.request('submission', { submissionId });
        const detail = this.extractDetail(response);
        const summary = await this.findSubmissionSummary(submissionId);
        return this.normalizeSubmission(detail || summary || {}, summary || null);
      });
    }

    async getAnalytics() {
      return this.cached('analytics', async () => {
        const response = await this.request('analytics');
        if (!this.hasAnalyticsPayload(response)) {
          throw new Error('The configured Apps Script endpoint did not return analytics data. Deploy a faculty read API or update DESConfig.apiBaseUrl.');
        }
        return this.normalizeAnalytics(response);
      });
    }

    async getDashboard() {
      const analytics = await this.getAnalytics();
      const submissions = await this.getSubmissions().catch(() => []);
      const uniqueChallenges = new Set(submissions.map((item) => item.challenge).filter(Boolean));
      const evaluated = submissions.filter((item) => item.submissionStatus === 'Evaluated');
      const pending = submissions.filter((item) => item.submissionStatus !== 'Evaluated');
      const averageMarks = this.numberOrNull(analytics.summary.averageMarks);
      const coAttainment = this.numberOrNull(analytics.summary.coAttainment || analytics.summary.overallCOAttainment);

      return {
        activeChallenges: analytics.summary.activeChallenges ?? uniqueChallenges.size,
        studentSubmissions: analytics.summary.studentSubmissions ?? submissions.length,
        pendingEvaluations: analytics.summary.pendingEvaluations ?? pending.length,
        completedEvaluations: analytics.summary.completedEvaluations ?? evaluated.length,
        averageMarks,
        coAttainment,
        recentSubmissions: submissions.slice(0, 5).map((item) => ({
          id: item.id,
          studentName: item.studentName,
          challenge: item.challenge,
          status: item.submissionStatus
        })),
        insights: analytics.insights || []
      };
    }

    async saveEvaluation(payload) {
      const response = await this.request('saveEvaluation', payload, 'POST');
      this.cache?.clear?.();
      return response;
    }

    async updateEvaluation(payload) {
      return this.request('updateEvaluation', payload, 'POST');
    }

    async getChallenges() {
      const submissions = await this.getSubmissions();
      const challenges = new Map();
      submissions.forEach((submission) => {
        if (!submission.challenge) {
          return;
        }
        challenges.set(submission.challenge, new ChallengeModel({
          id: submission.challengeId || submission.challenge,
          code: submission.challengeId || '',
          title: submission.challenge
        }));
      });
      return Array.from(challenges.values());
    }

    async getChallenge(id) {
      const challenges = await this.getChallenges();
      return challenges.find((challenge) => String(challenge.id) === String(id) || String(challenge.code) === String(id)) || null;
    }

    async getOutcomeSummary() {
      const analytics = await this.getAnalytics();
      return analytics.outcomes || [];
    }

    async getOutcomeData() {
      return this.getOutcomeSummary();
    }

    async getReports() {
      return [];
    }

    async getStudents() {
      const submissions = await this.getSubmissions();
      const students = new Map();
      submissions.forEach((submission) => {
        const key = submission.prn || submission.studentName;
        if (!key) {
          return;
        }
        students.set(key, new StudentModel({
          id: key,
          name: submission.studentName,
          prn: submission.prn,
          branch: submission.branch,
          division: submission.division,
          email: submission.email
        }));
      });
      return Array.from(students.values());
    }

    async getFaculty() {
      return [];
    }

    async getActivities() {
      const submissions = await this.getSubmissions();
      return submissions.flatMap((submission) => submission.activities || []);
    }

    async getRubrics() {
      return [];
    }

    async getSettings() {
      return {};
    }

    async cached(key, loader) {
      if (config.enableCache !== false && this.cache) {
        const cached = this.cache.get(key);
        if (cached) {
          return cached;
        }
      }

      const value = await loader();
      if (config.enableCache !== false && this.cache) {
        this.cache.set(key, value);
      }
      return value;
    }

    async findSubmissionSummary(id) {
      const submissions = await this.getSubmissions().catch(() => []);
      return submissions.find((item) => String(item.id) === String(id)) || null;
    }

    async request(action, payload = {}, method = 'POST') {
      const endpoint = this.configuredEndpoint(action);
      const url = this.buildUrl(action, method === 'GET' ? payload : {});
      const options = {
        method,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: this.createAbortSignal(config.timeout)
      };

      if (method !== 'GET') {
        options.body = JSON.stringify({ action: endpoint, ...payload });
      }

      let lastError = null;
      for (let attempt = 0; attempt <= (config.retryCount || 0); attempt += 1) {
        try {
          const response = await fetch(url, options);
          const data = await this.parseResponse(response);
          this.validateResponse(data, action);
          return data;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Apps Script request failed for ${action}`, error.message);
          if (attempt < (config.retryCount || 0)) {
            await this.delay((config.retryDelay || 0) * (attempt + 1));
          }
        }
      }

      throw lastError || new Error('Google Sheets request failed.');
    }

    buildUrl(action, params = {}) {
      const url = new URL(config.apiBaseUrl);
      url.searchParams.set('action', this.configuredEndpoint(action));
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
      return url.toString();
    }

    configuredEndpoint(name) {
      return config.endpoints?.[name === 'submissions' ? 'getSubmissions' : name === 'submission' ? 'getSubmission' : name === 'analytics' ? 'getAnalytics' : name] || name;
    }

    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Google Sheets request failed with status ${response.status}`);
      }
      const text = await response.text();
      if (!text) {
        return {};
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON response from Google Sheets.');
      }
    }

    validateResponse(data, action = '') {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid Google Sheets response payload.');
      }
      if (data.error || data.ok === false || data.success === false) {
        const message = data.error || data.message || 'Google Sheets API returned an error.';
        const readActions = new Set(['submissions', 'submission', 'analytics']);
        if (readActions.has(action) && /duplicate submission/i.test(message)) {
          throw new Error('The Apps Script deployment is still using the student submission handler. Redeploy the backend files in the Google Script folder, then reload this page.');
        }
        throw new Error(message);
      }
    }

    extractList(response, key) {
      if (Array.isArray(response)) {
        return response;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response[key])) {
        return response[key];
      }
      if (Array.isArray(response.records)) {
        return response.records;
      }
      if (Array.isArray(response.rows)) {
        return response.rows;
      }
      if (Array.isArray(response.items)) {
        return response.items;
      }
      return [];
    }

    hasListPayload(response, key) {
      return Array.isArray(response)
        || Array.isArray(response?.data)
        || Array.isArray(response?.[key])
        || Array.isArray(response?.records)
        || Array.isArray(response?.rows)
        || Array.isArray(response?.items);
    }

    hasAnalyticsPayload(response = {}) {
      const source = response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : response;
      return Boolean(
        source.summary
        || source.metrics
        || source.academicPerformance
        || source.studentPerformance
        || source.challengeAnalytics
        || source.facultyAnalytics
        || source.totalSubmissions !== undefined
        || source.evaluatedSubmissions !== undefined
        || source.pendingEvaluations !== undefined
        || Array.isArray(source.challengeWise)
        || Array.isArray(source.facultyWise)
        || source.outcomeAnalytics
        || source.charts
        || source['Total submissions'] !== undefined
        || source['Pending evaluations'] !== undefined
        || source['Completed evaluations'] !== undefined
        || source['Challenge-wise count']
        || source['Student statistics']
        || Array.isArray(source.insights)
        || Array.isArray(source.recommendations)
      );
    }

    extractDetail(response) {
      if (response.payload && typeof response.payload === 'object') {
        return response.payload;
      }
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        return response.data;
      }
      if (response.submission && typeof response.submission === 'object') {
        return response.submission;
      }
      return response;
    }

    normalizeSubmission(raw = {}, summary = null) {
      const row = raw instanceof SubmissionModel ? raw : { ...raw };
      const fallback = summary instanceof SubmissionModel ? summary : null;
      const payload = this.parsePayload(row) || this.parsePayload(summary) || this.payloadFromDetail(row);
      const student = payload.studentInformation || {};
      const challenge = payload.challengeMetadata || {};
      const submission = payload.submission || {};
      const submissionData = payload.submissionData || {};
      const submittedAt = this.first(row, ['Timestamp', 'Submitted At', 'submittedAt', 'timestamp']) || submission.submittedAt || fallback?.submittedOn || '';
      const challengeId = this.first(row, ['Challenge ID', 'challengeId']) || challenge.id || challenge.code || fallback?.challengeId || '';
      const challengeTitle = this.first(row, ['Challenge Title', 'challengeTitle']) || challenge.title || fallback?.challenge || '';
      const id = this.first(row, ['Submission ID', 'submissionId', 'id']) || submission.submissionId || fallback?.id || '';
      const status = this.first(row, ['Status', 'submissionStatus', 'status']) || submission.status || fallback?.submissionStatus || 'Submitted';
      const completion = this.first(row, ['Completion %', 'completionPercent', 'completion']) ?? submissionData.completionPercent ?? fallback?.completionPercent ?? null;

      const normalized = new SubmissionModel({
        id,
        studentName: this.first(row, ['Student Name', 'studentName']) || student.name || student.student1 || student.groupName || fallback?.studentName || '',
        prn: this.first(row, ['Roll Number', 'PRN', 'prn', 'rollNumber']) || student.rollNumber || student.prn || fallback?.prn || '',
        branch: this.first(row, ['Branch', 'Department', 'Programme', 'branch']) || student.branch || student.department || fallback?.branch || '',
        division: this.first(row, ['Division', 'division']) || student.division || fallback?.division || '',
        challenge: challengeTitle || challengeId,
        attempt: Number(this.first(row, ['Attempt Number', 'attemptNumber', 'attempt']) || submission.attemptNumber || fallback?.attempt || 1),
        submittedOn: this.formatDate(submittedAt || fallback?.submittedOn || ''),
        submissionStatus: this.titleStatus(status),
        systemScore: this.numberOrNull(this.first(row, ['System Score', 'systemScore']) ?? fallback?.systemScore),
        facultyScore: this.numberOrNull(this.first(row, ['Faculty Score', 'facultyScore', 'Marks', 'marks', 'totalMarks']) ?? fallback?.facultyScore),
        timeTaken: this.first(row, ['Time Taken', 'timeTaken']) || fallback?.timeTaken || '',
        activities: this.extractActivities(payload, row, fallback)
      });

      normalized.challengeId = challengeId;
      normalized.completionPercent = this.numberOrNull(completion);
      normalized.email = this.first(row, ['Email', 'email']) || student.email || fallback?.email || '';
      normalized.submissionHash = this.first(row, ['Submission Hash', 'submissionHash']) || submission.submissionHash || '';
      normalized.rawPayload = payload;
      normalized.rawRow = row;
      return normalized;
    }

    isBlankSubmission(submission = {}) {
      return ![
        submission.id,
        submission.studentName,
        submission.prn,
        submission.challengeId,
        submission.challenge
      ].some((value) => String(value || '').trim());
    }

    parsePayload(row = {}) {
      if (!row) {
        return null;
      }
      if (row.rawPayload && typeof row.rawPayload === 'object' && Object.keys(row.rawPayload).length > 0) {
        return row.rawPayload;
      }
      if (row.JSONPayload && typeof row.JSONPayload === 'object' && Object.keys(row.JSONPayload).length > 0) {
        return row.JSONPayload;
      }
      const rawPayload = this.first(row, ['Full JSON Payload', 'JSON Payload', 'JSONPayload', 'jsonPayload', 'payload']);
      if (!rawPayload) {
        return null;
      }
      if (typeof rawPayload === 'object') {
        return rawPayload;
      }
      try {
        return JSON.parse(rawPayload);
      } catch (error) {
        this.logger.warn('Invalid JSON Payload column', error.message);
        return {
          submissionData: {
            activityResponses: [{
              id: 'payload-parse-error',
              name: 'JSON Payload',
              response: 'Submission payload could not be parsed.',
              maxMarks: 0,
              systemSuggestedMarks: 0
            }]
          }
        };
      }
    }

    payloadFromDetail(detail = {}) {
      if (detail.studentInformation || detail.challengeMetadata || detail.submissionData || detail.submission) {
        return detail;
      }
      return {};
    }

    extractActivities(payload = {}, row = {}, fallback = null) {
      const activityResponses = payload.submissionData?.activityResponses;
      if (Array.isArray(activityResponses) && activityResponses.length) {
        return activityResponses.map((activity, index) => ({
          id: activity.id || activity.activityId || `activity-${index + 1}`,
          name: activity.title || activity.name || activity.activityTitle || activity.activityId || `Activity ${index + 1}`,
          response: this.summarizeResponse(activity.response ?? activity.studentResponse ?? activity.answers ?? activity),
          maxMarks: Number(activity.maxMarks ?? activity.marks ?? activity.cceMarks ?? 0),
          category: activity.category || activity.component || activity.status || 'Activity',
          systemSuggestedMarks: Number(activity.systemSuggestedMarks ?? activity.suggestedMarks ?? 0)
        }));
      }
      if (Array.isArray(row.activities) && row.activities.length) {
        return row.activities;
      }
      if (fallback?.activities?.length) {
        return fallback.activities;
      }
      return [];
    }

    normalizeAnalytics(response = {}) {
      const source = response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : response;
      const summary = source.summary || source.metrics || source;
      const challengeCounts = this.cleanLabeledObject(source['Challenge-wise count'] || source.challengeWiseCount || {});
      const studentStatistics = this.cleanLabeledObject(source['Student statistics'] || source.studentStatistics || {});
      const directChallengeWise = Array.isArray(source.challengeWise) ? source.challengeWise : [];
      const directFacultyWise = Array.isArray(source.facultyWise) ? source.facultyWise : [];
      const compactSubmissionCount = this.sumObjectValues(challengeCounts);
      const compactCompleted = this.clampCount(summary['Completed evaluations'], compactSubmissionCount);
      const compactPending = this.clampCount(summary['Pending evaluations'], compactSubmissionCount);
      return {
        summary: {
          totalStudents: this.numberOrNull(summary.totalStudents ?? summary.students ?? Object.keys(studentStatistics).length),
          totalChallenges: this.numberOrNull(summary.totalChallenges ?? summary.challenges ?? (directChallengeWise.length || Object.keys(challengeCounts).length)),
          completedEvaluations: this.numberOrNull(summary.completedEvaluations ?? summary.evaluatedSubmissions ?? summary.evaluated ?? compactCompleted),
          pendingEvaluations: this.numberOrNull(summary.pendingEvaluations ?? summary.pending ?? compactPending),
          averageMarks: this.numberOrNull(summary.averageMarks ?? summary.avgMarks ?? summary['Average completion']),
          averagePercentage: this.numberOrNull(summary.averagePercentage),
          completionRate: this.numberOrNull(summary.completionRate),
          overallCOAttainment: this.numberOrNull(summary.overallCOAttainment ?? summary.coAttainment),
          overallPOContribution: this.numberOrNull(summary.overallPOContribution ?? summary.poContribution),
          overallStudentPerformance: this.numberOrNull(summary.overallStudentPerformance ?? summary.studentPerformance),
          activeChallenges: this.numberOrNull(summary.activeChallenges),
          studentSubmissions: this.numberOrNull(summary.studentSubmissions ?? summary.totalSubmissions ?? (compactSubmissionCount || summary['Total submissions'])),
          coAttainment: this.numberOrNull(summary.coAttainment)
        },
        academicPerformance: source.academicPerformance || source.academic || {},
        studentPerformance: source.studentPerformance || source.students || {},
        challengeAnalytics: source.challengeAnalytics || source.challenges || {
          mostAttempted: this.topObjectKey(challengeCounts),
          leastAttempted: this.bottomObjectKey(challengeCounts),
          challengeWise: directChallengeWise
        },
        facultyAnalytics: source.facultyAnalytics || source.faculty || { facultyWise: directFacultyWise },
        outcomeAnalytics: source.outcomeAnalytics || source.outcomes || {},
        charts: {
          ...(source.charts || {}),
          challengeCompletion: directChallengeWise.length
            ? directChallengeWise.map((item) => ({
              label: item.challengeTitle || item.challengeId || 'Challenge',
              value: this.numberOrNull(item.completionRate) || 0
            }))
            : this.objectToChartItems(challengeCounts)
        },
        insights: this.arrayOfText(source.insights),
        recommendations: this.arrayOfText(source.recommendations),
        outcomes: Array.isArray(source.outcomes) ? source.outcomes : []
      };
    }

    summarizeResponse(value) {
      if (value === undefined || value === null || value === '') {
        return 'No response recorded.';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map((item) => this.summarizeResponse(item)).join('; ');
      }
      if (typeof value === 'object') {
        if (value.studentAnswer) {
          return value.studentAnswer;
        }
        if (value.text) {
          return value.text;
        }
        if (value.justification) {
          return value.justification;
        }
        if (value.answers && typeof value.answers === 'object') {
          return Object.entries(value.answers).map(([key, answer]) => `${key}: ${answer}`).join('; ');
        }
        if (Array.isArray(value.componentResponses)) {
          return value.componentResponses.map((item) => `${item.componentNumber}: ${item.studentAnswer || ''}`).join('; ');
        }
        return JSON.stringify(value);
      }
      return String(value);
    }

    first(source = {}, keys = []) {
      if (!source) {
        return '';
      }
      for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
          return source[key];
        }
      }
      const normalized = Object.entries(source).reduce((result, [key, value]) => {
        result[this.normalizeKey(key)] = value;
        return result;
      }, {});
      for (const key of keys) {
        const value = normalized[this.normalizeKey(key)];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return '';
    }

    normalizeKey(key) {
      return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    formatDate(value) {
      if (!value) {
        return '';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }
      return date.toISOString().slice(0, 10);
    }

    titleStatus(value) {
      const text = String(value || 'Submitted').trim();
      if (!text) {
        return 'Submitted';
      }
      return text.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    numberOrNull(value) {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const number = Number(String(value).replace('%', ''));
      return Number.isFinite(number) ? number : null;
    }

    arrayOfText(value) {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value.map((item) => String(item));
      }
      return [String(value)];
    }

    objectToChartItems(value = {}) {
      return Object.entries(value || {})
        .filter(([label]) => label)
        .map(([label, count]) => ({ label, value: this.numberOrNull(count) || 0 }));
    }

    cleanLabeledObject(value = {}) {
      return Object.entries(value || {}).reduce((result, [label, entryValue]) => {
        const key = String(label || '').trim();
        if (key && key !== '()') {
          result[key] = entryValue;
        }
        return result;
      }, {});
    }

    sumObjectValues(value = {}) {
      return Object.values(value || {}).reduce((total, entryValue) => total + (this.numberOrNull(entryValue) || 0), 0);
    }

    clampCount(value, maximum) {
      const count = this.numberOrNull(value);
      if (count === null || !maximum) {
        return count;
      }
      return Math.min(count, maximum);
    }

    topObjectKey(value = {}) {
      return this.objectExtremeKey(value, (current, candidate) => candidate > current);
    }

    bottomObjectKey(value = {}) {
      return this.objectExtremeKey(value, (current, candidate) => candidate < current);
    }

    objectExtremeKey(value = {}, compare) {
      const entries = Object.entries(value || {}).filter(([label]) => label);
      if (!entries.length) {
        return '';
      }
      return entries.reduce((best, entry) => {
        const bestValue = this.numberOrNull(best[1]) || 0;
        const entryValue = this.numberOrNull(entry[1]) || 0;
        return compare(bestValue, entryValue) ? entry : best;
      }, entries[0])[0];
    }

    createAbortSignal(timeout) {
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
        return AbortSignal.timeout(timeout || config.timeout || 12000);
      }
      return undefined;
    }

    delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
  }

  global.DESRepository = new Repository();
})(window);
