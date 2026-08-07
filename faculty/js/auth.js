(function() {
    const loggedInFaculty = localStorage.getItem("loggedInFaculty");
    if (!loggedInFaculty) {
        // Redirect back to student portal if unauthorized
        window.location.replace("../outputs/meilp/index.html");
    }
})();
