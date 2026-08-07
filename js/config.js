window.MEILP = window.MEILP || {};

/**
 * Central platform configuration.
 * Keep platform-level defaults here and assignment-specific content in data files
 * or assignment folders.
 */
window.MEILP.platformConfig = {
  appName: "MEILP",
  fullName: "Mechanical Engineering Interactive Learning Platform",
  buildLabel: "Sprint 1 Platform Engine",
  storageNamespace: "meilp",
  defaultTheme: "light",
  navItems: [
    { label: "Platform", href: "#platform" },
    { label: "Assignments", href: "#assignments" },
    { label: "Docs", href: "#docs" }
  ]
};

window.MEILP.dataSources = {
  assignmentRegistry: "data/assignments.json"
};

window.MEILP.googleSheetsConfig = {
  submissionWebAppUrl: "https://script.google.com/macros/s/AKfycbwCLYivn63yQtBMTWyY8FxCvkIZyQi-lS2acZfxY5bUrzYFAiWRhhS4qx-Jkm33pmTp/exec",
  requestTimeoutMs: 10000,
  apiKey: ""
};

window.MEILP.submissionConfig = {
  maxRetryAttempts: 3
};
