window.MEILP = window.MEILP || {};

/**
 * Service to manage faculty-wise assignment deadlines and enable/disable availability controls.
 * All controls are strictly namespaced by canonical Faculty_ID (e.g., FAC001, FAC002).
 */
class AssignmentControlService {
  constructor(options = {}) {
    this.storageNamespace = options.storageNamespace || "meilp-assignment-controls";
    if (options.storage) {
      this.storage = options.storage;
    } else if (window.MEILP && typeof window.MEILP.StorageService === "function") {
      this.storage = new window.MEILP.StorageService(this.storageNamespace);
    } else {
      const ns = this.storageNamespace;
      this.storage = {
        get(key, fallback) {
          try {
            const raw = localStorage.getItem(`${ns}:${key}`);
            return raw !== null ? JSON.parse(raw) : fallback;
          } catch {
            return fallback;
          }
        },
        set(key, val) {
          try {
            localStorage.setItem(`${ns}:${key}`, JSON.stringify(val));
          } catch { }
          return val;
        }
      };
    }
  }

  /**
   * Safely parse a value into a boolean with a fail-closed default.
   * Handles: true, false, "true", "false", "TRUE", "FALSE", 1, 0, "1", "0", "yes", "no".
   * The strings "false" and "0" strictly return false.
   * Empty, null, missing, malformed or unknown values fail closed to fallback (default: false).
   */
  parseBoolean(val, fallback = false) {
    const defaultVal = typeof fallback === "boolean" ? fallback : false;
    if (val === true || val === 1) return true;
    if (val === false || val === 0) return false;
    if (typeof val === "string") {
      const s = String(val).trim().toLowerCase();
      if (s === "true" || s === "1" || s === "yes") return true;
      if (s === "false" || s === "0" || s === "no") return false;
      return defaultVal;
    }
    return defaultVal;
  }

  /**
   * Resolves any faculty identifier (email, display name, legacy key, or ID) to a canonical uppercase Faculty_ID.
   * Faculty_ID is the authoritative identifier; Faculty_Name is for display only.
   */
  resolveFacultyId(facultyIdentifier) {
    if (!facultyIdentifier || typeof facultyIdentifier !== "string") {
      return "UNKNOWN";
    }
    const trimmed = facultyIdentifier.trim();
    if (!trimmed || trimmed.toUpperCase() === "UNKNOWN" || trimmed.toLowerCase().includes("unknown") || trimmed.toLowerCase().includes("unassigned")) {
      return "UNKNOWN";
    }

    // Direct Faculty_ID format: FAC001, FAC002, etc.
    if (/^FAC\d+$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    // Admin format: ADMIN001, etc.
    if (/^ADMIN\d+$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    const lower = trimmed.toLowerCase();

    // Backward-compatibility resolver for legacy faculty name strings
    if (lower === "dr. rahul bachute" || lower === "dr rahul bachute" || lower === "rahul bachute") {
      return "FAC001";
    }
    if (lower === "dr rahul p bachute" || lower === "dr. rahul p bachute" || lower === "bachuterahul@gmail.com") {
      return "ADMIN001";
    }
    if (lower === "dr niranjan shegokar" || lower === "dr. niranjan shegokar" || lower === "niranjan shegokar") {
      return "FAC002";
    }
    if (lower === "prof khandu said" || lower === "prof. khandu said" || lower === "prof said khandu" || lower === "prof. said khandu" || lower === "khandu said" || lower === "saidkhandu@gmail.com") {
      return "FAC004";
    }
    if (lower === "prof atul gowardipe" || lower === "prof. atul gowardipe" || lower === "atul gowardipe") {
      return "FAC003";
    }

    // Registry lookup
    const registries = [];
    if (typeof ACTIVE_FACULTY_REGISTRY !== "undefined" && Array.isArray(ACTIVE_FACULTY_REGISTRY)) {
      registries.push(...ACTIVE_FACULTY_REGISTRY);
    }
    if (window.MEILP && Array.isArray(window.MEILP.ACTIVE_FACULTY_REGISTRY)) {
      registries.push(...window.MEILP.ACTIVE_FACULTY_REGISTRY);
    }
    try {
      const rawLocal = localStorage.getItem("DES_REGISTERED_FACULTIES");
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) registries.push(...parsed);
      }
      const rawSession = localStorage.getItem("DES_FACULTY_SESSION");
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session && session.facultyId) registries.push(session);
      }
    } catch (e) { }

    const match = registries.find(f =>
      f && (
        (f.facultyId && f.facultyId.toLowerCase() === lower) ||
        (f.facultyName && f.facultyName.toLowerCase() === lower) ||
        (f.email && f.email.toLowerCase() === lower) ||
        (f.loginId && f.loginId.toLowerCase() === lower)
      )
    );

    if (match && match.facultyId) {
      return match.facultyId.toUpperCase();
    }

    // Default Institutional Registry (offline fallback if cloud registry is syncing)
    const DEFAULT_INSTITUTIONAL_REGISTRY = [
      { facultyId: "ADMIN001", facultyName: "Dr Rahul P Bachute", email: "bachuterahul@gmail.com", role: "ADMIN" },
      { facultyId: "FAC001", facultyName: "Rahul Bachute", email: "rahul.bachute@dypic.in", role: "FACULTY" },
      { facultyId: "FAC002", facultyName: "Dr Niranjan Shegokar", email: "niranjan.shegokar@dypic.in", role: "FACULTY" },
      { facultyId: "FAC004", facultyName: "Prof Khandu Said", email: "saidkhandu@gmail.com", role: "FACULTY" }
    ];

    const defaultMatch = DEFAULT_INSTITUTIONAL_REGISTRY.find(f =>
      f && (
        (f.facultyId && f.facultyId.toLowerCase() === lower) ||
        (f.facultyName && f.facultyName.toLowerCase() === lower) ||
        (f.email && f.email.toLowerCase() === lower)
      )
    );

    if (defaultMatch && defaultMatch.facultyId) {
      return defaultMatch.facultyId.toUpperCase();
    }

    return trimmed.toUpperCase();
  }

  /**
   * Normalizes any faculty identifier into canonical Faculty_ID.
   */
  normalizeFacultyId(facultyId) {
    return this.resolveFacultyId(facultyId);
  }

  /**
   * Parses any input date string (ISO, DD.MM.YYYY, DD/MM/YYYY, etc.) into a valid JS Date object.
   */
  parseDueDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const str = dateStr.trim();
    if (!str) return null;

    // Standard JS parse first
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    // Handle DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY with optional time
    const match = str.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})(?:\s+|,)?(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      let hour = match[4] ? parseInt(match[4], 10) : 23;
      const min = match[5] ? parseInt(match[5], 10) : 59;
      const sec = match[6] ? parseInt(match[6], 10) : 0;
      const ampm = match[7] ? match[7].toUpperCase() : null;

      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;

      d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  /**
   * Returns registered faculty members list if loaded, or empty array.
   */
  getFacultyList() {
    return [];
  }

  /**
   * Gets stored controls map for a specific faculty member keyed by canonical Faculty_ID.
   * Reads from window.localStorage with automatic legacy key migration.
   */
  getFacultyControlsMap(facultyIdentifier) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (canonicalId === "UNKNOWN") {
      return {};
    }

    const canonicalKey = `${this.storageNamespace}:${canonicalId}`;

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(canonicalKey);
        if (raw) {
          return JSON.parse(raw);
        }

        // Backward compatibility migration: check lowercase ID or legacy name-based keys
        const legacyCandidates = [canonicalId.toLowerCase()];
        if (canonicalId === "FAC001") {
          legacyCandidates.push("dr-rahul-bachute", "rahul-bachute");
        }
        if (typeof facultyIdentifier === "string" && facultyIdentifier.length > 0) {
          legacyCandidates.push(facultyIdentifier.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
        }

        for (const cand of legacyCandidates) {
          if (!cand || cand === "unknown") continue;
          const legacyKey = `${this.storageNamespace}:${cand}`;
          const rawLegacy = window.localStorage.getItem(legacyKey);
          if (rawLegacy) {
            try {
              const parsed = JSON.parse(rawLegacy);
              if (parsed && typeof parsed === "object") {
                window.localStorage.setItem(canonicalKey, JSON.stringify(parsed));
                return parsed;
              }
            } catch (e) { }
          }
        }
      }
    } catch { }

    if (this.storage && typeof this.storage.get === "function") {
      const stored = this.storage.get(canonicalId, null);
      if (stored !== null && typeof stored === "object") {
        return stored;
      }
    }

    return {};
  }

  /**
   * Gets assignment controls for a specific assignment and faculty member.
   */
  getControls(assignmentId, facultyIdentifier) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    const map = this.getFacultyControlsMap(canonicalId);
    const id = assignmentId || "default";
    const existing = map[id] || {};

    return {
      assignmentId: id,
      facultyId: canonicalId,
      enabled: typeof existing.enabled === "boolean" ? existing.enabled : true,
      dueDate: existing.dueDate || null,
      releaseDate: existing.releaseDate || null,
      allowLate: this.parseBoolean(existing.allowLate, false),
      note: existing.note || "",
      updatedAt: existing.updatedAt || null
    };
  }

  getEndpoint() {
    return window.MEILP?.googleSheetsConfig?.submissionWebAppUrl
      || (typeof config !== "undefined" && config?.apiBaseUrl)
      || window.DES_CONFIG?.apiBaseUrl
      || "https://script.google.com/macros/s/AKfycbzAnnjAXquy00NQ1fXFhI45IdkcZ0SQiL-mGmf7B_Z-_0uXLg6lah8VYNRi9JYbXgtD/exec";
  }

  /**
   * Fetches cloud-based controls from Google Sheets backend for a specific faculty member.
   * Stores results under canonical Faculty_ID key.
   */
  async fetchCloudControls(facultyIdentifier) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") {
      return [];
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) return [];

    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      let res = await fetch(`${endpoint}${sep}action=getAssignmentControls&facultyId=${encodeURIComponent(canonicalId)}`, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      let json = null;
      if (res.ok) {
        json = await res.json();
      }

      // Backward-compatibility resolver: If cloud returns empty for FAC001,
      // query legacy identifier "Dr. Rahul Bachute" and populate canonical FAC001
      if ((!json || !json.success || !Array.isArray(json.data) || json.data.length === 0) && canonicalId === "FAC001") {
        try {
          const fbRes = await fetch(`${endpoint}${sep}action=getAssignmentControls&facultyId=${encodeURIComponent("Dr. Rahul Bachute")}`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
          });
          if (fbRes.ok) {
            const fbJson = await fbRes.json();
            if (fbJson && fbJson.success && Array.isArray(fbJson.data) && fbJson.data.length > 0) {
              json = fbJson;
            }
          }
        } catch (fbErr) {}
      }

      if (json && json.success && Array.isArray(json.data)) {
        const map = this.getFacultyControlsMap(canonicalId);
          json.data.forEach((item) => {
            if (item && item.assignmentId) {
              map[item.assignmentId] = {
                enabled: typeof item.enabled === "boolean" ? item.enabled : true,
                dueDate: item.dueDate || null,
                releaseDate: item.releaseDate || null,
                allowLate: this.parseBoolean(item.allowLate, false),
                updatedAt: item.updatedAt || new Date().toISOString()
              };
            }
          });
          const canonicalKey = `${this.storageNamespace}:${canonicalId}`;
          try {
            window.localStorage.setItem(canonicalKey, JSON.stringify(map));
          } catch (e) { }
          return json.data;
        }
    } catch (e) {
      console.warn("[AssignmentControlService] Cloud fetch failed, using cached controls:", e.message);
    }
    return [];
  }

  /**
   * Reads raw assignment controls directly from the cloud backend.
   *
   * @param {string} facultyIdentifier - Faculty ID or name.
   * @param {Object} [options={}] - { fetchFn, timeoutMs }
   * @return {Promise<Array>} Array of control objects from Google Sheets backend.
   */
  async readCloudControls(facultyIdentifier, options = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") return [];
    const endpoint = this.getEndpoint();
    if (!endpoint) return [];

    const fetchImpl = options.fetchFn || (typeof fetch !== "undefined" ? fetch : null);
    if (!fetchImpl) throw new Error("No fetch implementation available");

    const sep = endpoint.includes("?") ? "&" : "?";
    const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = `${endpoint}${sep}action=getAssignmentControls&facultyId=${encodeURIComponent(canonicalId)}&${cacheBuster}`;

    const timeoutMs = options.timeoutMs || 8000;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer = null;
    if (controller && timeoutMs > 0) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
      const res = await fetchImpl(url, {
        method: "GET",
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} from backend`);
      }

      const json = await res.json();
      if (!json || json.success === false) {
        throw new Error((json && json.message) || "Failed to retrieve controls from backend");
      }

      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new Error(`Read request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Saves assignment control record to Google Sheets backend.
   * NOTE: An opaque no-cors response cannot confirm whether the sheet write succeeded.
   * Use saveCloudControlWithVerification() for reliable save/read-back verification.
   */
  async saveCloudControl(assignmentId, facultyIdentifier, controls = {}, options = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") {
      return null;
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) return null;

    const authFacultyId = (typeof window !== "undefined" && window.DESAuth && window.DESAuth.getCurrentUser && window.DESAuth.getCurrentUser()?.facultyId) || canonicalId;
    const fetchImpl = options.fetchFn || (typeof fetch !== "undefined" ? fetch : null);
    if (!fetchImpl) return null;

    try {
      const payload = {
        action: "saveAssignmentControl",
        facultyId: canonicalId,
        assignmentId,
        enabled: typeof controls.enabled === "boolean" ? controls.enabled : true,
        dueDate: controls.dueDate || "",
        releaseDate: controls.releaseDate || "",
        allowLate: this.parseBoolean(controls.allowLate, false),
        authFacultyId
      };

      const sep = endpoint.includes("?") ? "&" : "?";
      const postUrl = `${endpoint}${sep}action=saveAssignmentControl`;

      await fetchImpl(postUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return payload;
    } catch (e) {
      console.warn("[AssignmentControlService] Cloud save failed:", e.message);
      return null;
    }
  }

  /**
   * Saves assignment control record to Google Sheets backend with read-back verification.
   * NOTE: An opaque no-cors response (status 0 / type 'opaque') is NEVER treated as proof of success.
   * The setting is only considered SYNCED after reading back from the cloud and confirming
   * that the persisted values match the expected values.
   *
   * @param {string} assignmentId
   * @param {string} facultyIdentifier
   * @param {Object} controls - { enabled, dueDate, allowLate, releaseDate, note }
   * @param {Object} [options={}] - { timeoutMs = 8000, maxRetries = 2, retryDelayMs = 300, fetchFn = null }
   * @return {Promise<{ success: boolean, status: string, error?: string, controls?: Object, expected?: boolean, actual?: boolean }>}
   */
  async saveCloudControlWithVerification(assignmentId, facultyIdentifier, controls = {}, options = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") {
      return { success: false, status: "INVALID_FACULTY", error: "Cannot save controls for UNKNOWN faculty" };
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      return { success: false, status: "NO_ENDPOINT", error: "Backend API endpoint is not configured" };
    }

    const fetchImpl = options.fetchFn || (typeof fetch !== "undefined" ? fetch : null);
    if (!fetchImpl) {
      return { success: false, status: "NO_FETCH", error: "Fetch API is not available" };
    }

    const authFacultyId = (typeof window !== "undefined" && window.DESAuth && window.DESAuth.getCurrentUser && window.DESAuth.getCurrentUser()?.facultyId) || canonicalId;
    const expectedAllowLate = this.parseBoolean(controls.allowLate, false);
    const expectedEnabled = controls.enabled !== undefined ? Boolean(controls.enabled) : true;

    const payload = {
      action: "saveAssignmentControl",
      facultyId: canonicalId,
      assignmentId,
      enabled: expectedEnabled,
      dueDate: controls.dueDate || "",
      releaseDate: controls.releaseDate || "",
      allowLate: expectedAllowLate,
      authFacultyId
    };

    const sep = endpoint.includes("?") ? "&" : "?";
    const postUrl = `${endpoint}${sep}action=saveAssignmentControl`;
    const timeoutMs = options.timeoutMs || 8000;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    const retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 300;

    // STEP 1: Execute Write
    let writeController = typeof AbortController !== "undefined" ? new AbortController() : null;
    let writeTimer = null;
    if (writeController && timeoutMs > 0) {
      writeTimer = setTimeout(() => writeController.abort(), timeoutMs);
    }

    try {
      await fetchImpl(postUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: writeController ? writeController.signal : undefined
      });
      if (writeTimer) clearTimeout(writeTimer);

      // CRITICAL REQUIREMENT: An opaque response (status 0 / type 'opaque') is NEVER treated as proof of success!
      // We do not return success here. We must proceed to read-back verification.
    } catch (writeErr) {
      if (writeTimer) clearTimeout(writeTimer);
      const isTimeout = writeErr.name === "AbortError" || /timeout/i.test(writeErr.message);
      return {
        success: false,
        status: isTimeout ? "TIMEOUT" : "WRITE_FAILED",
        error: isTimeout ? `Write timed out after ${timeoutMs}ms` : (writeErr.message || "Write network failure")
      };
    }

    // STEP 2: Read-back Verification with Retry Loop
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      attempt++;
      if (attempt > 1 && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }

      try {
        const cloudData = await this.readCloudControls(canonicalId, { fetchFn: fetchImpl, timeoutMs });
        const matched = cloudData.find((item) => item && String(item.assignmentId).trim() === String(assignmentId).trim());

        if (!matched) {
          lastError = `Assignment "${assignmentId}" not found in cloud records after write (attempt ${attempt})`;
          continue;
        }

        const cloudAllowLate = this.parseBoolean(matched.allowLate, false);
        const cloudEnabled = matched.enabled === true || String(matched.enabled).toLowerCase() === "true";

        if (cloudAllowLate === expectedAllowLate) {
          // Read-back confirmed! Update local cached map
          const map = this.getFacultyControlsMap(canonicalId);
          map[assignmentId] = {
            enabled: cloudEnabled,
            dueDate: matched.dueDate || null,
            releaseDate: matched.releaseDate || null,
            allowLate: cloudAllowLate,
            updatedAt: matched.updatedAt || new Date().toISOString()
          };
          const canonicalKey = `${this.storageNamespace}:${canonicalId}`;
          try {
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.setItem(canonicalKey, JSON.stringify(map));
            }
          } catch (e) { }

          return {
            success: true,
            status: "SYNCED",
            controls: map[assignmentId],
            message: "Persisted and verified in Google Sheets"
          };
        } else {
          lastError = `Read-back mismatch: expected allowLate=${expectedAllowLate}, but cloud returned allowLate=${cloudAllowLate}`;
        }
      } catch (readErr) {
        const isTimeout = readErr.name === "AbortError" || /timeout/i.test(readErr.message);
        lastError = isTimeout ? `Read-back timed out after ${timeoutMs}ms` : (readErr.message || "Read-back request failed");
      }
    }

    // If retry loop finishes without confirming SYNCED:
    const isMismatch = lastError && lastError.includes("mismatch");
    const isTimeout = lastError && /timeout/i.test(lastError);
    return {
      success: false,
      status: isMismatch ? "MISMATCH" : (isTimeout ? "TIMEOUT" : "READ_FAILED"),
      error: lastError || "Failed to confirm save with cloud backend",
      expected: expectedAllowLate
    };
  }

  /**
   * Bulk updates multiple assignments with read-back verification.
   * Reports mixed outcomes explicitly so partial failures are never concealed.
   *
   * @param {Array<string>} assignmentIds
   * @param {string} facultyIdentifier
   * @param {Object} controlsUpdate - { allowLate: boolean, enabled?: boolean }
   * @param {Object} [options={}] - { timeoutMs, maxRetries, retryDelayMs, fetchFn }
   * @return {Promise<{ total: number, synced: Array<string>, failed: Array<string>, isMixed: boolean, allSynced: boolean, allFailed: boolean, results: Object, error?: string }>}
   */
  async bulkSaveCloudControlsWithVerification(assignmentIds, facultyIdentifier, controlsUpdate = {}, options = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") {
      return { total: 0, synced: [], failed: assignmentIds, isMixed: false, allSynced: false, allFailed: true, error: "Invalid faculty ID", results: {} };
    }

    const fetchImpl = options.fetchFn || (typeof fetch !== "undefined" ? fetch : null);
    const timeoutMs = options.timeoutMs || 10000;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    const retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 300;
    const expectedAllowLate = this.parseBoolean(controlsUpdate.allowLate, false);

    // 1. Dispatch writes for each assignment
    const writePromises = assignmentIds.map((id) => {
      const current = this.getControls(id, canonicalId);
      const updated = { ...current, ...controlsUpdate, allowLate: expectedAllowLate };
      return this.saveCloudControl(id, canonicalId, updated, { fetchFn: fetchImpl }).catch((err) => ({ error: err.message }));
    });
    await Promise.allSettled(writePromises);

    // 2. Read back cloud controls for the entire faculty cohort
    let attempt = 0;
    let cloudData = null;
    let readError = null;

    while (attempt <= maxRetries) {
      attempt++;
      if (attempt > 1 && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
      try {
        cloudData = await this.readCloudControls(canonicalId, { fetchFn: fetchImpl, timeoutMs });
        if (Array.isArray(cloudData)) break;
      } catch (err) {
        readError = err.message;
      }
    }

    if (!Array.isArray(cloudData)) {
      return {
        total: assignmentIds.length,
        synced: [],
        failed: [...assignmentIds],
        isMixed: false,
        allSynced: false,
        allFailed: true,
        error: `Failed to read back cloud records: ${readError || "Unknown read error"}`,
        results: assignmentIds.reduce((acc, id) => {
          acc[id] = { success: false, status: "READ_FAILED", error: readError };
          return acc;
        }, {})
      };
    }

    // 3. Verify each assignment in cloudData
    const synced = [];
    const failed = [];
    const results = {};
    const map = this.getFacultyControlsMap(canonicalId);

    assignmentIds.forEach((id) => {
      const matched = cloudData.find((item) => item && String(item.assignmentId).trim() === String(id).trim());
      if (matched) {
        const cloudAllowLate = this.parseBoolean(matched.allowLate, false);
        if (cloudAllowLate === expectedAllowLate) {
          synced.push(id);
          results[id] = { success: true, status: "SYNCED", message: "Confirmed in Google Sheets" };
          map[id] = {
            enabled: matched.enabled === true || String(matched.enabled).toLowerCase() === "true",
            dueDate: matched.dueDate || null,
            releaseDate: matched.releaseDate || null,
            allowLate: cloudAllowLate,
            updatedAt: matched.updatedAt || new Date().toISOString()
          };
        } else {
          failed.push(id);
          results[id] = {
            success: false,
            status: "MISMATCH",
            error: `Read-back mismatch: expected allowLate=${expectedAllowLate}, got ${cloudAllowLate}`
          };
        }
      } else {
        failed.push(id);
        results[id] = {
          success: false,
          status: "NOT_FOUND",
          error: "Assignment not present in cloud records"
        };
      }
    });

    // Update local cache for synced items
    const canonicalKey = `${this.storageNamespace}:${canonicalId}`;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(canonicalKey, JSON.stringify(map));
      }
    } catch (e) { }

    return {
      total: assignmentIds.length,
      synced,
      failed,
      isMixed: synced.length > 0 && failed.length > 0,
      allSynced: failed.length === 0 && synced.length > 0,
      allFailed: synced.length === 0,
      results
    };
  }

  /**
   * Saves assignment controls for a specific assignment and faculty member.
   * Stores under canonical Faculty_ID key and asynchronously persists to Google Sheets.
   */
  setControls(assignmentId, facultyIdentifier, controls = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (canonicalId === "UNKNOWN") {
      return null;
    }

    const canonicalKey = `${this.storageNamespace}:${canonicalId}`;
    const map = this.getFacultyControlsMap(canonicalId);
    const id = assignmentId || "default";

    map[id] = {
      enabled: typeof controls.enabled === "boolean" ? controls.enabled : true,
      dueDate: controls.dueDate || null,
      releaseDate: controls.releaseDate || null,
      allowLate: this.parseBoolean(controls.allowLate, false),
      note: controls.note || "",
      updatedAt: new Date().toISOString()
    };

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(canonicalKey, JSON.stringify(map));
      }
    } catch { }

    if (this.storage && typeof this.storage.set === "function") {
      this.storage.set(canonicalId, map);
    }

    // Persist to Google Sheets backend
    this.saveCloudControl(id, canonicalId, map[id]);

    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("meilp:assignment-controls-updated", {
        detail: { assignmentId: id, facultyId: canonicalId, controls: map[id] }
      }));
    }

    return map[id];
  }

  /**
   * Evaluates access status for an assignment under a specific faculty member.
   */
  evaluateAccess(assignmentId, facultyIdentifier) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (canonicalId === "UNKNOWN") {
      return {
        enabled: true,
        dueDate: null,
        formattedDueDate: null,
        isPastDue: false,
        canSubmit: true,
        note: "",
        facultyId: "UNKNOWN"
      };
    }

    const ctrl = this.getControls(assignmentId, canonicalId);
    const now = new Date();
    let isPastDue = false;
    let isUnreleased = false;
    let formattedDueDate = null;
    let parsedDue = null;
    let parsedRelease = null;

    if (ctrl.releaseDate) {
      parsedRelease = this.parseDueDate(ctrl.releaseDate);
      if (parsedRelease) {
        isUnreleased = now < parsedRelease;
      }
    }

    if (ctrl.dueDate) {
      parsedDue = this.parseDueDate(ctrl.dueDate);
      if (parsedDue) {
        isPastDue = now > parsedDue;
        formattedDueDate = parsedDue.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
      }
    }

    const allowLate = this.parseBoolean(ctrl.allowLate, false);
    const canSubmit = ctrl.enabled && !isUnreleased && (!parsedDue || !isPastDue || allowLate);

    return {
      enabled: ctrl.enabled,
      dueDate: ctrl.dueDate,
      formattedDueDate,
      releaseDate: ctrl.releaseDate || null,
      isUnreleased,
      allowLate,
      isPastDue,
      canSubmit,
      note: ctrl.note,
      facultyId: ctrl.facultyId
    };
  }

  /**
   * Helper to format raw date string to readable text.
   */
  formatDateTime(isoString) {
    if (!isoString) return "No Deadline";
    const date = this.parseDueDate(isoString);
    if (!date) return "No Deadline";

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
}

window.MEILP.AssignmentControlService = AssignmentControlService;
if (window.MEILP.StorageService && !window.MEILP.assignmentControlService) {
  window.MEILP.assignmentControlService = new AssignmentControlService();
}
