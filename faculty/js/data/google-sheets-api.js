(function (global) {
  class GoogleSheetsApi {
    constructor(config) {
      this.config = config;
      this.logger = this.createLogger();
    }

    createLogger() {
      return {
        log(message, level = 'info') {
          if (!this.config.loggingEnabled) {
            return;
          }
          console[level](message);
        }
      };
    }

    async request(endpoint, payload = {}, options = {}) {
      const url = `${this.config.apiBaseUrl}/${endpoint}`;
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, appName: this.config.appName, version: this.config.version }),
        signal: AbortSignal.timeout(options.timeout || this.config.timeout)
      };

      let lastError = null;
      for (let attempt = 0; attempt <= this.config.retryCount; attempt += 1) {
        try {
          this.logger.log(`[${endpoint}] Request attempt ${attempt + 1}`);
          const response = await fetch(url, requestOptions);
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error;
          this.logger.log(`[${endpoint}] ${error.message}`, 'warn');
          if (attempt < this.config.retryCount) {
            await this.delay(this.config.retryDelay * (attempt + 1));
          }
        }
      }

      throw lastError || new Error('API request failed');
    }

    delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
  }

  global.GoogleSheetsApiClient = GoogleSheetsApi;
})(window);
