/* CamperDNA — main.js */

// Mobile nav toggle
(function () {
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.nav__mobile');
  if (!hamburger || !mobileNav) return;
  hamburger.addEventListener('click', function () {
    const open = mobileNav.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', open);
    hamburger.querySelectorAll('span').forEach(function (s, i) {
      s.style.transform = open
        ? (i === 0 ? 'translateY(7px) rotate(45deg)' : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)')
        : '';
    });
  });
  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', false);
      hamburger.querySelectorAll('span').forEach(function (s) { s.style.transform = ''; });
    }
  });
})();

// Highlight active nav link
(function () {
  const links = document.querySelectorAll('.nav__link');
  const path = window.location.pathname;
  links.forEach(function (link) {
    const href = link.getAttribute('href');
    if (href && href !== '/' && path.startsWith(href)) {
      link.classList.add('nav__link--active');
    }
  });
})();

// Scroll-based nav: add .is-scrolled class after 40px
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  var ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        nav.classList.toggle('is-scrolled', window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();
