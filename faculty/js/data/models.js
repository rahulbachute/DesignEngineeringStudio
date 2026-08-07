class StudentModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.prn = data.prn || '';
    this.branch = data.branch || '';
    this.division = data.division || '';
    this.batch = data.batch || '';
    this.email = data.email || '';
    this.status = data.status || 'Active';
  }
}

class ChallengeModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.code = data.code || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.difficulty = data.difficulty || 'Medium';
    this.estimatedTime = data.estimatedTime || '';
    this.active = data.active !== false;
  }
}

class ActivityModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.response = data.response || '';
    this.maxMarks = data.maxMarks || 0;
    this.category = data.category || 'Objective';
    this.systemSuggestedMarks = data.systemSuggestedMarks || 0;
    this.correctAnswer = data.correctAnswer || '';
  }
}

class SubmissionModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.studentName = data.studentName || '';
    this.prn = data.prn || '';
    this.branch = data.branch || '';
    this.division = data.division || '';
    this.challenge = data.challenge || '';
    this.attempt = data.attempt || 1;
    this.submittedOn = data.submittedOn || '';
    this.submissionStatus = data.submissionStatus || 'Submitted';
    this.systemScore = data.systemScore ?? null;
    this.facultyScore = data.facultyScore ?? null;
    this.timeTaken = data.timeTaken || '';
    this.activities = (data.activities || []).map((activity) => new ActivityModel(activity));
    this.challengeId = data.challengeId || '';
    this.completionPercent = data.completionPercent ?? null;
    this.email = data.email || '';
    this.submissionHash = data.submissionHash || '';
    this.rawPayload = data.rawPayload || {};
    this.rawRow = data.rawRow || {};
  }
}

class EvaluationModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.submissionId = data.submissionId || '';
    this.facultyName = data.facultyName || '';
    this.facultyMarks = data.facultyMarks || [];
    this.remarks = data.remarks || '';
    this.modified = data.modified || false;
    this.auditTrail = data.auditTrail || [];
    this.status = data.status || 'Draft';
  }
}

class OutcomeModel {
  constructor(data = {}) {
    this.code = data.code || '';
    this.type = data.type || 'CO';
    this.attainment = data.attainment || 0;
    this.target = data.target || 0;
    this.gap = data.gap || 0;
    this.status = data.status || 'Pending';
  }
}

class AnalyticsModel {
  constructor(data = {}) {
    this.summary = data.summary || {};
    this.charts = data.charts || {};
    this.insights = data.insights || [];
    this.recommendations = data.recommendations || [];
  }
}

class ReportModel {
  constructor(data = {}) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.category = data.category || 'Assessment Reports';
    this.description = data.description || '';
    this.content = data.content || {};
    this.generatedAt = data.generatedAt || '';
  }
}
