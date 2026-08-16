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
  submissionWebAppUrl: "https://script.google.com/macros/s/AKfycbw9o5gPYgMVdxXyL1XdN9s3N5ndBjuMgSMs9UptWPrM2fo8221TLha0nUphx9f7Drk/exec",
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
  "Zeal College of Engineering & Research, Narhe",
  "Other – Pune",
  "Other – Maharashtra",
  "Other – Outside Maharashtra"
];
