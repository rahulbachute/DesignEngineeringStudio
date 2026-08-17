window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.theme = {
  storageKey: "des-analytics-theme",

  init() {
    this.apply(localStorage.getItem(this.storageKey) || "light");
    document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
      this.apply(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  },

  apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(this.storageKey, theme);
    const icon = document.querySelector("[data-theme-toggle] i");
    if (icon) {
      icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    }
  }
};
