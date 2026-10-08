/* Pretvara emoji medalja (🥇🥈🥉) u tekstu u SVG ikone. Koristi se gdje se medalje slažu u tekstu (npr. "🥇3 🥈2 🥉1"). */
window.hcsMedalize = function (str) {
  return String(str)
    .replace(/🥇/g, '<span class="hm hm-g" role="img" aria-label="zlato"></span>')
    .replace(/🥈/g, '<span class="hm hm-s" role="img" aria-label="srebro"></span>')
    .replace(/🥉/g, '<span class="hm hm-b" role="img" aria-label="bronca"></span>');
};

(function () {
  'use strict';

  // Jedina definicija bazne putanje u cijelom sajtu (ostale skripte koriste window.HCS_BASE).
  // Sajt je uvijek na korijenu domene (curling.hr, localhost) -> BASE = ''.
  // Iznimka: privremeni GitHub Pages "project" URL (…github.io/curling-hr/) -> BASE = '/curling-hr'.
  // Detekcija ide po putanji, ne po hostnameu, pa radi isto na svakoj domeni.
  // Nakon prelaska na curling.hr (CNAME) ovaj dio postaje uvijek '' i može se pojednostaviti.
  const BASE = /^\/curling-hr(\/|$)/.test(window.location.pathname) ? '/curling-hr' : '';
  window.HCS_BASE = BASE;

  const HEADER_HTML = `
<header class="site-header">
  <div class="header-inner">
    <a href="${BASE}/" class="header-brand">
      <img src="${BASE}/assets/images/hcs-logo.png" alt="HCS Logo" class="header-logo">
      <div class="header-titles">
        <span class="header-title header-title-full" data-hr="Hrvatski curling savez" data-en="Croatian Curling Association">Hrvatski curling savez</span>
        <span class="header-title header-title-short" data-hr="HCS" data-en="CCA">HCS</span>
        <span class="header-subtitle" data-hr="Croatian Curling Association" data-en="Hrvatski curling savez">Croatian Curling Association</span>
      </div>
    </a>
    <div class="header-controls">
      <button class="theme-toggle" id="themeToggle" aria-label="Promjena teme">
        <span class="theme-icon hi hi-sun" aria-hidden="true"></span>
      </button>
      <button class="lang-toggle" id="langToggle" aria-label="Change language">
        <span id="langLabel">EN</span>
      </button>
      <a class="m365-link" id="m365Link" href="https://login.microsoftonline.com/" target="_blank" rel="noopener noreferrer"
         data-title-hr="Prijava na interne stranice saveza"
         data-title-en="Sign in to the federation's staff pages"
         title="Prijava na interne stranice saveza">
        <span class="hi hi-user" aria-hidden="true"></span>
        <span class="sr-only" data-hr="Prijava" data-en="Login">Prijava</span>
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

  // ===== Mobilni izbornik (do 700 px): jedan panel, tri prikaza =====
  // root = glavni izbornik, l2 = "Prvenstva Hrvatske", l3 = "Statistika".
  // U svakom trenutku vidljiv je samo JEDAN prikaz (kao u iOS postavkama), pa nikad
  // ne prelazi visinu ekrana; panel je uz to ograničen i ima vlastito listanje.
  // Stavke 2. i 3. razine kopiraju se iz #phcNav2/#phcNav3 (jedan izvor naziva i
  // prijevoda). Desktop izbornik ovo uopće ne koristi (kopije su tamo skrivene).
  const mqMobile = window.matchMedia('(max-width: 700px)');
  const isMobileNav = () => mqMobile.matches;

  function buildMobileNav() {
    const siteNav = document.getElementById('siteNav');
    const rootUl = siteNav && siteNav.querySelector('ul');
    const nav2 = document.getElementById('phcNav2');
    const nav3 = document.getElementById('phcNav3');
    const prv = document.getElementById('navPrvenstva');
    if (!siteNav || !rootUl || !nav2 || !nav3 || !prv) return;

    rootUl.classList.add('mnav-root');
    prv.classList.add('has-sub');

    function makeList(id, parentLabelSrc, srcLinks) {
      const ul = document.createElement('ul');
      ul.id = id;
      ul.className = 'mnav-sub';
      ul.hidden = true;

      const backLi = document.createElement('li');
      const back = document.createElement('a');
      back.href = '#';
      back.className = 'mnav-back';
      back.setAttribute('role', 'button');
      const arrow = document.createElement('span');
      arrow.className = 'mnav-back-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '\u2039';
      const label = document.createElement('span');
      label.dataset.hr = parentLabelSrc.dataset.hr;
      label.dataset.en = parentLabelSrc.dataset.en;
      label.textContent = parentLabelSrc.dataset.hr;
      back.append(arrow, label);
      backLi.appendChild(back);
      ul.appendChild(backLi);

      srcLinks.forEach(src => {
        const li = document.createElement('li');
        const a = src.cloneNode(true);
        a.classList.remove('active');
        if (a.dataset.page === 'statistika') a.classList.add('has-sub');
        li.appendChild(a);
        ul.appendChild(li);
      });
      return ul;
    }

    const l2 = makeList('mnavL2', prv, nav2.querySelectorAll('a[data-page]'));
    const statLink = nav2.querySelector('a[data-page="statistika"]');
    const l3 = makeList('mnavL3', statLink, nav3.querySelectorAll('a[data-tab]'));
    rootUl.after(l2, l3);
  }

  // Prebacuje prikaz panela; fokus se prebacuje na prvu stavku novog prikaza
  // (inače bi tipkovnica/čitač ekrana ostali na stavci koja je upravo nestala).
  function showMobileView(view, moveFocus) {
    const siteNav = document.getElementById('siteNav');
    if (!siteNav) return;
    const lists = { root: siteNav.querySelector('.mnav-root'), l2: document.getElementById('mnavL2'), l3: document.getElementById('mnavL3') };
    siteNav.dataset.view = view;
    Object.keys(lists).forEach(k => { if (lists[k]) lists[k].hidden = (k !== view); });
    siteNav.scrollTop = 0;
    if (moveFocus && lists[view]) {
      const first = lists[view].querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  }

  // Ako smo na stranici Prvenstva, hamburger se otvara na razini u kojoj se nalazimo:
  // Statistika -> 3. razina, ostalo (Pregled, Postignuća) -> 2. razina; svugdje drugdje
  // glavni izbornik. Trenutna stavka se usput označi.
  function currentMobileView() {
    const siteNav = document.getElementById('siteNav');
    if (!siteNav || document.body.dataset.page !== 'prvenstva') return 'root';
    const route = location.hash.replace(/^#/, '').split('?')[0].split('/');
    const section = route[0] === 'pregled' || !route[0] ? 'prvenstva' : route[0];
    const tab = route[1] === 'podaci' ? 'statistika' : (route[1] || 'poretci');
    const mark = (list, attr, value) => {
      if (!list) return;
      list.querySelectorAll('a[data-' + attr + ']').forEach(a => {
        const on = a.dataset[attr] === value;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    };
    mark(document.getElementById('mnavL2'), 'page', section);
    mark(document.getElementById('mnavL3'), 'tab', section === 'statistika' ? tab : null);
    return section === 'statistika' ? 'l3' : 'l2';
  }

  function closeMobileNav() {
    const siteNav = document.getElementById('siteNav');
    if (siteNav) siteNav.classList.remove('open');
    const toggle = document.getElementById('navToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    showMobileView('root', false);
  }

  buildMobileNav();

  // Tooltip (title) i aria-label za gumbe teme i jezika: kažu što je trenutno uključeno i što
  // će se dogoditi klikom. Redoslijed teme pri klikanju: automatska -> svijetla -> tamna.
  const SWITCHER_TEXTS = {
    theme: {
      auto:  { hr: 'Prikaz boja: prema postavkama SUSTAVA. Klikni za SVIJETLI prikaz.', en: 'Theme: from the SYSTEM. Click for LIGHT theme.' },
      light: { hr: 'Prikaz boja: SVIJETLI. Klikni za TAMNI prikaz.',                    en: 'Theme: LIGHT. Click for DARK theme.' },
      dark:  { hr: 'Prikaz boja: TAMNI. Klikni za prikaz prema postavkama SUSTAVA.',    en: 'Theme: DARK. Click for SYSTEM theme.' }
    },
    lang: {
      hr: { hr: 'Jezik: HRVATSKI. Klikni za ENGLESKI / Click for ENGLISH.',    en: 'Language: CROATIAN. Click for ENGLISH / Klikni za ENGLESKI.' },
      en: { hr: 'Jezik: ENGLESKI. Klikni za HRVATSKI / Click for CROATIAN.',   en: 'Language: ENGLISH. Click for CROATIAN / Klikni za HRVATSKI.' }
    }
  };

  function refreshSwitcherTitles() {
    let lang = 'hr', theme = 'auto';
    try { lang = localStorage.getItem('hcs-lang') === 'en' ? 'en' : 'hr'; } catch (e) {}
    try { theme = localStorage.getItem('hcs-theme') || 'auto'; } catch (e) {}
    if (!SWITCHER_TEXTS.theme[theme]) theme = 'auto';
    const themeBtn = document.getElementById('themeToggle');
    const langBtn = document.getElementById('langToggle');
    if (themeBtn) {
      const t = SWITCHER_TEXTS.theme[theme][lang];
      themeBtn.title = t;
      themeBtn.setAttribute('aria-label', t);
    }
    if (langBtn) {
      const t = SWITCHER_TEXTS.lang[lang][lang];
      langBtn.title = t;
      langBtn.setAttribute('aria-label', t);
    }
  }

  initHeader();

  function initHeader() {
    const page = document.body.dataset.page || '';

    // Active nav link
    const currentPath = window.location.pathname;
    // Samo glavni popis: kopije 2./3. razine (mobilni izbornik) imaju href="#" pa bi
    // se inače sve označile kao aktivne.
    document.querySelectorAll('.site-nav .mnav-root a').forEach(link => {
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
    const ICONS = { auto: 'hi-monitor', light: 'hi-sun', dark: 'hi-moon' };

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
      if (themeIcon) themeIcon.className = 'theme-icon hi ' + (ICONS[theme] || ICONS.auto);
      localStorage.setItem('hcs-theme', theme);
      refreshSwitcherTitles();
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
      refreshSwitcherTitles();
      // Javljamo ostatku stranice (npr. prvenstva.js) da se jezik promijenio, za
      // dijelove koji sami generiraju svoj HTML pa ih ovaj querySelectorAll pristup
      // ne dohvaća automatski (npr. dinamički prikaz značaka na Postignućima).
      document.dispatchEvent(new CustomEvent('hcs-lang-change', { detail: { lang } }));
    }

    // Vijesti (popis i članci) postoje samo na hrvatskom: u engleskom načinu prikazujemo
    // napomenu. U hrvatskom načinu je tekst prazan, pa se element sakrije (vidi CSS :empty).
    if (document.body.dataset.page === 'vijesti') {
      const note = document.createElement('p');
      note.className = 'hr-only-note';
      note.dataset.hr = '';
      note.dataset.en = "News articles are published in Croatian only. Use your browser's translate feature if needed.";
      const host = document.querySelector('.post-article') || document.querySelector('main.site-main');
      if (host) host.insertBefore(note, host.firstChild);
    }

    applyLang(localStorage.getItem('hcs-lang') || 'hr');
    if (langBtn) langBtn.addEventListener('click', () => {
      applyLang((localStorage.getItem('hcs-lang') || 'hr') === 'hr' ? 'en' : 'hr');
    });

    // Mobile nav
    const navToggle = document.getElementById('navToggle');
    const siteNav = document.getElementById('siteNav');

    if (navToggle && siteNav) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-controls', 'siteNav');
      navToggle.addEventListener('click', () => {
        const willOpen = !siteNav.classList.contains('open');
        siteNav.classList.toggle('open', willOpen);
        navToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        showMobileView(willOpen ? currentMobileView() : 'root', false);
      });

      // Jedan slušač za sve prijelaze između razina (samo na mobilnom).
      siteNav.addEventListener('click', e => {
        if (!isMobileNav()) return;
        const a = e.target.closest('a');
        if (!a || !siteNav.contains(a)) return;

        if (a.id === 'navPrvenstva') {
          e.preventDefault();
          showMobileView('l2', true);
        } else if (a.classList.contains('mnav-back')) {
          e.preventDefault();
          showMobileView(siteNav.dataset.view === 'l3' ? 'l2' : 'root', true);
        } else if (a.dataset.page) {            // stavka 2. razine
          e.preventDefault();
          if (a.dataset.page === 'statistika') {
            showMobileView('l3', true);
          } else {
            closeMobileNav();
            window.location.href = BASE + '/prvenstva/#' + a.dataset.page;
          }
        } else if (a.dataset.tab) {             // stavka 3. razine
          e.preventDefault();
          closeMobileNav();
          // Interni id taba "statistika" u URL-u se uvijek zove "podaci"
          window.location.href = BASE + '/prvenstva/#statistika/' + (a.dataset.tab === 'statistika' ? 'podaci' : a.dataset.tab);
        }
        // ostale stavke (obične poveznice) rade normalno
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && siteNav.classList.contains('open')) {
          closeMobileNav();
          navToggle.focus();
        }
      });

      // Prelazak između mobilnog i desktop prikaza (npr. rotacija, promjena veličine prozora)
      // uvijek vraća izbornik u početno stanje.
      mqMobile.addEventListener('change', closeMobileNav);
    }
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