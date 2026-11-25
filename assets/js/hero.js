/* ============================================================
   Naslovne slike (hero) na početnoj stranici: vrtnja nekoliko najnovijih
   ============================================================
   Popis slika je assets/json/hero.json (generira ga skripte/generiraj-hero.py iz
   assets/images/hero/GGGG-MM-DD.jpg + .txt s natpisom; pokreće ga GitHub Action).
   - prikazuje se BROJ najnovijih slika; najnovija TRAJANJE_PRVA ms, ostale TRAJANJE_OSTALE ms
   - prijelaz zdesna nalijevo; nakon zadnje slike nastavlja u istom smjeru na prvu
   - strelice lijevo/desno, točkice, povlačenje prstom na mobitelu
   - vrtnja stoji dok je miš iznad slike ili je fokus na kontrolama i dok kartica nije vidljiva;
     nakon klika na strelicu/točkicu brojanje vremena kreće ispočetka
   - uz sustavnu postavku "smanjeno kretanje" nema automatske vrtnje ni animacije
   Ako se hero.json ne učita, ostaje statična slika upisana u index.html.
   ============================================================ */
(function () {
  'use strict';

  const BROJ = 3;
  const TRAJANJE_PRVA = 10000;
  const TRAJANJE_OSTALE = 6000;
  const PRIJELAZ = 600;                 // ms; mora odgovarati CSS-u (.hero-track transition)

  const fig = document.getElementById('heroFigure');
  if (!fig || !window.fetch) return;
  const BASE = window.HCS_BASE || '';
  const manjeKretanja = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let jezik = 'hr';
  try { jezik = localStorage.getItem('hcs-lang') === 'en' ? 'en' : 'hr'; } catch (e) {}
  const TXT = {
    hr: { prev: 'Prethodna slika', next: 'Sljedeća slika', slika: 'Slika' },
    en: { prev: 'Previous image', next: 'Next image', slika: 'Image' }
  };

  fetch(BASE + '/assets/json/hero.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((d) => {
      const slike = (d && d.slike || []).slice(0, BROJ);
      if (slike.length) izgradi(slike);
    })
    .catch((e) => console.warn('Hero: popis slika nije učitan, ostaje statična slika.', e));

  function izgradi(slike) {
    const n = slike.length;
    const url = (s) => BASE + '/assets/images/hero/' + encodeURIComponent(s.slika);
    const natpis = (s) => (jezik === 'en' ? (s.en || s.hr) : s.hr) || '';

    // Staza sa slikama; za neprekinutu vrtnju na kraj ide kopija prve slike.
    const track = document.createElement('div');
    track.className = 'hero-track';
    const okvir = document.createElement('div');
    okvir.className = 'hero-viewport';
    okvir.appendChild(track);

    const imgs = [];
    slike.concat(n > 1 ? [slike[0]] : []).forEach((s, i) => {
      const img = document.createElement('img');
      img.className = 'home-hero-img hero-slide';
      img.alt = i < n ? s.hr : '';
      if (i >= n) img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      img.dataset.src = url(s);
      track.appendChild(img);
      imgs.push(img);
    });

    const cap = fig.querySelector('.hero-caption') || document.createElement('figcaption');
    cap.className = 'hero-caption';
    cap.removeAttribute('data-hr');
    cap.removeAttribute('data-en');

    fig.innerHTML = '';
    fig.appendChild(okvir);
    fig.appendChild(cap);
    fig.classList.add('hero-carousel');

    // Prva slika odmah, ostale tek kad se prva učita (ne usporavaju naslovnicu).
    imgs[0].src = imgs[0].dataset.src;
    const ostale = () => imgs.slice(1).forEach((im) => { im.src = im.dataset.src; });
    if (imgs[0].complete) ostale(); else { imgs[0].addEventListener('load', ostale, { once: true }); imgs[0].addEventListener('error', ostale, { once: true }); }

    let i = 0;                // indeks prikazane slike (0..n; n je kopija prve)
    let timer = null;
    let stoji = false;        // miš/fokus iznad slike

    function postavi(idx, animiraj) {
      track.style.transition = animiraj && !manjeKretanja ? '' : 'none';
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      if (!animiraj || manjeKretanja) void track.offsetWidth;   // primijeni bez animacije
      i = idx;
      osvjeziOznake();
    }
    function stvarni() { return i % n; }

    function osvjeziOznake() {
      const s = slike[stvarni()];
      cap.textContent = natpis(s);
      cap.hidden = !cap.textContent;
      if (tocke) tocke.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', k === stvarni() ? 'true' : 'false'));
    }

    function idi(idx) {
      if (n < 2) return;
      if (idx < 0) { postavi(n, false); idx = n - 1; }   // s prve unatrag: skok na kopiju, pa animacija na zadnju
      postavi(idx, true);
      if (i === n) setTimeout(() => { if (i === n) postavi(0, false); }, manjeKretanja ? 0 : PRIJELAZ + 30);
      pokreni();
    }

    function pokreni() {
      clearTimeout(timer);
      if (n < 2 || manjeKretanja || stoji || document.hidden) return;
      timer = setTimeout(() => idi(i + 1), stvarni() === 0 ? TRAJANJE_PRVA : TRAJANJE_OSTALE);
    }

    // Strelice i točkice (samo ako ima više slika)
    let tocke = null;
    let oznakeJezik = () => {};
    if (n > 1) {
      const strelica = (smjer) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hero-arrow hero-arrow-' + smjer;
        b.innerHTML = smjer === 'prev' ? '&#8249;' : '&#8250;';
        b.addEventListener('click', () => idi(smjer === 'prev' ? stvarni() - 1 : i + 1));
        fig.appendChild(b);
        return b;
      };
      const bPrev = strelica('prev');
      const bNext = strelica('next');
      tocke = document.createElement('div');
      tocke.className = 'hero-dots';
      slike.forEach((s, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.addEventListener('click', () => { if (k !== stvarni()) idi(k === 0 && stvarni() === n - 1 ? n : k); else pokreni(); });
        tocke.appendChild(b);
      });
      okvir.appendChild(tocke);

      oznakeJezik = () => {
        bPrev.setAttribute('aria-label', TXT[jezik].prev);
        bNext.setAttribute('aria-label', TXT[jezik].next);
        tocke.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-label', TXT[jezik].slika + ' ' + (k + 1)));
      };
      oznakeJezik();

      // Stani dok je miš iznad slike ili je fokus na kontrolama.
      fig.addEventListener('mouseenter', () => { stoji = true; clearTimeout(timer); });
      fig.addEventListener('mouseleave', () => { stoji = false; pokreni(); });
      fig.addEventListener('focusin', () => { stoji = true; clearTimeout(timer); });
      fig.addEventListener('focusout', (e) => { if (!fig.contains(e.relatedTarget)) { stoji = false; pokreni(); } });
      document.addEventListener('visibilitychange', pokreni);

      // Povlačenje prstom (mobitel)
      let x0 = null, y0 = null;
      okvir.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      okvir.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) idi(dx < 0 ? i + 1 : stvarni() - 1);
      }, { passive: true });

      // Tipkovnica: strelice kad je fokus na kontrolama vrtnje
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); idi(stvarni() - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); idi(i + 1); }
      });
    }

    document.addEventListener('hcs-lang-change', (e) => {
      jezik = e.detail && e.detail.lang === 'en' ? 'en' : 'hr';
      osvjeziOznake();
      oznakeJezik();
    });

    postavi(0, false);
    pokreni();
  }
})();
