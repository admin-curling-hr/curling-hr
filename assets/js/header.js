(function () {
  'use strict';

  // Auto-detect base path - works both locally and on GitHub Pages
  // Locally: http://localhost:8080/ -> BASE = ''
  // GitHub:  https://admin-curling-hr.github.io/curling-hr/ -> BASE = '/curling-hr'
  const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : '/curling-hr';

  const HEADER_HTML = `
<header class="site-header">
  <div class="header-inner">
    <a href="${BASE}/" class="header-brand">
      <img src="${BASE}/assets/images/hcs-logo.png" alt="HCS Logo" class="header-logo">
      <div class="header-titles">
        <span class="header-title" data-hr="Hrvatski curling savez" data-en="Croatian Curling Association">Hrvatski curling savez</span>
        <span class="header-subtitle" data-hr="Croatian Curling Association" data-en="Hrvatski curling savez">Croatian Curling Association</span>
      </div>
    </a>
    <div class="header-controls">
      <button class="theme-toggle" id="themeToggle" aria-label="Promjena teme">
        <span class="theme-icon">☀️</span>
      </button>
      <button class="lang-toggle" id="langToggle" aria-label="Change language">
        <span id="langLabel">EN</span>
      </button>
      <button class="nav-toggle" id="navToggle" aria-label="Izbornik">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  <nav class="site-nav" id="siteNav">
    <ul>
      <li><a href="${BASE}/" data-hr="Početna" data-en="Home">Početna</a></li>
      <li><a href="${BASE}/vijesti.html" data-hr="Vijesti" data-en="News">Vijesti</a></li>
      <li><a href="${BASE}/kalendar.html" data-hr="Kalendar događanja" data-en="Events">Kalendar događanja</a></li>
      <li><a href="${BASE}/klubovi.html" data-hr="Klubovi" data-en="Clubs">Klubovi</a></li>
      <li><a href="${BASE}/prvenstva.html" id="navPrvenstva" data-hr="Prvenstva Hrvatske" data-en="Croatian Championships">Prvenstva Hrvatske</a></li>
      <li><a href="${BASE}/reprezentacija.html" data-hr="Nastupi reprezentacije" data-en="National Team">Nastupi reprezentacije</a></li>
      <li><a href="${BASE}/o-curlingu.html" data-hr="O curlingu" data-en="About Curling">O curlingu</a></li>
      <li><a href="${BASE}/o-nama.html" data-hr="O nama" data-en="About Us">O nama</a></li>
    </ul>
  </nav>

  <div id="phcNav2" class="phc-subnav-bar phc-subnav-bar--l2" style="display:none;">
    <ul class="phc-subnav-list">
      <li><a href="#" class="active" data-page="prvenstva">Pregled</a></li>
      <li><a href="#" data-page="statistika">Statistika</a></li>
      <li><a href="#" data-page="postignuca">Postignuća igrača</a></li>
    </ul>
  </div>
  <div id="phcNav3" class="phc-subnav-bar phc-subnav-bar--l3" style="display:none;">
    <ul class="phc-subnav-list">
      <li><a href="#" class="active" data-tab="poretci">Poretci</a></li>
      <li><a href="#" data-tab="klubovi">Klubovi</a></li>
      <li><a href="#" data-tab="ekipe">Ekipe</a></li>
      <li><a href="#" data-tab="igraci">Igrači</a></li>
      <li><a href="#" data-tab="klubovih2h">Klubovi međusobno</a></li>
      <li><a href="#" data-tab="ekipeh2h">Ekipe međusobno</a></li>
      <li><a href="#" data-tab="igracih2h">Igrači međusobno</a></li>
      <li><a href="#" data-tab="rekordi">Rekordi</a></li>
      <li><a href="#" data-tab="statistika">Podaci</a></li>
    </ul>
  </div>
</header>`;

  // Insert header into placeholder
  const placeholder = document.getElementById('site-header');
  if (placeholder) placeholder.outerHTML = HEADER_HTML;

  initHeader();

  function initHeader() {
    const page = document.body.dataset.page || '';

    // Active nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.site-nav a').forEach(link => {
      const linkPath = new URL(link.href, window.location.origin).pathname;
      const isHome = linkPath === BASE + '/' || linkPath === BASE || linkPath === '/';
      if (isHome) {
        if (currentPath === BASE + '/' || currentPath === BASE || currentPath === '/') {
          link.classList.add('active');
        }
      } else if (currentPath.startsWith(linkPath)) {
        link.classList.add('active');
      }
    });

    // PHC nav
    const nav2 = document.getElementById('phcNav2');
    const nav3 = document.getElementById('phcNav3');
    if (page === 'prvenstva' && nav2) {
      nav2.style.display = '';
      initPhcNav(nav2, nav3);
    }

    // Theme
    const themeBtn = document.getElementById('themeToggle');
    const themeIcon = themeBtn ? themeBtn.querySelector('.theme-icon') : null;
    const THEMES = ['auto', 'light', 'dark'];
    const ICONS = { auto: '🖥️', light: '☀️', dark: '🌙' };

    function applyTheme(theme) {
      if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.dataset.theme = theme;
      }
      if (themeIcon) themeIcon.textContent = ICONS[theme] || ICONS.auto;
      localStorage.setItem('hcs-theme', theme);
    }

    applyTheme(localStorage.getItem('hcs-theme') || 'auto');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      const current = localStorage.getItem('hcs-theme') || 'auto';
      applyTheme(THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handleAutoTheme() {
      if (!localStorage.getItem('hcs-theme') || localStorage.getItem('hcs-theme') === 'auto') {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
      }
    }
    mq.addEventListener('change', handleAutoTheme);
    handleAutoTheme();

    // Language
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

    applyLang(localStorage.getItem('hcs-lang') || 'hr');
    if (langBtn) langBtn.addEventListener('click', () => {
      applyLang((localStorage.getItem('hcs-lang') || 'hr') === 'hr' ? 'en' : 'hr');
    });

    // Mobile nav
    const navToggle = document.getElementById('navToggle');
    const siteNav = document.getElementById('siteNav');
    if (navToggle && siteNav) {
      navToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
    }
  }

  function initPhcNav(nav2, nav3) {
    const nav2Links = nav2.querySelectorAll('a[data-page]');
    const nav3Links = nav3 ? nav3.querySelectorAll('a[data-tab]') : [];

    function alignNav2() {
      const prvLink = document.getElementById('navPrvenstva');
      const nav2List = nav2.querySelector('.phc-subnav-list');
      if (!prvLink || !nav2List) { nav2.classList.add('ready'); return; }
      if (window.innerWidth <= 700) {
        nav2List.style.paddingLeft = '';
        nav2.classList.add('ready');
        if (nav3) nav3.classList.add('ready');
        return;
      }
      const listRect = nav2List.getBoundingClientRect();
      const prvRect = prvLink.getBoundingClientRect();
      const currentPad = parseFloat(getComputedStyle(nav2List).paddingLeft) || 0;
      const needed = prvRect.left - listRect.left + currentPad;
      nav2List.style.paddingLeft = Math.max(0, needed) + 'px';
      nav2.classList.add('ready');
      if (nav3) nav3.classList.add('ready');
    }

    requestAnimationFrame(() => requestAnimationFrame(alignNav2));
    window.addEventListener('resize', () => {
      nav2.classList.remove('ready');
      if (nav3) nav3.classList.remove('ready');
      requestAnimationFrame(() => requestAnimationFrame(alignNav2));
    });

    function setNav2Active(pg) {
      nav2Links.forEach(a => a.classList.toggle('active', a.dataset.page === pg));
      if (nav3) nav3.style.display = pg === 'statistika' ? '' : 'none';
    }

    function setNav3Active(tab) {
      nav3Links.forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    }

    nav2Links.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const pg = this.dataset.page;
        setNav2Active(pg);
        if (typeof switchToPage === 'function') switchToPage(pg);
        if (pg === 'statistika') {
          setNav3Active('poretci');
          if (typeof switchToTab === 'function') switchToTab('poretci');
        }
      });
    });

    nav3Links.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const tab = this.dataset.tab;
        setNav3Active(tab);
        if (typeof switchToTab === 'function') switchToTab(tab);
      });
    });

    document.addEventListener('click', function (e) {
      const tabBtn = e.target.closest('.tab-btn');
      if (tabBtn && tabBtn.dataset.tab) setNav3Active(tabBtn.dataset.tab);
    });
  }

})();
