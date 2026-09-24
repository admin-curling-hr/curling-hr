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
      <a class="m365-link" id="m365Link" href="https://teams.microsoft.com/" target="_blank" rel="noopener noreferrer"
         data-title-hr="Prijava na interne stranice saveza"
         data-title-en="Sign in to the federation's staff pages"
         title="Prijava na interne stranice saveza">
        <span data-hr="Prijava" data-en="Login">Prijava</span>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Izbornik">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  <nav class="site-nav" id="siteNav">
    <ul>
      <li><a href="${BASE}/" data-hr="Početna" data-en="Home">Početna</a></li>
      <li><a href="${BASE}/vijesti/" data-hr="Vijesti" data-en="News">Vijesti</a></li>
      <li><a href="${BASE}/kalendar/" data-hr="Kalendar događanja" data-en="Events">Kalendar događanja</a></li>
      <li><a href="${BASE}/klubovi/" data-hr="Klubovi" data-en="Clubs">Klubovi</a></li>
      <li><a href="${BASE}/prvenstva/" id="navPrvenstva" data-hr="Prvenstva Hrvatske" data-en="Croatian Championships">Prvenstva Hrvatske</a></li>
      <li><a href="${BASE}/reprezentacija/" data-hr="Nastupi reprezentacije" data-en="National Team">Nastupi reprezentacije</a></li>
      <li><a href="${BASE}/o-curlingu/" data-hr="O curlingu" data-en="About Curling">O curlingu</a></li>
      <li><a href="${BASE}/o-nama/" data-hr="O nama" data-en="About Us">O nama</a></li>
    </ul>
  </nav>

  <div id="phcNav2" class="phc-subnav-bar phc-subnav-bar--l2" style="display:none;">
    <ul class="phc-subnav-list">
      <li><a href="#" class="active" data-page="prvenstva" data-hr="Pregled" data-en="Overview">Pregled</a></li>
      <li><a href="#" data-page="statistika" data-hr="Statistika" data-en="Statistics">Statistika</a></li>
      <li><a href="#" data-page="postignuca" data-hr="Postignuća igrača" data-en="Player Achievements">Postignuća igrača</a></li>
    </ul>
  </div>
  <div id="phcNav3" class="phc-subnav-bar phc-subnav-bar--l3" style="display:none;">
    <ul class="phc-subnav-list">
      <li><a href="#" class="active" data-tab="poretci" data-hr="Poretci" data-en="Standings">Poretci</a></li>
      <li><a href="#" data-tab="klubovi" data-hr="Klubovi" data-en="Clubs">Klubovi</a></li>
      <li><a href="#" data-tab="ekipe" data-hr="Ekipe" data-en="Teams">Ekipe</a></li>
      <li><a href="#" data-tab="igraci" data-hr="Igrači" data-en="Players">Igrači</a></li>
      <li><a href="#" data-tab="klubovih2h" data-hr="Klubovi međusobno" data-en="Clubs Head-to-Head">Klubovi međusobno</a></li>
      <li><a href="#" data-tab="ekipeh2h" data-hr="Ekipe međusobno" data-en="Teams Head-to-Head">Ekipe međusobno</a></li>
      <li><a href="#" data-tab="igracih2h" data-hr="Igrači međusobno" data-en="Players Head-to-Head">Igrači međusobno</a></li>
      <li><a href="#" data-tab="rekordi" data-hr="Rekordi" data-en="Records">Rekordi</a></li>
      <li><a href="#" data-tab="statistika" data-hr="Podaci" data-en="Data">Podaci</a></li>
    </ul>
  </div>
</header>`;

  // Insert header into placeholder
  const placeholder = document.getElementById('site-header');
  if (placeholder) placeholder.outerHTML = HEADER_HTML;

  // closeMobileNav je na IIFE razini da je dostupna i initHeader i initPhcNav
  function closeMobileNav() {
    const siteNavEl = document.getElementById('siteNav');
    if (siteNavEl) siteNavEl.classList.remove('open');
    const nav2 = document.getElementById('phcNav2');
    const nav3 = document.getElementById('phcNav3');
    const overlay = document.getElementById('mobileNavOverlay');
    if (nav2) {
      nav2.classList.remove('mobile-open', 'ready');
      nav2.style.cssText = 'display:none;';
    }
    if (nav3) nav3.classList.remove('mobile-open');
    if (overlay) overlay.style.display = 'none';
  }

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
    } else if (nav2) {
      // Na svim stranicama — inicijaliziraj nav2 listenere za mobilni izbornik
      initPhcNav(nav2, nav3);
    }

    // Theme
    const themeBtn = document.getElementById('themeToggle');
    const themeIcon = themeBtn ? themeBtn.querySelector('.theme-icon') : null;
    const THEMES = ['auto', 'light', 'dark'];
    const ICONS = { auto: '🖥️', light: '☀️', dark: '🌙' };

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
      // Kod "auto" načina odmah postavljamo stvarnu boju (light/dark) prema
      // trenutnoj postavci sustava - ne smijemo samo maknuti data-theme atribut,
      // jer stranica nema CSS pravilo koje bi samo od sebe pratilo sustav.
      if (theme === 'auto') {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
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

    // Ako je odabran "auto" način i korisnik promijeni postavku sustava
    // (npr. sustav prijeđe iz light u dark) dok je stranica otvorena, osvježi temu.
    mq.addEventListener('change', () => {
      if ((localStorage.getItem('hcs-theme') || 'auto') === 'auto') {
        applyTheme('auto');
      }
    });

    // Language
    const langBtn = document.getElementById('langToggle');
    const langLabel = document.getElementById('langLabel');

    function applyLang(lang) {
      document.querySelectorAll('[data-hr][data-en]').forEach(el => {
        el.textContent = lang === 'en' ? el.dataset.en : el.dataset.hr;
      });
      // Prijevod title/tooltip atributa (npr. m365-link) - odvojeno od teksta jer
      // se ne smije mijenjati textContent elementa, samo naslov koji se vidi na hover.
      document.querySelectorAll('[data-title-hr][data-title-en]').forEach(el => {
        el.title = lang === 'en' ? el.dataset.titleEn : el.dataset.titleHr;
      });
      // Prijevod odlomaka koji sadrže ugniježđeni HTML (npr. <strong> pojmovi usred rečenice)
      // - ovdje se mijenja innerHTML umjesto textContent kako bi se sačuvalo podebljavanje.
      document.querySelectorAll('[data-hr-html][data-en-html]').forEach(el => {
        el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.hrHtml;
      });
      // Prijevod data-label atributa (npr. responzivne tablice na mobitelu gdje se
      // naziv stupca prikazuje preko CSS-a: content: attr(data-label)).
      document.querySelectorAll('[data-label-hr][data-label-en]').forEach(el => {
        el.dataset.label = lang === 'en' ? el.dataset.labelEn : el.dataset.labelHr;
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
      navToggle.addEventListener('click', () => {
        siteNav.classList.toggle('open');
        // Sakrij nav2/nav3 kad zatvorimo hamburger
        if (!siteNav.classList.contains('open')) {
          const nav2 = document.getElementById('phcNav2');
          const nav3 = document.getElementById('phcNav3');
          if (nav2) nav2.classList.remove('mobile-open');
          if (nav3) nav3.classList.remove('mobile-open');
        }
      });
    }

    // Na mobilnom: klik na "Prvenstva Hrvatske" otvori nav2 inline
    // umjesto da odmah navigira na stranicu
    const prvenstvaLink = document.getElementById('navPrvenstva');

    // Kreiraj overlay koji blokira sadržaj ispod nav2
    const mobileOverlay = document.createElement('div');
    mobileOverlay.id = 'mobileNavOverlay';
    mobileOverlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:998;background:transparent;';
    document.body.appendChild(mobileOverlay);
    mobileOverlay.addEventListener('click', closeMobileNav);

    if (prvenstvaLink) {
      prvenstvaLink.addEventListener('click', function(e) {
        if (window.innerWidth > 700) return;
        e.preventDefault();
        const nav2 = document.getElementById('phcNav2');
        if (!nav2) return;
        const isOpen = nav2.classList.contains('mobile-open');
        if (isOpen) {
          closeMobileNav();
        } else {
          nav2.removeAttribute('style');
          nav2.classList.add('mobile-open', 'ready');
          nav2.style.cssText = 'display:block;position:fixed;left:0;right:0;z-index:999;';
          // Pozicioniraj nav2 ispod site-nav
          const siteNav = document.getElementById('siteNav');
          if (siteNav) {
            const navBottom = siteNav.getBoundingClientRect().bottom;
            nav2.style.top = navBottom + 'px';
          }
          mobileOverlay.style.display = 'block';
        }
      });
    }

    // Sakrij nav2/nav3 kad se prozor umanji na mobitel
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 700) {
        const siteNavEl = document.getElementById('siteNav');
        if (!siteNavEl?.classList.contains('open')) {
          closeMobileNav();
        }
      } else {
        // Desktop — ukloni mobile-open klase
        const nav2 = document.getElementById('phcNav2');
        const nav3 = document.getElementById('phcNav3');
        if (nav2) nav2.classList.remove('mobile-open');
        if (nav3) nav3.classList.remove('mobile-open');
      }
    });
  }

  function initPhcNav(nav2, nav3) {
    const nav2Links = nav2.querySelectorAll('a[data-page]');
    const nav3Links = nav3 ? nav3.querySelectorAll('a[data-tab]') : [];

    function alignNav2() {
      const prvLink = document.getElementById('navPrvenstva');
      const nav2List = nav2.querySelector('.phc-subnav-list');
      if (!prvLink || !nav2List) { nav2.classList.add('ready'); return; }

      // Reset padding first so measurement is clean
      nav2List.style.paddingLeft = '';

      if (window.innerWidth <= 700) {
        nav2.classList.add('ready');
        if (nav3) nav3.classList.add('ready');
        return;
      }

      // Measure after reset
      const listRect = nav2List.getBoundingClientRect();
      const prvRect = prvLink.getBoundingClientRect();
      const basePad = parseFloat(getComputedStyle(nav2List).paddingLeft) || 0;
      const needed = prvRect.left - listRect.left + basePad;
      nav2List.style.paddingLeft = Math.max(0, needed) + 'px';
      nav2.classList.add('ready');
      if (nav3) nav3.classList.add('ready');
    }

    requestAnimationFrame(() => requestAnimationFrame(alignNav2));

    let resizeTimer;
    window.addEventListener('resize', () => {
      nav2.classList.remove('ready');
      if (nav3) nav3.classList.remove('ready');
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(alignNav2, 50);
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

        // Na mobilnom
        if (window.innerWidth <= 700) {
          if (pg === 'statistika') {
            // Prikaži treću razinu izbornika umjesto navigacije
            nav2.classList.remove('mobile-open', 'ready');
            nav2.style.cssText = 'display:none;';
            const overlay = document.getElementById('mobileNavOverlay');
            if (overlay) overlay.style.display = 'none';
            // Prikaži nav3
            if (nav3) {
              nav3.removeAttribute('style');
              nav3.classList.add('mobile-open', 'ready');
              nav3.style.cssText = 'display:block;position:fixed;left:0;right:0;z-index:999;';
              const siteNavEl = document.getElementById('siteNav');
              if (siteNavEl) {
                const navBottom = siteNavEl.getBoundingClientRect().bottom;
                nav3.style.top = navBottom + 'px';
              }
              const overlay2 = document.getElementById('mobileNavOverlay');
              if (overlay2) overlay2.style.display = 'block';
            }
          } else {
            closeMobileNav();
            const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? '' : '/curling-hr';
            window.location.href = base + '/prvenstva/#' + pg;
          }
          return;
        }

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

        // Na mobilnom — navigiraj na stranicu s hashom
        if (window.innerWidth <= 700) {
          closeMobileNav();
          const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? '' : '/curling-hr';
          window.location.href = base + '/prvenstva/#statistika/' + tab;
          return;
        }

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