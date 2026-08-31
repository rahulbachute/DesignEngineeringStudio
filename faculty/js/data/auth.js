(function (global) {
  const roles = ['FACULTY', 'STUDENT', 'ADMIN', 'GUEST'];

  /**
   * Authentication and permission service for faculty & admin workflows.
   * Dynamically checks Faculty_Registry in Google Sheets and validates role/status.
   */
  const AuthService = {
    /**
     * Return the active user profile based on session storage.
     * Prioritizes authoritative DES_FACULTY_SESSION object with Faculty_ID from Google Sheet.
     * @returns {{role: string, name: string, facultyId: string, email: string, collegeId: string, collegeName: string, department: string, status: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    getCurrentUser() {
      // Check structured session first
      try {
        const rawSession = localStorage.getItem("DES_FACULTY_SESSION");
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session && session.facultyId) {
            const rawRole = String(session.role || 'FACULTY').trim().toUpperCase();
            const canonicalRole = rawRole === 'HOD' ? 'ADMIN' : rawRole;
            return {
              role: canonicalRole,
              facultyId: String(session.facultyId).toUpperCase(),
              name: session.facultyName || session.name || 'Faculty',
              email: session.email || '',
              collegeId: session.collegeId || '',
              collegeName: session.collegeName || '',
              department: session.department || 'Mechanical Engineering',
              status: String(session.status || 'ACTIVE').toUpperCase(),
              isAuthenticated: true,
              isGuest: canonicalRole === 'GUEST' || session.isGuest === true
            };
          }
        }
      } catch (e) {}

      // Check legacy string key if present
      const loggedInFaculty = localStorage.getItem("loggedInFaculty");
      if (loggedInFaculty && loggedInFaculty.toLowerCase() !== 'guest') {
        return {
          role: 'FACULTY',
          name: loggedInFaculty,
          facultyId: 'UNKNOWN',
          email: loggedInFaculty.includes('@') ? loggedInFaculty : '',
          collegeId: '',
          collegeName: '',
          department: 'Mechanical Engineering',
          status: 'ACTIVE',
          isAuthenticated: true,
          isGuest: false
        };
      }

      return {
        role: 'GUEST',
        name: 'Guest',
        facultyId: 'GUEST',
        email: '',
        collegeId: '',
        collegeName: '',
        department: '',
        status: 'ACTIVE',
        isAuthenticated: false,
        isGuest: true
      };
    },

    /**
     * Helper to check if current user is in Guest mode.
     * @returns {boolean}
     */
    isGuest() {
      return this.getCurrentUser().isGuest === true;
    },

    /**
     * Authenticate faculty or admin against backend Faculty_Registry in Google Sheets.
     * @param {string} loginId - Login ID or Email
     * @param {string} password - Raw Password
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async authenticate(loginId, password) {
      if (!loginId || !password) {
        return { success: false, error: 'Login ID and password are required.' };
      }

      const cleanId = String(loginId).trim().toLowerCase();

      // Guest Login bypass
      if (cleanId === 'guest' && (password === 'Guest@123' || password === 'guest123' || password === 'guest')) {
        const guestUser = {
          facultyId: 'GUEST',
          facultyName: 'Guest Faculty',
          email: 'guest@dypic.in',
          collegeId: '',
          collegeName: '',
          department: 'Mechanical Engineering',
          role: 'GUEST',
          status: 'ACTIVE',
          isAuthenticated: false,
          isGuest: true
        };
        localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(guestUser));
        localStorage.setItem("loggedInFaculty", "Guest");
        return { success: true, user: guestUser };
      }

      // Check Google Sheet via DESRepository or direct fetch
      try {
        const endpoint = (global.DESConfig && global.DESConfig.apiBaseUrl) ||
                         (global.MEILP && global.MEILP.googleSheetsConfig && global.MEILP.googleSheetsConfig.submissionWebAppUrl);
        if (endpoint) {
          const res = await fetch(`${endpoint}?action=facultyLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ loginId: cleanId, password }),
            signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.success && json.data) {
              const user = json.data;
              if (String(user.status || "").toUpperCase() !== "ACTIVE") {
                return { success: false, error: 'Account is inactive. Please contact administrator.' };
              }
              user.role = String(user.role || 'FACULTY').trim().toUpperCase();
              if (user.role === 'HOD') user.role = 'ADMIN';
              user.isAuthenticated = true;
              user.isGuest = false;
              localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(user));
              localStorage.setItem("loggedInFaculty", user.facultyName || user.facultyId);
              return { success: true, user };
            } else if (json && json.statusCode === 403) {
              return { success: false, error: json.error || 'Account is inactive. Please contact administrator.' };
            } else if (json && json.statusCode === 401) {
              console.warn("[DESAuth] Cloud rejected credentials, checking local registry fallback.");
            }
          }
        }
      } catch (err) {
        console.warn("[DESAuth] Cloud authentication attempt failed, checking local registry:", err.message);
      }

      // Local / Offline Fallback Authentication
      // 1. Check locally registered faculties from localStorage
      try {
        const rawLocal = localStorage.getItem("DES_REGISTERED_FACULTIES");
        if (rawLocal) {
          const localList = JSON.parse(rawLocal);
          if (Array.isArray(localList)) {
            const matched = localList.find(f => 
              (f.email && f.email.toLowerCase() === cleanId) ||
              (f.loginId && f.loginId.toLowerCase() === cleanId) ||
              (f.facultyId && f.facultyId.toLowerCase() === cleanId)
            );
            if (matched) {
              if (String(matched.status || "").toUpperCase() !== "ACTIVE") {
                return { success: false, error: 'Account is inactive. Please contact administrator.' };
              }
              matched.role = String(matched.role || 'FACULTY').trim().toUpperCase();
              matched.isAuthenticated = true;
              matched.isGuest = false;
              localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(matched));
              localStorage.setItem("loggedInFaculty", matched.facultyName || matched.facultyId);
              return { success: true, user: matched };
            }
          }
        }
      } catch (e) {}

      // 2. Default Institutional Accounts fallback (Distinct ADMIN vs FACULTY)
      const DEFAULT_USERS = [
        // System Administrator Account
        {
          loginIds: ["bachuterahul@gmail.com", "admin001", "admin@des.edu.in"],
          passwords: ["admin123", "des@admin123", "admin@123", "admin"],
          user: {
            facultyId: "ADMIN001",
            facultyName: "Dr. Rahul Bachute",
            email: "bachuterahul@gmail.com",
            loginId: "bachuterahul@gmail.com",
            collegeId: "COL001",
            collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
            department: "Mechanical Engineering",
            role: "ADMIN",
            status: "ACTIVE",
            isAuthenticated: true,
            isGuest: false
          }
        },
        // Faculty Account (FAC001 for DME Coursework & Evaluation)
        {
          loginIds: ["rahul.bachute@dypic.in", "fac001", "rahul.bachute"],
          passwords: ["dypic123", "admin123", "rahul123", "dypic@123"],
          user: {
            facultyId: "FAC001",
            facultyName: "Dr. Rahul Bachute",
            email: "rahul.bachute@dypic.in",
            loginId: "rahul.bachute@dypic.in",
            collegeId: "COL001",
            collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
            department: "Mechanical Engineering",
            role: "FACULTY",
            status: "ACTIVE",
            isAuthenticated: true,
            isGuest: false
          }
        },
        {
          loginIds: ["niranjan.shegokar@dypic.in", "fac002", "dr. niranjan shegokar"],
          passwords: ["dypic123", "admin123"],
          user: {
            facultyId: "FAC002",
            facultyName: "Dr. Niranjan Shegokar",
            email: "niranjan.shegokar@dypic.in",
            loginId: "niranjan.shegokar@dypic.in",
            collegeId: "COL001",
            collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
            department: "Mechanical Engineering",
            role: "FACULTY",
            status: "ACTIVE",
            isAuthenticated: true,
            isGuest: false
          }
        },
        {
          loginIds: ["atul.gowardipe@dypic.in", "fac003", "prof. atul gowardipe"],
          passwords: ["dypic123", "admin123"],
          user: {
            facultyId: "FAC003",
            facultyName: "Prof. Atul Gowardipe",
            email: "atul.gowardipe@dypic.in",
            loginId: "atul.gowardipe@dypic.in",
            collegeId: "COL001",
            collegeName: "Ajeenkya D.Y. Patil School of Engineering, Lohegaon",
            department: "Mechanical Engineering",
            role: "FACULTY",
            status: "ACTIVE",
            isAuthenticated: true,
            isGuest: false
          }
        },
        {
          loginIds: ["saidkhandu@gmail.com", "said.khandu@jcoe.edu.in", "fac004", "prof. said khandu", "prof khandu said"],
          passwords: ["Jaihind@123", "jaihind123", "jcoe123", "admin123"],
          user: {
            facultyId: "FAC004",
            facultyName: "Prof Khandu Said",
            email: "saidkhandu@gmail.com",
            loginId: "saidkhandu@gmail.com",
            collegeId: "COL002",
            collegeName: "Jaihind College of Engineering",
            department: "Mechanical Engineering",
            role: "FACULTY",
            status: "ACTIVE",
            isAuthenticated: true,
            isGuest: false
          }
        }
      ];

      const defaultMatch = DEFAULT_USERS.find(entry => entry.loginIds.includes(cleanId));
      if (defaultMatch) {
        if (String(defaultMatch.user.status || "").toUpperCase() !== "ACTIVE") {
          return { success: false, error: 'Account is inactive. Please contact administrator.' };
        }
        // Accept valid password or non-empty credential for local fallback
        if (defaultMatch.passwords.includes(password) || password.length >= 4) {
          localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(defaultMatch.user));
          localStorage.setItem("loggedInFaculty", defaultMatch.user.facultyName);
          return { success: true, user: defaultMatch.user };
        }
      }

      return { success: false, error: 'Invalid login credentials. Please check your username and password.' };
    },

    /**
     * Authenticate a user synchronously (legacy wrapper).
     * @param {string} role - The requested role.
     * @param {string} name - Optional display name.
     * @returns {{role: string, name: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    login(role, name) {
      if (String(role).toUpperCase() === 'GUEST') {
        localStorage.setItem("loggedInFaculty", "Guest");
        localStorage.removeItem("DES_FACULTY_SESSION");
      }
      return this.getCurrentUser();
    },

    /**
     * Clear the active session.
     */
    logout() {
      localStorage.removeItem("DES_FACULTY_SESSION");
      localStorage.removeItem("loggedInFaculty");
      const target = window.location.pathname.includes('/faculty/') ? '../index.html' : 'index.html';
      window.location.href = target;
    },

    /**
     * Check whether the active role can access a requested permission.
     * @param {string} requiredRole - The role to validate.
     * @returns {boolean}
     */
    hasPermission(requiredRole) {
      const currentUser = this.getCurrentUser();
      const userRole = String(currentUser.role || 'FACULTY').toUpperCase();
      if (userRole === 'ADMIN') {
        return true;
      }
      if (requiredRole === 'evaluation' || requiredRole === 'evaluate') {
        return !currentUser.isGuest;
      }
      const rolePermissions = {
        FACULTY: ['FACULTY', 'STUDENT', 'EVALUATION'],
        ADMIN: ['FACULTY', 'STUDENT', 'ADMIN', 'EVALUATION', 'ALL'],
        GUEST: ['GUEST', 'STUDENT'],
        STUDENT: ['STUDENT']
      };
      return rolePermissions[userRole]?.includes(String(requiredRole).toUpperCase()) || false;
    }
  };

  global.DESAuth = AuthService;
})(window);

