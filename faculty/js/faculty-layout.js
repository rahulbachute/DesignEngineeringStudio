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

  // Topbar user profile badge & logout button
  const topbarBadgeContainer = document.querySelector('.topbar .d-flex.align-items-center.gap-2');
  if (topbarBadgeContainer) {
    const user = window.DESAuth?.getCurrentUser?.() || {};
    const isGuest = user.isGuest || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";

    const userBadgeMarkup = isGuest
      ? `<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2"><i class="bi bi-person-circle me-1"></i>Guest Mode</span>`
      : `<span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis px-3 py-2" title="${user.facultyId || ''} • ${user.collegeName || ''}"><i class="bi bi-person-badge me-1"></i>${user.name || 'Faculty'}${user.facultyId && user.facultyId !== 'GUEST' ? ` (${user.facultyId})` : ''}</span>`;

    topbarBadgeContainer.innerHTML = `
      <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis px-3 py-2">MEILP</span>
      ${userBadgeMarkup}
      <button id="facultyLogoutBtn" class="btn btn-sm btn-outline-danger ms-2" type="button" title="Logout session">
        <i class="bi bi-box-arrow-right me-1"></i>Logout
      </button>
    `;

    const logoutBtn = document.getElementById('facultyLogoutBtn');
    if (logoutBtn)        logoutBtn.addEventListener('click', () => {
          if (window.DESAuth?.logout) {
            window.DESAuth.logout();
          } else {
            localStorage.removeItem('loggedInFaculty');
            const target = window.location.pathname.includes('/outputs/meilp/') ? '../index.html' : '../outputs/meilp/index.html';
            window.location.href = target;
          }
        });
    }
  }
});
