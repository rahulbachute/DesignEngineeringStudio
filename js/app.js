window.MEILP = window.MEILP || {};

// ─── All 17 assignments hardcoded — always available, no fetch required ───────
const ALL_ASSIGNMENTS = [
  { id: "EC-01", title: "Safety Verification of Elevator Suspension Cables", discipline: "Design of Machine Elements", summary: "Configuration-driven engineering challenge for independent elevator suspension cable review.", tasks: 9, icon: "bi-building-gear", launchPath: "assignment-workbench.html?assignment=elevator" },
  { id: "EC-02", title: "Determine factor of safety of motorcycle stand and verify whether design is safe", discipline: "Design of Machine Elements", summary: "Template-authored engineering challenge for side stand stability and load reasoning.", tasks: 9, icon: "bi-bicycle", launchPath: "assignment-workbench.html?assignment=motorcycle" },
  { id: "EC-03", title: "Engineering Materials Selection in Two-Wheeler Components", discipline: "Design of Machine Elements", summary: "Engineering challenge scaffold for material selection decisions across two-wheeler components.", tasks: 11, icon: "bi-tools", launchPath: "assignment-workbench.html?assignment=materials-selection" },
  { id: "EC-04", title: "Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever", discipline: "Design of Machine Elements", summary: "Configuration-driven engineering challenge for borewell pump hand lever safety and ergonomics.", tasks: 19, icon: "bi-tools", launchPath: "assignment-workbench.html?assignment=borewell-pump" },
  { id: "EC-05", title: "Failure Analysis and Material Selection of a Failed Mechanical Component", discipline: "Design of Machine Elements", summary: "Engineering challenge to investigate the failure mechanism, material, and factor of safety of a bolted joint.", tasks: 13, icon: "bi-wrench", launchPath: "assignment-workbench.html?assignment=failure-analysis" },
  { id: "EC-06", title: "Stress Concentration Analysis of a Plate with a Central Hole", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze stress concentration, nominal vs peak stress, material selection, and safety factor of a plate with a hole.", tasks: 12, icon: "bi-symmetry-horizontal", launchPath: "assignment-workbench.html?assignment=stress-concentration" },
  { id: "EC-07", title: "Design of Shaft for a Real-World Engineering Application", discipline: "Design of Machine Elements", summary: "Engineering challenge to determine loading, bearing reactions, bending moment, torque, combined loading, required shaft diameter, and factor of safety for a power transmission shaft.", tasks: 10, icon: "bi-gear-wide-connected", launchPath: "assignment-workbench.html?assignment=shafts" },
  { id: "EC-08", title: "Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze shaft-hub-key connections, transmitted torque, tangential force, key width and height, shear and crushing failure modes, factor of safety, and final key selection.", tasks: 10, icon: "bi-key-fill", launchPath: "assignment-workbench.html?assignment=Keys" },
  { id: "EC-09", title: "Identification and Selection of Couplings Used in Mechanical Power Transmission", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze shaft connections, torque transmission, misalignment accommodation, working principles, coupling classification, application selection, and engineering justification for a motor-pump system.", tasks: 13, icon: "bi-link-45deg", launchPath: "assignment-workbench.html?assignment=coupling" },
  { id: "EC-10", title: "Design of a Cotter Joint for a Bicycle", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze bicycle pedal-to-axle power transmission, identify cotter joint components, establish design requirements, calculate cotter shear and crushing stresses, verify Factor of Safety, and render engineering design recommendations.", tasks: 10, icon: "bi-gear-fill", launchPath: "assignment-workbench.html?assignment=cotter-joint" },
  { id: "EA-11", title: "Design and Analysis of a Knuckle Joint for a Tractor–Trailer", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze tractor-trailer power transmission load path, identify single-eye and fork lug components, evaluate 30-degree turning load, calculate pin shear, eye tensile/bearing stresses, and verify Factor of Safety.", tasks: 10, icon: "bi-truck", launchPath: "assignment-workbench.html?assignment=kunckle%20joint" },
  { id: "EA-12", title: "Design of a Helical Compression Spring for Motorcycle Suspension", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze motorcycle rear twin-shock suspension, identify spring and damper components, establish load and deflection requirements, design spring geometry, calculate Wahl factor and torsional shear stress, verify Factor of Safety, and render engineering recommendations.", tasks: 10, icon: "bi-activity", launchPath: "assignment-workbench.html?assignment=helical-spring-design" },
  { id: "EA-13", title: "Construction and Design Verification of a Leaf Spring", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze commercial vehicle multi-leaf spring suspension construction, identify master and graduated leaves, convert vehicle payload into cantilever beam model, calculate bending stress and deflection, verify Factor of Safety, and render engineering recommendations.", tasks: 10, icon: "bi-layers", launchPath: "assignment-workbench.html?assignment=leaf-spring-design" },
  { id: "EA-14", title: "Comparative Study and Selection of Springs for Engineering Applications", discipline: "Design of Machine Elements", summary: "Engineering challenge to compare four fundamental spring configurations, evaluate loading modes and construction, compare performance trade-offs, and justify optimal spring selection.", tasks: 10, icon: "bi-diagram-3", launchPath: "assignment-workbench.html?assignment=spring-selection" },
  { id: "EA-15", title: "Analysis of an Automobile Suspension System", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze a motorcycle rear suspension system as an integrated mechanical assembly, identify structural, elastic, and damping components, trace load transmission paths, evaluate compression and rebound dynamics, diagnose fault conditions, and render system-level tuning recommendations.", tasks: 10, icon: "bi-gear-wide-connected", launchPath: "assignment-workbench.html?assignment=suspension-system-design" },
  { id: "EA-16", title: "Fatigue Design of an Automotive Propeller Shaft", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze automotive rear-wheel drive torque transmission, identify critical splined and weld neck stress concentrations, calculate mean and alternating torsional stresses, apply modified Soderberg fatigue criteria, verify hollow tubular shaft diameter, and diagnose 45-degree torsional fatigue failure.", tasks: 10, icon: "bi-shield-check", launchPath: "assignment-workbench.html?assignment=shaft-fatigue-design" },
  { id: "EA-17", title: "Fatigue Analysis of a Connecting Rod", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyze high-speed internal combustion engine reciprocating kinematics, trace gas and inertia force transmission, identify transition fillet stress concentrations, apply modified Soderberg fatigue criteria, verify I-section shank geometry, and diagnose high-cycle fatigue cracking.", tasks: 10, icon: "bi-cpu", launchPath: "assignment-workbench.html?assignment=connecting-rod-fatigue" },
  { id: "EA-18", title: "Torque Requirement and Efficiency Estimation of a Bench Vice Screw Mechanism", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyse the bench vice power-screw mechanism, calculate thread and collar friction torques, determine total operating torque, estimate mechanical efficiency, verify self-locking condition, and assess mechanism suitability.", tasks: 10, icon: "bi-wrench-adjustable", launchPath: "assignment-workbench.html?assignment=bench-vice" },
  { id: "EA-19", title: "Analysis of C-Clamp Screw and Collar Friction Effects", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyse the C-clamp power-screw mechanism, determine thread friction torque, collar friction torque, evaluate total tightening torque, investigate the relative contribution of collar friction, and assess operator hand force.", tasks: 11, icon: "bi-border-inner", launchPath: "assignment-workbench.html?assignment=c-clamp-friction" },
  { id: "EA-20", title: "Design of a Power Screw for a Hydraulic Press", discipline: "Design of Machine Elements", summary: "Engineering challenge to design, analyse, and verify the bed-adjustment power screw mechanism of a hydraulic press, calculating thread and collar friction torques, operating torque, efficiency, self-locking safety, and combined stress verification under heavy positioning loads.", tasks: 11, icon: "bi-gear-wide-connected", launchPath: "assignment-workbench.html?assignment=hydraulic-press" },
  { id: "EC-21", title: "Design of Automotive Steering Gear (Recirculating Ball Type)", discipline: "Design of Machine Elements", summary: "Engineering challenge to analyse and design an automotive recirculating-ball steering gear mechanism, evaluating rolling contact kinematics, ball-nut axial travel, rack-and-sector angular transformation, steering ratio, output torque, and Pitman arm linkage forces.", tasks: 11, icon: "bi-bullseye", launchPath: "assignment-workbench.html?assignment=recirculating-ball-steering" },
  { id: "EA-22", title: "Design of a 2-Ton Mobile Scissor Lift Power Screw", discipline: "Design of Machine Elements", summary: "Engineering challenge to design, analyse, and verify the horizontal power-screw mechanism of a 2-ton mobile scissor lift, calculating scissor kinematic force transformation, thread and collar friction torques, operating torque, efficiency, self-locking safety, and combined core stresses.", tasks: 11, icon: "bi-layers-half", launchPath: "assignment-workbench.html?assignment=mobile-scissor-lift" }
];

// ─── Direct localStorage read — zero abstraction ──────────────────────────────
function normalizeFacultyKey(name) {
  if (!name || typeof name !== "string") return "dr-rahul-bachute";
  const s = name.trim().toLowerCase();
  if (s.includes("rahul") || s.includes("bachute")) return "dr-rahul-bachute";
  if (s.includes("niranjan") || s.includes("shegokar")) return "dr-niranjan-shegokar";
  if (s.includes("atul") || s.includes("gowardipe")) return "prof-atul-gowardipe";
  return s.replace(/[^a-z0-9]+/g, "-");
}

function loadFacultyControls(facultyName) {
  const key = "meilp-assignment-controls:" + normalizeFacultyKey(facultyName);
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function parseDueDate(str) {
  if (!str) return null;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  const m = str.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})(?:[T\s,]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    d = new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 23, m[5] ? +m[5] : 59);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDueDate(str) {
  const d = parseDueDate(str);
  if (!d) return null;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function escapeHtml(str) {
  if (typeof window.MEILP.escapeHtml === "function") return window.MEILP.escapeHtml(str);
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getSelectedFaculty() {
  const sel = document.getElementById("studentFacultySelect");
  return (sel && sel.value) ? sel.value : (window.localStorage.getItem("meilp:selectedStudentFaculty") ? JSON.parse(window.localStorage.getItem("meilp:selectedStudentFaculty")) : "Dr. Rahul Bachute");
}

// ─── Live assignment list (updated when JSON loads successfully) ───────────────
let liveAssignments = ALL_ASSIGNMENTS;

// ─── Main render function ─────────────────────────────────────────────────────
function renderAssignmentCards(cards) {
  const grid = document.querySelector("[data-assignment-grid]");
  if (!grid) return;

  // Update live list if a new set is passed in
  if (Array.isArray(cards) && cards.length > 0) liveAssignments = cards;
  const assignments = liveAssignments;

  const faculty = getSelectedFaculty();
  const controls = loadFacultyControls(faculty);

  let enabledCount = 0, disabledCount = 0;
  assignments.forEach(a => {
    const c = controls[a.id] || {};
    (typeof c.enabled === "boolean" ? c.enabled : true) ? enabledCount++ : disabledCount++;
  });

  const banner = document.getElementById("facultyStatusBanner");
  if (banner) {
    banner.innerHTML = `<i class="bi bi-person-badge-fill me-1"></i>Schedule for <strong>${escapeHtml(faculty)}</strong> &nbsp;(${enabledCount} Active, ${disabledCount} Disabled)`;
  }

  grid.innerHTML = assignments.map(card => {
    const ctrl = controls[card.id] || {};
    const enabled = typeof ctrl.enabled === "boolean" ? ctrl.enabled : true;
    const rawDue = ctrl.dueDate || null;
    const formatted = formatDueDate(rawDue);
    const isPastDue = rawDue ? (new Date() > parseDueDate(rawDue)) : false;
    const icon = card.icon || "bi-journal-text";
    const launchUrl = card.launchPath || `assignment-workbench.html?assignment=${card.id}`;

    const deadlinePill = (rawDue && formatted)
      ? (isPastDue
          ? `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"><i class="bi bi-clock-history me-1"></i>Deadline Passed: ${formatted}</span>`
          : `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-calendar-event me-1"></i>Due: ${formatted}</span>`)
      : `<span class="badge bg-light text-muted border"><i class="bi bi-clock me-1"></i>No Deadline</span>`;

    if (!enabled) {
      return `<div class="col-12 col-md-6 col-lg-4">
        <article class="assignment-card h-100 d-flex flex-column justify-content-between p-4 shadow-sm border rounded-4"
          style="background-color:#f8f9fa;border-color:#dee2e6;opacity:0.75;filter:grayscale(30%);cursor:not-allowed;"
          onclick="alert('Disabled by ${escapeHtml(faculty)} for your class.')">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <span class="card-icon fs-3 text-secondary bg-secondary-subtle p-3 rounded-4"><i class="bi ${escapeHtml(icon)}"></i></span>
              <div class="text-end">
                <span class="badge bg-dark text-white rounded-pill px-3 py-1 mb-1 d-block">${escapeHtml(card.id)}</span>
                <span class="badge bg-secondary-subtle text-secondary-emphasis border"><i class="bi bi-slash-circle me-1"></i>Disabled</span>
              </div>
            </div>
            <h3 class="h6 fw-bold text-secondary mb-2">${escapeHtml(card.title)}</h3>
            <p class="text-secondary small mb-3">${escapeHtml(card.summary || "")}</p>
          </div>
          <div>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-light text-dark border">${card.tasks || 0} tasks</span>
              <span class="badge bg-light text-dark border">${escapeHtml(card.discipline || "")}</span>
              ${deadlinePill}
            </div>
            <button class="btn btn-secondary w-100 rounded-pill py-2" disabled><i class="bi bi-lock-fill me-1"></i>Disabled by Faculty</button>
          </div>
        </article>
      </div>`;
    }

    return `<div class="col-12 col-md-6 col-lg-4">
      <article class="assignment-card h-100 d-flex flex-column justify-content-between p-4 shadow-sm border rounded-4 hover-shadow"
        style="background-color:#fff;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;"
        onclick="window.location.href='${launchUrl}'">
        <div>
          <div class="d-flex justify-content-between align-items-start mb-3">
            <span class="card-icon fs-3 text-primary bg-primary-subtle p-3 rounded-4"><i class="bi ${escapeHtml(icon)}"></i></span>
            <div class="text-end">
              <span class="badge bg-dark text-white rounded-pill px-3 py-1 mb-1 d-block">${escapeHtml(card.id)}</span>
              <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle"><i class="bi bi-check-circle me-1"></i>Active</span>
            </div>
          </div>
          <h3 class="h6 fw-bold text-dark mb-2">${escapeHtml(card.title)}</h3>
          <p class="text-secondary small mb-3">${escapeHtml(card.summary || "")}</p>
        </div>
        <div>
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="badge bg-light text-dark border">${card.tasks || 0} tasks</span>
            <span class="badge bg-light text-dark border">${escapeHtml(card.discipline || "")}</span>
            ${deadlinePill}
          </div>
          ${ctrl.note ? `<div class="alert alert-info py-1 px-2 small mb-3"><i class="bi bi-info-circle me-1"></i>${escapeHtml(ctrl.note)}</div>` : ""}
          <a href="${launchUrl}" class="btn btn-primary w-100 rounded-pill py-2 shadow-sm" onclick="event.stopPropagation();"><i class="bi bi-rocket-takeoff me-1"></i>Launch Workbench</a>
        </div>
      </article>
    </div>`;
  }).join("");
}

// ─── Expose globally ──────────────────────────────────────────────────────────
window.MEILP.renderAssignmentCards = renderAssignmentCards;
window.MEILP.loadFacultyControls = loadFacultyControls;

// ─── Bind controls ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  // Render immediately with hardcoded list so page never shows blank
  renderAssignmentCards(ALL_ASSIGNMENTS);

  // Then try to fetch the live assignments.json — two paths tried in order
  const REGISTRY_PATHS = [
    "../../data/assignments.json",
    "/data/assignments.json"
  ];

  function getCustomAssignments() {
    try {
      const raw = window.localStorage.getItem("meilp-custom-assignments");
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function mergeWithCustom(baseList) {
    const custom = getCustomAssignments();
    const existingIds = new Set(baseList.map(a => a.id));
    return [...baseList, ...custom.filter(a => !existingIds.has(a.id))];
  }

  (async function loadLiveAssignments() {
    let base = ALL_ASSIGNMENTS;
    for (const path of REGISTRY_PATHS) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const json = await res.json();
        const list = json.assignments || (Array.isArray(json) ? json : null);
        if (list && list.length > 0) { base = list; break; }
      } catch (e) { /* try next */ }
    }
    // Merge JSON assignments with faculty-created custom ones
    const merged = mergeWithCustom(base);
    renderAssignmentCards(merged);
    console.log("[MEILP] Loaded", merged.length, "assignments (", merged.length - base.length, "custom)");
  })();

  const sel = document.getElementById("studentFacultySelect");
  const btn = document.getElementById("btnShowAssignments");

  if (sel) {
    sel.addEventListener("change", function () {
      try { window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify(sel.value)); } catch(e) {}
      renderAssignmentCards();
    });
  }
  if (btn) {
    btn.addEventListener("click", function () {
      renderAssignmentCards();
    });
  }

  // Listen for faculty portal changes (cross-tab storage event)
  window.addEventListener("storage", function (e) {
    if (e.key && (e.key.startsWith("meilp-assignment-controls") || e.key === "meilp-custom-assignments")) {
      // Re-merge and re-render with latest custom assignments
      const merged = mergeWithCustom(liveAssignments);
      renderAssignmentCards(merged);
    }
  });

  // Theme toggle
  const themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const cur = document.documentElement.dataset.theme || "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem("meilp:theme", JSON.stringify(next)); } catch(e) {}
      const icon = themeBtn.querySelector("i");
      if (icon) icon.className = next === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    });
  }

  // Restore saved theme
  try {
    const t = window.localStorage.getItem("meilp:theme");
    if (t) document.documentElement.dataset.theme = JSON.parse(t);
  } catch(e) {}
});
