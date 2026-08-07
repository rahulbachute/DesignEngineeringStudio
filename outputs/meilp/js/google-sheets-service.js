window.MEILP = window.MEILP || {};

class GoogleSheetsService {

  constructor({ config = {}, now = () => new Date() } = {}) {
    this.config = {
      submissionWebAppUrl: "",
      requestTimeoutMs: 10000,
      apiKey: "",
      ...config
    };

    this.now = now;
  }

  isConfigured() {
    return Boolean(this.config.submissionWebAppUrl);
  }

  async submit(payload) {

    if (!this.isConfigured()) {
      return this.failure(
        "Google Sheets submission endpoint is not configured.",
        "CONFIG_MISSING"
      );
    }

    try {

      const response = await fetch(this.requestUrl("submit"), {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "submit",
          ...payload
        })
      });

      // In no-cors mode, Google Apps Script redirects result in an opaque response.
      // If we reach here without a network error, the POST request was successfully sent.
      if (response.type === "opaque" || response.status === 0) {
        return {
          ok: true,
          queued: false,
          code: "SUBMITTED",
          message: "Submission successful.",
          submittedAt: this.now().toISOString(),
          data: {}
        };
      }

      if (!response.ok) {
        return this.failure(
          `Google Sheets returned HTTP ${response.status}.`,
          "HTTP_ERROR",
          response.status
        );
      }

      const text = await response.text();

      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }

      if (data.ok === false || data.success === false) {
        return {
          ok: false,
          queued: false,
          code: data.code || "SERVER_REJECTED",
          message: data.message || data.error || "Submission rejected.",
          status: data.statusCode || response.status,
          data
        };
      }

      return {
        ok: true,
        queued: false,
        code: "SUBMITTED",
        message: data.message || "Submission successful.",
        submittedAt: this.now().toISOString(),
        data
      };

    } catch (error) {

      return {
        ok: false,
        queued: false,
        code: "NETWORK_ERROR",
        message: error.message || "Unable to reach Google Sheets.",
        status: null
      };

    }

  }

  requestUrl(action = "") {

    const url = new URL(
      this.config.submissionWebAppUrl,
      window.location.href
    );

    if (action) {
      url.searchParams.set("action", action);
    }

    if (this.config.apiKey) {
      url.searchParams.set("apiKey", this.config.apiKey);
    }

    return url.toString();
  }

  failure(message, code, status = null) {
    return {
      ok: false,
      queued: false,
      code,
      status,
      message
    };
  }

}

window.MEILP.GoogleSheetsService = GoogleSheetsService;
