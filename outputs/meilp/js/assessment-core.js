// Shared deterministic answer-key assessment. Also used by Google Apps Script.
var DESAssessmentCore = (function () {
  'use strict';
  function number(value) {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !isFinite(Number(value))) return null;
    return Number(value);
  }
  function round(value) { return Math.round((value + 1e-10) * 100) / 100; }
  function text(value) { return String(value === undefined || value === null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' '); }
  function parse(value) {
    for (var i = 0; i < 3 && typeof value === 'string'; i++) {
      try { value = JSON.parse(value); } catch (error) { break; }
    }
    return value && typeof value === 'object' ? value : {};
  }
  function groups(rubric) {
    var result = {}, criteria = (rubric && rubric.criteria) || [];
    for (var i = 0; i < criteria.length; i++) {
      var c = criteria[i], id = c.stepId || c.activityId || c.id;
      if (!id) continue;
      if (!result[id]) {
        result[id] = {id:id,title:c.title,marks:0,criteria:[],coMapping:c.coMapping || c.co || '',poMapping:c.poMapping || c.po || [],psoMapping:c.psoMapping || c.pso || [],bloomLevel:c.bloomLevel || ''};
      }
      var marks = number(c.marks !== undefined ? c.marks : c.maxMarks);
      result[id].marks = marks === null || result[id].marks === null ? null : round(result[id].marks + marks);
      result[id].criteria.push(c);
    }
    return result;
  }
  function correctValues(question) {
    var options = question.options || [], values = [], correctOptions = 0;
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      if (o && typeof o === 'object' && (o.correct === true || o.isCorrect === true || o.value === 'correct')) {
        correctOptions++;
        var candidates = [o.id,o.value,o.title,o.label,o.text];
        for (var j = 0; j < candidates.length; j++) if (candidates[j] !== undefined && text(candidates[j])) values.push(String(candidates[j]));
      }
    }
    if (correctOptions > 1) return [];
    if (!correctOptions) {
      var declared = question.correctAnswer !== undefined ? question.correctAnswer : question.answer;
      if (declared !== undefined && declared !== null) {
        values.push(String(declared));
        for (var oi = 0; oi < options.length; oi++) {
          var option = options[oi];
          if (option && typeof option === 'object') {
            var names = [option.id,option.value,option.title,option.label,option.text];
            if (names.some(function (name) { return name !== undefined && text(name) === text(declared); })) {
              for (var ni = 0; ni < names.length; ni++) if (names[ni] !== undefined) values.push(String(names[ni]));
            }
          }
        }
      }
    }
    return values;
  }
  function compile(step, group, activity) {
    step = step || {}; activity = activity || {};
    var cs = group ? group.criteria : [], max = group ? group.marks : number(step.marks !== undefined ? step.marks : step.maxMarks);
    var procedural = step.statusGroup === 'setup' || step.statusGroup === 'submission' || step.id === 'submit' || step.component === 'information-card';
    var disabled = step.autoEvaluation && step.autoEvaluation.enabled === false, subjective = false, explicit = false;
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].autoEvaluation && cs[i].autoEvaluation.enabled === false) disabled = true;
      if (cs[i].type === 'scoring' && !(cs[i].autoEvaluation && cs[i].autoEvaluation.enabled === true)) subjective = true;
      if (cs[i].type === 'auto-grading' || (cs[i].autoEvaluation && cs[i].autoEvaluation.enabled === true)) explicit = true;
    }
    var definition = {maxMarks:max,procedural:procedural,allowAutomated:false,checks:[],reason:''};
    if (procedural || max === 0) { definition.reason = 'Procedural activity'; return definition; }
    if (disabled) { definition.reason = 'Automatic evaluation is disabled by the rubric'; return definition; }
    if (subjective) { definition.reason = 'Independent faculty judgement required'; return definition; }
    var labels = activity.labels;
    if (step.component === 'image-label' && Array.isArray(labels) && labels.length) {
      for (var li = 0; li < labels.length; li++) {
        var label = labels[li], componentNumber = label.componentNumber || label.id || li + 1;
        var accepted = label.correctAnswer ? [label.correctAnswer].concat(label.acceptedAnswers || []) : [];
        if (!accepted.length) { definition.checks = []; definition.allowAutomated = !!explicit; definition.reason = 'A label answer key is missing'; return definition; }
        definition.checks.push({kind:'text',key:'component' + componentNumber,alternatives:[String(componentNumber),'label-' + componentNumber],accepted:accepted});
      }
    } else if (step.component === 'text-mcq') {
      var questions = Array.isArray(activity.questions) && activity.questions.length ? activity.questions : [activity.mcq || activity];
      for (var qi = 0; qi < questions.length; qi++) {
        var acceptedValues = correctValues(questions[qi]);
        if (!acceptedValues.length) { definition.checks = []; definition.allowAutomated = !!explicit; definition.reason = 'An explicit MCQ answer key is missing'; return definition; }
        definition.checks.push({kind:'text',key:questions === activity.questions ? (questions[qi].id || 'q_' + (qi + 1)) : 'mcq',accepted:acceptedValues});
      }
    } else {
      var fields = activity.steps || activity.fields || [];
      for (var fi = 0; fi < fields.length; fi++) {
        var field = fields[fi];
        if (Array.isArray(field.acceptedAnswers) && field.acceptedAnswers.length) {
          definition.checks.push({kind:'text',key:field.id || field.name,accepted:field.acceptedAnswers}); continue;
        }
        if (field.type === 'text' || field.type === 'textarea') continue;
        var expected = number(field.expected !== undefined ? field.expected : field.expectedValue);
        if (expected === null) { definition.checks = []; definition.allowAutomated = !!explicit || step.statusGroup === 'calculation'; definition.reason = 'Explicit numeric answer keys are unavailable; hints and placeholders are not grading keys'; return definition; }
        var tolerance = number(field.tolerance);
        if (tolerance === null) tolerance = 0;
        if (tolerance < 0) { definition.checks = []; definition.reason = 'Invalid answer-key tolerance'; return definition; }
        definition.checks.push({kind:'numeric',key:field.id || field.name,expected:expected,tolerance:tolerance});
      }
      if (!explicit && step.statusGroup !== 'calculation') definition.checks = [];
    }
    if (step.component === 'text-mcq' && activity.fields && activity.fields.length && definition.checks.length) {
      for (var mi = 0; mi < activity.fields.length; mi++) {
        var extra = activity.fields[mi], expectedExtra = number(extra.expected);
        if (expectedExtra === null) { definition.checks = []; definition.allowAutomated = !!explicit; definition.reason = 'An accompanying numeric answer key is missing'; return definition; }
        definition.checks.push({kind:'numeric',key:extra.id || extra.name,expected:expectedExtra,tolerance:number(extra.tolerance) || 0});
      }
    }
    definition.allowAutomated = (!!definition.checks.length || explicit || step.statusGroup === 'calculation') && max !== null && max > 0;
    if (!definition.allowAutomated && !definition.reason) definition.reason = 'Independent faculty judgement or an explicit answer key is required';
    return definition;
  }
  function assess(definition, response) {
    if (!definition || !definition.allowAutomated || !definition.checks || !definition.checks.length) return {marks:null,status:'faculty-review',reason:definition ? definition.reason : 'Evaluation policy unavailable'};
    var values = parse(response), answers = parse(values.answers), checks = definition.checks, correct = 0, attempted = 0;
    for (var i = 0; i < checks.length; i++) {
      var check = checks[i], value = values[check.key];
      if (value === undefined) value = answers[check.key];
      var alternatives = check.alternatives || [];
      for (var ai = 0; value === undefined && ai < alternatives.length; ai++) value = values[alternatives[ai]] !== undefined ? values[alternatives[ai]] : answers[alternatives[ai]];
      if (value && typeof value === 'object' && value.value !== undefined) value = value.value;
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        attempted++;
        if (check.kind === 'numeric') {
          var numeric = number(value);
          if (numeric !== null && Math.abs(numeric - check.expected) <= check.tolerance + 1e-10) correct++;
        } else {
          var accepted = check.accepted || [];
          for (var ti = 0; ti < accepted.length; ti++) if (text(value) === text(accepted[ti])) { correct++; break; }
        }
      }
    }
    if (!attempted) return {marks:null,status:'not-assessed',reason:'No answers to graded checks were recorded',correct:0,total:checks.length};
    return {marks:round(definition.maxMarks * correct / checks.length),status:'assessed',correct:correct,total:checks.length,attempted:attempted,reason:'Compared with configured answer keys'};
  }
  return {number:number,round:round,groups:groups,compile:compile,assess:assess};
})();
if (typeof window !== 'undefined') { window.MEILP = window.MEILP || {}; window.MEILP.AssessmentCore = DESAssessmentCore; }
