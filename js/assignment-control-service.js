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

    const lower = trimmed.toLowerCase();
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
      { facultyId: "ADMIN001", facultyName: "System Administrator", email: "bachuterahul@gmail.com", role: "ADMIN" },
      { facultyId: "FAC001", facultyName: "Dr. Rahul Bachute", email: "rahul.bachute@dypic.in", role: "FACULTY" },
      { facultyId: "FAC002", facultyName: "Dr. Niranjan Shegokar", email: "niranjan.shegokar@dypic.in", role: "FACULTY" },
      { facultyId: "FAC003", facultyName: "Prof. Atul Gowardipe", email: "atul.gowardipe@dypic.in", role: "FACULTY" },
      { facultyId: "FAC004", facultyName: "Prof. Said Khandu", email: "saidkhandu@gmail.com", role: "FACULTY" }
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
      allowLate: Boolean(existing.allowLate),
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
      const res = await fetch(`${endpoint}${sep}action=getAssignmentControls&facultyId=${encodeURIComponent(canonicalId)}`, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          const map = this.getFacultyControlsMap(canonicalId);
          json.data.forEach((item) => {
            if (item && item.assignmentId) {
              map[item.assignmentId] = {
                enabled: typeof item.enabled === "boolean" ? item.enabled : true,
                dueDate: item.dueDate || null,
                releaseDate: item.releaseDate || null,
                allowLate: Boolean(item.allowLate),
                updatedAt: item.updatedAt || new Date().toISOString()
              };
            }
          });
          const canonicalKey = `${this.storageNamespace}:${canonicalId}`;
          try {
            window.localStorage.setItem(canonicalKey, JSON.stringify(map));
          } catch { }
          return json.data;
        }
      }
    } catch (e) {
      console.warn("[AssignmentControlService] Cloud fetch failed, using cached controls:", e.message);
    }
    return [];
  }

  /**
   * Saves assignment control record to Google Sheets backend.
   */
  async saveCloudControl(assignmentId, facultyIdentifier, controls = {}) {
    const canonicalId = this.resolveFacultyId(facultyIdentifier);
    if (!canonicalId || canonicalId === "UNKNOWN") {
      return null;
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) return null;

    const authFacultyId = (window.DESAuth && window.DESAuth.getCurrentUser && window.DESAuth.getCurrentUser()?.facultyId) || canonicalId;

    try {
      const payload = {
        action: "saveAssignmentControl",
        facultyId: canonicalId,
        assignmentId,
        enabled: typeof controls.enabled === "boolean" ? controls.enabled : true,
        dueDate: controls.dueDate || "",
        releaseDate: controls.releaseDate || "",
        allowLate: Boolean(controls.allowLate),
        authFacultyId
      };

      const sep = endpoint.includes("?") ? "&" : "?";
      const postUrl = `${endpoint}${sep}action=saveAssignmentControl`;

      await fetch(postUrl, {
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
      allowLate: Boolean(controls.allowLate),
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
    let formattedDueDate = null;
    let parsedDue = null;

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

    const canSubmit = ctrl.enabled && (!parsedDue || !isPastDue);

    return {
      enabled: ctrl.enabled,
      dueDate: ctrl.dueDate,
      formattedDueDate,
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
