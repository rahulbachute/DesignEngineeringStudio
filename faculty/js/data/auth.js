(function (global) {
  const roles = ['faculty', 'student', 'admin', 'guest'];

  /**
   * Lightweight authentication and permission service for faculty workflows.
   */
  const AuthService = {
    /**
     * Return the active user profile based on localStorage session.
     * @returns {{role: string, name: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    getCurrentUser() {
      const loggedInFaculty = localStorage.getItem("loggedInFaculty");
      if (!loggedInFaculty) {
        return {
          role: 'guest',
          name: 'Guest',
          isAuthenticated: false,
          isGuest: true
        };
      }

      if (loggedInFaculty.toLowerCase() === 'guest') {
        return {
          role: 'guest',
          name: 'Guest Faculty',
          isAuthenticated: true,
          isGuest: true
        };
      }

      const facultyNames = {
        'rahul.bachute@dypic.in': 'Dr. Rahul Bachute',
        'niranjan.shegokar@dypic.in': 'Dr. Niranjan Shegokar',
        'atul.gowardipe@dypic.in': 'Prof. Atul Gowardipe'
      };

      const displayName = facultyNames[loggedInFaculty.toLowerCase()] || loggedInFaculty;

      return {
        role: 'faculty',
        name: displayName,
        email: loggedInFaculty,
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
     * Authenticate a user and update the active role.
     * @param {string} role - The requested role.
     * @param {string} name - Optional display name.
     * @returns {{role: string, name: string, isAuthenticated: boolean, isGuest: boolean}}
     */
    login(role, name) {
      if (role === 'guest') {
        localStorage.setItem("loggedInFaculty", "Guest");
      }
      return this.getCurrentUser();
    },

    /**
     * Clear the active session.
     */
    logout() {
      localStorage.removeItem("loggedInFaculty");
      window.location.href = "../outputs/meilp/index.html";
    },

    /**
     * Check whether the active role can access a requested permission.
     * @param {string} requiredRole - The role to validate.
     * @returns {boolean}
     */
    hasPermission(requiredRole) {
      const currentUser = this.getCurrentUser();
      if (requiredRole === 'evaluation' || requiredRole === 'evaluate') {
        return !currentUser.isGuest;
      }
      const rolePermissions = {
        faculty: ['faculty', 'student', 'evaluation'],
        guest: ['faculty', 'student'],
        student: ['student'],
        admin: ['faculty', 'student', 'admin', 'evaluation']
      };
      return rolePermissions[currentUser.role]?.includes(requiredRole) || false;
    }
  };

  global.DESAuth = AuthService;
})(window);
