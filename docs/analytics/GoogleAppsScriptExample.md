# Google Apps Script Example

Use this as a starting point for the existing DES Google Apps Script.

```js
function doGet() {
  const payload = {
    student: {
      name: "Student Name",
      rollNumber: "303001",
      division: "A",
      batch: "A1",
      currentSemester: "Semester V"
    },
    summary: {
      completedChallenges: 12,
      totalChallenges: 15,
      averageScore: 24,
      maxAverageScore: 30,
      totalHours: 18,
      leaderboardRank: 4
    },
    challengeHistory: [],
    coAttainment: {},
    bloomDistribution: {},
    poMapping: {},
    skillDevelopment: {},
    learningTrend: [],
    badges: [],
    leaderboard: [],
    facultyFeedback: [],
    reflections: []
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

In production, replace the arrays and objects with values read from the DES challenge response sheets.
