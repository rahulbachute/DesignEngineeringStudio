window.MEILP = window.MEILP || {};

/**
 * Central platform configuration.
 * Keep platform-level defaults here and assignment-specific content in data files
 * or assignment folders.
 */
window.MEILP.platformConfig = {
  appName: "MEILP",
  fullName: "Mechanical Engineering Interactive Learning Platform",
  buildLabel: "Design Engineering Studio Platform Engine",
  storageNamespace: "meilp",
  defaultTheme: "light",
  navItems: [
    { label: "Home", href: "#home" },
    { label: "Assignments", href: "#assignments" }
  ]
};

window.MEILP.dataSources = {
  assignmentRegistry: "../../data/assignments.json"
};

window.MEILP.googleSheetsConfig = {
  submissionWebAppUrl: "https://script.google.com/macros/s/AKfycbzAnnjAXquy00NQ1fXFhI45IdkcZ0SQiL-mGmf7B_Z-_0uXLg6lah8VYNRi9JYbXgtD/exec",
  requestTimeoutMs: 10000,
  apiKey: ""
};

window.MEILP.submissionConfig = {
  maxRetryAttempts: 3
};

window.MEILP.colleges = [
  "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
  "AISSMS College of Engineering, Pune",
  "Alard College of Engineering & Management, Marunji",
  "Anantrao Pawar College of Engineering & Research, Pune",
  "Bharati Vidyapeeth's College of Engineering, Lavale",
  "COEP Technological University, Pune",
  "D.Y. Patil College of Engineering, Akurdi, Pune",
  "Dattakala Group of Institutions, Swami-Chincholi",
  "Dr. D.Y. Patil Institute of Technology, Pimpri, Pune",
  "Flora Institute of Technology, Khopi",
  "G.H. Raisoni College of Engineering & Management, Wagholi",
  "Genba Sopanrao Moze College of Engineering, Baner-Balewadi",
  "Government College of Engineering & Research, Avasari Khurd",
  "Indira College of Engineering & Management, Pune",
  "ISBM College of Engineering, Nande",
  "Jaihind College of Engineering",
  "JSPM Narhe Technical Campus, Narhe",
  "JSPM's Bhivarabai Sawant Institute of Technology & Research, Wagholi",
  "JSPM's Jaywantrao Sawant College of Engineering, Hadapsar",
  "K.J. College of Engineering & Management Research, Pisoli",
  "Keystone School of Engineering, Pune",
  "Marathwada Mitra Mandal's College of Engineering, Karvenagar",
  "Marathwada Mitra Mandal's Institute of Technology, Lohgaon",
  "MIT Academy of Engineering, Alandi",
  "Modern College of Engineering, Pune",
  "Modern Education Society's Wadia College of Engineering, Pune",
  "Navsahyadri Education Society's Group of Institutions, Naigaon",
  "NBN Sinhgad Technical Institutes Campus, Ambegaon",
  "Nutan Maharashtra Institute of Engineering & Technology, Talegaon",
  "P. Vasantdada Patil Institute of Technology, Bavdhan",
  "P.K. Technical Campus, Chakan/Khed",
  "PDEA's College of Engineering, Manjari",
  "Pimpri Chinchwad College of Engineering & Research, Ravet",
  "Pimpri Chinchwad College of Engineering (PCCOE), Nigdi, Pune",
  "PVG's College of Engineering, Technology & Management, Pune",
  "Rajarshi Shahu College of Engineering, Tathawade",
  "Rajgad Technical Campus, Bhor",
  "Rasiklal M. Dhariwal Sinhgad Technical Institutes Campus, Warje",
  "S.B. Patil College of Engineering, Vangali/Indapur",
  "Samarth College of Engineering & Management, Belhe",
  "Sharadchandra Pawar College of Engineering & Technology, Someshwar Nagar",
  "Sharadchandra Pawar College of Engineering, Dumbarwadi",
  "Shree Ramchandra College of Engineering, Lonikand",
  "Siddhant College of Engineering, Sudumbare",
  "Sinhgad Academy of Engineering, Kondhwa",
  "Sinhgad College of Engineering, Vadgaon",
  "Sinhgad Institute of Technology & Science, Narhe",
  "SJVPM College of Engineering, Pune",
  "Smt. Kashibai Navale College of Engineering, Vadgaon",
  "Suman Ramesh Tulsiani Technical Campus, Kamshet",
  "Trinity Academy of Engineering, Yewalewadi",
  "Trinity College of Engineering & Research, Pisoli",
  "TSSM's Bhivarabai Sawant College of Engineering & Research, Narhe",
  "Universal College of Engineering & Research, Sasewadi",
  "Vidya Pratishthan's K.B. Institute of Engineering & Technology, Baramati",
  "Vishwakarma Institute of Technology (VIT), Bibwewadi, Pune",
  "Zeal College of Engineering & Research, Narhe"
];

window.MEILP.ACTIVE_COLLEGE_REGISTRY = [
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

window.MEILP.ACTIVE_FACULTY_REGISTRY = [
  {
    facultyId: "FAC001",
    facultyName: "Dr. Rahul Bachute",
    email: "rahul.bachute@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "HOD",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC002",
    facultyName: "Dr. Niranjan Shegokar",
    email: "niranjan.shegokar@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC003",
    facultyName: "Prof. Atul Gowardipe",
    email: "atul.gowardipe@dypic.in",
    collegeId: "COL001",
    collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  },
  {
    facultyId: "FAC004",
    facultyName: "Prof. Said Khandu",
    email: "said.khandu@jcoe.edu.in",
    collegeId: "COL002",
    collegeName: "Jaihind College of Engineering",
    department: "Mechanical Engineering",
    role: "FACULTY",
    status: "ACTIVE"
  }
];

window.MEILP.isRegisteredCollege = function(collegeIdentifier) {
  if (!collegeIdentifier) return false;
  const key = String(collegeIdentifier).trim().toUpperCase();
  if (key === "OTHER" || key.startsWith("OTHER") || key.includes("UNREGISTERED") || key.includes("UNKNOWN") || key.includes("GUEST")) {
    return false;
  }
  const list = window.MEILP.ACTIVE_COLLEGE_REGISTRY || [];
  return list.some(c => {
    const cId = (c.collegeId || "").trim().toUpperCase();
    const cName = (c.collegeName || "").trim().toUpperCase();
    if (cName.startsWith("OTHER") || cName.includes("UNREGISTERED") || cName.includes("UNKNOWN") || cName.includes("GUEST")) {
      return false;
    }
    return (cId && cId === key) || (cName && cName === key);
  });
};

window.MEILP.getActiveFacultiesForCollege = function(collegeIdentifier) {
  if (!collegeIdentifier) return [];
  const key = String(collegeIdentifier).trim().toUpperCase();
  const colList = window.MEILP.ACTIVE_COLLEGE_REGISTRY || [];
  const matchedCol = colList.find(c => (c.collegeId && c.collegeId.toUpperCase() === key) || (c.collegeName && c.collegeName.toUpperCase() === key));
  const effectiveColId = matchedCol ? matchedCol.collegeId.toUpperCase() : key;
  
  let localFaculties = [];
  try {
    const rawLocal = typeof localStorage !== "undefined" ? localStorage.getItem("DES_REGISTERED_FACULTIES") : null;
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) localFaculties = parsed;
    }
  } catch (e) {}

  const allFaculties = [...(window.MEILP.ACTIVE_FACULTY_REGISTRY || []), ...localFaculties];
  const seen = new Set();
  const result = [];
  for (const f of allFaculties) {
    if (f && f.facultyId && !seen.has(f.facultyId.toUpperCase())) {
      seen.add(f.facultyId.toUpperCase());
      const fColId = String(f.collegeId || "").trim().toUpperCase();
      const fStatus = String(f.status || "ACTIVE").trim().toUpperCase();
      if (fStatus === "ACTIVE" && fColId === effectiveColId && f.facultyId.toUpperCase() !== "UNKNOWN") {
        result.push(f);
      }
    }
  }
  return result;
};
