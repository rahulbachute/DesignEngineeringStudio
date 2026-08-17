window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.ui = {
  render(model) {
    this.text("[data-student-name]", model.student.name);
    this.text("[data-roll-number]", model.student.rollNumber);
    this.text("[data-division]", model.student.division);
    this.text("[data-batch]", model.student.batch);
    this.text("[data-semester]", model.student.currentSemester);
    this.text("[data-overall-percent]", `${model.computed.completionPercent}%`);
    this.text("[data-completed-challenges]", model.computed.completedLabel);
    this.text("[data-pending-challenges]", model.computed.pendingChallenges);
    this.text("[data-average-score]", model.computed.averageScoreLabel);
    this.text("[data-submission-status]", model.computed.submissionStatus);
    this.text("[data-total-hours]", `${model.summary.totalHours} Hours`);
    this.text("[data-rank]", `#${model.summary.leaderboardRank}`);

    const progress = document.querySelector("[data-overall-progress-bar]");
    progress.style.width = `${model.computed.completionPercent}%`;
    progress.closest(".progress").setAttribute("aria-valuenow", String(model.computed.completionPercent));

    this.renderChallengeHistory(model.challengeHistory);
    this.renderBadges(model.badges);
    this.renderFeedback(model.facultyFeedback);
    this.renderReflections(model.reflections);
    this.renderLeaderboard(model.leaderboard);
  },

  renderChallengeHistory(items) {
    document.querySelector("[data-challenge-history]").innerHTML = items.map((item) => `
      <tr>
        <td>${this.escape(item.challenge)}</td>
        <td>${this.escape(item.marks)}</td>
        <td><span class="status-pill ${item.status === "Completed" ? "status-completed" : "status-pending"}">${this.escape(item.status)}</span></td>
        <td>${this.escape(item.date)}</td>
      </tr>
    `).join("");
  },

  renderBadges(items) {
    document.querySelector("[data-badges]").innerHTML = items.map((item) => `
      <article class="engineering-badge">
        <i class="bi ${this.escape(item.icon)}" aria-hidden="true"></i>
        <strong>${this.escape(item.name)}</strong>
        <p>${this.escape(item.description)}</p>
      </article>
    `).join("");
  },

  renderFeedback(items) {
    document.querySelector("[data-feedback]").innerHTML = items.map((item) => `
      <article class="feedback-item">
        <strong>${this.escape(item.comment)}</strong>
        <p>${this.escape(item.area)} | ${this.escape(item.date)}</p>
      </article>
    `).join("");
  },

  renderReflections(items) {
    document.querySelector("[data-reflections]").innerHTML = items.map((item) => `
      <article class="reflection-item">
        <strong>${this.escape(item.challenge)}: ${this.escape(item.question)}</strong>
        <p>${this.escape(item.answer)}</p>
      </article>
    `).join("");
  },

  renderLeaderboard(items) {
    document.querySelector("[data-leaderboard]").innerHTML = items.map((item) => `
      <tr>
        <td>#${item.rank}</td>
        <td>${this.escape(item.name)}</td>
        <td>${this.escape(item.class || "-")}</td>
        <td>${this.escape(item.division || "-")}</td>
        <td>${item.score}</td>
        <td>${item.badges}</td>
      </tr>
    `).join("");
  },

  bindViewSwitch() {
    document.body.dataset.viewMode = "student";
    document.querySelectorAll("[data-view-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-view-mode]").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        document.body.dataset.viewMode = button.dataset.viewMode;
      });
    });
  },

  text(selector, value) {
    document.querySelector(selector).textContent = value;
  },

  escape(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }
};
