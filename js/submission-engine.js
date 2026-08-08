window.MEILP = window.MEILP || {};

/**
 * Builds, validates, submits, and queues DES challenge submissions.
 * Public method names are preserved for ChallengeRunner and Google Apps Script compatibility.
 */
class SubmissionEngine {
  constructor({ storage, transport = null, eventBus = null, config = {}, now = () => new Date() } = {}) {
    if (!storage) {
      throw new Error("SubmissionEngine requires a storage service.");
    }

    this.storage = storage;
    this.transport = transport;
    this.eventBus = eventBus;
    this.now = now;
    this.config = {
      draftKey: "submission-draft",
      queueKey: "submission-queue",
      statusKey: "submission-status",
      maxRetryAttempts: 3,
      ...config
    };
    this.inFlight = new Set();
  }

  /**
   * Builds a Google Sheets-compatible submission payload from runner context.
   */
  buildPayload(context = {}) {
    const state = context.state || {};
    const config = context.config || {};
    const workflow = context.workflow || {};
    const rubric = context.rubric || {};
    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    const learningSteps = steps.filter((step) => step.component !== "submission-summary");
    const learningStepIds = new Set(learningSteps.map((step) => step.id));
    const completedTaskIds = Array.isArray(context.completedTaskIds) ? context.completedTaskIds : [];
    const submittedAt = this.now().toISOString();
    const student = this.normalizeStudentInformation(state.student || {});
    const settings = state.settings || {};
    const attemptMode = student.attemptMode || settings.attemptMode || "individual";
    const activityResponses = this.buildActivityResponses(learningSteps, state.responses || {}, rubric);
    const completedActivities = completedTaskIds.filter((id) => learningStepIds.has(id)).length;
    const totalActivities = learningSteps.length;
    const completionPercent = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;
    const baseSubmission = {
      submissionId: this.createSubmissionId(config, student, submittedAt),
      submittedAt,
      status: "submitted",
      attemptMode,
      submissionHash: ""
    };

    const payload = {
      submission: baseSubmission,
      studentInformation: student,
      challengeMetadata: this.buildChallengeMetadata(config, rubric),
      submissionData: {
        completedActivities,
        totalActivities,
        completionPercent,
        activityResponses,
        reflection: this.extractReflection(activityResponses)
      },
      facultyEvaluation: this.buildFacultyEvaluation(config, rubric),
      analytics: this.buildAnalytics(config, student, attemptMode, completionPercent, activityResponses)
    };

    payload.submission.submissionHash = this.stableHash(this.stableStringify({
      studentInformation: payload.studentInformation,
      challengeMetadata: payload.challengeMetadata,
      submissionData: payload.submissionData
    }));
    return payload;
  }

  /**
   * Validates required submission fields without mutating the payload.
   */
  validateSubmissionPayload(payload) {
    const errors = [];
    const data = payload && typeof payload === "object" ? payload : {};
    const student = data.studentInformation || {};
    const submission = data.submission || {};
    const submissionData = data.submissionData || {};
    const activities = Array.isArray(submissionData.activityResponses) ? submissionData.activityResponses : [];

    if (!submission.submissionId) {
      errors.push("Submission ID is missing.");
    }
    if (!submission.submittedAt) {
      errors.push("Submission timestamp is missing.");
    }
    this.validateStudentInformation(student, submission.attemptMode, errors);
    if (!activities.length) {
      errors.push("At least one activity response is required.");
    }
    this.validateActivityResponses(activities, errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Submits the current context, or queues it when transport is unavailable.
   */
  async submit(context = {}) {
    const payload = this.buildPayload(context);
    const validation = this.validateSubmissionPayload(payload);
    if (!validation.valid) {
      const status = this.status(false, false, "VALIDATION_ERROR", "Submission validation failed.", validation.errors);
      this.setStatus(status);
      return status;
    }

    const identity = this.queueIdentity({ payload });
    if (this.inFlight.has(identity)) {
      return this.status(false, false, "DUPLICATE_IN_FLIGHT", "This submission is already being sent.");
    }

    if (!this.transport || typeof this.transport.submit !== "function") {
      return this.queueSubmission(payload, "Submission saved locally because no transport is available.");
    }

    this.inFlight.add(identity);
    try {
      const result = await this.transport.submit(payload);
      if (result && result.ok) {
        this.removeFromQueue(payload);
        const status = this.status(true, false, result.code || "SUBMITTED", result.message || "Submission recorded successfully.");
        this.setStatus(status);
        this.clearDraft();
        this.emit("submission:submitted", { payload, result });
        return status;
      }

      return this.queueSubmission(payload, (result && result.message) || "Submission queued for retry.", result);
    } catch (error) {
      return this.queueSubmission(payload, this.errorMessage(error) || "Submission queued after a network error.", { code: "NETWORK_ERROR" });
    } finally {
      this.inFlight.delete(identity);
    }
  }

  /**
   * Retries queued submissions up to the configured retry limit.
   */
  async retryQueue() {
    if (!this.transport || typeof this.transport.submit !== "function") {
      return this.status(false, true, "TRANSPORT_MISSING", "Retry requires a configured submission transport.");
    }

    const queue = this.getQueue();
    const remaining = [];
    let submittedCount = 0;

    for (const item of queue) {
      if (item.blocked || item.attempts >= this.config.maxRetryAttempts) {
        remaining.push({ ...item, blocked: true });
        continue;
      }

      const nextItem = { ...item, attempts: item.attempts + 1, lastAttemptAt: this.now().toISOString() };
      try {
        const result = await this.transport.submit(nextItem.payload);
        if (result && result.ok) {
          submittedCount += 1;
          this.emit("submission:submitted", { payload: nextItem.payload, result });
        } else {
          remaining.push({
            ...nextItem,
            blocked: nextItem.attempts >= this.config.maxRetryAttempts,
            lastError: result ? result.message : "Retry failed."
          });
        }
      } catch (error) {
        remaining.push({
          ...nextItem,
          blocked: nextItem.attempts >= this.config.maxRetryAttempts,
          lastError: this.errorMessage(error) || "Retry failed."
        });
      }
    }

    this.setQueue(remaining);
    const message = submittedCount
      ? `${submittedCount} queued submission${submittedCount === 1 ? "" : "s"} submitted. ${remaining.length} remaining.`
      : `${remaining.length} queued submission${remaining.length === 1 ? "" : "s"} remaining.`;
    const status = this.status(submittedCount > 0, remaining.length > 0, "RETRY_COMPLETE", message);
    this.setStatus(status);
    return status;
  }

  /**
   * Saves an attempt draft for autosave recovery.
   */
  autosaveDraft(draft) {
    try {
      this.storage.set(this.config.draftKey, {
        ...(draft || {}),
        updatedAt: this.now().toISOString()
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Loads the most recent autosaved attempt draft.
   */
  loadDraft() {
    return this.storage.get(this.config.draftKey, null);
  }

  /**
   * Removes the autosaved attempt draft after successful submission.
   */
  clearDraft() {
    try {
      this.storage.remove(this.config.draftKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the current submission queue with malformed and duplicate items removed.
   */
  getQueue() {
    const saved = this.storage.get(this.config.queueKey, []);
    const seen = new Set();
    return (Array.isArray(saved) ? saved : [])
      .map((item) => this.normalizeQueueItem(item))
      .filter((item) => item && !this.hasSeenQueueItem(seen, item));
  }

  /**
   * Returns the last submission status.
   */
  getStatus() {
    return this.storage.get(this.config.statusKey, this.status(false, false, "READY", "Ready for validation."));
  }

  /**
   * Adds or updates one payload in the offline queue.
   */
  queueSubmission(payload, message, result = {}) {
    const identity = this.queueIdentity({ payload });
    const queue = this.getQueue().filter((item) => this.queueIdentity(item) !== identity);
    queue.push({
      id: payload.submission.submissionId,
      payload,
      attempts: 0,
      queuedAt: this.now().toISOString(),
      lastError: result.message || message,
      blocked: false
    });
    this.setQueue(queue);

    const status = this.status(false, true, result.code || "QUEUED", message);
    this.setStatus(status);
    this.emit("submission:queued", { payload, result });
    return status;
  }

  /**
   * Builds activity response rows for Google Sheets.
   */
  buildActivityResponses(steps, responses, rubric) {
    const criteriaById = this.criteriaByActivityId(rubric);
    return steps.map((step) => {
      const criteria = criteriaById[step.id] || {};
      return {
        activityId: step.id,
        title: criteria.title || step.title || "",
        component: step.component || "",
        cceMarks: criteria.marks !== undefined ? criteria.marks : (step.marks !== undefined ? step.marks : 0),
        coMapping: criteria.coMapping || step.co || "",
        poMapping: Array.isArray(criteria.poMapping) ? criteria.poMapping : (step.po || []),
        psoMapping: Array.isArray(criteria.psoMapping) ? criteria.psoMapping : (step.pso || []),
        bloomLevel: criteria.bloomLevel || step.bloomLevel || "",
        status: this.isEmptyResponse(responses[step.id]) ? "incomplete" : "completed",
        response: responses[step.id] || {}
      };
    });
  }

  /**
   * Builds challenge metadata using existing assignment config fields.
   */
  buildChallengeMetadata(config, rubric) {
    return {
      id: config.id || config.projectCode || "",
      slug: config.slug || "",
      title: config.title || "",
      version: config.version || "",
      subject: config.subject || config.courseCode || "",
      courseCode: config.courseCode || config.subject || "",
      courseName: config.courseName || "",
      cceType: config.cceType || rubric.cceType || "",
      cceMarks: config.cceMarks !== undefined ? config.cceMarks : (rubric.totalMarks !== undefined ? rubric.totalMarks : 0),
      courseOutcome: config.courseOutcome || rubric.courseOutcome || "",
      programOutcomes: config.programOutcomes || [],
      programSpecificOutcomes: config.programSpecificOutcomes || [],
      bloomLevelsCovered: config.bloomLevelsCovered || []
    };
  }

  /**
   * Builds the faculty evaluation placeholder expected by the Apps Script.
   */
  buildFacultyEvaluation(config, rubric) {
    const totalCceMarks = config.cceMarks !== undefined ? config.cceMarks : (rubric.totalMarks !== undefined ? rubric.totalMarks : 0);
    return {
      totalCceMarks,
      provisionalCceMarks: "",
      facultyRemarks: "",
      status: "pending",
      evaluationTimestamp: "",
      mappingSummary: this.buildMappingSummary(rubric)
    };
  }

  /**
   * Builds analytics summaries from the same activity rows sent to Sheets.
   */
  buildAnalytics(config, student, attemptMode, completionPercent, activityResponses) {
    const studentName = student.name || student.student1 || student.groupName || "";
    return {
      studentDashboard: {
        challengeId: config.id || config.projectCode || "",
        studentName,
        rollNumber: student.rollNumber || "",
        attemptMode,
        completionPercent,
        submissionStatus: "submitted"
      },
      learningAnalytics: {
        coAttainment: this.countBy(activityResponses, "coMapping"),
        poMapping: this.countArrayValues(activityResponses, "poMapping"),
        psoMapping: this.countArrayValues(activityResponses, "psoMapping"),
        bloomDistribution: this.countBy(activityResponses, "bloomLevel")
      }
    };
  }

  /**
   * Normalizes group member fields while preserving all original student keys.
   */
  normalizeStudentInformation(student) {
    const normalized = { ...student };
    const groupMembers = ["student1", "student2", "student3", "student4"]
      .map((key) => student[key])
      .filter((name) => String(name || "").trim());
    if (groupMembers.length) {
      normalized.groupMembers = groupMembers;
    }
    return normalized;
  }

  /**
   * Validates student identity fields for individual and group modes.
   */
  validateStudentInformation(student, attemptMode, errors) {
    if (!student.collegeName) {
      errors.push("College / Institution is required.");
    }

    if (attemptMode === "group") {
      if (!student.groupNumber) {
        errors.push("Group Number is required.");
      }
      ["student1", "student2", "student3", "student4"].forEach((field) => {
        if (!student[field]) {
          errors.push(`${this.title(field)} is required.`);
        }
      });
    } else {
      if (!student.rollNumber) {
        errors.push("Roll Number is required.");
      }
      if (!student.name) {
        errors.push("Name is required.");
      }
    }

    if (!student.division) {
      errors.push("Division is required.");
    }
  }

  /**
   * Validates activity responses with the existing submission rules.
   */
  validateActivityResponses(activityResponses, errors) {
    activityResponses.forEach((activity) => {
      const item = activity || {};
      const activityId = String(item.activityId || "");
      if (activityId === "reflection" && this.isEmptyResponse(item.response)) {
        errors.push("Reflection responses are required.");
      }

      if (activityId.includes("notebook") && this.isEmptyResponse(item.response)) {
        errors.push("Engineering Notebook responses are required.");
      }

      if (item.component === "image-label" && !this.hasCompleteImageLabelResponse(item.response)) {
        errors.push(`${item.title} requires all component selections.`);
      }
    });
  }

  /**
   * Writes the queue safely to storage.
   */
  setQueue(queue) {
    try {
      this.storage.set(this.config.queueKey, Array.isArray(queue) ? queue : []);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Writes submission status safely to storage.
   */
  setStatus(status) {
    try {
      this.storage.set(this.config.statusKey, status);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalizes a queue item and rejects malformed records.
   */
  normalizeQueueItem(item) {
    if (!item || typeof item !== "object" || !item.payload || typeof item.payload !== "object") {
      return null;
    }

    const payload = item.payload;
    const submission = payload.submission || {};
    const identity = this.queueIdentity(item);
    if (!identity) {
      return null;
    }

    return {
      ...item,
      id: item.id || submission.submissionId,
      payload,
      attempts: Number.isFinite(Number(item.attempts)) ? Math.max(0, Number(item.attempts)) : 0,
      blocked: Boolean(item.blocked)
    };
  }

  /**
   * Builds the duplicate-detection identity for a queue item.
   */
  queueIdentity(item) {
    const payload = item && item.payload;
    const submission = payload && payload.submission;
    if (!submission) {
      return "";
    }
    return submission.submissionHash || submission.submissionId || item.id || "";
  }

  /**
   * Tracks queue identities and returns true for duplicate entries.
   */
  hasSeenQueueItem(seen, item) {
    const identity = this.queueIdentity(item);
    if (!identity || seen.has(identity)) {
      return true;
    }
    seen.add(identity);
    return false;
  }

  /**
   * Removes queued entries matching a submitted payload.
   */
  removeFromQueue(payload) {
    const identity = this.queueIdentity({ payload });
    if (!identity) {
      return;
    }
    const remaining = this.getQueue().filter((item) => this.queueIdentity(item) !== identity);
    this.setQueue(remaining);
  }

  /**
   * Converts an error into a short user-safe message.
   */
  errorMessage(error) {
    return error && error.message ? error.message : "";
  }

  /**
   * Returns true when a response has no meaningful values.
   */
  isEmptyResponse(response) {
    if (response === null || response === undefined) {
      return true;
    }
    if (typeof response === "string") {
      return !response.trim();
    }
    if (Array.isArray(response)) {
      return response.length === 0;
    }
    if (typeof response === "object") {
      return Object.keys(response).length === 0 || Object.values(response).every((value) => this.isEmptyResponse(value));
    }
    return false;
  }

  /**
   * Validates image-label component responses without changing their saved schema.
   */
  hasCompleteImageLabelResponse(response) {
    if (!response || typeof response !== "object") {
      return false;
    }
    if (response.validation && response.validation.valid === false) {
      return false;
    }
    if (Array.isArray(response.componentResponses) && response.componentResponses.length) {
      return response.componentResponses.every((item) => String(item.studentAnswer || "").trim());
    }
    if (response.answers && typeof response.answers === "object") {
      return Object.values(response.answers).every((value) => String(value || "").trim());
    }
    return false;
  }

  /**
   * Creates a stable submission identifier from challenge, student, and timestamp fields.
   */
  createSubmissionId(config, student, submittedAt) {
    const challengeId = config.id || config.projectCode || config.slug || "challenge";
    const identity = student.rollNumber || student.groupNumber || student.name || student.student1 || "anonymous";
    return `${this.slug(challengeId)}-${this.slug(identity)}-${submittedAt.replace(/\D/g, "")}`;
  }

  /**
   * Creates a compact non-cryptographic hash for duplicate detection.
   */
  stableHash(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Stringifies objects with stable key order for repeatable hashes.
   */
  stableStringify(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`).join(",")}}`;
  }

  /**
   * Builds a last-operation status record.
   */
  status(ok, queued, code, message, errors = []) {
    return {
      ok,
      submitted: ok,
      queued,
      code,
      message,
      errors,
      updatedAt: this.now().toISOString()
    };
  }

  /**
   * Builds a lookup table for rubric criteria.
   */
  criteriaByActivityId(rubric) {
    return (Array.isArray(rubric.criteria) ? rubric.criteria : []).reduce((result, criteria) => {
      if (criteria && criteria.activityId) {
        result[criteria.activityId] = criteria;
      }
      return result;
    }, {});
  }

  /**
   * Builds mapping totals for faculty evaluation context.
   */
  buildMappingSummary(rubric) {
    const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
    return {
      co: this.countBy(criteria, "coMapping"),
      po: this.countArrayValues(criteria, "poMapping"),
      pso: this.countArrayValues(criteria, "psoMapping"),
      bloom: this.countBy(criteria, "bloomLevel")
    };
  }

  /**
   * Counts scalar field values across records.
   */
  countBy(items, field) {
    return (Array.isArray(items) ? items : []).reduce((result, item) => {
      const value = item && item[field];
      if (value) {
        result[value] = (result[value] || 0) + 1;
      }
      return result;
    }, {});
  }

  /**
   * Counts array field values across records.
   */
  countArrayValues(items, field) {
    return (Array.isArray(items) ? items : []).reduce((result, item) => {
      const values = item && Array.isArray(item[field]) ? item[field] : [];
      values.forEach((value) => {
        result[value] = (result[value] || 0) + 1;
      });
      return result;
    }, {});
  }

  /**
   * Extracts reflection activity responses for analytics compatibility.
   */
  extractReflection(activityResponses) {
    return activityResponses
      .filter((activity) => activity.activityId === "reflection")
      .map((activity) => activity.response || {});
  }

  /**
   * Emits a submission event when an EventBus is present.
   */
  emit(eventName, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, payload);
    }
  }

  /**
   * Converts text into a storage- and ID-safe slug.
   */
  slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  }

  /**
   * Converts identifiers into readable labels.
   */
  title(value) {
    return String(value || "").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
  }
}

window.MEILP.SubmissionEngine = SubmissionEngine;
