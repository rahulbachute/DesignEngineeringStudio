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
  { id: "EA-22", title: "Design of a 2-Ton Mobile Scissor Lift Power Screw", discipline: "Design of Machine Elements", summary: "Engineering challenge to design, analyse, and verify the horizontal power-screw mechanism of a 2-ton mobile scissor lift, calculating scissor kinematic force transformation, thread and collar friction torques, operating torque, efficiency, self-locking safety, and combined core stresses.", tasks: 11, icon: "bi-layers-half", launchPath: "assignment-workbench.html?assignment=mobile-scissor-lift" },
  { id: "EA-TS-01", title: "Design of Helical Gears for High-Speed Rotary Equipment", discipline: "Transmission System Design", summary: "Engineering challenge to design, analyse, and verify a high-speed helical gear pair, calculating torque, formative teeth, Lewis form factors, pitch geometry, Barth dynamic factor, effective load, Lewis beam strength, Buckingham wear strength, safety factors, and parametric redesign.", tasks: 8, icon: "bi-gear-wide-connected", launchPath: "assignment-workbench.html?assignment=helical-gear-design", co: "CO1", weightage: "12 Marks", status: "Ready" },
  { id: "EA-TS-02", title: "Design Parameters of Spur Gears for Industrial Conveyor Systems", discipline: "Transmission System Design", summary: "Engineering challenge to design, analyse, and verify a single-stage spur gear reduction drive for heavy bulk material conveyors, evaluating transmission ratio, torque, pitch geometry, Lewis beam strength, Barth dynamic load, Buckingham wear durability, and parametric redesign.", tasks: 12, icon: "bi-gear-wide-connected", launchPath: "assignment-workbench.html?assignment=spur-gear-design", co: "CO1", weightage: "12 Marks", status: "Ready" }
];

// ─── College to Faculty Mapping ──────────────────────────────────────────────
const ACTIVE_COLLEGE_REGISTRY = [
  { collegeId: "COL001", collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon", status: "ACTIVE" },
  { collegeId: "COL002", collegeName: "Jaihind College of Engineering", status: "ACTIVE" },
  { collegeId: "COL003", collegeName: "AISSMS College of Engineering, Pune", status: "ACTIVE" },
  { collegeId: "COL004", collegeName: "Alard College of Engineering & Management, Marunji", status: "ACTIVE" },
  { collegeId: "COL005", collegeName: "Anantrao Pawar College of Engineering & Research, Pune", status: "ACTIVE" },
  { collegeId: "COL006", collegeName: "Bharati Vidyapeeth's College of Engineering, Lavale", status: "ACTIVE" },
  { collegeId: "COL007", collegeName: "COEP Technological University, Pune", status: "ACTIVE" },
  { collegeId: "COL008", collegeName: "D.Y. Patil College of Engineering, Akurdi, Pune", status: "ACTIVE" },
  { collegeId: "COL009", collegeName: "Dattakala Group of Institutions, Swami-Chincholi", status: "ACTIVE" },
  { collegeId: "COL010", collegeName: "Dr. D.Y. Patil Institute of Technology, Pimpri, Pune", status: "ACTIVE" },
  { collegeId: "COL011", collegeName: "Flora Institute of Technology, Khopi", status: "ACTIVE" },
  { collegeId: "COL012", collegeName: "G.H. Raisoni College of Engineering & Management, Wagholi", status: "ACTIVE" },
  { collegeId: "COL013", collegeName: "Genba Sopanrao Moze College of Engineering, Baner-Balewadi", status: "ACTIVE" },
  { collegeId: "COL014", collegeName: "Government College of Engineering & Research, Avasari Khurd", status: "ACTIVE" },
  { collegeId: "COL015", collegeName: "Indira College of Engineering & Management, Pune", status: "ACTIVE" },
  { collegeId: "COL016", collegeName: "ISBM College of Engineering, Nande", status: "ACTIVE" },
  { collegeId: "COL017", collegeName: "JSPM Narhe Technical Campus, Narhe", status: "ACTIVE" },
  { collegeId: "COL018", collegeName: "JSPM's Bhivarabai Sawant Institute of Technology & Research, Wagholi", status: "ACTIVE" },
  { collegeId: "COL019", collegeName: "JSPM's Jaywantrao Sawant College of Engineering, Hadapsar", status: "ACTIVE" },
  { collegeId: "COL020", collegeName: "K.J. College of Engineering & Management Research, Pisoli", status: "ACTIVE" },
  { collegeId: "COL021", collegeName: "Keystone School of Engineering, Pune", status: "ACTIVE" },
  { collegeId: "COL022", collegeName: "Marathwada Mitra Mandal's College of Engineering, Karvenagar", status: "ACTIVE" },
  { collegeId: "COL023", collegeName: "Marathwada Mitra Mandal's Institute of Technology, Lohgaon", status: "ACTIVE" },
  { collegeId: "COL024", collegeName: "MIT Academy of Engineering, Alandi", status: "ACTIVE" },
  { collegeId: "COL025", collegeName: "Modern College of Engineering, Pune", status: "ACTIVE" },
  { collegeId: "COL026", collegeName: "Modern Education Society's Wadia College of Engineering, Pune", status: "ACTIVE" },
  { collegeId: "COL027", collegeName: "Navsahyadri Education Society's Group of Institutions, Naigaon", status: "ACTIVE" },
  { collegeId: "COL028", collegeName: "NBN Sinhgad Technical Institutes Campus, Ambegaon", status: "ACTIVE" },
  { collegeId: "COL029", collegeName: "Nutan Maharashtra Institute of Engineering & Technology, Talegaon", status: "ACTIVE" },
  { collegeId: "COL030", collegeName: "P. Vasantdada Patil Institute of Technology, Bavdhan", status: "ACTIVE" },
  { collegeId: "COL031", collegeName: "P.K. Technical Campus, Chakan/Khed", status: "ACTIVE" },
  { collegeId: "COL032", collegeName: "PDEA's College of Engineering, Manjari", status: "ACTIVE" },
  { collegeId: "COL033", collegeName: "Pimpri Chinchwad College of Engineering & Research, Ravet", status: "ACTIVE" },
  { collegeId: "COL034", collegeName: "Pimpri Chinchwad College of Engineering (PCCOE), Nigdi, Pune", status: "ACTIVE" },
  { collegeId: "COL035", collegeName: "PVG's College of Engineering, Technology & Management, Pune", status: "ACTIVE" },
  { collegeId: "COL036", collegeName: "Rajarshi Shahu College of Engineering, Tathawade", status: "ACTIVE" },
  { collegeId: "COL037", collegeName: "Rajgad Technical Campus, Bhor", status: "ACTIVE" },
  { collegeId: "COL038", collegeName: "Rasiklal M. Dhariwal Sinhgad Technical Institutes Campus, Warje", status: "ACTIVE" },
  { collegeId: "COL039", collegeName: "S.B. Patil College of Engineering, Vangali/Indapur", status: "ACTIVE" },
  { collegeId: "COL040", collegeName: "Samarth College of Engineering & Management, Belhe", status: "ACTIVE" },
  { collegeId: "COL041", collegeName: "Sharadchandra Pawar College of Engineering & Technology, Someshwar Nagar", status: "ACTIVE" },
  { collegeId: "COL042", collegeName: "Sharadchandra Pawar College of Engineering, Dumbarwadi", status: "ACTIVE" },
  { collegeId: "COL043", collegeName: "Shree Ramchandra College of Engineering, Lonikand", status: "ACTIVE" },
  { collegeId: "COL044", collegeName: "Siddhant College of Engineering, Sudumbare", status: "ACTIVE" },
  { collegeId: "COL045", collegeName: "Sinhgad Academy of Engineering, Kondhwa", status: "ACTIVE" },
  { collegeId: "COL046", collegeName: "Sinhgad College of Engineering, Vadgaon", status: "ACTIVE" },
  { collegeId: "COL047", collegeName: "Sinhgad Institute of Technology & Science, Narhe", status: "ACTIVE" },
  { collegeId: "COL048", collegeName: "SJVPM College of Engineering, Pune", status: "ACTIVE" },
  { collegeId: "COL049", collegeName: "Smt. Kashibai Navale College of Engineering, Vadgaon", status: "ACTIVE" },
  { collegeId: "COL050", collegeName: "Suman Ramesh Tulsiani Technical Campus, Kamshet", status: "ACTIVE" },
  { collegeId: "COL051", collegeName: "Trinity Academy of Engineering, Yewalewadi", status: "ACTIVE" },
  { collegeId: "COL052", collegeName: "Trinity College of Engineering & Research, Pisoli", status: "ACTIVE" },
  { collegeId: "COL053", collegeName: "TSSM's Bhivarabai Sawant College of Engineering & Research, Narhe", status: "ACTIVE" },
  { collegeId: "COL054", collegeName: "Universal College of Engineering & Research, Sasewadi", status: "ACTIVE" },
  { collegeId: "COL055", collegeName: "Vidya Pratishthan's K.B. Institute of Engineering & Technology, Baramati", status: "ACTIVE" },
  { collegeId: "COL056", collegeName: "Vishwakarma Institute of Technology (VIT), Bibwewadi, Pune", status: "ACTIVE" },
  { collegeId: "COL057", collegeName: "Zeal College of Engineering & Research, Narhe", status: "ACTIVE" }
];

const ACTIVE_FACULTY_REGISTRY = [
  {
    facultyId: "FAC001",
    facultyName: "Rahul Bachute",
    email: "rahul.bachute@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC002",
    facultyName: "Dr Niranjan Shegokar",
    email: "niranjan.shegokar@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC004",
    facultyName: "Prof Khandu Said",
    email: "saidkhandu@gmail.com",
    collegeId: "COL002",
    collegeName: "Jaihind College of Engineering",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  }
];

let currentLoadedColleges = ACTIVE_COLLEGE_REGISTRY;
let currentLoadedFaculties = [];

async function fetchColleges() {
  const isActualCollege = (c) => {
    if (!c || c.status !== "ACTIVE") return false;
    const name = (c.collegeName || "").trim().toUpperCase();
    if (name.startsWith("OTHER") || name.includes("UNREGISTERED") || name.includes("UNKNOWN") || name.includes("GUEST")) return false;
    return true;
  };

  const endpoint = window.MEILP?.googleSheetsConfig?.submissionWebAppUrl;
  if (endpoint) {
    try {
      const res = await fetch(`${endpoint}?action=colleges`, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.filter(isActualCollege);
        }
      }
    } catch (e) {
      console.warn("[MEILP] Remote colleges fetch failed, using fallback list:", e.message);
    }
  }
  return ACTIVE_COLLEGE_REGISTRY.filter(isActualCollege);
}

async function fetchFacultyList(collegeId) {
  if (!collegeId) return [];
  const canonicalColId = String(collegeId).trim().toUpperCase();

  // If MEILP helper is available, check it first
  if (window.MEILP && typeof window.MEILP.getActiveFacultiesForCollege === "function") {
    const list = window.MEILP.getActiveFacultiesForCollege(collegeId);
    if (list && list.length > 0) {
      return list.filter(f => f.status === "ACTIVE" && f.facultyId && f.facultyId.toUpperCase() !== "UNKNOWN" && f.facultyId.toUpperCase() !== "FAC003");
    }
  }

  const endpoint = window.MEILP?.googleSheetsConfig?.submissionWebAppUrl;
  if (endpoint) {
    try {
      const res = await fetch(`${endpoint}?action=facultyList&collegeId=${encodeURIComponent(collegeId)}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.filter(f => f.status === "ACTIVE" && (!collegeId || String(f.collegeId).toUpperCase() === canonicalColId) && f.facultyId && f.facultyId.toUpperCase() !== "UNKNOWN" && f.facultyId.toUpperCase() !== "FAC003");
        }
      }
    } catch (e) {
      console.warn("[MEILP] Remote facultyList fetch failed, using fallback list:", e.message);
    }
  }

  // Fallback to local storage & static active faculty registry
  let localFaculties = [];
  try {
    const rawLocal = window.localStorage ? window.localStorage.getItem("DES_REGISTERED_FACULTIES") : null;
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) localFaculties = parsed;
    }
    const currentSession = window.localStorage ? JSON.parse(window.localStorage.getItem("DES_FACULTY_SESSION") || "null") : null;
    if (currentSession && currentSession.facultyId && currentSession.facultyId !== "GUEST") {
      if (!localFaculties.some(f => f.facultyId === currentSession.facultyId)) {
        localFaculties.push(currentSession);
      }
    }
  } catch (e) {}

  const allFaculties = [...ACTIVE_FACULTY_REGISTRY, ...localFaculties];
  const seen = new Set();
  const result = [];
  for (const f of allFaculties) {
    if (f && f.facultyId && !seen.has(f.facultyId)) {
      seen.add(f.facultyId);
      const fColId = String(f.collegeId || "").trim().toUpperCase();
      if (f.status === "ACTIVE" && fColId === canonicalColId && f.facultyId.toUpperCase() !== "UNKNOWN" && f.facultyId.toUpperCase() !== "FAC003") {
        result.push(f);
      }
    }
  }
  return result;
}

// ─── Direct localStorage read & unified service access ──────────────────────────
function normalizeFacultyKey(facultyId) {
  if (!facultyId || typeof facultyId !== "string") return "UNKNOWN";
  const svc = window.MEILP?.assignmentControlService || (window.MEILP?.AssignmentControlService ? new window.MEILP.AssignmentControlService() : null);
  if (svc && typeof svc.resolveFacultyId === "function") {
    return svc.resolveFacultyId(facultyId);
  }
  return facultyId.trim().toUpperCase();
}

function loadFacultyControls(facultyIdentifier) {
  if (!facultyIdentifier || facultyIdentifier === "UNKNOWN" || String(facultyIdentifier).includes("Unknown") || String(facultyIdentifier).includes("Unassigned")) {
    return {};
  }
  const svc = window.MEILP?.assignmentControlService || (window.MEILP?.AssignmentControlService ? new window.MEILP.AssignmentControlService() : null);
  if (svc && typeof svc.getFacultyControlsMap === "function") {
    return svc.getFacultyControlsMap(facultyIdentifier);
  }
  const key = "meilp-assignment-controls:" + normalizeFacultyKey(facultyIdentifier);
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function parseDueDate(str) {
  if (!str) return null;
  if (str instanceof Date) {
    return isNaN(str.getTime()) ? null : str;
  }
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  const m = typeof str === "string" ? str.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})(?:[T\s,]+(\d{1,2}):(\d{2}))?/) : null;
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

// ─── Dynamic Due Date Badge Calculation & Live Updates ────────────────────────
const DUE_DATE_THRESHOLDS = {
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  SEVENTY_TWO_HOURS_MS: 72 * 60 * 60 * 1000,
  TWENTY_FOUR_HOURS_MS: 24 * 60 * 60 * 1000
};

const DUE_STATE_CLASSES = [
  "due-safe",
  "due-approaching",
  "due-soon",
  "due-urgent",
  "due-overdue"
];

function getDueDateState(dueDateInput, nowMs) {
  if (!dueDateInput) return null;
  const d = (dueDateInput instanceof Date) ? (isNaN(dueDateInput.getTime()) ? null : dueDateInput) : parseDueDate(dueDateInput);
  if (!d || isNaN(d.getTime())) return null;

  const currentNow = typeof nowMs === "number" ? nowMs : Date.now();
  const remaining = d.getTime() - currentNow;

  if (remaining > DUE_DATE_THRESHOLDS.SEVEN_DAYS_MS) {
    return "safe";
  }
  if (remaining > DUE_DATE_THRESHOLDS.SEVENTY_TWO_HOURS_MS) {
    return "approaching";
  }
  if (remaining > DUE_DATE_THRESHOLDS.TWENTY_FOUR_HOURS_MS) {
    return "soon";
  }
  if (remaining > 0) {
    return "urgent";
  }
  return "overdue";
}

let dueDateTickerInterval = null;

function stopDueDateBadgeTicker() {
  if (dueDateTickerInterval) {
    clearInterval(dueDateTickerInterval);
    dueDateTickerInterval = null;
  }
}

function updateDueDateBadges(nowMs) {
  if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
  const badges = document.querySelectorAll(".due-date-badge[data-due-date]");
  if (!badges || !badges.forEach) return;
  badges.forEach(badge => {
    const rawDateStr = typeof badge.getAttribute === "function" ? badge.getAttribute("data-due-date") : (badge.dataset ? badge.dataset.dueDate : null);
    if (!rawDateStr) return;
    const d = parseDueDate(rawDateStr);
    if (!d || isNaN(d.getTime())) return;

    const state = getDueDateState(d, nowMs);
    if (!state) return;

    if (badge.classList && typeof badge.classList.remove === "function") {
      DUE_STATE_CLASSES.forEach(cls => badge.classList.remove(cls));
      badge.classList.add(`due-${state}`);
    }

    const storedFormatted = typeof badge.getAttribute === "function" ? badge.getAttribute("data-formatted-date") : (badge.dataset ? badge.dataset.formattedDate : null);
    const formatted = storedFormatted || formatDueDate(rawDateStr);
    if (formatted) {
      const isOverdue = state === "overdue";
      const icon = isOverdue ? "bi-clock-history" : "bi-calendar-event";
      const label = isOverdue ? `Deadline Passed: ${formatted}` : `Due: ${formatted}`;
      badge.innerHTML = `<i class="bi ${icon} me-1"></i>${escapeHtml(label)}`;
    }
  });
}

function startDueDateBadgeTicker() {
  stopDueDateBadgeTicker();
  if (typeof setInterval !== "undefined") {
    dueDateTickerInterval = setInterval(() => {
      updateDueDateBadges();
    }, 60000);
    if (dueDateTickerInterval && typeof dueDateTickerInterval.unref === "function") {
      dueDateTickerInterval.unref();
    }
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeunload", () => {
    stopDueDateBadgeTicker();
  });
}

function escapeHtml(str) {
  if (typeof window.MEILP.escapeHtml === "function") return window.MEILP.escapeHtml(str);
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getSelectedCollege() {
  if (getActiveRole() === "GUEST") return "";
  const sel = document.getElementById("studentCollegeSelect");
  if (sel && sel.value) {
    const match = currentLoadedColleges.find(c => c.collegeId === sel.value);
    if (match) return match.collegeName;
  }
  return "";
}

function getSelectedCollegeId() {
  if (getActiveRole() === "GUEST") return "";
  const sel = document.getElementById("studentCollegeSelect");
  if (sel && sel.value) return sel.value;
  return "";
}

function getSelectedFaculty() {
  if (getActiveRole() === "GUEST") return "";
  const sel = document.getElementById("studentFacultySelect");
  if (sel && sel.value) {
    if (sel.value === "UNKNOWN") return "Unknown / Unassigned Faculty";
    const match = currentLoadedFaculties.find(f => f.facultyId === sel.value);
    if (match) return match.facultyName;
  }
  return "";
}

function getSelectedFacultyId() {
  if (getActiveRole() === "GUEST") return "";
  const sel = document.getElementById("studentFacultySelect");
  if (sel && sel.value) return sel.value;
  return "";
}

// ─── Student Profile Context (Requirement 9 & 10) ──────────────────────────────
function getStudentProfile() {
  try {
    const raw = window.localStorage.getItem("meilp:studentProfile");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    fullName: "",
    rollNo: "",
    email: "",
    division: "",
    academicYear: "",
    collegeId: getSelectedCollegeId(),
    collegeName: getSelectedCollege(),
    facultyId: getSelectedFacultyId(),
    facultyName: getSelectedFaculty(),
    registeredAt: ""
  };
}

function saveStudentProfile(profile = {}) {
  const current = getStudentProfile();
  const updated = {
    ...current,
    ...profile,
    updatedAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem("meilp:studentProfile", JSON.stringify(updated));
    if (updated.collegeId) window.localStorage.setItem("meilp:selectedStudentCollegeId", JSON.stringify(updated.collegeId));
    if (updated.collegeName) window.localStorage.setItem("meilp:selectedStudentCollege", JSON.stringify(updated.collegeName));
    if (updated.facultyId) window.localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify(updated.facultyId));
    if (updated.facultyName) window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify(updated.facultyName));
  } catch (e) {}
  return updated;
}

window.MEILP.getStudentProfile = getStudentProfile;
window.MEILP.saveStudentProfile = saveStudentProfile;

function getActiveRole() {
  try {
    const raw = window.localStorage ? window.localStorage.getItem("meilp:activeRole") : null;
    if (raw) return String(raw).trim().toUpperCase();
  } catch(e) {}
  return "STUDENT";
}

function syncGatewayControls(role) {
  const activeRole = role || getActiveRole();
  const collegeSel = document.getElementById("studentCollegeSelect");
  const facultySel = document.getElementById("studentFacultySelect");
  const btnShow = document.getElementById("btnShowAssignments");
  const banner = document.getElementById("facultyStatusBanner");

  if (activeRole === "GUEST") {
    if (collegeSel) {
      collegeSel.value = "";
      collegeSel.disabled = true;
    }
    if (facultySel) {
      if (facultySel.innerHTML !== undefined) {
        facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
      }
      facultySel.value = "";
      facultySel.disabled = true;
    }
    if (btnShow) btnShow.disabled = true;
    if (banner) {
      banner.innerHTML = `<i class="bi bi-eye-fill me-1"></i><strong>Guest Mode (Read-Only)</strong>: Browsing standard coursework catalogue. Submissions and attempt creation are disabled.`;
    }
  } else {
    if (collegeSel) collegeSel.disabled = false;
    if (facultySel) facultySel.disabled = false;
    if (collegeSel && !collegeSel.value) {
      if (facultySel) {
        if (facultySel.innerHTML !== undefined) {
          facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
        }
        facultySel.value = "";
      }
      if (btnShow) btnShow.disabled = true;
    } else if (collegeSel && collegeSel.value) {
      updateFacultyDropdown(collegeSel.value, facultySel ? facultySel.value : "");
    }
  }
}

function setActiveRole(role) {
  const norm = String(role || "STUDENT").trim().toUpperCase();
  try {
    if (window.localStorage) {
      window.localStorage.setItem("meilp:activeRole", norm);
    }
  } catch(e) {}
  syncGatewayControls(norm);
  return norm;
}

window.MEILP.getActiveRole = getActiveRole;
window.MEILP.setActiveRole = setActiveRole;
window.MEILP.syncGatewayControls = syncGatewayControls;

function isRegisteredCollege(collegeId) {
  if (!collegeId) return false;
  const key = String(collegeId).trim().toUpperCase();
  if (key === "OTHER" || key.startsWith("OTHER") || key.includes("UNREGISTERED") || key.includes("UNKNOWN") || key.includes("GUEST")) {
    return false;
  }
  const list = (typeof currentLoadedColleges !== "undefined" && currentLoadedColleges && currentLoadedColleges.length > 0) 
    ? currentLoadedColleges 
    : ((window.MEILP && window.MEILP.ACTIVE_COLLEGE_REGISTRY) || []);
  return list.some(c => {
    const cId = (c.collegeId || "").trim().toUpperCase();
    const cName = (c.collegeName || "").trim().toUpperCase();
    if (cName.startsWith("OTHER") || cName.includes("UNREGISTERED") || cName.includes("UNKNOWN") || cName.includes("GUEST")) {
      return false;
    }
    return (cId && cId === key) || (cName && cName === key);
  });
}

window.MEILP.isRegisteredCollege = isRegisteredCollege;

async function populateCollegeAndFacultyDropdowns(options = {}) {
  const collegeSel = document.getElementById("studentCollegeSelect");
  const facultySel = document.getElementById("studentFacultySelect");
  if (!collegeSel || !facultySel) return;

  currentLoadedColleges = await fetchColleges();

  // 1. Determine active role FIRST
  const role = getActiveRole();

  if (role === "GUEST") {
    // -------------------------------------------------------------------------
    // GUEST INITIALIZATION
    // Neutral controls, no student profile restoration, controls disabled
    // -------------------------------------------------------------------------
    const defaultCollegeOption = `<option value="" disabled selected>Select Your College</option>`;
    const collegeOptions = currentLoadedColleges.map(c =>
      `<option value="${escapeHtml(c.collegeId)}">${escapeHtml(c.collegeName)}</option>`
    ).join("");
    collegeSel.innerHTML = defaultCollegeOption + collegeOptions;
    collegeSel.value = "";
    collegeSel.disabled = true;

    facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
    facultySel.value = "";
    facultySel.disabled = true;

    const btnShow = document.getElementById("btnShowAssignments");
    if (btnShow) btnShow.disabled = true;

    const banner = document.getElementById("facultyStatusBanner");
    if (banner) {
      banner.innerHTML = `<i class="bi bi-eye-fill me-1"></i><strong>Guest Mode (Read-Only)</strong>: Browsing standard coursework catalogue. Submissions and attempt creation are disabled.`;
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // STUDENT INITIALIZATION
  // ---------------------------------------------------------------------------
  const isCoursework = Boolean(
    typeof window !== "undefined" && window.MEILP && window.MEILP.isCourseworkPage
  );

  const allowRestore = !isCoursework && (!options || options.restoreProfile !== false);

  let savedCollegeId = "";
  let savedFacultyId = "";

  if (allowRestore) {
    try {
      const rawProfile = window.localStorage.getItem("meilp:studentProfile");
      if (rawProfile) {
        const profile = JSON.parse(rawProfile);
        if (profile && typeof profile === "object" && profile.collegeId) {
          savedCollegeId = String(profile.collegeId).trim().toUpperCase();
          if (profile.facultyId) {
            savedFacultyId = String(profile.facultyId).trim().toUpperCase();
          }
        }
      }
    } catch(e) {}
  }

  const isCollegeValid = savedCollegeId && currentLoadedColleges.some(c => c.collegeId.toUpperCase() === savedCollegeId);
  const activeCollegeId = isCollegeValid ? savedCollegeId : "";

  // If college is registered and has active faculty, UNKNOWN must never be restored from prior profile
  if (activeCollegeId && isRegisteredCollege(activeCollegeId)) {
    const facs = (typeof window.MEILP?.getActiveFacultiesForCollege === "function")
      ? window.MEILP.getActiveFacultiesForCollege(activeCollegeId)
      : [];
    if (facs.length > 0 && savedFacultyId === "UNKNOWN") {
      savedFacultyId = "";
    }
  }

  const defaultCollegeOption = `<option value="" disabled ${!activeCollegeId ? "selected" : ""}>Select Your College</option>`;
  const collegeOptions = currentLoadedColleges.map(c =>
    `<option value="${escapeHtml(c.collegeId)}"${(activeCollegeId && c.collegeId.toUpperCase() === activeCollegeId) ? " selected" : ""}>${escapeHtml(c.collegeName)}</option>`
  ).join("");
  collegeSel.innerHTML = defaultCollegeOption + collegeOptions;
  collegeSel.disabled = false;

  const btnShow = document.getElementById("btnShowAssignments");

  if (activeCollegeId) {
    collegeSel.value = activeCollegeId;
    await updateFacultyDropdown(activeCollegeId, savedFacultyId);
  } else {
    collegeSel.value = "";
    facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
    facultySel.value = "";
    facultySel.disabled = false;
    if (btnShow) btnShow.disabled = true;
  }
}

async function updateFacultyDropdown(collegeId, explicitFacultyId) {
  const facultySel = document.getElementById("studentFacultySelect");
  if (!facultySel) return;

  if (getActiveRole() === "GUEST") {
    facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
    facultySel.value = "";
    facultySel.disabled = true;
    return;
  }

  if (!collegeId) {
    facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
    facultySel.value = "";
    facultySel.disabled = false;
    try {
      window.localStorage.removeItem("meilp:selectedStudentCollegeId");
      window.localStorage.removeItem("meilp:selectedStudentCollege");
      window.localStorage.removeItem("meilp:selectedStudentFacultyId");
      window.localStorage.removeItem("meilp:selectedStudentFaculty");
    } catch(e) {}
    return;
  }

  const isRegistered = isRegisteredCollege(collegeId);
  const activeCollege = currentLoadedColleges.find(c => c.collegeId.toUpperCase() === String(collegeId).trim().toUpperCase() || c.collegeName.toUpperCase() === String(collegeId).trim().toUpperCase()) || { collegeId, collegeName: collegeId };

  if (!isRegistered) {
    // -------------------------------------------------------------------------
    // UNREGISTERED COLLEGE -> Treat as GUEST
    // -------------------------------------------------------------------------
    facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
    facultySel.value = "";
    facultySel.disabled = true;

    try {
      window.localStorage.removeItem("meilp:selectedStudentFacultyId");
      window.localStorage.removeItem("meilp:selectedStudentFaculty");
      window.localStorage.setItem("meilp:activeRole", "GUEST");
    } catch(e) {}

    if (window.updateGatewayRoleUI) {
      window.updateGatewayRoleUI("GUEST");
    }
    if (window.MEILP && typeof window.MEILP.setActiveRole === "function") {
      window.MEILP.setActiveRole("GUEST");
    }

    const banner = document.getElementById("facultyStatusBanner");
    if (banner) {
      banner.innerHTML = `<i class="bi bi-info-circle me-1"></i><strong>Your College is not yet registered with MEILP.</strong> You can continue as a Guest to explore our engineering learning resources and assignments. Guest users cannot create attempts or submit assignments.`;
    }
    return;
  }

  facultySel.innerHTML = `<option value="" disabled selected>Loading faculties...</option>`;
  facultySel.disabled = true;

  try {
    currentLoadedFaculties = await fetchFacultyList(collegeId);
  } catch (err) {
    facultySel.innerHTML = `<option value="ERROR" disabled selected>Unable to load faculty list. Please try again.</option>`;
    facultySel.disabled = false;
    return;
  }

  facultySel.disabled = false;

  const validActiveFaculties = (currentLoadedFaculties || []).filter(f =>
    f && f.facultyId && f.facultyId.toUpperCase() !== "UNKNOWN" && (f.status === "ACTIVE" || !f.status)
  );

  const isCoursework = Boolean(
    typeof window !== "undefined" && window.MEILP && window.MEILP.isCourseworkPage
  );

  let targetFacultyId = "";
  if (typeof explicitFacultyId === "string" && explicitFacultyId.trim()) {
    targetFacultyId = explicitFacultyId.trim().toUpperCase();
  } else if (!isCoursework) {
    try {
      const rawProfile = window.localStorage.getItem("meilp:studentProfile");
      if (rawProfile) {
        const profile = JSON.parse(rawProfile);
        if (profile && typeof profile === "object" && String(profile.collegeId).toUpperCase() === String(collegeId).toUpperCase() && profile.facultyId) {
          targetFacultyId = String(profile.facultyId).trim().toUpperCase();
        }
      }
    } catch(e) {}
  }

  if (validActiveFaculties.length > 0) {
    // -------------------------------------------------------------------------
    // REGISTERED COLLEGE WITH ONE OR MORE ACTIVE FACULTIES
    // "Unassigned Faculty / No Faculty" and "UNKNOWN" MUST NOT APPEAR!
    // Initial state: "Select Your Faculty" (disabled, placeholder)
    // -------------------------------------------------------------------------
    const isFacultyValid = targetFacultyId && targetFacultyId !== "UNKNOWN" && validActiveFaculties.some(f => f.facultyId.toUpperCase() === targetFacultyId);

    const defaultOption = `<option value="" disabled ${!isFacultyValid ? "selected" : ""}>Select Your Faculty</option>`;
    const facultyOptions = validActiveFaculties.map(f =>
      `<option value="${escapeHtml(f.facultyId)}"${(isFacultyValid && f.facultyId.toUpperCase() === targetFacultyId) ? " selected" : ""}>${escapeHtml(f.facultyName)}</option>`
    ).join("");

    facultySel.innerHTML = defaultOption + facultyOptions;

    if (isFacultyValid) {
      facultySel.value = targetFacultyId;
      const selectedFaculty = validActiveFaculties.find(f => f.facultyId.toUpperCase() === targetFacultyId);
      try {
        window.localStorage.setItem("meilp:selectedStudentCollegeId", JSON.stringify(activeCollege.collegeId));
        window.localStorage.setItem("meilp:selectedStudentCollege", JSON.stringify(activeCollege.collegeName));
        if (selectedFaculty) {
          window.localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify(selectedFaculty.facultyId));
          window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify(selectedFaculty.facultyName));
        }
      } catch(e) {}
    } else {
      facultySel.value = "";
      try {
        window.localStorage.setItem("meilp:selectedStudentCollegeId", JSON.stringify(activeCollege.collegeId));
        window.localStorage.setItem("meilp:selectedStudentCollege", JSON.stringify(activeCollege.collegeName));
        window.localStorage.removeItem("meilp:selectedStudentFacultyId");
        window.localStorage.removeItem("meilp:selectedStudentFaculty");
      } catch(e) {}
    }
  } else {
    // -------------------------------------------------------------------------
    // REGISTERED COLLEGE WITH ZERO ACTIVE FACULTIES
    // Automatically select "Unassigned Faculty / No Faculty" with Faculty_ID = "UNKNOWN"
    // Student remains a STUDENT. Attempts & submissions are allowed.
    // -------------------------------------------------------------------------
    facultySel.innerHTML = `<option value="UNKNOWN" selected>Unassigned Faculty / No Faculty</option>`;
    facultySel.value = "UNKNOWN";
    try {
      window.localStorage.setItem("meilp:selectedStudentCollegeId", JSON.stringify(activeCollege.collegeId));
      window.localStorage.setItem("meilp:selectedStudentCollege", JSON.stringify(activeCollege.collegeName));
      window.localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify("UNKNOWN"));
      window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify("Unassigned Faculty / No Faculty"));
      saveStudentProfile({
        collegeId: activeCollege.collegeId,
        collegeName: activeCollege.collegeName,
        facultyId: "UNKNOWN",
        facultyName: "Unassigned Faculty / No Faculty"
      });
    } catch(e) {}
  }

  if (getActiveRole() === "GUEST") {
    facultySel.disabled = true;
  }
}

// ─── Live assignment list (updated when JSON loads successfully) ───────────────
let liveAssignments = ALL_ASSIGNMENTS;

// ─── In-Page Validation Message Banner (Google Sites & Direct) ────────────────
function showLaunchValidationMessage(message, options) {
  options = options || {};
  let title = options.title;
  if (!title) {
    if (message && message.indexOf("College") !== -1) {
      title = "College Required";
    } else if (message && message.indexOf("Faculty") !== -1) {
      title = "Faculty Required";
    } else {
      title = "Selection Required";
    }
  }

  let targetElementId = options.targetElementId;
  if (!targetElementId) {
    if (message && message.indexOf("College") !== -1) {
      targetElementId = "studentCollegeSelect";
    } else if (message && message.indexOf("Faculty") !== -1) {
      targetElementId = "studentFacultySelect";
    }
  }

  if (typeof window !== "undefined") {
    if (!window.MEILP) window.MEILP = {};
    window.MEILP.lastLaunchValidation = {
      message: message,
      title: title,
      targetElementId: targetElementId,
      timestamp: Date.now()
    };
  }

  if (typeof document === "undefined") {
    return;
  }

  let banner = document.getElementById("meilpLaunchValidationBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "meilpLaunchValidationBanner";
    banner.className = "meilp-launch-validation-banner col-12 d-none";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "assertive");
    banner.style.display = "none";
    banner.innerHTML = `
      <div class="meilp-launch-banner-content">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="meilp-launch-banner-icon text-warning" aria-hidden="true">
              <i class="bi bi-exclamation-triangle-fill"></i>
            </span>
            <h5 class="meilp-launch-banner-title mb-0" id="meilpLaunchValidationTitle">Selection Required</h5>
          </div>
          <button type="button" class="btn-close meilp-launch-banner-close" id="meilpLaunchValidationCloseBtn" aria-label="Close"></button>
        </div>
        <p class="meilp-launch-banner-text mb-3" id="meilpLaunchValidationMessage"></p>
        <div class="d-flex justify-content-end">
          <button type="button" class="btn btn-primary px-4 py-2 rounded-pill fw-semibold meilp-launch-banner-ok-btn" id="meilpLaunchValidationOkBtn">OK</button>
        </div>
      </div>`;
  }

  // Determine placement: immediately above the clicked card or card list
  let targetCardCol = null;
  const grid = document.querySelector("[data-assignment-grid]");

  if (options.event && options.event.target && typeof options.event.target.closest === "function") {
    const card = options.event.target.closest(".assignment-card");
    if (card) {
      targetCardCol = (card.closest && card.closest(".col-12")) || card.parentElement;
    }
  }

  if (!targetCardCol && options.assignmentId && grid && typeof grid.querySelector === "function") {
    const matching = grid.querySelector(`[onclick*="${options.assignmentId}"]`);
    if (matching) {
      targetCardCol = (matching.closest && matching.closest(".col-12")) || (matching.parentElement === grid ? matching : null);
    }
  }

  if (targetCardCol && targetCardCol.parentElement) {
    targetCardCol.parentElement.insertBefore(banner, targetCardCol);
  } else if (grid && grid.parentElement) {
    grid.parentElement.insertBefore(banner, grid);
  } else if (document.body && banner.parentElement !== document.body) {
    document.body.appendChild(banner);
  }

  const titleEl = document.getElementById("meilpLaunchValidationTitle");
  if (titleEl) titleEl.textContent = title;

  const msgEl = document.getElementById("meilpLaunchValidationMessage");
  if (msgEl) msgEl.textContent = message;

  banner.classList.remove("d-none");
  banner.style.display = "block";

  const okBtn = document.getElementById("meilpLaunchValidationOkBtn");
  const closeBtn = document.getElementById("meilpLaunchValidationCloseBtn");

  function cleanupAndDismiss() {
    banner.classList.add("d-none");
    banner.style.display = "none";
    if (okBtn) okBtn.removeEventListener("click", onOkClick);
    if (closeBtn) closeBtn.removeEventListener("click", onCloseClick);
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", onKeyDown, true);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", onKeyDown, true);
    }

    if (targetElementId) {
      const targetEl = document.getElementById(targetElementId);
      if (targetEl) {
        if (typeof targetEl.scrollIntoView === "function") {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }
        if (typeof targetEl.focus === "function") {
          targetEl.focus();
        }
      }
    }
  }

  function onOkClick(e) {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    cleanupAndDismiss();
  }

  function onCloseClick(e) {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    cleanupAndDismiss();
  }

  function onKeyDown(e) {
    if (e.key === "Escape" || e.keyCode === 27 || e.key === "Esc") {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      cleanupAndDismiss();
    }
  }

  if (okBtn) {
    okBtn.addEventListener("click", onOkClick, { once: true });
    try {
      if (typeof okBtn.focus === "function") {
        okBtn.focus({ preventScroll: true });
      }
    } catch (err) {
      try { okBtn.focus(); } catch (e) {}
    }
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", onCloseClick, { once: true });
  }

  if (typeof banner.scrollIntoView === "function") {
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeyDown, true);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", onKeyDown, true);
  }
}

// ─── Direct Assignment Launch Guard ──────────────────────────────────────────
function launchAssignment(assignmentId, event) {
  if (event) {
    if (typeof event.preventDefault === "function") event.preventDefault();
    if (typeof event.stopPropagation === "function") event.stopPropagation();
  }
  const activeRole = getActiveRole();
  const collegeId = getSelectedCollegeId();
  const facultyId = getSelectedFacultyId();
  const isRegistered = isRegisteredCollege(collegeId);
  const activeFaculties = (typeof window.MEILP?.getActiveFacultiesForCollege === "function" && isRegistered)
    ? window.MEILP.getActiveFacultiesForCollege(collegeId)
    : (currentLoadedFaculties || []).filter(f => f && f.facultyId && f.facultyId.toUpperCase() !== "UNKNOWN" && (f.status === "ACTIVE" || !f.status));
  const hasActiveFaculties = activeFaculties.length > 0;

  if (activeRole === "STUDENT" || !activeRole) {
    if (!collegeId || !isRegistered) {
      showLaunchValidationMessage("Please select your College before starting this assignment.", {
        title: "College Required",
        targetElementId: "studentCollegeSelect",
        assignmentId: assignmentId,
        event: event
      });
      return false;
    }
    if (hasActiveFaculties && (!facultyId || facultyId === "UNKNOWN")) {
      showLaunchValidationMessage("Please select your Faculty before starting this assignment.", {
        title: "Faculty Required",
        targetElementId: "studentFacultySelect",
        assignmentId: assignmentId,
        event: event
      });
      return false;
    }
  }

  const allList = (typeof liveAssignments !== "undefined" && Array.isArray(liveAssignments) && liveAssignments.length > 0)
    ? liveAssignments
    : ALL_ASSIGNMENTS;
  const found = allList.find(a => a && (a.id === assignmentId || a.slug === assignmentId));
  const targetPath = (found && found.launchPath) ? found.launchPath : `assignment-workbench.html?assignment=${encodeURIComponent(assignmentId)}`;
  window.location.href = targetPath;
  return true;
}

// ─── Main render function ─────────────────────────────────────────────────────
function renderAssignmentCards(cards) {
  const grid = document.querySelector("[data-assignment-grid]");
  if (!grid) return;

  const validationBanner = document.getElementById("meilpLaunchValidationBanner");
  if (validationBanner && validationBanner.parentElement === grid && grid.parentElement) {
    grid.parentElement.insertBefore(validationBanner, grid);
  }

  // Update live list if a new set is passed in
  if (Array.isArray(cards) && cards.length > 0) liveAssignments = cards;
  const assignments = liveAssignments;

  const activeRole = getActiveRole();
  const college = (activeRole === "GUEST") ? "" : getSelectedCollege();
  const faculty = (activeRole === "GUEST") ? "" : getSelectedFaculty();
  const facultyId = (activeRole === "GUEST") ? "" : getSelectedFacultyId();
  const controls = (facultyId && facultyId !== "UNKNOWN" && activeRole !== "GUEST") ? loadFacultyControls(facultyId) : {};

  let enabledCount = 0, disabledCount = 0;
  assignments.forEach(a => {
    const c = controls[a.id] || {};
    (typeof c.enabled === "boolean" ? c.enabled : true) ? enabledCount++ : disabledCount++;
  });

  const banner = document.getElementById("facultyStatusBanner");
  const collegeId = (activeRole === "GUEST") ? "" : getSelectedCollegeId();
  const isRegistered = isRegisteredCollege(collegeId);
  const activeFaculties = (typeof window.MEILP?.getActiveFacultiesForCollege === "function" && isRegistered)
    ? window.MEILP.getActiveFacultiesForCollege(collegeId)
    : (currentLoadedFaculties || []).filter(f => f && f.facultyId && f.facultyId.toUpperCase() !== "UNKNOWN" && (f.status === "ACTIVE" || !f.status));
  const hasActiveFaculties = activeFaculties.length > 0;

  // Student is blocked when:
  // - No college selected, OR
  // - College is registered AND has active faculties, but student hasn't selected one (!facultyId or facultyId === "UNKNOWN")
  const isNoCollegeSelected = activeRole === "STUDENT" && !collegeId;
  const isFacultyNotSelected = activeRole === "STUDENT" && isRegistered && hasActiveFaculties && (!facultyId || facultyId === "UNKNOWN");
  const isStudentBlocked = isNoCollegeSelected || isFacultyNotSelected;

  const btnShow = document.getElementById("btnShowAssignments");
  const collegeSel = document.getElementById("studentCollegeSelect");
  const facultySel = document.getElementById("studentFacultySelect");

  if (activeRole === "GUEST") {
    if (collegeSel) {
      collegeSel.disabled = true;
      if (collegeSel.value !== "") collegeSel.value = "";
    }
    if (facultySel) {
      facultySel.disabled = true;
      if (facultySel.value !== "") {
        if (facultySel.innerHTML !== undefined) {
          facultySel.innerHTML = `<option value="" disabled selected>Select Your Faculty</option>`;
        }
        facultySel.value = "";
      }
    }
    if (btnShow) btnShow.disabled = true;
  } else {
    if (collegeSel) collegeSel.disabled = false;
    if (btnShow) {
      if (!collegeId) {
        btnShow.disabled = true;
      } else if (isRegistered && !hasActiveFaculties) {
        btnShow.disabled = false;
      } else {
        btnShow.disabled = isStudentBlocked;
      }
    }
  }

  if (banner) {
    if (activeRole === "GUEST") {
      banner.innerHTML = `<i class="bi bi-eye-fill me-1"></i><strong>Guest Mode (Read-Only)</strong>: Browsing standard coursework catalogue. Submissions and attempt creation are disabled.`;
    } else if (isFacultyNotSelected) {
      banner.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-warning me-1"></i><strong>Faculty Selection Required</strong>: Please select your faculty before continuing.`;
    } else if (isRegistered && !hasActiveFaculties) {
      banner.innerHTML = `<i class="bi bi-info-circle me-1"></i>Showing standard coursework for <strong>${escapeHtml(college)}</strong> (Unassigned Faculty / No Faculty)`;
    } else if (!facultyId) {
      banner.innerHTML = `<i class="bi bi-info-circle me-1"></i>Showing standard coursework for students and visitors`;
    } else if (facultyId === "UNKNOWN" || faculty.includes("Unknown") || faculty.includes("Unassigned")) {
      banner.innerHTML = `<i class="bi bi-info-circle me-1"></i>Showing standard coursework for <strong>Unassigned Faculty / No Faculty</strong>${college ? ` • <span class="opacity-75">${escapeHtml(college)}</span>` : ""}`;
    } else {
      banner.innerHTML = `<i class="bi bi-person-badge-fill me-1"></i>Schedule for <strong>${escapeHtml(faculty)}</strong> &nbsp;(${enabledCount} Active, ${disabledCount} Disabled)${college ? ` • <span class="opacity-75">${escapeHtml(college)}</span>` : ""}`;
    }
  }

  function renderSingleCard(card) {
    const ctrl = controls[card.id] || {};
    const enabled = typeof ctrl.enabled === "boolean" ? ctrl.enabled : true;
    const rawDue = ctrl.dueDate || null;
    const dObj = rawDue ? parseDueDate(rawDue) : null;
    const formatted = (rawDue && dObj) ? formatDueDate(rawDue) : null;
    const dueState = dObj ? getDueDateState(dObj) : null;
    const icon = card.icon || "bi-journal-text";

    const deadlinePill = (dObj && formatted && dueState)
      ? `<span class="badge border due-date-badge due-${dueState}" data-due-date="${escapeHtml(dObj.toISOString())}" data-formatted-date="${escapeHtml(formatted)}"><i class="bi ${dueState === "overdue" ? "bi-clock-history" : "bi-calendar-event"} me-1"></i>${dueState === "overdue" ? "Deadline Passed: " : "Due: "}${escapeHtml(formatted)}</span>`
      : `<span class="badge bg-light text-muted border"><i class="bi bi-clock me-1"></i>No Deadline</span>`;

    const coBadge = card.co ? `<span class="badge bg-light text-dark border">${escapeHtml(card.co)}</span>` : "";
    const weightageBadge = card.weightage ? `<span class="badge bg-light text-dark border">${escapeHtml(card.weightage)}</span>` : "";
    const statusLabel = card.status === "Ready" ? "Ready" : "Active";

    if (!enabled) {
      return `<div class="col-12 col-md-6 col-lg-4">
        <article class="assignment-card h-100 d-flex flex-column justify-content-between p-4 shadow-sm border rounded-4"
          style="background-color:#f8f9fa;border-color:#dee2e6;opacity:0.75;filter:grayscale(30%);cursor:not-allowed;"
          onclick="alert('Disabled by ${escapeHtml(faculty || "Faculty")} for your class.')">
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
              ${coBadge}
              ${weightageBadge}
              <span class="badge bg-light text-dark border">${card.tasks || 0} tasks</span>
              <span class="badge bg-light text-dark border">${escapeHtml(card.discipline || "")}</span>
              ${deadlinePill}
            </div>
            <button class="btn btn-secondary w-100 rounded-pill py-2" disabled><i class="bi bi-lock-fill me-1"></i>Disabled by Faculty</button>
          </div>
        </article>
      </div>`;
    }

    const launchHandler = `window.MEILP.launchAssignment('${escapeHtml(card.id)}', event);`;
    const launchButton = `<button type="button" class="btn btn-primary w-100 rounded-pill py-2 shadow-sm" onclick="event.stopPropagation(); window.MEILP.launchAssignment('${escapeHtml(card.id)}', event);"><i class="bi bi-rocket-takeoff me-1"></i>Launch Workbench</button>`;

    return `<div class="col-12 col-md-6 col-lg-4">
      <article class="assignment-card h-100 d-flex flex-column justify-content-between p-4 shadow-sm border rounded-4 hover-shadow"
        style="background-color:#fff;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;"
        onclick="${launchHandler}">
        <div>
          <div class="d-flex justify-content-between align-items-start mb-3">
            <span class="card-icon fs-3 text-primary bg-primary-subtle p-3 rounded-4"><i class="bi ${escapeHtml(icon)}"></i></span>
            <div class="text-end">
              <span class="badge bg-dark text-white rounded-pill px-3 py-1 mb-1 d-block">${escapeHtml(card.id)}</span>
              <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle"><i class="bi bi-check-circle me-1"></i>${statusLabel}</span>
            </div>
          </div>
          <h3 class="h6 fw-bold text-dark mb-2">${escapeHtml(card.title)}</h3>
          <p class="text-secondary small mb-3">${escapeHtml(card.summary || "")}</p>
        </div>
        <div>
          <div class="d-flex flex-wrap gap-2 mb-3">
            ${coBadge}
            ${weightageBadge}
            <span class="badge bg-light text-dark border">${card.tasks || 0} tasks</span>
            <span class="badge bg-light text-dark border">${escapeHtml(card.discipline || "")}</span>
            ${deadlinePill}
          </div>
          ${ctrl.note ? `<div class="alert alert-info py-1 px-2 small mb-3"><i class="bi bi-info-circle me-1"></i>${escapeHtml(ctrl.note)}</div>` : ""}
          ${launchButton}
        </div>
      </article>
    </div>`;
  }

  const dmeAssignments = assignments.filter(a => {
    const disc = String(a.discipline || "").toLowerCase();
    const id = String(a.id || "").toUpperCase();
    return disc.indexOf("transmission") === -1 && !id.startsWith("EA-TS");
  });

  const tsAssignments = assignments.filter(a => {
    const disc = String(a.discipline || "").toLowerCase();
    const id = String(a.id || "").toUpperCase();
    return disc.indexOf("transmission") !== -1 || id.startsWith("EA-TS");
  });

  grid.innerHTML = dmeAssignments.map(renderSingleCard).join("");

  const tsGrid = document.querySelector("[data-transmission-assignment-grid]") || document.getElementById("transmissionAssignmentGrid");
  if (tsGrid) {
    tsGrid.innerHTML = tsAssignments.map(renderSingleCard).join("");
  }

  startDueDateBadgeTicker();
}

// ─── Expose globally ──────────────────────────────────────────────────────────
window.MEILP.renderAssignmentCards = renderAssignmentCards;
window.MEILP.loadFacultyControls = loadFacultyControls;
window.MEILP.populateCollegeAndFacultyDropdowns = populateCollegeAndFacultyDropdowns;
window.MEILP.updateFacultyDropdown = updateFacultyDropdown;
window.MEILP.getSelectedCollege = getSelectedCollege;
window.MEILP.getSelectedCollegeId = getSelectedCollegeId;
window.MEILP.getSelectedFaculty = getSelectedFaculty;
window.MEILP.getSelectedFacultyId = getSelectedFacultyId;
window.MEILP.getDueDateState = getDueDateState;
window.MEILP.updateDueDateBadges = updateDueDateBadges;
window.MEILP.startDueDateBadgeTicker = startDueDateBadgeTicker;
window.MEILP.stopDueDateBadgeTicker = stopDueDateBadgeTicker;
window.MEILP.DUE_DATE_THRESHOLDS = DUE_DATE_THRESHOLDS;
window.MEILP.DUE_STATE_CLASSES = DUE_STATE_CLASSES;
window.MEILP.launchAssignment = launchAssignment;
window.MEILP.showLaunchValidationMessage = showLaunchValidationMessage;
// ─── Coursework Initial Scroll Position Helper ───────────────────────────────
function initCourseworkScroll() {
  if (typeof window !== "undefined" && window.MEILP && window.MEILP.isCourseworkPage) {
    if (!window.__courseworkInitialScrollDone) {
      window.__courseworkInitialScrollDone = true;
      var hist = (typeof window !== "undefined" && window.history) || (typeof history !== "undefined" ? history : null);
      if (hist && "scrollRestoration" in hist) {
        hist.scrollRestoration = "manual";
      }
      if (typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
      }
      if (typeof document !== "undefined") {
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
    }
  }
}

window.MEILP.initCourseworkScroll = initCourseworkScroll;
if (typeof window !== "undefined") {
  window.launchAssignment = launchAssignment;
  window.showLaunchValidationMessage = showLaunchValidationMessage;
  window.initCourseworkScroll = initCourseworkScroll;
}

// ─── Bind controls ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initCourseworkScroll();
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
    populateCollegeAndFacultyDropdowns();
    renderAssignmentCards(merged);
    console.log("[MEILP] Loaded", merged.length, "assignments (", merged.length - base.length, "custom)");
  })();

  populateCollegeAndFacultyDropdowns();

  const collegeSel = document.getElementById("studentCollegeSelect");
  const facultySel = document.getElementById("studentFacultySelect");
  const btn = document.getElementById("btnShowAssignments");

  const syncAndRenderControls = async function(facId) {
    const canonicalId = (facId && facId !== "UNKNOWN") ? normalizeFacultyKey(facId) : null;
    if (canonicalId && canonicalId !== "UNKNOWN") {
      try {
        const svc = window.MEILP?.assignmentControlService || (window.MEILP?.AssignmentControlService ? new window.MEILP.AssignmentControlService() : null);
        if (svc && typeof svc.fetchCloudControls === "function") {
          await svc.fetchCloudControls(canonicalId);
        }
      } catch (err) {
        console.warn("[MEILP] Cloud control sync failed:", err);
      }
    }
    renderAssignmentCards();
  };

  if (collegeSel) {
    collegeSel.addEventListener("change", async function () {
      if (getActiveRole() === "GUEST") return;
      try {
        window.localStorage.removeItem("meilp:selectedStudentFacultyId");
        window.localStorage.removeItem("meilp:selectedStudentFaculty");
      } catch(e) {}
      await updateFacultyDropdown(collegeSel.value, "");
      const facId = getSelectedFacultyId();
      syncAndRenderControls(facId);
    });
  }

  if (facultySel) {
    facultySel.addEventListener("change", function () {
      if (getActiveRole() === "GUEST") return;
      const activeCollege = currentLoadedColleges.find(c => c.collegeId === (collegeSel ? collegeSel.value : ""));
      const activeFaculty = currentLoadedFaculties.find(f => f.facultyId === facultySel.value);
      try {
        if (facultySel.value === "UNKNOWN") {
          window.localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify("UNKNOWN"));
          window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify("Unknown / Unassigned Faculty"));
          saveStudentProfile({
            collegeId: activeCollege?.collegeId || (collegeSel ? collegeSel.value : ""),
            collegeName: activeCollege?.collegeName || "",
            facultyId: "UNKNOWN",
            facultyName: "Unknown / Unassigned Faculty"
          });
        } else if (activeFaculty) {
          window.localStorage.setItem("meilp:selectedStudentFacultyId", JSON.stringify(activeFaculty.facultyId));
          window.localStorage.setItem("meilp:selectedStudentFaculty", JSON.stringify(activeFaculty.facultyName));
          saveStudentProfile({
            collegeId: activeCollege?.collegeId || (collegeSel ? collegeSel.value : ""),
            collegeName: activeCollege?.collegeName || "",
            facultyId: activeFaculty.facultyId,
            facultyName: activeFaculty.facultyName
          });
        } else if (!facultySel.value) {
          window.localStorage.removeItem("meilp:selectedStudentFacultyId");
          window.localStorage.removeItem("meilp:selectedStudentFaculty");
        }
      } catch(e) {}
      syncAndRenderControls(facultySel.value);
    });
  }
  if (btn) {
    btn.addEventListener("click", function () {
      if (getActiveRole() === "GUEST") return;
      const facId = getSelectedFacultyId();
      syncAndRenderControls(facId);
    });
  }

  // Trigger initial cloud sync after dropdowns are populated
  populateCollegeAndFacultyDropdowns().then(() => {
    if (getActiveRole() === "GUEST") return;
    const facId = getSelectedFacultyId();
    if (facId && facId !== "UNKNOWN") {
      syncAndRenderControls(facId);
    }
  });

  // Listen for faculty portal changes (cross-tab storage event)
  window.addEventListener("storage", function (e) {
    if (!e.key || e.key.startsWith("meilp-assignment-controls") || e.key === "meilp-custom-assignments") {
      // Re-merge and re-render with latest custom assignments
      const merged = mergeWithCustom(liveAssignments);
      renderAssignmentCards(merged);
    }
  });

  // Listen for in-window custom events
  window.addEventListener("meilp:assignment-controls-updated", function () {
    renderAssignmentCards();
  });
  window.addEventListener("meilp-controls-updated", function () {
    renderAssignmentCards();
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
