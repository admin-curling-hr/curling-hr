// Kalendar - automatsko razvrstavanje natjecanja u "Predstojeća natjecanja" /
// "Održana natjecanja" unutar cjelina "Domaća natjecanja" i "Međunarodna
// natjecanja" (obje označene atributom data-split-by-date u kalendar/index.html).
//
// Admin i dalje samo dodaje nove ".kalendar-kartica" elemente izravno u
// odgovarajuću sekciju (isto kao i prije - vidi README, "Ažuriranje statičnih
// stranica") - ovaj skript ih pri svakom učitavanju stranice sam razvrsta u
// pravu podcjelinu prema datumu iz ".kartica-datum", pa se ništa ne treba ručno
// premještati kad natjecanje prođe.

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  // Naslovi podcjelina (dvojezično - isti mehanizam kao ostatak stranice,
  // vidi applyLang() u header.js: čim se doda data-hr/data-en, svaki sljedeći
  // klik na prekidač jezika će ih automatski prevesti).
  var LABELS = {
    predstojeca: { hr: 'Predstojeća natjecanja', en: 'Upcoming Competitions' },
    odrzana: { hr: 'Održana natjecanja', en: 'Past Competitions' }
  };

  // Parsira datum(e) iz teksta kartice i vraća Date koji predstavlja KRAJ
  // natjecanja (23:59:59 zadnjeg dana) - to je trenutak nakon kojeg se kartica
  // premješta iz "Predstojeća" u "Održana". Podržani formati (svi već korišteni
  // u kalendar/index.html):
  //   "19. – 20. 09. 2026."          (raspon unutar istog mjeseca)
  //   "27. 10. – 01. 11. 2026."      (raspon koji prelazi iz jednog u drugi mjesec)
  //   "06. 03. 2027."                (jedan dan)
  //   "04/2027."                     (samo mjesec/godina - bez točnog dana)
  // Ako format nije prepoznat, vraća null - takva kartica ostaje u "Predstojeća"
  // (sigurnije ju je prikazati nego pogrešno sakriti zbog neprepoznatog formata).
  function parseEndDate(text) {
    var str = (text || '').trim();

    // "DD. MM. – DD. MM. YYYY."
    var m = str.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/);
    if (m) return new Date(+m[5], +m[4] - 1, +m[3], 23, 59, 59);

    // "DD. – DD. MM. YYYY."
    m = str.match(/^(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/);
    if (m) return new Date(+m[4], +m[3] - 1, +m[2], 23, 59, 59);

    // "DD. MM. YYYY." (jedan dan)
    m = str.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], 23, 59, 59);

    // "MM/YYYY." (zadnji dan tog mjeseca)
    m = str.match(/^(\d{1,2})\/(\d{4})\.?$/);
    if (m) return new Date(+m[2], +m[1], 0, 23, 59, 59);

    return null;
  }

  function init() {
    var lang = localStorage.getItem('hcs-lang') || 'hr';
    var now = new Date();

    var sekcije = document.querySelectorAll('.kalendar-sekcija[data-split-by-date]');
    for (var s = 0; s < sekcije.length; s++) {
      razvrstajSekciju(sekcije[s], now, lang);
    }
  }

  function razvrstajSekciju(sekcija, now, lang) {
    var kartice = Array.prototype.slice.call(sekcija.querySelectorAll(':scope > .kalendar-kartica'));
    if (!kartice.length) return;

    var predstojece = [];
    var odrzane = [];

    kartice.forEach(function (kartica) {
      var datumEl = kartica.querySelector('.kartica-datum');
      var end = datumEl ? parseEndDate(datumEl.textContent) : null;
      if (end && end.getTime() < now.getTime()) {
        odrzane.push({ el: kartica, end: end });
      } else {
        predstojece.push({ el: kartica, end: end });
      }
    });

    // Predstojeća: najbliža prva. Održana: najnovija prva (obrnut kronoloski redoslijed).
    predstojece.sort(function (a, b) {
      return (a.end ? a.end.getTime() : Infinity) - (b.end ? b.end.getTime() : Infinity);
    });
    odrzane.sort(function (a, b) {
      return (b.end ? b.end.getTime() : 0) - (a.end ? a.end.getTime() : 0);
    });

    // Makni originalne kartice iz sekcije - premjestit ćemo ih (iste DOM elemente,
    // ne kopije) u nove podcjeline, čime se čuvaju sve njihove (već prevedene)
    // vrijednosti i event listeneri.
    kartice.forEach(function (k) { k.remove(); });

    if (predstojece.length) {
      sekcija.appendChild(buildPodsekcija('predstojeca', predstojece, lang));
    }
    if (odrzane.length) {
      sekcija.appendChild(buildPodsekcija('odrzana', odrzane, lang));
    }
  }

  function buildPodsekcija(kind, entries, lang) {
    var wrap = document.createElement('div');
    wrap.className = 'kalendar-podsekcija kalendar-podsekcija-' + kind;

    var h4 = document.createElement('h4');
    h4.className = 'podsekcija-naslov';
    h4.dataset.hr = LABELS[kind].hr;
    h4.dataset.en = LABELS[kind].en;
    h4.textContent = lang === 'en' ? LABELS[kind].en : LABELS[kind].hr;
    wrap.appendChild(h4);

    var lista = document.createElement('div');
    lista.className = 'kalendar-kartica-lista';
    entries.forEach(function (entry) { lista.appendChild(entry.el); });
    wrap.appendChild(lista);

    return wrap;
  }
})();