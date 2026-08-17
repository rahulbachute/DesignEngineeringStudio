(function() {
    let loggedInFaculty = localStorage.getItem("loggedInFaculty");
    if (!loggedInFaculty) {
        loggedInFaculty = "Dr. Rahul Bachute";
        try {
            localStorage.setItem("loggedInFaculty", loggedInFaculty);
        } catch (e) {}
    }
})();
