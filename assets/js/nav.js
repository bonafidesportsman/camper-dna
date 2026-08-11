// CamperDNA mobile navigation
// External file because the site Content-Security-Policy blocks inline scripts.

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.site-nav .nav-toggle').forEach((toggle) => {
    const nav = toggle.closest('.site-nav');
    const links = nav?.querySelector('.nav-links');
    if (!links) return;

    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.toggle('open');
      links.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  });
});
