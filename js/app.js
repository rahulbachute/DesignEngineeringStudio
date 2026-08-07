const {
  StorageService,
  dataSources,
  escapeHtml,
  fetchJson,
  filterValidAssignmentCards,
  platformConfig,
  qs,
  renderNavigation,
  setActiveNavigation
} = window.MEILP;

const storage = new StorageService(platformConfig.storageNamespace);
const engine = new window.MEILP.PlatformEngine({
  storage,
  config: platformConfig
});
window.MEILP.engine = engine;

function renderAssignmentCards(cards) {
  const grid = qs("[data-assignment-grid]");
  if (!grid) {
    return;
  }

  const validCards = filterValidAssignmentCards(cards);
  if (validCards.length === 0) {
    return;
  }

  grid.innerHTML = validCards
    .map((card) => {
      const icon = card.icon || "bi-journal-text";
      return `
        <div class="col-md-6 col-xl-4">
          <article class="assignment-card">
            <span class="card-icon"><i class="bi ${escapeHtml(icon)}" aria-hidden="true"></i></span>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.summary)}</p>
            <footer>
              <span class="status-pill">${escapeHtml(card.status)}</span>
              <span class="status-pill">${escapeHtml(card.discipline || "Engineering")}</span>
              <span class="status-pill">${Number(card.tasks || 0)} tasks</span>
            </footer>
          </article>
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

  const icon = qs("[data-theme-toggle] i");
  if (icon) {
    icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  }
}

function bindThemeToggle() {
  const button = qs("[data-theme-toggle]");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme || platformConfig.defaultTheme;
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

async function bootstrapPlatform() {
  engine.start();
  renderNavigation(qs("[data-nav-list]"), platformConfig.navItems);
  setActiveNavigation(window.location.hash || "#platform");

  window.addEventListener("hashchange", () => setActiveNavigation(window.location.hash));

  const savedTheme = storage.get("theme", platformConfig.defaultTheme);
  applyTheme(savedTheme);
  bindThemeToggle();

  const assignmentData = await fetchJson(dataSources.assignmentRegistry, null);
  if (assignmentData) {
    renderAssignmentCards(assignmentData.assignments || assignmentData);
  }

  const buildLabel = qs("[data-build-label]");
  if (buildLabel) {
    buildLabel.textContent = platformConfig.buildLabel;
  }
}

bootstrapPlatform();
