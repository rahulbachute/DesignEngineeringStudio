# Student Analytics Dashboard

The Student Analytics Dashboard helps students monitor semester progress and gives faculty an overview of class performance.

## Files

```text
analytics-dashboard.html
css/analytics-dashboard.css
js/analytics/config.js
js/analytics/googleSheets.js
js/analytics/analytics.js
js/analytics/charts.js
js/analytics/dashboard.js
js/analytics/ui.js
js/analytics/theme.js
data/analytics/sample-dashboard.json
```

## Data Source

The dashboard reads from Google Apps Script when `googleSheetsWebAppUrl` is configured in `js/analytics/config.js`.

If no URL is configured, it loads `data/analytics/sample-dashboard.json`.

## Google Sheets Fields

The Apps Script response should return JSON with these sections:

- `student`
- `summary`
- `challengeHistory`
- `coAttainment`
- `bloomDistribution`
- `poMapping`
- `skillDevelopment`
- `learningTrend`
- `badges`
- `leaderboard`
- `facultyFeedback`
- `reflections`

## Charts

Charts use Chart.js only:

- CO Attainment: bar chart
- Bloom Distribution: doughnut chart
- PO Mapping: radar chart
- Skill Development: radar chart
- Learning Trend: line chart

## Export

Students can:

- Download a CSV progress report
- Print the dashboard
- Use browser print to generate PDF
