window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.config = {
  appName: "Design Engineering Studio",
  dashboardTitle: "Student Analytics Dashboard",
  sampleDataUrl: "data/analytics/sample-dashboard.json",
  googleSheetsWebAppUrl: "https://script.google.com/macros/s/AKfycbzAnnjAXquy00NQ1fXFhI45IdkcZ0SQiL-mGmf7B_Z-_0uXLg6lah8VYNRi9JYbXgtD/exec",
  requestTimeoutMs: 8000,
  embeddedSampleData: {
    student: { name: "Aarav Deshmukh", rollNumber: "303041", division: "A", batch: "A2", currentSemester: "Semester V" },
    summary: { completedChallenges: 12, totalChallenges: 15, averageScore: 24, maxAverageScore: 30, totalHours: 18, leaderboardRank: 4 },
    challengeHistory: [
      { challenge: "Elevator Cable", marks: "28/30", score: 28, maxScore: 30, status: "Completed", date: "12 July", hours: 2 },
      { challenge: "Side Stand Stability", marks: "24/30", score: 24, maxScore: 30, status: "Completed", date: "15 July", hours: 1.5 },
      { challenge: "Spring Selection", marks: "Pending", score: 0, maxScore: 30, status: "Pending", date: "-", hours: 0 }
    ],
    coAttainment: { CO1: 90, CO2: 78, CO3: 72, CO4: 68, CO5: 64 },
    bloomDistribution: { Remember: 10, Understand: 22, Apply: 30, Analyze: 20, Evaluate: 12, Create: 6 },
    poMapping: { PO1: 88, PO2: 82, PO3: 74, PO4: 58, PO5: 70, PO6: 55, PO7: 62, PO8: 80, PO9: 76, PO10: 66, PO11: 84 },
    skillDevelopment: { "Design Skill": 86, Analysis: 82, Communication: 74, Documentation: 78, Creativity: 70, "Engineering Judgement": 88 },
    learningTrend: [
      { label: "Assignment 1", score: 58 },
      { label: "Assignment 2", score: 64 },
      { label: "Challenge 1", score: 76 },
      { label: "Challenge 2", score: 80 },
      { label: "Quiz", score: 72 },
      { label: "Open Book Test", score: 78 },
      { label: "CCE", score: 84 },
      { label: "Final", score: 88 }
    ],
    badges: [
      { name: "ASME Designer", description: "Completed professional design workflow.", icon: "bi-gear-wide-connected" },
      { name: "Material Expert", description: "Strong material selection evidence.", icon: "bi-layers" },
      { name: "Safety Engineer", description: "Prioritized safety-critical decisions.", icon: "bi-shield-check" },
      { name: "Problem Solver", description: "Completed calculation-heavy challenges.", icon: "bi-lightbulb" }
    ],
    leaderboard: [
      { rank: 1, name: "Saanvi Patil", class: "TE", division: "A", score: 29, badges: 7 },
      { rank: 2, name: "Rohan Kulkarni", class: "TE", division: "B", score: 27, badges: 6 },
      { rank: 3, name: "Meera Shah", class: "TE", division: "A", score: 26, badges: 6 },
      { rank: 4, name: "Aarav Deshmukh", class: "TE", division: "C", score: 24, badges: 6 }
    ],
    facultyFeedback: [
      { date: "12 July", comment: "Excellent Engineering Thinking", area: "Recommendation" },
      { date: "15 July", comment: "Improve assumptions", area: "Calculations" },
      { date: "18 July", comment: "Better free body diagram", area: "Documentation" }
    ],
    reflections: [
      { challenge: "Elevator Cable", question: "What did you learn?", answer: "Safety factors and material certification are central to elevator cable selection." },
      { challenge: "Side Stand Stability", question: "Biggest challenge?", answer: "Understanding how center of gravity affects the support polygon." }
    ]
  },
  chartColors: {
    primary: "#0B2E59",
    accent: "#F28C28",
    secondary: "#6C3FC5",
    success: "#198754",
    info: "#0D6EFD",
    warning: "#FFC107"
  }
};
