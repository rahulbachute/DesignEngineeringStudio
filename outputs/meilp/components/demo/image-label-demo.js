window.addEventListener("DOMContentLoaded", () => {
  const storage = new window.MEILP.StorageService("meilp-image-label-demo");
  const engine = new window.MEILP.PlatformEngine({
    storage,
    config: window.MEILP.platformConfig
  });
  const services = engine.getServices();
  window.MEILP.registerSprint2BComponents(services.componentRegistry);

  const imageLabel = services.componentRegistry.create("image-label", {
    config: {
      id: "imageLabelDemo",
      title: "Identify Diagram Areas",
      imageTitle: "Configurable Label Image",
      figure: "Figure Demo",
      description: "Marker positions are loaded from component configuration.",
      image: "../../assets/images/generic-engineering-diagram.svg",
      placeholderImage: "../../assets/images/image-placeholder.svg",
      errorImage: "../../assets/images/image-error.svg",
      labels: [
        { id: 1, x: 45.5, y: 16.5, placeholder: "Component 1" },
        { id: 2, x: 63, y: 33, placeholder: "Component 2" },
        { id: 3, x: 56.2, y: 64.5, placeholder: "Component 3" },
        { id: 4, x: 28, y: 76.5, placeholder: "Component 4" }
      ]
    },
    stateManager: services.stateManager,
    eventBus: services.eventBus
  });

  document.querySelector("[data-image-label-demo]").append(imageLabel.render());
  bindLabelDemoControls(imageLabel);
  bindLabelDemoEvents(services.eventBus);
});

function bindLabelDemoControls(component) {
  document.querySelector("[data-demo-save]").addEventListener("click", () => component.save());
  document.querySelector("[data-demo-reload]").addEventListener("click", () => component.setValue(component.load()));
  document.querySelector("[data-demo-reset]").addEventListener("click", () => component.reset());
}

function bindLabelDemoEvents(eventBus) {
  ["label-updated", "label-saved", "label-reset", "validation-complete", "image-loaded", "zoom-changed"].forEach((eventName) => {
    eventBus.listen(eventName, (payload) => addDemoLog(eventName, payload));
  });
}

function addDemoLog(eventName, payload = {}) {
  const log = document.querySelector("[data-event-log]");
  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${window.MEILP.escapeHtml(eventName)}</strong>
    <span>${window.MEILP.escapeHtml(summarizeLabelPayload(payload))}</span>
  `;
  log.prepend(item);
}

function summarizeLabelPayload(payload) {
  if (typeof payload.valid === "boolean") {
    return payload.valid ? "valid" : "needs attention";
  }
  if (payload.validation) {
    return payload.validation.valid ? "saved valid labels" : "saved with validation messages";
  }
  if (typeof payload.zoom === "number") {
    return `viewer zoom ${payload.zoom.toFixed(2)}x`;
  }
  return payload.componentId || "event emitted";
}
