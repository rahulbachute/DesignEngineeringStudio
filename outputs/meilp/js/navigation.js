window.MEILP = window.MEILP || {};

/**
 * Navigation rendering and active-link behavior.
 * The shell owns navigation; assignment pages can contribute items later through
 * configuration instead of editing markup directly.
 */
function renderNavigation(container, items) {
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map((item) => {
      return `
        <li class="nav-item">
          <a class="nav-link" href="${item.href}">${item.label}</a>
        </li>
      `;
    })
    .join("");
}

function setActiveNavigation(currentHash = window.location.hash) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.getAttribute("href") === currentHash;
    link.classList.toggle("active", isActive);
    link.toggleAttribute("aria-current", isActive);
  });
}

window.MEILP.renderNavigation = renderNavigation;
window.MEILP.setActiveNavigation = setActiveNavigation;
