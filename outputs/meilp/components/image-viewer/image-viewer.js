window.MEILP = window.MEILP || {};

/**
 * Reusable responsive image viewer with zoom, pan, fullscreen, loading, and
 * error states. It is assignment-agnostic and fully configuration driven.
 */
class ImageViewerComponent extends window.MEILP.BaseComponent {
  constructor(options = {}) {
    super(options);
    this.zoomLevel = 1;
    this.minZoom = 1;
    this.maxZoom = Number(this.config.maxZoom || 4);
    this.zoomStep = Number(this.config.zoomStep || 0.2);
    this.position = { x: 0, y: 0 };
    this.isPanning = false;
    this.lastPointer = { x: 0, y: 0 };
    this.lastPinchDistance = 0;
    this.fullscreenActive = false;
    this.boundHandlers = {};
  }

  static register(registry) {
    registry.register("image-viewer", ImageViewerComponent);
  }

  render() {
    this.element = document.createElement("section");
    this.element.className = "meilp-component image-viewer-component";
    this.element.innerHTML = `
      <div class="card component-card">
        <div class="card-header">
          <div>
            <span class="component-kicker">${this.escape(this.config.figure || "Figure")}</span>
            <h2>${this.escape(this.config.title || "Image Viewer")}</h2>
          </div>
          <div class="image-toolbar" aria-label="Image controls">
            <button class="btn btn-icon" type="button" data-image-zoom-out aria-label="Zoom out"><i class="bi bi-zoom-out" aria-hidden="true"></i></button>
            <button class="btn btn-icon" type="button" data-image-reset aria-label="Reset zoom"><i class="bi bi-aspect-ratio" aria-hidden="true"></i></button>
            <button class="btn btn-icon" type="button" data-image-zoom-in aria-label="Zoom in"><i class="bi bi-zoom-in" aria-hidden="true"></i></button>
            <button class="btn btn-icon" type="button" data-image-fullscreen aria-label="Toggle fullscreen"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="card-body">
          <figure class="image-figure">
            <div class="image-stage" data-image-stage>
              <div class="image-spinner" data-image-spinner>
                <span class="spinner-border text-primary" aria-hidden="true"></span>
                <span class="visually-hidden">Loading image</span>
              </div>
              <img data-viewer-image alt="${this.escape(this.config.alt || this.config.title || "Configurable engineering image")}" loading="lazy" draggable="false">
            </div>
            <figcaption>
              <strong>${this.escape(this.config.figure || "")}</strong>
              <span>${this.escape(this.config.description || "")}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    `;

    this.bindEvents();
    this.load();
    this.applyFeatureFlags();
    return this.element;
  }

  load() {
    const image = this.getImageElement();
    const source = this.config.image || this.config.placeholderImage || "../assets/images/image-placeholder.svg";
    this.setLoading(true);
    image.dataset.errorFallbackActive = "false";
    image.src = source;
    return source;
  }

  setImage(source, options = {}) {
    this.config.image = source;
    if (options.title) {
      this.config.title = options.title;
    }
    this.resetZoom();
    return this.load();
  }

  zoomIn() {
    return this.setZoom(this.zoomLevel + this.zoomStep);
  }

  zoomOut() {
    return this.setZoom(this.zoomLevel - this.zoomStep);
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.position = { x: 0, y: 0 };
    this.applyTransform();
    this.emit("zoom-changed", this.serialize());
  }

  fitToScreen() {
    this.resetZoom();
  }

  serialize() {
    return {
      componentId: this.config.id,
      image: this.config.image || null,
      zoom: this.zoomLevel,
      position: { ...this.position },
      fullscreen: this.fullscreenActive
    };
  }

  bindEvents() {
    const image = this.getImageElement();
    const stage = this.getStageElement();

    this.boundHandlers.load = () => this.handleImageLoaded();
    this.boundHandlers.error = () => this.handleImageError();
    this.boundHandlers.wheel = (event) => this.handleWheel(event);
    this.boundHandlers.pointerDown = (event) => this.startPan(event);
    this.boundHandlers.pointerMove = (event) => this.movePan(event);
    this.boundHandlers.pointerUp = () => this.endPan();
    this.boundHandlers.touchStart = (event) => this.handleTouchStart(event);
    this.boundHandlers.touchMove = (event) => this.handleTouchMove(event);
    this.boundHandlers.fullscreenChange = () => this.handleFullscreenChange();

    image.addEventListener("load", this.boundHandlers.load);
    image.addEventListener("error", this.boundHandlers.error);
    stage.addEventListener("wheel", this.boundHandlers.wheel, { passive: false });
    stage.addEventListener("pointerdown", this.boundHandlers.pointerDown);
    stage.addEventListener("pointermove", this.boundHandlers.pointerMove);
    stage.addEventListener("pointerup", this.boundHandlers.pointerUp);
    stage.addEventListener("pointerleave", this.boundHandlers.pointerUp);
    stage.addEventListener("touchstart", this.boundHandlers.touchStart, { passive: false });
    stage.addEventListener("touchmove", this.boundHandlers.touchMove, { passive: false });
    document.addEventListener("fullscreenchange", this.boundHandlers.fullscreenChange);

    this.element.querySelector("[data-image-zoom-in]").addEventListener("click", () => this.zoomIn());
    this.element.querySelector("[data-image-zoom-out]").addEventListener("click", () => this.zoomOut());
    this.element.querySelector("[data-image-reset]").addEventListener("click", () => this.resetZoom());
    this.element.querySelector("[data-image-fullscreen]").addEventListener("click", () => this.toggleFullscreen());
  }

  applyFeatureFlags() {
    const zoomEnabled = this.config.zoom !== false;
    const fullscreenEnabled = this.config.fullscreen !== false;
    this.element.querySelectorAll("[data-image-zoom-in], [data-image-zoom-out], [data-image-reset]").forEach((button) => {
      button.hidden = !zoomEnabled;
    });
    this.element.querySelector("[data-image-fullscreen]").hidden = !fullscreenEnabled;
  }

  handleImageLoaded() {
    this.setLoading(false);
    this.emit("image-loaded", this.serialize());
  }

  handleImageError() {
    const image = this.getImageElement();
    const errorImage = this.config.errorImage || "../assets/images/image-error.svg";
    if (image.dataset.errorFallbackActive === "true") {
      this.setLoading(false);
      return;
    }
    image.dataset.errorFallbackActive = "true";
    image.src = errorImage;
    this.setLoading(false);
    this.emit("image-error", this.serialize());
  }

  handleWheel(event) {
    if (this.config.zoom === false) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY < 0 ? this.zoomStep : -this.zoomStep;
    this.setZoom(this.zoomLevel + delta);
  }

  startPan(event) {
    if (this.zoomLevel <= 1) {
      return;
    }
    this.isPanning = true;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.getStageElement().setPointerCapture(event.pointerId);
  }

  movePan(event) {
    if (!this.isPanning || this.zoomLevel <= 1) {
      return;
    }
    const deltaX = event.clientX - this.lastPointer.x;
    const deltaY = event.clientY - this.lastPointer.y;
    this.position.x += deltaX;
    this.position.y += deltaY;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.applyTransform();
  }

  endPan() {
    this.isPanning = false;
  }

  handleTouchStart(event) {
    if (event.touches.length === 2) {
      this.lastPinchDistance = this.getPinchDistance(event.touches);
    }
  }

  handleTouchMove(event) {
    if (event.touches.length !== 2 || this.config.zoom === false) {
      return;
    }
    event.preventDefault();
    const distance = this.getPinchDistance(event.touches);
    const delta = distance > this.lastPinchDistance ? this.zoomStep : -this.zoomStep;
    this.lastPinchDistance = distance;
    this.setZoom(this.zoomLevel + delta);
  }

  getPinchDistance(touches) {
    const x = touches[0].clientX - touches[1].clientX;
    const y = touches[0].clientY - touches[1].clientY;
    return Math.hypot(x, y);
  }

  setZoom(value) {
    const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, Number(value.toFixed(2))));
    this.zoomLevel = nextZoom;
    if (this.zoomLevel === 1) {
      this.position = { x: 0, y: 0 };
    }
    this.applyTransform();
    this.emit("zoom-changed", this.serialize());
    return this.zoomLevel;
  }

  applyTransform() {
    const image = this.getImageElement();
    const stage = this.getStageElement();
    const markerLayer = stage ? stage.querySelector(".label-marker-layer") : null;
    const transform = `translate(${this.position.x}px, ${this.position.y}px) scale(${this.zoomLevel})`;
    if (image) {
      image.style.transform = transform;
    }
    if (markerLayer) {
      markerLayer.style.transform = transform;
    }
    this.element.querySelector("[data-image-zoom-out]").disabled = this.zoomLevel <= this.minZoom;
    this.element.querySelector("[data-image-zoom-in]").disabled = this.zoomLevel >= this.maxZoom;
  }

  toggleFullscreen() {
    const card = this.element.querySelector(".component-card");
    if (!card.requestFullscreen || !document.exitFullscreen) {
      return;
    }
    if (!document.fullscreenElement) {
      card.requestFullscreen();
      return;
    }
    document.exitFullscreen();
  }

  handleFullscreenChange() {
    this.fullscreenActive = Boolean(document.fullscreenElement && this.element.contains(document.fullscreenElement));
    this.element.classList.toggle("image-viewer-fullscreen", this.fullscreenActive);
    this.emit(this.fullscreenActive ? "fullscreen-opened" : "fullscreen-closed", this.serialize());
  }

  setLoading(isLoading) {
    const spinner = this.element.querySelector("[data-image-spinner]");
    spinner.hidden = !isLoading;
    this.getStageElement().classList.toggle("is-loading", isLoading);
  }

  getImageElement() {
    return this.element.querySelector("[data-viewer-image]");
  }

  getStageElement() {
    return this.element.querySelector("[data-image-stage]");
  }

  emit(eventName, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventName, payload);
    }
  }

  escape(value) {
    return window.MEILP.escapeHtml ? window.MEILP.escapeHtml(value) : String(value);
  }

  destroy() {
    const image = this.getImageElement();
    const stage = this.getStageElement();
    if (image && this.boundHandlers.load) {
      image.removeEventListener("load", this.boundHandlers.load);
      image.removeEventListener("error", this.boundHandlers.error);
      stage.removeEventListener("wheel", this.boundHandlers.wheel);
      stage.removeEventListener("pointerdown", this.boundHandlers.pointerDown);
      stage.removeEventListener("pointermove", this.boundHandlers.pointerMove);
      stage.removeEventListener("pointerup", this.boundHandlers.pointerUp);
      stage.removeEventListener("pointerleave", this.boundHandlers.pointerUp);
      stage.removeEventListener("touchstart", this.boundHandlers.touchStart);
      stage.removeEventListener("touchmove", this.boundHandlers.touchMove);
      document.removeEventListener("fullscreenchange", this.boundHandlers.fullscreenChange);
    }
    super.destroy();
  }
}

window.MEILP.ImageViewerComponent = ImageViewerComponent;
window.MEILP.registerImageViewerComponent = ImageViewerComponent.register;
