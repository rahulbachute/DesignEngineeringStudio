window.addEventListener("DOMContentLoaded", () => {
  const storage = new window.MEILP.StorageService("meilp-image-viewer-demo");
  const engine = new window.MEILP.PlatformEngine({
    storage,
    config: window.MEILP.platformConfig
  });
  const services = engine.getServices();
  window.MEILP.registerSprint2BComponents(services.componentRegistry);

  const viewer = services.componentRegistry.create("image-viewer", {
    config: {
      id: "imageViewerDemo",
      title: "Configurable Engineering Image",
      figure: "Figure Demo",
      description: "Neutral diagram used to verify the reusable image viewer.",
      image: "../../assets/images/generic-engineering-diagram.svg",
      placeholderImage: "../../assets/images/image-placeholder.svg",
      errorImage: "../../assets/images/image-error.svg",
      zoom: true,
      fullscreen: true
    },
    stateManager: services.stateManager,
    eventBus: services.eventBus
  });

  document.querySelector("[data-image-viewer-demo]").append(viewer.render());
  bindViewerDemoControls(viewer);
  bindViewerDemoEvents(services.eventBus);
});

function bindViewerDemoControls(viewer) {
  document.querySelector("[data-demo-zoom-in]").addEventListener("click", () => viewer.zoomIn());
  document.querySelector("[data-demo-zoom-out]").addEventListener("click", () => viewer.zoomOut());
  document.querySelector("[data-demo-reset]").addEventListener("click", () => viewer.resetZoom());
  document.querySelector("[data-demo-error]").addEventListener("click", () => viewer.setImage("missing-demo-image.png"));
}

function bindViewerDemoEvents(eventBus) {
  ["image-loaded", "image-error", "zoom-changed", "fullscreen-opened", "fullscreen-closed"].forEach((eventName) => {
    eventBus.listen(eventName, (payload) => addDemoLog(eventName, payload));
  });
}

function addDemoLog(eventName, payload = {}) {
  const log = document.querySelector("[data-event-log]");
  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${window.MEILP.escapeHtml(eventName)}</strong>
    <span>${window.MEILP.escapeHtml(summarizeViewerPayload(payload))}</span>
  `;
  log.prepend(item);
}

function summarizeViewerPayload(payload) {
  if (typeof payload.zoom === "number") {
    return `zoom ${payload.zoom.toFixed(2)}x`;
  }
  return payload.image || "event emitted";
}
