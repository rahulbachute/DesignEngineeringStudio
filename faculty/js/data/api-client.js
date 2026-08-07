(function (global) {
  class ApiClient {
    constructor(config = global.DESConfig || {}) {
      this.config = config;
      this.logger = global.DESLogger ? global.DESLogger('ApiClient', config) : console;
    }

    /**
     * Send a GET request to the configured endpoint.
     * @param {string} endpoint - Endpoint name.
     * @param {object} payload - Request payload.
     * @param {object} options - Request options.
     * @returns {Promise<object>}
     */
    async get(endpoint, payload = {}, options = {}) {
      return this.request(endpoint, payload, { ...options, method: 'GET' });
    }

    /**
     * Send a POST request to the configured endpoint.
     * @param {string} endpoint - Endpoint name.
     * @param {object} payload - Request payload.
     * @param {object} options - Request options.
     * @returns {Promise<object>}
     */
    async post(endpoint, payload = {}, options = {}) {
      return this.request(endpoint, payload, { ...options, method: 'POST' });
    }

    /**
     * Send a request with retry, timeout, and response validation.
     * @param {string} endpoint - Endpoint name.
     * @param {object} payload - Request payload.
     * @param {object} options - Request options.
     * @returns {Promise<object>}
     */
    async request(endpoint, payload = {}, options = {}) {
      const url = this.buildUrl(endpoint);
      const requestOptions = {
        method: options.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: this.buildBody(payload),
        signal: this.createAbortSignal(options.timeout || this.config.timeout)
      };

      let lastError = null;
      for (let attempt = 0; attempt <= (this.config.retryCount || 0); attempt += 1) {
        try {
          this.logger.info(`Calling ${endpoint}`, { attempt: attempt + 1, url });
          const response = await fetch(url, requestOptions);
          const data = await this.parseResponse(response);
          this.validateResponse(data);
          return data;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Request failed for ${endpoint}`, error.message);
          if (attempt < (this.config.retryCount || 0)) {
            await this.delay((this.config.retryDelay || 0) * (attempt + 1));
          }
        }
      }

      throw lastError || new Error('API request failed');
    }

    buildUrl(endpoint) {
      const baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');
      const normalizedEndpoint = endpoint.replace(/^\//, '');
      return `${baseUrl}/${normalizedEndpoint}`;
    }

    buildBody(payload) {
      return JSON.stringify({
        ...payload,
        appName: this.config.appName,
        version: this.config.version,
        mode: this.config.appMode || 'DEVELOPMENT'
      });
    }

    createAbortSignal(timeout) {
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
        return AbortSignal.timeout(timeout || this.config.timeout);
      }
      return undefined;
    }

    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const text = await response.text();
      if (!text) {
        return {};
      }
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error('Invalid JSON response');
      }
    }

    validateResponse(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response payload');
      }
      if (data.error) {
        throw new Error(data.error);
      }
    }

    delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
  }

  global.ApiClient = ApiClient;
})(window);
