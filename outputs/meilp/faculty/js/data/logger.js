(function (global) {
  class Logger {
    constructor(moduleName = 'DES', config = global.DESConfig || {}) {
      this.moduleName = moduleName;
      this.config = config;
      this.transport = [];
    }

    /**
     * Log an informational message.
     * @param {string} message - Message to log.
     * @param {*} details - Optional detail payload.
     */
    info(message, details = null) {
      this.write('info', message, details);
    }

    /**
     * Log a warning message.
     * @param {string} message - Message to log.
     * @param {*} details - Optional detail payload.
     */
    warn(message, details = null) {
      this.write('warn', message, details);
    }

    /**
     * Log an error message.
     * @param {string} message - Message to log.
     * @param {*} details - Optional detail payload.
     */
    error(message, details = null) {
      this.write('error', message, details);
    }

    /**
     * Log a debug message.
     * @param {string} message - Message to log.
     * @param {*} details - Optional detail payload.
     */
    debug(message, details = null) {
      this.write('debug', message, details);
    }

    /**
     * Write a structured log entry.
     * @param {string} level - Log level.
     * @param {string} message - Message to log.
     * @param {*} details - Optional detail payload.
     */
    write(level, message, details = null) {
      if (!this.config.loggingEnabled) {
        return;
      }

      const entry = {
        level: level.toUpperCase(),
        timestamp: new Date().toISOString(),
        module: this.moduleName,
        message,
        details
      };

      this.transport.forEach((transport) => transport(entry));

      if (typeof console !== 'undefined') {
        const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'debug' ? 'debug' : 'log';
        const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.module}]`;
        if (details !== null) {
          console[consoleMethod](prefix, message, details);
        } else {
          console[consoleMethod](prefix, message);
        }
      }
    }

    /**
     * Register a custom transport for log output.
     * @param {Function} transport - Callback receiving a log entry.
     */
    addTransport(transport) {
      if (typeof transport === 'function') {
        this.transport.push(transport);
      }
    }
  }

  const createLogger = (moduleName = 'DES', config = global.DESConfig || {}) => new Logger(moduleName, config);

  global.DESLogger = createLogger;
  global.Logger = Logger;
})(window);
