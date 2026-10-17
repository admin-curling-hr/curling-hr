// registracija.js — obrazac RI-1 „Zahtjev za registracijom igrača-ice" (stranica /registracija/, bez poveznice u izborniku).
// Podaci se upisuju samo u pregledniku; PDF (jedna A4 stranica) izrađuje se na uređaju pomoću jsPDF
// (assets/vendor/jspdf) i fonta s hrvatskim slovima (assets/fonts/liberation-sans-subset-*.ttf). Ništa se ne šalje niti sprema.
// Tijek: igrač-ica (ili klub) upiše podatke → Preuzmi PDF → ispis → potpisi rukom → sken/fotografija e-poštom Savezu.
//
// Što se mijenja na jednom mjestu (CONFIG ispod): podaci Saveza i e-adresa, popis klubova te svi tekstovi obrasca
// (izjave, zaštita podataka, suglasnost roditelja, potvrda kluba). Tekstovi imaju dvije inačice: za punoljetnu i za
// maloljetnu osobu (prema datumu rođenja); inačica za maloljetnu uključuje roditelja/staratelja.

(function () {
  'use strict';

  // ============================================================
  //  CONFIG
  // ============================================================
  const HCS = {
    naziv: 'Hrvatski curling savez',
    adresa: 'Zagreb, Vučetićev prilaz 3/11',
    email: 'info@curling.hr',                   // na ovu adresu klubovi šalju potpisani zahtjev (sken/fotografija)
    stranica: 'curling.hr/registracija/',
    obrazac: 'OBRAZAC RI-1',
    naslov: 'ZAHTJEV ZA REGISTRACIJOM IGRAČA-ICE'
  };

  const MALOLJETAN_DO = 18;   // mlađi od ovoga: tekstovi uključuju roditelja/staratelja i otvara se kartica 1a

  // Aktivni klubovi (kratko = prikaz u izborniku, naziv = naziv u tekstovima i PDF-u).
  // Isti popis kao u assets/js/prijava.js — kad se klub doda/ukloni, promijeniti na oba mjesta.
  const KLUBOVI = [
    { kratko: 'Vis',              naziv: 'Curling klub Vis' },
    { kratko: 'Čudnovati Čunjaš', naziv: 'Curling klub Čudnovati Čunjaš' },
    { kratko: 'Silent',           naziv: 'Curling klub Silent' },
    { kratko: 'Legija Zagreb',    naziv: 'Curling klub Legija Zagreb' },
    { kratko: 'Sisak',            naziv: 'Curling klub Sisak' }
  ];

  // --- Tekstovi obrasca (preuzeti iz obrasca RI-1; mal = maloljetna osoba) ---
  const IZJAVE = [
    'Izjavljujem da prihvaćam Statut i opće akte kluba, te Statut i opće akte Hrvatskog curling saveza.',
    'Izjavljujem da nisam registriran-a niti za jedan drugi klub.'
  ];

  const ZASTITA_NASLOV = 'Zaštita osobnih podataka.';
  const zastita = (mal) =>
    'Obaviješten/a sam da Hrvatski curling savez (voditelj obrade; Vučetićev prilaz 3, Zagreb; info@curling.hr) podatke iz ovog ' +
    'zahtjeva obrađuje radi vođenja Matične knjige registriranih igrača-ica i organizacije natjecanja, na temelju legitimnog ' +
    'interesa Saveza i klubova (čl. 6. st. 1. t. f Opće uredbe o zaštiti podataka) i Registracijskog pravilnika, te da se ime i ' +
    'prezime, klub i rezultati objavljuju na web-stranici Saveza. Podaci o rođenju i adresi ne objavljuju se. Više informacija o ' +
    'obradi i o pravima ispitanika nalazi se u Izjavi o zaštiti podataka na web-stranici Saveza (curling.hr).' +
    (mal ? ' Za igrača-icu mlađeg-u od 18 godina ova se obavijest odnosi i na roditelja ili staratelja.' : '');

  const suglasnostRoditelja = (klub) => `Suglasan sam da se moj sin - kći registrira i nastupa za ${klub ? klub.naziv : 'klub'}.`;
  const SUGLASNOST_NAPOMENA = '(Suglasnost i potpis roditelja za mlađe od 18 godina)';

  // Potvrda kluba. Obrazac je u izvorniku jedan za sve dobi („…a za igrače-ice mlađe od 18 godina…"); ovdje se
  // prema datumu rođenja prikazuje samo ono što se odnosi na tu osobu. Riječ „vlastoručno" uz popunjavanje podataka
  // izostavljena je jer se podaci upisuju na web-stranici (potpis ostaje vlastoručan).
  const potvrdaKluba = (mal) =>
    'Potvrđujem da je igrač-ica popunio-la podatke u Zahtjevu za registraciju i da je vlastoručno potpisao-la istu' +
    (mal ? ', te da je zahtjev supotpisao roditelj ili staratelj' : '') + '. ' +
    'Potvrđujem i da klub raspolaže valjanom liječničkom potvrdom o sposobnosti igrača-ice za bavljenje sportom te potpisanom ' +
    'izjavom o zdravstvenoj sposobnosti i prihvaćanju rizika' + (mal ? ', potpisanom od roditelja ili staratelja' : '') + '. ' +
    'Potvrde ostaju u klubu i ne dostavljaju se Savezu.';

  // ============================================================
  //  Pomoćne funkcije
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const trim = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function formatDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${parseInt(m[3], 10)}. ${parseInt(m[2], 10)}. ${m[1]}.` : '';
  }

  function jeDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }

  function starost(rodjen, ref) {
    let a = ref.getFullYear() - rodjen.getFullYear();
    const m = ref.getMonth() - rodjen.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < rodjen.getDate())) a--;
    return a;
  }

  function bezDijakritika(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'));
  }

  // ============================================================
  //  Inicijalizacija obrasca
  // ============================================================
  const sel = $('klub');
  sel.innerHTML = '<option value="">— odaberite —</option>';
  KLUBOVI.forEach((k) => {
    const o = document.createElement('option');
    o.value = k.kratko;
    o.textContent = k.kratko;
    sel.appendChild(o);
  });

  $('emailHcs').innerHTML = `<a href="mailto:${HCS.email}">${HCS.email}</a>`;

  function klubOdabran() { return KLUBOVI.find((k) => k.kratko === $('klub').value) || null; }

  function maloljetan() {
    const d = jeDatum($('rodjen').value);
    if (!d || d > new Date()) return false;
    return starost(d, new Date()) < MALOLJETAN_DO;
  }

  // Tekstovi se iscrtavaju iznova kad se promijeni dobna skupina ili klub.
  function iscrtaj() {
    const mal = maloljetan();
    const klub = klubOdabran();
    $('kartRoditelj').classList.toggle('hidden', !mal);
    $('hintRodjen').textContent = mal ? 'Igrač-ica je mlađi/a od 18 godina: potreban je i potpis roditelja ili staratelja.' : '';

    const box = $('izjave');
    box.innerHTML = '';
    const dodaj = (html) => { const p = document.createElement('p'); if (html.lead) { const b = document.createElement('strong'); b.textContent = html.lead + ' '; p.appendChild(b); } p.appendChild(document.createTextNode(html.t)); box.appendChild(p); };
    IZJAVE.forEach((t) => dodaj({ lead: '', t, bold: true }));
    box.querySelectorAll('p').forEach((p) => { p.classList.add('izjava-glavna'); });
    dodaj({ lead: ZASTITA_NASLOV, t: zastita(mal) });

    if (mal) {
      const p = document.createElement('p');
      p.innerHTML = '';
      p.appendChild(document.createTextNode(suglasnostRoditelja(klub) + ' '));
      const s = document.createElement('span');
      s.className = 'sitno';
      s.textContent = SUGLASNOST_NAPOMENA;
      p.appendChild(s);
      box.appendChild(p);
    }
    $('potvrdaKluba').textContent = potvrdaKluba(mal);
  }

  ['rodjen', 'klub'].forEach((id) => { $(id).addEventListener('input', iscrtaj); $(id).addEventListener('change', iscrtaj); });
  iscrtaj();

  // ============================================================
  //  Prikupljanje i provjera podataka
  // ============================================================
  function prikupi() {
    const greske = [];
    const err = (poruka, el) => greske.push({ poruka, el });

    const ime = trim($('ime').value);
    const klub = klubOdabran();
    const rodjenISO = $('rodjen').value;
    const rodjen = jeDatum(rodjenISO);
    const drzavljanstvo = trim($('drzavljanstvo').value);
    const roditelj = trim($('roditelj').value);
    const ovlastena = trim($('ovlastena').value);

    if (!ime) err('Upišite ime i prezime igrača-ice.', $('ime'));
    else if (!/\s/.test(ime)) err('Upišite i ime i prezime igrača-ice.', $('ime'));
    if (!klub) err('Odaberite curling klub.', $('klub'));
    if (!rodjen) err('Upišite datum rođenja.', $('rodjen'));
    else if (rodjen > new Date()) err('Datum rođenja ne može biti u budućnosti.', $('rodjen'));
    else if (starost(rodjen, new Date()) > 110) err('Provjerite datum rođenja.', $('rodjen'));
    if (!drzavljanstvo) err('Upišite državljanstvo.', $('drzavljanstvo'));

    const mal = maloljetan();
    return { greske, podaci: { ime, klub, rodjen: rodjenISO, drzavljanstvo, mal, roditelj: mal ? roditelj : '', ovlastena } };
  }

  // ============================================================
  //  PDF (jedna A4 stranica)
  // ============================================================
  let logoCache;
  async function ucitajLogo() {
    if (logoCache !== undefined) return logoCache;
    try {
      const r = await fetch('../assets/images/hcs-logo.png');
      if (!r.ok) throw new Error('logo');
      const blob = await r.blob();
      logoCache = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      logoCache = null;   // PDF se izrađuje i bez logotipa
    }
    return logoCache;
  }

  // Fontovi (Liberation Sans, podskup s hrvatskim slovima): standardni PDF fontovi nemaju č, ć, đ, š, ž.
  const FONT_DATOTEKE = {
    regular: '../assets/fonts/liberation-sans-subset-regular.ttf',
    bold:    '../assets/fonts/liberation-sans-subset-bold.ttf',
    italic:  '../assets/fonts/liberation-sans-subset-italic.ttf'
  };
  let fontCache = null;
  async function ucitajFontove() {
    if (fontCache) return fontCache;
    const dohvati = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Nije moguće učitati font (' + url + ').');
      const bytes = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const [regular, bold, italic] = await Promise.all([FONT_DATOTEKE.regular, FONT_DATOTEKE.bold, FONT_DATOTEKE.italic].map(dohvati));
    fontCache = { regular, bold, italic };
    return fontCache;
  }

  function crtaj(p, logo, fontovi, f) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    doc.addFileToVFS('Lib-Regular.ttf', fontovi.regular);
    doc.addFont('Lib-Regular.ttf', 'Lib', 'normal');
    doc.addFileToVFS('Lib-Bold.ttf', fontovi.bold);
    doc.addFont('Lib-Bold.ttf', 'Lib', 'bold');
    doc.addFileToVFS('Lib-Italic.ttf', fontovi.italic);
    doc.addFont('Lib-Italic.ttf', 'Lib', 'italic');

    const L = 20, W = 170, DONJE = 278;
    let y = 14;
    const crna = () => doc.setTextColor(20, 20, 20);
    const tekst = (s, x, yy, opt) => doc.text(s, x, yy, opt);
    const font = (stil, velicina) => { doc.setFont('Lib', stil); doc.setFontSize(velicina); };
    const mm = (pt) => pt * 0.3528;
    const rez = (h) => { if (y + h > DONJE) { doc.addPage(); y = 15; } };

    doc.setProperties({
      title: `${HCS.naslov} — ${p.ime}`,
      subject: `${HCS.obrazac}: ${p.klub.naziv}`,
      author: HCS.naziv,
      creator: HCS.stranica
    });

    // Odlomak s mogućim podebljanim uvodom: [{ t, b }]; vraća se nova vertikalna pozicija.
    function par(x, w, segmenti, velicina, razmak, stil) {
      const sp = (font(stil || 'normal', velicina), doc.getTextWidth(' '));
      const rijeci = [];
      segmenti.forEach((s) => s.t.split(/\s+/).filter(Boolean).forEach((r) => rijeci.push({ t: r, b: !!s.b })));
      const redovi = [];
      let red = [], sir = 0;
      rijeci.forEach((r) => {
        font(r.b ? 'bold' : (stil || 'normal'), velicina);
        const rw = doc.getTextWidth(r.t);
        if (red.length && sir + sp + rw > w) { redovi.push(red); red = []; sir = 0; }
        red.push({ ...r, rw });
        sir += (red.length > 1 ? sp : 0) + rw;
      });
      if (red.length) redovi.push(red);
      const lh = mm(velicina) * razmak;
      rez(redovi.length * lh);
      redovi.forEach((rd) => {
        let cx = x;
        rd.forEach((r) => { font(r.b ? 'bold' : (stil || 'normal'), velicina); crna(); tekst(r.t, cx, y); cx += r.rw + sp; });
        y += lh;
      });
      return y;
    }

    // Mjesto za potpis: crta (prazan prostor iznad nje za potpis), ispod nje naziv, a ispod toga neobavezno ispisano ime.
    function potpis(x0, w0, labela, ime, visina) {
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25);
      const yl = y + visina;
      doc.line(x0, yl, x0 + w0, yl);
      font('normal', 9 * f); crna();
      let kraj = yl + 4.2 * f;
      tekst(labela, x0 + w0 / 2, kraj, { align: 'center' });
      if (ime) { font('bold', 8.5 * f); kraj += 4 * f; tekst(ime, x0 + w0 / 2, kraj, { align: 'center' }); }
      return kraj;
    }

    // --- zaglavlje: logotip lijevo, oznaka obrasca desno, naziv i adresa Saveza ---
    if (logo) { try { doc.addImage(logo, 'PNG', L, y, 24 * f, 24 * f); } catch (e) { /* bez logotipa */ } }
    font('bold', 9.5); crna();
    tekst(HCS.obrazac, L + W, y + 12 * f, { align: 'right' });
    y += 24 * f + 4 * f;
    font('bold', 10); tekst(HCS.naziv, L, y); y += 4.6;
    tekst(HCS.adresa, L, y);
    y += 12 * f;

    // --- naslov ---
    font('bold', 13 * f);
    tekst(HCS.naslov, L + W / 2, y, { align: 'center' });
    y += 11 * f;

    // --- podaci (naziv polja lijevo, upisani podatak na crti) ---
    const polja = [['Ime i prezime:', p.ime], ['Curling klub:', p.klub.naziv], ['Datum rođenja:', formatDatum(p.rodjen)], ['Državljanstvo:', p.drzavljanstvo]];
    const xp = L + 42;
    polja.forEach(([naziv, vrijednost]) => {
      font('normal', 10.5 * f); crna();
      tekst(naziv, L + 4, y);
      font('normal', 11 * f); crna();
      tekst(vrijednost, xp + 1.5, y - 0.6);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
      doc.line(xp, y + 1.2, L + W, y + 1.2);
      y += 9.5 * f;
    });
    y += 3 * f;

    // --- izjave ---
    IZJAVE.forEach((t) => { par(L, W, [{ t, b: true }], 10.5 * f, 1.3); y += 2.6 * f; });
    y += 0.8 * f;
    par(L, W, [{ t: ZASTITA_NASLOV, b: true }, { t: zastita(p.mal) }], 8.5 * f, 1.35);
    y += 6 * f;

    // --- mjesto, datum i potpis igrača-ice ---
    const VIS = 15 * f, KX = L + 100, KW = W - 100;
    rez(VIS + 14);
    font('normal', 9.5 * f); crna();
    tekst('U ___________________, dne. ______________', L, y + VIS);
    y = potpis(KX, KW, 'Potpis igrača-ice', '', VIS) + 9 * f;

    // --- suglasnost roditelja/staratelja (samo za mlađe od 18 godina) ---
    if (p.mal) {
      rez(VIS + 14);
      const y0 = y;
      par(L, 92, [{ t: suglasnostRoditelja(p.klub) }], 10.5 * f, 1.3);
      font('normal', 8.5 * f); crna();
      tekst(SUGLASNOST_NAPOMENA, L, y); y += mm(8.5 * f) * 1.3;
      const yk = y;
      y = y0;
      const kraj = potpis(KX, KW, 'Potpis roditelja ili staratelja', p.roditelj, VIS);
      y = Math.max(yk, kraj) + 9 * f;
    }

    // --- potvrda kluba ---
    rez(VIS + 34);
    par(L, W, [{ t: potvrdaKluba(p.mal) }], 10 * f, 1.4);
    y += 2 * f;
    rez(VIS + 12);
    y = potpis(KX, KW, 'Ovlaštena osoba kluba', p.ovlastena, VIS);

    // --- podnožje ---
    const sad = new Date();
    const p2 = (v) => String(v).padStart(2, '0');
    const vrijeme = `${sad.getDate()}. ${sad.getMonth() + 1}. ${sad.getFullYear()}. ${p2(sad.getHours())}:${p2(sad.getMinutes())}`;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25);
      doc.line(L, 284, L + W, 284);
      font('normal', 7.5); doc.setTextColor(110, 110, 110);
      tekst(`Izrađeno na ${HCS.stranica}, ${vrijeme}`, L, 288.3);
      if (n > 1) tekst(`stranica ${i}/${n}`, L + W, 288.3, { align: 'right' });
    }
    return doc;
  }

  async function izradiPdf(p) {
    const logo = await ucitajLogo();
    const fontovi = await ucitajFontove();
    let doc = null;
    // Pokušaj stati na jednu A4 stranicu: ako ne stane, malo smanji fontove i razmake.
    for (const f of [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7]) {
      doc = crtaj(p, logo, fontovi, f);
      if (doc.getNumberOfPages() === 1) break;
    }
    return doc;
  }

  // Naziv: RI-1-Registracija-<ime i prezime kako je upisano>-<klub>.pdf, npr. RI-1-Registracija-Ivan-Horvat-Vis.pdf
  function nazivDatoteke(p) {
    const dio = (x) => bezDijakritika(String(x)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
    return ['RI-1', 'Registracija', p.ime, p.klub.kratko].map(dio).join('-') + '.pdf';
  }

  // ============================================================
  //  Gumbi
  // ============================================================
  const poruka = $('poruka');
  function prikaziPoruku(vrsta, html) {
    poruka.className = 'poruka ' + vrsta;
    poruka.innerHTML = html;
  }

  $('forma').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
    const { greske, podaci } = prikupi();
    if (greske.length) {
      greske.forEach((g) => g.el && g.el.classList.add('invalid'));
      const li = greske.map((g) => `<li>${g.poruka.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`).join('');
      prikaziPoruku('err', `<strong>Obrazac još nije potpun:</strong><ul>${li}</ul>`);
      const prvi = greske.find((g) => g.el);
      if (prvi) { prvi.el.focus(); prvi.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    const btn = $('btnPdf');
    btn.disabled = true;
    try {
      if (!window.jspdf) throw new Error('Nedostaje biblioteka za PDF.');
      const doc = await izradiPdf(podaci);
      const ime = nazivDatoteke(podaci);
      doc.save(ime);
      const stranica = doc.getNumberOfPages();
      prikaziPoruku('ok', `<strong>PDF je izrađen (${ime}).</strong>Ispišite ga, potpišite` +
        (podaci.mal ? ' (igrač-ica, roditelj ili staratelj i ovlaštena osoba kluba)' : ' (igrač-ica i ovlaštena osoba kluba)') +
        ` te pošaljite Savezu e-poštom (sken ili fotografija) na <a href="mailto:${HCS.email}">${HCS.email}</a>.` +
        (stranica > 1 ? ' Napomena: sadržaj nije stao na jednu stranicu.' : ''));
    } catch (err) {
      prikaziPoruku('err', '<strong>PDF nije moguće izraditi.</strong>' + (err && err.message ? err.message : ''));
    } finally {
      btn.disabled = false;
    }
  });

  $('btnOcisti').addEventListener('click', () => {
    if (!window.confirm('Obrisati sve upisane podatke?')) return;
    $('forma').reset();
    iscrtaj();
    poruka.className = 'poruka';
    poruka.innerHTML = '';
    document.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
  });

  // Uklanja crveni rub čim se polje počne ispravljati.
  document.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
  document.addEventListener('change', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
})();
