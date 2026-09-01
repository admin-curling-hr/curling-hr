/* ============================================================
   HRVATSKI CURLING SAVEZ — main.js
   Theme switcher, language switcher, mobile nav
   ============================================================ */

(function () {
  'use strict';

  /* ---- Theme ---- */
  const html = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  const themeIcon = themeBtn ? themeBtn.querySelector('.theme-icon') : null;

  const THEMES = ['auto', 'light', 'dark'];
  const ICONS  = { auto: '🖥️', light: '☀️', dark: '🌙' };

  function applyTheme(theme) {
    html.dataset.theme = theme;
    if (themeIcon) themeIcon.textContent = ICONS[theme] || ICONS.auto;
    // For 'auto', let CSS media query handle it via prefers-color-scheme
    if (theme === 'auto') {
      html.removeAttribute('data-theme');
    }
    localStorage.setItem('hcs-theme', theme);
  }

  function cycleTheme() {
    const current = localStorage.getItem('hcs-theme') || 'auto';
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    applyTheme(next);
  }

  // Init theme
  const savedTheme = localStorage.getItem('hcs-theme') || 'auto';
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', cycleTheme);
  }

  // Support prefers-color-scheme for 'auto'
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function handleAutoTheme() {
    if (!localStorage.getItem('hcs-theme') || localStorage.getItem('hcs-theme') === 'auto') {
      html.dataset.theme = mq.matches ? 'dark' : 'light';
    }
  }
  mq.addEventListener('change', handleAutoTheme);
  handleAutoTheme();

  /* ---- Language ---- */
  const langBtn = document.getElementById('langToggle');
  const langLabel = document.getElementById('langLabel');

  function applyLang(lang) {
    document.querySelectorAll('[data-hr][data-en]').forEach(el => {
      el.textContent = lang === 'en' ? el.dataset.en : el.dataset.hr;
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'hr';
    if (langLabel) langLabel.textContent = lang === 'en' ? 'HR' : 'EN';
    localStorage.setItem('hcs-lang', lang);
  }

  function toggleLang() {
    const current = localStorage.getItem('hcs-lang') || 'hr';
    applyLang(current === 'hr' ? 'en' : 'hr');
  }

  const savedLang = localStorage.getItem('hcs-lang') || 'hr';
  applyLang(savedLang);

  if (langBtn) {
    langBtn.addEventListener('click', toggleLang);
  }

  /* ---- Mobile nav ---- */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      siteNav.classList.toggle('open');
    });
  }

  /* ---- Active nav link ---- */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.site-nav a').forEach(link => {
    const linkPath = new URL(link.href, window.location.origin).pathname;
    if (linkPath === currentPath || (linkPath !== '/' && currentPath.startsWith(linkPath))) {
      link.classList.add('active');
    }
  });

})();
