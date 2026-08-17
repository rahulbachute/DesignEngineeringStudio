window.MEILP = window.MEILP || {};

/**
 * Storage adapter boundary for MEILP.
 * Sprint 0 uses localStorage. Future adapters can implement the same methods
 * for Google Sheets, authenticated APIs, or LMS integrations.
 */
class StorageService {
  /**
   * Creates a namespaced storage adapter with an in-memory fallback.
   */
  constructor(namespace, driver = window.localStorage) {
    this.namespace = namespace;
    this.driver = this.resolveDriver(driver);
  }

  /**
   * Builds a fully namespaced storage key.
   */
  buildKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Reads and parses a stored value, returning fallback for malformed JSON or storage errors.
   */
  get(key, fallback = null) {
    try {
      const rawValue = this.driver.getItem(this.buildKey(key));
      if (rawValue === null) {
        return fallback;
      }
      return JSON.parse(rawValue);
    } catch {
      return fallback;
    }
  }

  /**
   * Serializes and stores a value.
   */
  set(key, value) {
    try {
      this.driver.setItem(this.buildKey(key), JSON.stringify(value));
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        throw error;
      }
      throw error;
    }
    return value;
  }

  /**
   * Removes one value from the namespace.
   */
  remove(key) {
    try {
      this.driver.removeItem(this.buildKey(key));
    } catch {
      // Storage removal failures are non-fatal for callers.
    }
  }

  /**
   * Removes all values stored under the namespace.
   */
  clearNamespace() {
    this.keys()
      .filter((key) => key.startsWith(`${this.namespace}:`))
      .forEach((key) => {
        try {
          this.driver.removeItem(key);
        } catch {
          // Continue clearing remaining keys.
        }
      });
  }

  /**
   * Returns available storage keys for browser and memory drivers.
   */
  keys() {
    if (typeof this.driver.length === "number" && typeof this.driver.key === "function") {
      const keys = [];
      for (let index = 0; index < this.driver.length; index += 1) {
        const key = this.driver.key(index);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    }
    return Object.keys(this.driver);
  }

  /**
   * Selects a usable storage driver, falling back to memory when localStorage is unavailable.
   */
  resolveDriver(driver) {
    try {
      const testKey = "__meilp_storage_test__";
      driver.setItem(testKey, "1");
      driver.removeItem(testKey);
      return driver;
    } catch {
      return this.createMemoryDriver();
    }
  }

  /**
   * Creates a small localStorage-compatible in-memory driver.
   */
  createMemoryDriver() {
    const data = {};
    return {
      get length() {
        return Object.keys(data).length;
      },
      key(index) {
        return Object.keys(data)[index] || null;
      },
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      setItem(key, value) {
        data[key] = String(value);
      },
      removeItem(key) {
        delete data[key];
      }
    };
  }

  /**
   * Detects browser quota errors across engines.
   */
  isQuotaExceeded(error) {
    return Boolean(error && (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    ));
  }
}

window.MEILP.StorageService = StorageService;
