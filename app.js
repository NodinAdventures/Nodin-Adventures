/* ============================================================
   TrailRide Rentals — App JavaScript
   ============================================================ */

(function () {
  'use strict';

  // ---------- THEME TOGGLE ----------
  const html = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');

  let currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  html.setAttribute('data-theme', currentTheme);
  updateToggleIcon(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', currentTheme);
      themeToggle.setAttribute('aria-label', 'Switch to ' + (currentTheme === 'dark' ? 'light' : 'dark') + ' mode');
      updateToggleIcon(currentTheme);
    });
  }

  function updateToggleIcon(theme) {
    if (!themeToggle) return;
    themeToggle.innerHTML = theme === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ---------- STICKY HEADER ----------
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('site-header--scrolled');
      } else {
        header.classList.remove('site-header--scrolled');
      }
    }, { passive: true });
  }

  // ---------- MOBILE NAV ----------
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileClose = document.getElementById('mobile-close');
  const mobileNav = document.getElementById('mobile-nav');

  function openMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
    if (mobileClose) mobileClose.focus();
  }

  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.focus();
    }
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileNav);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);

  // Close mobile nav on link click
  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav && mobileNav.classList.contains('is-open')) {
      closeMobileNav();
    }
  });

  // ---------- SCROLL REVEAL ----------
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger siblings
          const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')];
          const delay = siblings.indexOf(entry.target) * 80;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, Math.min(delay, 320));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    revealElements.forEach(el => el.classList.add('visible'));
  }

  // ---------- HERO BG PARALLAX ----------
  const heroBg = document.getElementById('hero-bg');
  if (heroBg) {
    // Kick off subtle scale animation on load
    requestAnimationFrame(() => {
      heroBg.style.transform = 'scale(1)';
    });

    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const limit = window.innerHeight;
      if (scrolled < limit) {
        const pct = scrolled / limit;
        heroBg.style.transform = `scale(1) translateY(${pct * 30}px)`;
      }
    }, { passive: true });
  }

  // ---------- SMOOTH SCROLL ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- BOOKING FORM ----------
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const originalText = btn.innerHTML;

      // Validate required fields
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (field.type === 'checkbox' ? !field.checked : !field.value.trim()) {
          valid = false;
          field.style.outline = '2px solid var(--color-error)';
          field.addEventListener('change', () => { field.style.outline = ''; }, { once: true });
          field.addEventListener('input',  () => { field.style.outline = ''; }, { once: true });
        }
      });
      if (!valid) return;

      // Loading state
      btn.innerHTML = 'Sending\u2026';
      btn.disabled = true;

      // Collect all form field values as a plain object
      const fd = new FormData(form);
      const payload = {};
      fd.forEach((val, key) => {
        if (payload[key]) {
          // Multiple checkboxes with same name → array
          payload[key] = [].concat(payload[key], val);
        } else {
          payload[key] = val;
        }
      });

      fetch('/.netlify/functions/confirm-booking', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(payload)
      })
      .then(response => {
        if (response.ok) {
          btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Inquiry Sent!';
          btn.style.background = 'var(--color-success)';
          form.reset();
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.disabled = false;
          }, 6000);
        } else {
          response.json().then(d => console.error('Submission error:', d)).catch(() => {});
          btn.innerHTML = 'Try Again';
          btn.style.background = '#c0392b';
          btn.disabled = false;
        }
      })
      .catch(() => {
        btn.innerHTML = 'Error \u2014 Try Again';
        btn.style.background = '#c0392b';
        btn.disabled = false;
      });
    });
  }

  // ---------- COUNTER ANIMATION (hero stats) ----------
  const statValues = document.querySelectorAll('.hero__stat-value');
  const countersAnimated = new Set();

  function animateCounter(el) {
    if (countersAnimated.has(el)) return;
    countersAnimated.add(el);

    const text = el.textContent.trim();
    const match = text.match(/^(\d+)(.*)$/);
    if (!match) return;

    const end = parseInt(match[1], 10);
    const suffix = match[2] || '';
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * end);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window && statValues.length) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statValues.forEach(el => statsObserver.observe(el));
  }

})();

