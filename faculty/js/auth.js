(function() {
    try {
        const rawSession = typeof localStorage !== 'undefined' ? localStorage.getItem("DES_FACULTY_SESSION") : null;
        let session = null;
        if (rawSession) {
            try { session = JSON.parse(rawSession); } catch(e) {}
            if (session && session.facultyName) {
                localStorage.setItem("loggedInFaculty", session.facultyName);
            }
        }

        // Direct URL Access Guard for Faculty Portal:
        // Users must be authenticated with role FACULTY or ADMIN. Guests and unauthenticated users are redirected.
        const role = session ? String(session.role || '').toUpperCase() : '';
        const isAuth = session && (session.isAuthenticated === true || (session.facultyId && session.facultyId !== 'GUEST'));
        const isGuest = !session || session.isGuest === true || role === 'GUEST' || (session && session.facultyId === 'GUEST');

        if (!isAuth || isGuest || (role !== 'FACULTY' && role !== 'ADMIN' && role !== 'HOD')) {
            if (typeof window !== 'undefined' && window.location && window.location.pathname) {
                if (!window.location.pathname.includes('register.html')) {
                    console.warn("[Faculty Guard] Unauthorized direct access to faculty portal. Redirecting to gateway.");
                    const target = window.location.pathname.includes('/faculty/') ? '../index.html' : 'index.html';
                    window.location.href = target;
                }
            }
        }
    } catch (e) {
        if (typeof window !== 'undefined' && window.location && !window.location.pathname.includes('register.html')) {
            window.location.href = '../index.html';
        }
    }
})();

