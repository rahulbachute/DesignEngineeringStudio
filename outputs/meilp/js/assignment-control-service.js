window.MEILP = window.MEILP || {};

/**
 * Service to manage faculty-wise assignment deadlines and enable/disable availability controls.
 * Settings are stored per faculty member (namespaced by facultyId or name).
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
          } catch {}
          return val;
        }
      };
    }
  }

  /**
   * Normalizes any faculty identifier (email, display name, ID) into a unified canonical storage key.
   */
  normalizeFacultyId(facultyId) {
    if (!facultyId || typeof facultyId !== "string") {
      return "dr-rahul-bachute";
    }
    const raw = facultyId.trim().toLowerCase();

    if (raw.includes("rahul") || raw.includes("bachute")) {
      return "dr-rahul-bachute";
    }
    if (raw.includes("niranjan") || raw.includes("shegokar")) {
      return "dr-niranjan-shegokar";
    }
    if (raw.includes("atul") || raw.includes("gowardipe")) {
      return "prof-atul-gowardipe";
    }

    return raw.replace(/[^a-z0-9]+/g, "-");
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
   * Returns default faculty members list for selection.
   */
  getFacultyList() {
    return [
      { id: "dr-rahul-bachute", name: "Dr. Rahul Bachute", email: "rahul.bachute@dypic.in" },
      { id: "dr-niranjan-shegokar", name: "Dr. Niranjan Shegokar", email: "niranjan.shegokar@dypic.in" },
      { id: "prof-atul-gowardipe", name: "Prof. Atul Gowardipe", email: "atul.gowardipe@dypic.in" }
    ];
  }

  /**
   * Gets stored controls object for a specific faculty member.
   * Directly reads from window.localStorage first for cross-tab stability.
   */
  getFacultyControlsMap(facultyId) {
    const key = this.normalizeFacultyId(facultyId);
    const fullKey = `${this.storageNamespace}:${key}`;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(fullKey);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {}

    if (this.storage && typeof this.storage.get === "function") {
      const stored = this.storage.get(key, null);
      if (stored !== null && typeof stored === "object") {
        return stored;
      }
    }

    return {};
  }

  /**
   * Gets assignment controls for a specific assignment and faculty member.
   */
  getControls(assignmentId, facultyId) {
    const map = this.getFacultyControlsMap(facultyId);
    const id = assignmentId || "default";
    const existing = map[id] || {};

    return {
      assignmentId: id,
      facultyId: facultyId || "Dr. Rahul Bachute",
      enabled: typeof existing.enabled === "boolean" ? existing.enabled : true,
      dueDate: existing.dueDate || null,
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
   */
  async fetchCloudControls(facultyId) {
    if (!facultyId || String(facultyId).trim().toUpperCase() === "UNKNOWN") {
      return [];
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) return [];

    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}action=getAssignmentControls&facultyId=${encodeURIComponent(facultyId)}`, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          const map = this.getFacultyControlsMap(facultyId);
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
          const normKey = this.normalizeFacultyId(facultyId);
          const fullKey = `${this.storageNamespace}:${normKey}`;
          try {
            window.localStorage.setItem(fullKey, JSON.stringify(map));
          } catch {}
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
  async saveCloudControl(assignmentId, facultyId, controls = {}) {
    if (!facultyId || String(facultyId).trim().toUpperCase() === "UNKNOWN") {
      return null;
    }
    const endpoint = this.getEndpoint();
    if (!endpoint) return null;

    const authFacultyId = (window.DESAuth && window.DESAuth.getCurrentUser && window.DESAuth.getCurrentUser()?.facultyId) || facultyId;

    try {
      const payload = {
        action: "saveAssignmentControl",
        facultyId,
        assignmentId,
        enabled: typeof controls.enabled === "boolean" ? controls.enabled : true,
        dueDate: controls.dueDate || "",
        releaseDate: controls.releaseDate || "",
        allowLate: Boolean(controls.allowLate),
        authFacultyId
      };

      const sep = endpoint.includes("?") ? "&" : "?";
      const postUrl = `${endpoint}${sep}action=saveAssignmentControl`;

      const res = await fetch(postUrl, {
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
   * Writes to local cache immediately and asynchronously persists to Google Sheets.
   */
  setControls(assignmentId, facultyId, controls = {}) {
    const normKey = this.normalizeFacultyId(facultyId);
    const fullKey = `${this.storageNamespace}:${normKey}`;
    const map = this.getFacultyControlsMap(facultyId);
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
        window.localStorage.setItem(fullKey, JSON.stringify(map));
        if (facultyId && typeof facultyId === "string" && facultyId.includes("@")) {
          const rawKey = `${this.storageNamespace}:${facultyId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          window.localStorage.setItem(rawKey, JSON.stringify(map));
        }
      }
    } catch {}

    if (this.storage && typeof this.storage.set === "function") {
      this.storage.set(normKey, map);
    }

    // Persist to Google Sheets backend
    this.saveCloudControl(id, facultyId, map[id]);

    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("meilp:assignment-controls-updated", {
        detail: { assignmentId: id, facultyId, controls: map[id] }
      }));
    }

    return map[id];
  }

  /**
   * Evaluates access status for an assignment under a specific faculty member.
   */
  evaluateAccess(assignmentId, facultyId) {
    const ctrl = this.getControls(assignmentId, facultyId);
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
