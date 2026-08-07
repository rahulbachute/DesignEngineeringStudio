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

      const response = await fetch(this.requestUrl(), {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

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

      if (data.ok === false) {
        return {
          ok: false,
          queued: false,
          code: data.code || "SERVER_REJECTED",
          message: data.message || "Submission rejected.",
          status: response.status,
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

  requestUrl() {

    if (!this.config.apiKey) {
      return this.config.submissionWebAppUrl;
    }

    const url = new URL(
      this.config.submissionWebAppUrl,
      window.location.href
    );

    url.searchParams.set("apiKey", this.config.apiKey);

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
