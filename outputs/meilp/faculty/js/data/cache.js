(function (global) {
  class CacheStore {
    constructor(expiryMs = 5 * 60 * 1000) {
      this.expiryMs = expiryMs;
      this.storage = new Map();
    }

    /**
     * Retrieve a value from the in-memory cache if it is still fresh.
     * @param {string} key - Cache key.
     * @returns {*} Cached value or null.
     */
    get(key) {
      const entry = this.storage.get(key);
      if (!entry) {
        return null;
      }
      if (Date.now() - entry.timestamp > this.expiryMs) {
        this.storage.delete(key);
        return null;
      }
      return entry.value;
    }

    /**
     * Store a value in the in-memory cache.
     * @param {string} key - Cache key.
     * @param {*} value - Value to cache.
     */
    set(key, value) {
      this.storage.set(key, { value, timestamp: Date.now() });
    }

    /**
     * Remove a single cached value.
     * @param {string} key - Cache key.
     */
    clear(key) {
      this.storage.delete(key);
    }

    /**
     * Clear the full cache store.
     */
    clearAll() {
      this.storage.clear();
    }
  }

  const CacheService = {
    /**
     * Create a new cache store instance.
     * @param {number} expiryMs - Expiration time in milliseconds.
     * @returns {CacheStore}
     */
    createStore(expiryMs) {
      return new CacheStore(expiryMs);
    }
  };

  global.DESCache = CacheService;
})(window);
