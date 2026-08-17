(function (global) {
  const roles = ['faculty', 'student', 'admin', 'guest'];

  // Known verified faculty directory for offline / local-fallback authentication
  const KNOWN_FACULTY_REGISTRY = [
    {
      facultyId: 'FAC001',
      loginId: 'bachuterahul@gmail.com',
      passwordHash: '8f7d9a1b2c3e4f5a$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      rawPassword: '9370677650',
      facultyName: 'Dr. Rahul Bachute',
      email: 'bachuterahul@gmail.com',
      collegeId: 'COL001',
      collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
      department: 'Mechanical Engineering',
      role: 'admin',
      status: 'ACTIVE'
    },
    {
      facultyId: 'FAC001',
      loginId: 'rahul.bachute@dypic.in',
      passwordHash: '8f7d9a1b2c3e4f5a$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      rawPassword: 'dypic123',
      facultyName: 'Dr. Rahul Bachute',
      email: 'rahul.bachute@dypic.in',
      collegeId: 'COL001',
      collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
      department: 'Mechanical Engineering',
      role: 'faculty',
      status: 'ACTIVE'
    },
    {
      facultyId: 'FAC002',
      loginId: 'niranjan.shegokar@dypic.in',
      passwordHash: '8f7d9a1b2c3e4f5a$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      facultyName: 'Dr. Niranjan Shegokar',
      email: 'niranjan.shegokar@dypic.in',
      collegeId: 'COL001',
      collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
      department: 'Mechanical Engineering',
      role: 'FACULTY',
      status: 'ACTIVE'
    },
    {
      facultyId: 'FAC003',
      loginId: 'atul.gowardipe@dypic.in',
      passwordHash: '8f7d9a1b2c3e4f5a$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      facultyName: 'Prof. Atul Gowardipe',
      email: 'atul.gowardipe@dypic.in',
      collegeId: 'COL001',
      collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
      department: 'Mechanical Engineering',
      role: 'FACULTY',
      status: 'ACTIVE'
    },
    {
      facultyId: 'FAC004',
      loginId: 'saidkhandu@gmail.com',
      passwordHash: '8f7d9a1b2c3e4f5a$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      facultyName: 'Prof. Said Khandu',
      email: 'saidkhandu@gmail.com',
      collegeId: 'COL002',
      collegeName: 'Jaihind College of Engineering',
      department: 'Mechanical Engineering',
      role: 'FACULTY',
      status: 'ACTIVE'
    }
  ];

  /**
   * Lightweight authentication and permission service for faculty workflows.
   */
  const AuthService = {
    /**
     * Return the active user profile based on session storage.
     * Prioritizes authoritative DES_FACULTY_SESSION object with Faculty_ID.
     * @returns {{role: string, name: string, facultyId: string, email: string, collegeId: string, collegeName: string, department: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    getCurrentUser() {
      // Check structured session first
      try {
        const rawSession = localStorage.getItem("DES_FACULTY_SESSION");
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session && session.facultyId) {
            return {
              role: session.role || 'faculty',
              facultyId: session.facultyId,
              name: session.facultyName || session.name || 'Faculty',
              email: session.email || '',
              collegeId: session.collegeId || 'COL001',
              collegeName: session.collegeName || '',
              department: session.department || 'Mechanical Engineering',
              status: session.status || 'ACTIVE',
              isAuthenticated: true,
              isGuest: session.role === 'guest' || session.isGuest === true
            };
          }
        }
      } catch (e) {}

      // Fallback to legacy string key
      const loggedInFaculty = localStorage.getItem("loggedInFaculty");
      if (!loggedInFaculty) {
        return {
          role: 'guest',
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
      }

      if (loggedInFaculty.toLowerCase() === 'guest') {
        return {
          role: 'guest',
          name: 'Guest Faculty',
          facultyId: 'GUEST',
          email: 'guest@dypic.in',
          collegeId: 'COL001',
          collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
          department: 'Mechanical Engineering',
          status: 'ACTIVE',
          isAuthenticated: true,
          isGuest: true
        };
      }

      const match = KNOWN_FACULTY_REGISTRY.find(f =>
        f.loginId.toLowerCase() === loggedInFaculty.toLowerCase() ||
        f.facultyName.toLowerCase() === loggedInFaculty.toLowerCase() ||
        f.facultyId.toLowerCase() === loggedInFaculty.toLowerCase()
      );

      if (match) {
        return {
          role: match.role || 'faculty',
          name: match.facultyName,
          facultyId: match.facultyId,
          email: match.email,
          collegeId: match.collegeId,
          collegeName: match.collegeName,
          department: match.department,
          status: match.status,
          isAuthenticated: true,
          isGuest: false
        };
      }

      return {
        role: 'faculty',
        name: loggedInFaculty,
        facultyId: 'FAC001',
        email: loggedInFaculty.includes('@') ? loggedInFaculty : 'rahul.bachute@dypic.in',
        collegeId: 'COL001',
        collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
        department: 'Mechanical Engineering',
        status: 'ACTIVE',
        isAuthenticated: true,
        isGuest: false
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
     * Authenticate faculty against backend Faculty_Registry or local registry.
     * @param {string} loginId - Faculty Login ID or Email
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
          collegeId: 'COL001',
          collegeName: 'Ajeenkya D.Y. Patil School of Engineering, Lohegaon',
          department: 'Mechanical Engineering',
          role: 'guest',
          status: 'ACTIVE',
          isGuest: true
        };
        localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(guestUser));
        localStorage.setItem("loggedInFaculty", "Guest");
        return { success: true, user: guestUser };
      }

      // 1. Attempt API authentication if repository / backend is available
      try {
        if (global.DESRepository && typeof global.DESRepository.request === 'function') {
          const res = await global.DESRepository.request('facultyLogin', { loginId: cleanId, password });
          if (res && res.success && res.data) {
            const user = res.data;
            localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(user));
            localStorage.setItem("loggedInFaculty", user.facultyName || user.facultyId);
            return { success: true, user };
          } else if (res && res.error && res.statusCode === 401) {
            // Explicit password rejection by updated backend
            return { success: false, error: res.error };
          }
        } else {
          // Direct fetch fallback if DESRepository is not yet initialized
          const endpoint = (global.DESConfig && global.DESConfig.apiBaseUrl) ||
                           (global.MEILP && global.MEILP.googleSheetsConfig && global.MEILP.googleSheetsConfig.submissionWebAppUrl);
          if (endpoint) {
            const res = await fetch(`${endpoint}?action=facultyLogin`, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ loginId: cleanId, password }),
              signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
            });
            if (res.ok) {
              const json = await res.json();
              if (json && json.success && json.data) {
                const user = json.data;
                localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(user));
                localStorage.setItem("loggedInFaculty", user.facultyName || user.facultyId);
                return { success: true, user };
              } else if (json && json.statusCode === 401) {
                return { success: false, error: json.error || 'Invalid credentials' };
              }
            }
          }
        }
      } catch (err) {
        console.warn("[DESAuth] Live backend authentication attempt fell back to local registry:", err.message);
      }

      // 2. Local Fallback Verification against Known Faculty Registry
      let matched = null;
      if (cleanId === 'bachuterahul@gmail.com') {
        matched = KNOWN_FACULTY_REGISTRY.find(f => f.email === 'bachuterahul@gmail.com');
      } else if (cleanId === 'rahul.bachute@dypic.in') {
        matched = KNOWN_FACULTY_REGISTRY.find(f => f.email === 'rahul.bachute@dypic.in');
      } else {
        matched = KNOWN_FACULTY_REGISTRY.find(f =>
          f.loginId.toLowerCase() === cleanId ||
          f.email.toLowerCase() === cleanId ||
          f.facultyId.toLowerCase() === cleanId ||
          f.facultyName.toLowerCase() === cleanId ||
          (f.loginId.toLowerCase().includes('niranjan') && (cleanId.includes('niranjan') || cleanId.includes('shegokar'))) ||
          (f.loginId.toLowerCase().includes('atul') && (cleanId.includes('atul') || cleanId.includes('gowardipe'))) ||
          (f.loginId.toLowerCase().includes('said') && (cleanId.includes('said') || cleanId.includes('khandu')))
        );
      }

      if (!matched) {
        return { success: false, error: 'Invalid login credentials.' };
      }

      if (matched.status !== 'ACTIVE') {
        return { success: false, error: 'Faculty account is inactive. Please contact administrator.' };
      }

      // Check specific password for the matched user
      const isPasswordValid = (matched.rawPassword && password === matched.rawPassword) ||
                              (matched.email === 'bachuterahul@gmail.com' && password === '9370677650') ||
                              (matched.email === 'rahul.bachute@dypic.in' && password === 'dypic123') ||
                              (matched.email === 'saidkhandu@gmail.com' && password === 'jaihind123') ||
                              ((matched.email.includes('dypic.in')) && password === 'dypic123');

      if (isPasswordValid) {
        const user = {
          facultyId: matched.facultyId,
          facultyName: matched.facultyName,
          email: matched.email,
          collegeId: matched.collegeId,
          collegeName: matched.collegeName,
          department: matched.department,
          role: matched.role,
          status: matched.status,
          isGuest: false
        };
        localStorage.setItem("DES_FACULTY_SESSION", JSON.stringify(user));
        localStorage.setItem("loggedInFaculty", user.facultyName);
        return { success: true, user };
      }

      return { success: false, error: 'Invalid login credentials.' };
    },

    /**
     * Authenticate a user synchronously (legacy wrapper).
     * @param {string} role - The requested role.
     * @param {string} name - Optional display name.
     * @returns {{role: string, name: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    login(role, name) {
      if (role === 'guest') {
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
      const target = window.location.pathname.includes('/outputs/meilp/') ? '../index.html' : '../outputs/meilp/index.html';
      window.location.href = target;
    },

    /**
     * Check whether the active role can access a requested permission.
     * @param {string} requiredRole - The role to validate.
     * @returns {boolean}
     */
    hasPermission(requiredRole) {
      const currentUser = this.getCurrentUser();
      const userRole = (currentUser.role || 'faculty').toLowerCase();
      if (userRole === 'admin' || userRole === 'hod') {
        return true;
      }
      if (requiredRole === 'evaluation' || requiredRole === 'evaluate') {
        return !currentUser.isGuest;
      }
      const rolePermissions = {
        faculty: ['faculty', 'student', 'evaluation'],
        admin: ['faculty', 'student', 'admin', 'evaluation', 'all'],
        guest: ['faculty', 'student'],
        student: ['student']
      };
      return rolePermissions[userRole]?.includes(String(requiredRole).toLowerCase()) || false;
    }
  };

  global.DESAuth = AuthService;
})(window);
