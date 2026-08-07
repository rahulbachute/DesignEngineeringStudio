# Analytics Dashboard Installation Guide

## 1. Open Dashboard

Open:

```text
analytics-dashboard.html
```

## 2. Configure Google Apps Script

Edit:

```text
js/analytics/config.js
```

Set:

```js
googleSheetsWebAppUrl: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
```

## 3. Apps Script Response Format

Return JSON matching:

```json
{
  "student": {
    "name": "Student Name",
    "rollNumber": "303001",
    "division": "A",
    "batch": "A1",
    "currentSemester": "Semester V"
  },
  "summary": {
    "completedChallenges": 12,
    "totalChallenges": 15,
    "averageScore": 24,
    "maxAverageScore": 30,
    "totalHours": 18,
    "leaderboardRank": 4
  },
  "challengeHistory": [],
  "coAttainment": {},
  "bloomDistribution": {},
  "poMapping": {},
  "skillDevelopment": {},
  "learningTrend": [],
  "badges": [],
  "leaderboard": [],
  "facultyFeedback": [],
  "reflections": []
}
```

## 4. Deployment

The dashboard is static and can be deployed with the rest of DES on:

- GitHub Pages
- Netlify
- Google Sites iframe

## 5. Fallback

If Google Sheets is unavailable, the dashboard automatically uses sample data.
