window.MEILP = window.MEILP || {};

/**
 * Decoupled publish/subscribe service for platform and component events.
 * Components should communicate through this bus instead of importing each other.
 */
class EventBus {
  /**
   * Creates an empty event listener registry.
   */
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Registers a listener and returns an unsubscribe function.
   */
  listen(eventName, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("EventBus listener must be a function.");
    }

    const handlers = this.listeners.get(eventName) || new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);

    return () => this.remove(eventName, handler);
  }

  /**
   * Emits an event payload to a stable snapshot of current listeners.
   */
  emit(eventName, payload = {}) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    Array.from(handlers).forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        window.setTimeout(() => {
          throw error;
        }, 0);
      }
    });
  }

  /**
   * Removes a previously registered listener.
   */
  remove(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }
}

window.MEILP.EventBus = EventBus;
