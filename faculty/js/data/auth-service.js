(function (global) {
  if (!global.DESAuth) {
    global.DESAuth = {
      getCurrentUser() {
        const loggedInFaculty = localStorage.getItem("loggedInFaculty");
        const isGuest = !loggedInFaculty || loggedInFaculty.toLowerCase() === 'guest';
        return {
          role: isGuest ? 'guest' : 'faculty',
          name: isGuest ? 'Guest Faculty' : loggedInFaculty,
          isAuthenticated: true,
          isGuest
        };
      },
      isGuest() {
        return this.getCurrentUser().isGuest === true;
      },
      login(role, name) {
        return this.getCurrentUser();
      },
      logout() {
        localStorage.removeItem("loggedInFaculty");
        window.location.href = "../outputs/meilp/index.html";
      },
      hasPermission(requiredRole) {
        if (requiredRole === 'evaluation' || requiredRole === 'evaluate') {
          return !this.isGuest();
        }
        return true;
      }
    };
  }
})(window);
