(function (global) {
  if (!global.DESAuth) {
    global.DESAuth = {
      getCurrentUser() {
        return { role: 'faculty', name: 'Faculty User', isAuthenticated: true };
      },
      login(role, name) {
        return { role: role || 'faculty', name: name || 'Faculty User', isAuthenticated: true };
      },
      logout() {},
      hasPermission(requiredRole) {
        return requiredRole === 'faculty' || requiredRole === 'student';
      }
    };
  }
})(window);
