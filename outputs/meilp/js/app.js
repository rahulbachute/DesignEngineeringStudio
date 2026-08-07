(() => {
  const meilp = window.MEILP;
  const storage = new meilp.StorageService(meilp.platformConfig.storageNamespace);
  const engine = new meilp.PlatformEngine({
    storage,
    config: meilp.platformConfig
  });
  meilp.engine = engine;

  function renderAssignmentCards(cards) {
    const grid = meilp.qs("[data-assignment-grid]");
    if (!grid) {
      return;
    }

    const validCards = meilp.filterValidAssignmentCards(cards);
    if (validCards.length === 0) {
      return;
    }

    grid.innerHTML = validCards
      .map((card) => {
        const icon = card.icon || "bi-journal-text";
        const tagName = card.launchPath ? "a" : "article";
        const linkAttributes = card.launchPath ? ` href="${meilp.escapeHtml(card.launchPath)}"` : "";
        return `
          <div class="col-md-6 col-xl-4">
            <${tagName} class="assignment-card"${linkAttributes}>
              <span class="card-icon"><i class="bi ${meilp.escapeHtml(icon)}" aria-hidden="true"></i></span>
              <h3>${meilp.escapeHtml(card.title)}</h3>
              <p>${meilp.escapeHtml(card.summary)}</p>
              <footer>
                <span class="status-pill">${meilp.escapeHtml(card.status)}</span>
                <span class="status-pill">${meilp.escapeHtml(card.discipline || "Engineering")}</span>
                <span class="status-pill">${Number(card.tasks || 0)} tasks</span>
              </footer>
            </${tagName}>
          </div>
        `;
      })
      .join("");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    storage.set("theme", theme);
    engine.stateManager.update((state) => ({
      settings: {
        ...state.settings,
        theme
      }
    }));

    const icon = meilp.qs("[data-theme-toggle] i");
    if (icon) {
      icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    }
  }

  function bindThemeToggle() {
    const button = meilp.qs("[data-theme-toggle]");
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      const currentTheme = document.documentElement.dataset.theme || meilp.platformConfig.defaultTheme;
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }

  async function bootstrapPlatform() {
    engine.start();
    meilp.renderNavigation(meilp.qs("[data-nav-list]"), meilp.platformConfig.navItems);
    meilp.setActiveNavigation(window.location.hash || "#platform");

    window.addEventListener("hashchange", () => meilp.setActiveNavigation(window.location.hash));

    const savedTheme = storage.get("theme", meilp.platformConfig.defaultTheme);
    applyTheme(savedTheme);
    bindThemeToggle();

    const assignmentData = await meilp.fetchJson(meilp.dataSources.assignmentRegistry, null);
    if (assignmentData) {
      renderAssignmentCards(assignmentData.assignments || assignmentData);
    }

    const buildLabel = meilp.qs("[data-build-label]");
    if (buildLabel) {
      buildLabel.textContent = meilp.platformConfig.buildLabel;
    }
  }

  bootstrapPlatform();
})();
