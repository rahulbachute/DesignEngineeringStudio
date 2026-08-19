function handleFacultyLogout() {
  if (window.DESAuth && typeof window.DESAuth.logout === 'function') {
    window.DESAuth.logout();
  } else {
    try {
      localStorage.removeItem('DES_FACULTY_SESSION');
      localStorage.removeItem('loggedInFaculty');
    } catch(e) {}
    const target = window.location.pathname.includes('/faculty/') ? '../index.html' : 'index.html';
    window.location.href = target;
  }
}
window.handleFacultyLogout = handleFacultyLogout;

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'index';
  const links = document.querySelectorAll('[data-nav-link]');

  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isMatch = href === `${page}.html` || (page === 'index' && href === 'index.html');

    if (isMatch) {
      link.classList.add('active', 'text-white');
      link.classList.remove('text-white-50');
    } else {
      link.classList.remove('active', 'text-white');
      link.classList.add('text-white-50');
    }
  });

  // Wire up all logout buttons
  document.querySelectorAll('#facultyLogoutBtn, .faculty-logout-btn').forEach(btn => {
    btn.onclick = handleFacultyLogout;
  });

  // Topbar user profile badge
  const facultyBadge = document.getElementById('topbarFacultyBadge');
  const user = window.DESAuth?.getCurrentUser?.() || {};
  const isGuest = user.isGuest || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";

  if (facultyBadge) {
    if (isGuest) {
      facultyBadge.className = 'badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2';
      facultyBadge.innerHTML = '<i class="bi bi-person-circle me-1"></i>Guest Mode';
    } else {
      facultyBadge.className = 'badge rounded-pill bg-secondary-subtle text-secondary-emphasis px-3 py-2';
      facultyBadge.innerHTML = `<i class="bi bi-person-badge me-1"></i>${user.name || localStorage.getItem("loggedInFaculty") || 'Faculty'}`;
    }
  }
});
