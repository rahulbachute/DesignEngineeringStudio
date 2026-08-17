window.DESAnalytics = window.DESAnalytics || {};

window.DESAnalytics.charts = {
  instances: [],

  render(model, config) {
    this.destroy();
    const colors = config.chartColors;
    this.instances.push(this.bar("coChart", model.coAttainment, colors.primary, colors.accent));
    this.instances.push(this.pie("bloomChart", model.bloomDistribution, colors));
    this.instances.push(this.radar("poChart", model.poMapping, colors.primary, colors.accent));
    this.instances.push(this.radar("skillChart", model.skillDevelopment, colors.secondary, colors.accent));
    this.instances.push(this.line("trendChart", model.learningTrend, colors.primary, colors.accent));
  },

  bar(canvasId, values, primary, accent) {
    return new Chart(document.getElementById(canvasId), {
      type: "bar",
      data: {
        labels: Object.keys(values),
        datasets: [{
          label: "Attainment",
          data: Object.values(values),
          backgroundColor: accent,
          borderColor: primary,
          borderWidth: 1
        }]
      },
      options: this.options({ max: 100 })
    });
  },

  pie(canvasId, values, colors) {
    return new Chart(document.getElementById(canvasId), {
      type: "doughnut",
      data: {
        labels: Object.keys(values),
        datasets: [{
          data: Object.values(values),
          backgroundColor: [colors.primary, colors.accent, colors.secondary, colors.success, colors.info, colors.warning]
        }]
      },
      options: this.options()
    });
  },

  radar(canvasId, values, primary, accent) {
    return new Chart(document.getElementById(canvasId), {
      type: "radar",
      data: {
        labels: Object.keys(values),
        datasets: [{
          label: "Score",
          data: Object.values(values),
          backgroundColor: this.withAlpha(accent, 0.22),
          borderColor: primary,
          pointBackgroundColor: accent
        }]
      },
      options: this.options({ max: 100 })
    });
  },

  line(canvasId, trend, primary, accent) {
    return new Chart(document.getElementById(canvasId), {
      type: "line",
      data: {
        labels: trend.map((item) => item.label),
        datasets: [{
          label: "Learning Trend",
          data: trend.map((item) => item.score),
          borderColor: primary,
          backgroundColor: this.withAlpha(accent, 0.18),
          pointBackgroundColor: accent,
          tension: 0.35,
          fill: true
        }]
      },
      options: this.options({ max: 100 })
    });
  },

  options(scale = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 12,
            font: { family: "IBM Plex Sans" }
          }
        }
      },
      scales: scale.max ? {
        r: { suggestedMin: 0, suggestedMax: scale.max },
        y: { beginAtZero: true, suggestedMax: scale.max }
      } : {}
    };
  },

  destroy() {
    this.instances.forEach((chart) => chart.destroy());
    this.instances = [];
  },

  withAlpha(hex, alpha) {
    const value = hex.replace("#", "");
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
};
