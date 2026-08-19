(function() {
    // Check if session exists in localStorage
    try {
        const rawSession = localStorage.getItem("DES_FACULTY_SESSION");
        if (rawSession) {
            const session = JSON.parse(rawSession);
            if (session && session.facultyName) {
                localStorage.setItem("loggedInFaculty", session.facultyName);
            }
        }
    } catch (e) {}
})();

