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
});
