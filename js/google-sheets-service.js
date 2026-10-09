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
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "submit",
          ...payload
        })
      });

      if (response.type === "opaque" || response.status === 0) {
        return this.failure(
          "Submission could not be verified by Google Sheets. Please retry when the backend returns a readable confirmation.",
          "UNVERIFIED_RESPONSE",
          response.status
        );
      }

      if (!response.ok) {
        return this.failure(
          `Google Sheets returned HTTP ${response.status}.`,
          "HTTP_ERROR",
          response.status
        );
      }

      const text = await response.text();

      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          return this.failure(
            "Google Sheets returned a response that could not be verified.",
            "INVALID_RESPONSE",
            response.status
          );
        }
      }

      if (!data) {
        return {
          ok: false,
          queued: false,
          code: "UNVERIFIED_RESPONSE",
          message: "Google Sheets did not confirm that the submission was saved.",
          status: response.status,
          data
        };
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

      if (data.success !== true && data.ok !== true) {
        return {
          ok: false,
          queued: false,
          code: "UNVERIFIED_RESPONSE",
          message: "Google Sheets did not confirm that the submission was saved.",
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
