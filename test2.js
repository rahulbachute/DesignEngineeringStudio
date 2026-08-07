const fs = require('fs');

function titleStatus(status) {
    if (typeof status !== 'string') {
    return String(status || '');
    }
    return status.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
}

function summarizeResponse(value) {
    if (value === undefined || value === null || value === '') {
    return 'No response provided';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
    }
    if (Array.isArray(value)) {
    return value.map((item) => summarizeResponse(item)).join('; ');
    }
    if (typeof value === 'object') {
    const textParts = [];
    for (const [key, val] of Object.entries(value)) {
        if (val === undefined || val === null || val === '') {
        continue;
        }
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        textParts.push(`${titleStatus(key)}: ${val}`);
        } else if (Array.isArray(val) || typeof val === 'object') {
        textParts.push(`${titleStatus(key)}: ${summarizeResponse(val)}`);
        }
    }
    return textParts.length > 0 ? textParts.join(', ') : JSON.stringify(value);
    }
    return String(value);
}

fetch('https://script.google.com/macros/s/AKfycbzb7HYaA5WdPWd7ggQ416LHu1KHn27hWgubNmYKpx8aLgfAMY9kSvdMneqT1JCi6fQM/exec', {
  method: 'POST',
  body: JSON.stringify({ action: 'submission', submissionId: 'ec-01-44-20260731092628313' }),
  headers: { 'Content-Type': 'text/plain' }
}).then(r => r.json()).then(json => {
  const detail = json.data;
  const activityResponses = detail.submissionData?.activityResponses;
  let activities = [];
  if (Array.isArray(activityResponses) && activityResponses.length) {
    activities = activityResponses.map((activity, index) => ({
      id: activity.id || activity.activityId || `activity-${index + 1}`,
      name: activity.title || activity.name || activity.activityTitle || activity.activityId || `Activity ${index + 1}`,
      response: summarizeResponse(activity.response ?? activity.studentResponse ?? activity.answers ?? activity),
      maxMarks: Number(activity.maxMarks ?? activity.marks ?? activity.cceMarks ?? 0)
    }));
  }
  console.log('Activities length:', activities.length);
  // console.log(activities.slice(0, 1));
});
