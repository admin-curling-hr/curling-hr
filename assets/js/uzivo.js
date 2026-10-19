/* ============================================================
   UŽIVO — stranica /uzivo/
   Prikazuje SoftPeelR stranice aktivnih natjecanja u okviru (iframe).
   Postavke: assets/js/uzivo-config.js (učitava ih header.js -> window.hcsUzivoReady).
   Adresa pamti odabir: /uzivo/#<broj turnira>/<prikaz>, npr. #2260/raspored
   ============================================================ */
(function () {
  'use strict';

  const SP = 'https://softpeelr.com/en';   // SoftPeelR nema hrvatski; dostupni su en, de, fr-CH, it-CH, pl
  const PRIKAZI = [
    { id: 'poredak',   hr: 'Poredak',  en: 'Standings', put: id => '/tournaments/' + id + '/ranking' },
    { id: 'rezultati', hr: 'Rezultati', en: 'Results',  put: id => '/tournaments/' + id },
    { id: 'raspored',  hr: 'Raspored', en: 'Schedule',  put: id => '/tournaments/' + id + '/schedule' },
    { id: 'krugovi',   hr: 'Krugovi',  en: 'Rounds',    put: id => '/tournaments/' + id + '/rounds' },
    { id: 'ekipe',     hr: 'Ekipe',    en: 'Teams',     put: id => '/tournaments/' + id + '/team_instances' }
  ];

  const app = document.getElementById('uzivoApp');
  if (!app) return;

  let aktivna = [];
  let ucitano = false;
  let lang = 'hr';
  try { lang = localStorage.getItem('hcs-lang') === 'en' ? 'en' : 'hr'; } catch (e) {}

  const t = (hr, en) => (lang === 'en' ? en : hr);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const naziv = n => (lang === 'en' && n.nazivEn) ? n.nazivEn : n.naziv;

  function stanjeIzAdrese() {
    const [idStr, prikaz] = location.hash.replace(/^#/, '').split('/');
    const n = aktivna.find(x => String(x.softpeelr) === idStr) || aktivna[0];
    const p = PRIKAZI.find(x => x.id === prikaz) || PRIKAZI[0];
    return { n, p };
  }

  function prikazi() {
    if (!aktivna.length) {
      app.innerHTML =
        '<div class="uz-empty">' +
          '<h1>' + t('Trenutno nema natjecanja koje se prati uživo', 'No competition is currently being followed live') + '</h1>' +
          '<p>' + t('Raspored natjecanja pogledajte u ', 'See the competition schedule in the ') +
          '<a href="../kalendar/">' + t('Kalendaru događanja', 'Events calendar') + '</a>.</p>' +
        '</div>';
      return;
    }

    const { n, p } = stanjeIzAdrese();
    const url = SP + p.put(n.softpeelr);
    const meta = [n.datumi, n.mjesto].filter(Boolean).map(esc).join(' · ');

    let html = '';
    if (aktivna.length > 1) {
      html += '<div class="uz-comp" role="group" aria-label="' + t('Natjecanje', 'Competition') + '">' +
        aktivna.map(x => '<button type="button" class="uz-btn' + (x === n ? ' active' : '') + '" data-n="' + esc(x.softpeelr) + '"' +
          (x === n ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(naziv(x)) + '</button>').join('') +
        '</div>';
    }
    html +=
      '<span class="uz-badge"><span class="nav-live" aria-hidden="true"></span>' + t('Uživo', 'Live') + '</span>' +
      '<h1 class="uz-title">' + esc(naziv(n)) + '</h1>' +
      (meta ? '<p class="uz-meta">' + meta + '</p>' : '<p class="uz-meta"></p>') +
      '<div class="uz-tabs" role="group" aria-label="' + t('Prikaz', 'View') + '">' +
        PRIKAZI.map(x => '<button type="button" class="uz-btn' + (x === p ? ' active' : '') + '" data-p="' + x.id + '"' +
          (x === p ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + t(x.hr, x.en) + '</button>').join('') +
      '</div>' +
      '<div class="uz-frame-box"><iframe class="uz-frame" src="' + esc(url) + '" title="' +
        esc(naziv(n) + ' – ' + t(p.hr, p.en)) + '" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
      '<div class="uz-foot">' +        
        '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + t('Otvori u punom prikazu na SoftPeelR.com', 'Open full view on SoftPeeR.com') + ' ↗</a>' +
      '</div>';
    app.innerHTML = html;

    app.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => postavi(b.dataset.n, p.id)));
    app.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => postavi(n.softpeelr, b.dataset.p)));
  }

  // replaceState: gumbi ne pune povijest preglednika (tipka Natrag vodi na prethodnu stranicu)
  function postavi(id, prikaz) {
    history.replaceState(null, '', '#' + id + '/' + prikaz);
    prikazi();
  }

  document.addEventListener('hcs-lang-change', e => {
    lang = e.detail && e.detail.lang === 'en' ? 'en' : 'hr';
    if (ucitano) prikazi();
  });
  window.addEventListener('hashchange', () => { if (ucitano) prikazi(); });

  (window.hcsUzivoReady || Promise.resolve(null)).then(cfg => {
    aktivna = window.hcsUzivoAktivna ? window.hcsUzivoAktivna(cfg) : [];
    ucitano = true;
    prikazi();
  });
})();
