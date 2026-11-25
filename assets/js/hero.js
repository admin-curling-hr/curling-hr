/* ============================================================
   Naslovne slike (hero) na početnoj stranici: vrtnja nekoliko najnovijih
   ============================================================
   Popis slika je assets/json/hero.json (generira ga skripte/generiraj-hero.py iz
   assets/images/hero/GGGG-MM-DD.jpg + .txt s natpisom; pokreće ga GitHub Action).
   - prikazuje se BROJ najnovijih slika; najnovija TRAJANJE_PRVA ms, ostale TRAJANJE_OSTALE ms
   - PRIJELAZ PO DANU U TJEDNU (tablica PRIJELAZ_PO_DANU, po zagrebačkom vremenu): cijeli dan
     isti prijelaz za sve posjetitelje, sutradan drugi
   - strelice lijevo/desno, točkice, povlačenje prstom, tipke ← → kad je fokus na kontrolama
   - vrtnja stoji dok je miš iznad slike ili je fokus na kontrolama i dok kartica nije vidljiva;
     nakon klika na strelicu/točkicu brojanje vremena kreće ispočetka
   - uz sustavnu postavku "smanjeno kretanje": nema automatske vrtnje, a strelice mijenjaju
     sliku kratkim pretapanjem
   - za isprobavanje: ?prijelaz=zavjesa (ili drugo ime iz PRIJELAZI) na kraju adrese naslovnice
   Ako se hero.json ne učita, ostaje statična slika upisana u index.html.
   ============================================================ */
(function () {
  'use strict';

  const BROJ = 3;
  const TRAJANJE_PRVA = 10000;
  const TRAJANJE_OSTALE = 6000;

  // Prijelaz za svaki dan u tjednu (redom: ponedjeljak … nedjelja). Imena su ključevi iz PRIJELAZI.
  const PRIJELAZ_PO_DANU = ['klizanje', 'pretapanje', 'zavjesa', 'zum', 'paralaksa', 'zamucenje', 'sredina'];

  // Svaki prijelaz dobiva staru i novu sliku te smjer (1 = naprijed, -1 = natrag) i vraća
  // obećanje koje završi kad je prijelaz gotov. Nova slika je iznad stare (z-index).
  const E = 'ease-in-out';
  const anim = (el, okviri, ms, easing) => el.animate(okviri, { duration: ms, easing: easing || E }).finished;
  const PRIJELAZI = {
    // Klizanje: nova slika gura staru (zdesna nalijevo; natrag obrnuto)
    klizanje: (st, nv, d) => Promise.all([
      anim(st, [{ transform: 'translateX(0)' }, { transform: `translateX(${-100 * d}%)` }], 600),
      anim(nv, [{ transform: `translateX(${100 * d}%)` }, { transform: 'translateX(0)' }], 600)]),
    // Pretapanje: nova slika se polako pojavi preko stare
    pretapanje: (st, nv) => anim(nv, [{ opacity: 0 }, { opacity: 1 }], 1200),
    // Zavjesa: nova slika se otkriva zdesna nalijevo (natrag slijeva nadesno)
    zavjesa: (st, nv, d) => anim(nv, [{ clipPath: d > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 900),
    // Pretapanje + zum (Ken Burns): pretapanje, a slika se dok je prikazana polako približava
    zum: (st, nv) => anim(nv, [{ opacity: 0 }, { opacity: 1 }], 1200),
    // Paralaksa: nova slika uklizi preko stare, a stara se sporije odmiče i blago potamni
    paralaksa: (st, nv, d) => Promise.all([
      anim(st, [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: `translateX(${-30 * d}%)`, filter: 'brightness(0.6)' }], 750),
      anim(nv, [{ transform: `translateX(${100 * d}%)` }, { transform: 'translateX(0)' }], 750)]),
    // Zamućenje: stara slika se zamuti, a nova se preko nje pojavi i izoštri
    zamucenje: (st, nv) => Promise.all([
      anim(st, [{ filter: 'blur(0)' }, { filter: 'blur(10px)' }], 1000),
      anim(nv, [{ filter: 'blur(10px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }], 1000)]),
    // Otvaranje iz sredine: nova slika se otvara od sredine prema rubovima
    sredina: (st, nv) => anim(nv, [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }], 900),
    // Za "smanjeno kretanje": kratko pretapanje
    kratko: (st, nv) => anim(nv, [{ opacity: 0 }, { opacity: 1 }], 300)
  };

  const fig = document.getElementById('heroFigure');
  if (!fig || !window.fetch) return;
  const BASE = window.HCS_BASE || '';
  const manjeKretanja = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imaAnimacije = typeof Element.prototype.animate === 'function';

  // Današnji prijelaz: po danu u tjednu u Zagrebu; ?prijelaz=ime ima prednost (za isprobavanje).
  function danasnjiPrijelaz() {
    const izAdrese = new URLSearchParams(location.search).get('prijelaz');
    if (izAdrese && PRIJELAZI[izAdrese]) return izAdrese;
    let dan;
    try {
      const k = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zagreb', weekday: 'short' }).format(new Date());
      dan = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(k);
    } catch (e) { dan = -1; }
    if (dan < 0) dan = (new Date().getDay() + 6) % 7;
    const ime = PRIJELAZ_PO_DANU[dan % PRIJELAZ_PO_DANU.length];
    return PRIJELAZI[ime] ? ime : 'pretapanje';
  }
  const PRIJELAZ = manjeKretanja ? 'kratko' : danasnjiPrijelaz();

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

    const okvir = document.createElement('div');
    okvir.className = 'hero-viewport';
    const imgs = slike.map((s) => {
      const img = document.createElement('img');
      img.className = 'home-hero-img hero-slide';
      img.alt = s.hr;
      img.decoding = 'async';
      img.dataset.src = url(s);
      okvir.appendChild(img);
      return img;
    });

    const cap = fig.querySelector('.hero-caption') || document.createElement('figcaption');
    cap.className = 'hero-caption';
    cap.removeAttribute('data-hr');
    cap.removeAttribute('data-en');

    fig.innerHTML = '';
    fig.appendChild(okvir);
    fig.appendChild(cap);
    fig.classList.add('hero-carousel');
    fig.dataset.prijelaz = PRIJELAZ;

    // Prva slika odmah, ostale tek kad se prva učita (ne usporavaju naslovnicu).
    imgs[0].src = imgs[0].dataset.src;
    const ostale = () => imgs.slice(1).forEach((im) => { im.src = im.dataset.src; });
    if (imgs[0].complete) ostale(); else { imgs[0].addEventListener('load', ostale, { once: true }); imgs[0].addEventListener('error', ostale, { once: true }); }

    let i = 0;                // indeks prikazane slike
    let timer = null;
    let stoji = false;        // miš/fokus iznad slike
    let radi = false;         // prijelaz u tijeku
    let zum = null;           // animacija polaganog zuma (prijelaz "zum")
    let tocke = null;
    let oznakeJezik = () => {};

    function trajanje() { return i === 0 ? TRAJANJE_PRVA : TRAJANJE_OSTALE; }

    function prikazi(idx) {
      imgs.forEach((im, k) => {
        im.classList.toggle('is-on', k === idx);
        im.style.zIndex = k === idx ? 2 : 1;
      });
      i = idx;
      cap.textContent = natpis(slike[i]);
      cap.hidden = !cap.textContent;
      if (tocke) tocke.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
      if (PRIJELAZ === 'zum' && imaAnimacije) {
        if (zum) zum.cancel();
        zum = imgs[i].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }],
          { duration: trajanje() + 1500, easing: 'linear', fill: 'forwards' });
        if (stoji) zum.pause();
      }
    }

    function idi(idx, smjer) {
      if (n < 2 || radi) return;
      idx = (idx + n) % n;
      if (idx === i) { pokreni(); return; }
      const st = imgs[i], nv = imgs[idx];
      if (!imaAnimacije) { prikazi(idx); pokreni(); return; }
      radi = true;
      clearTimeout(timer);
      st.style.zIndex = 2;
      nv.style.zIndex = 3;
      nv.classList.add('is-on');
      cap.classList.add('is-fading');
      PRIJELAZI[PRIJELAZ](st, nv, smjer || 1)
        .catch(() => {})
        .then(() => {
          st.getAnimations().forEach((a) => a.cancel());
          if (zum && PRIJELAZ === 'zum') { zum.cancel(); zum = null; }
          prikazi(idx);
          cap.classList.remove('is-fading');
          radi = false;
          pokreni();
        });
    }

    function pokreni() {
      clearTimeout(timer);
      if (n < 2 || manjeKretanja || stoji || document.hidden || radi) return;
      timer = setTimeout(() => idi(i + 1, 1), trajanje());
    }

    if (n > 1) {
      const strelica = (smjer) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hero-arrow hero-arrow-' + smjer;
        b.innerHTML = smjer === 'prev' ? '&#8249;' : '&#8250;';
        b.addEventListener('click', () => (smjer === 'prev' ? idi(i - 1, -1) : idi(i + 1, 1)));
        okvir.appendChild(b);   // u okviru slike, pa je "sredina visine" sredina slike (i na mobitelu, gdje je natpis ispod)
        return b;
      };
      const bPrev = strelica('prev');
      const bNext = strelica('next');
      tocke = document.createElement('div');
      tocke.className = 'hero-dots';
      slike.forEach((s, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.addEventListener('click', () => idi(k, k > i ? 1 : -1));
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
      const stani = () => { stoji = true; clearTimeout(timer); if (zum) zum.pause(); };
      const nastavi = () => { stoji = false; if (zum) zum.play(); pokreni(); };
      fig.addEventListener('mouseenter', stani);
      fig.addEventListener('mouseleave', nastavi);
      fig.addEventListener('focusin', stani);
      fig.addEventListener('focusout', (e) => { if (!fig.contains(e.relatedTarget)) nastavi(); });
      document.addEventListener('visibilitychange', pokreni);

      // Povlačenje prstom (mobitel)
      let x0 = null, y0 = null;
      okvir.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      okvir.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? idi(i + 1, 1) : idi(i - 1, -1));
      }, { passive: true });

      // Tipkovnica: strelice kad je fokus na kontrolama vrtnje
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); idi(i - 1, -1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); idi(i + 1, 1); }
      });
    }

    document.addEventListener('hcs-lang-change', (e) => {
      jezik = e.detail && e.detail.lang === 'en' ? 'en' : 'hr';
      cap.textContent = natpis(slike[i]);
      oznakeJezik();
    });

    prikazi(0);
    pokreni();
  }
})();
