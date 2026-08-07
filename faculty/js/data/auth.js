(function (global) {
  const roles = ['faculty', 'student', 'admin'];
  const currentUser = {
    role: 'faculty',
    name: 'Dr. Rahul Bachute',
    isAuthenticated: true
  };

  /**
   * Lightweight authentication and permission service for faculty workflows.
   */
  const AuthService = {
    /**
     * Return the active user profile.
     * @returns {{role: string, name: string, isAuthenticated: boolean}}
     */
    getCurrentUser() {
      return currentUser;
    },

    /**
     * Authenticate a user and update the active role.
     * @param {string} role - The requested role.
     * @param {string} name - Optional display name.
     * @returns {{role: string, name: string, isAuthenticated: boolean}}
     */
    login(role, name) {
      currentUser.role = roles.includes(role) ? role : 'faculty';
      currentUser.name = name || currentUser.name;
      currentUser.isAuthenticated = true;
      return currentUser;
    },

    /**
     * Clear the active session.
     */
    logout() {
      currentUser.role = 'faculty';
      currentUser.name = 'Dr. Rahul Bachute';
      currentUser.isAuthenticated = false;
    },

    /**
     * Check whether the active role can access a requested permission.
     * @param {string} requiredRole - The role to validate.
     * @returns {boolean}
     */
    hasPermission(requiredRole) {
      const rolePermissions = {
        faculty: ['faculty', 'student'],
        student: ['student'],
        admin: ['faculty', 'student', 'admin']
      };
      return rolePermissions[currentUser.role]?.includes(requiredRole) || false;
    }
  };

  global.DESAuth = AuthService;
})(window);
