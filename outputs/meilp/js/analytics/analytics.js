window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.analytics = {
  buildModel(rawData) {
    const completed = rawData.summary.completedChallenges;
    const total = rawData.summary.totalChallenges;
    const completionPercent = total ? Math.round((completed / total) * 100) : 0;
    const pendingChallenges = Math.max(total - completed, 0);

    return {
      ...rawData,
      computed: {
        completionPercent,
        pendingChallenges,
        averageScoreLabel: `${rawData.summary.averageScore} / ${rawData.summary.maxAverageScore}`,
        completedLabel: `${completed} / ${total}`,
        submissionStatus: pendingChallenges === 0 ? "Complete" : "In Progress"
      }
    };
  },

  toCsv(model) {
    const rows = [
      ["Student", model.student.name],
      ["Roll Number", model.student.rollNumber],
      ["Division", model.student.division],
      ["Overall Completion", `${model.computed.completionPercent}%`],
      [],
      ["Challenge", "Marks", "Status", "Date"]
    ];

    model.challengeHistory.forEach((item) => {
      rows.push([item.challenge, item.marks, item.status, item.date]);
    });

    return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  }
};
