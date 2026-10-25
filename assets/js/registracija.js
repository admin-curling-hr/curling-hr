// registracija.js — obrazac „Zahtjev za registraciju igrača" (stranica /registracija/, bez poveznice u izborniku).
// Zahtjev podnosi KLUB: ovlaštena osoba kluba upiše podatke, označi potvrdu kluba, preuzme PDF (jedna A4 stranica)
// i pošalje ga Savezu e-poštom s adrese kluba. Ispis i potpisi nisu potrebni (kao kod prijave ekipe, /prijava/).
// Pristupnicu igrača (za maloljetne i s potpisom roditelja ili skrbnika) čuva klub i predočuje je Savezu na zahtjev;
// uvjerenje o zdravstvenoj sposobnosti provjerava se pri nastupu na natjecanju (Pravilnik o registraciji, čl. 6).
// Podaci se upisuju samo u pregledniku; PDF se izrađuje na uređaju pomoću jsPDF (assets/vendor/jspdf) i fonta
// s hrvatskim slovima (assets/fonts/liberation-sans-subset-*.ttf). Ništa se ne šalje niti sprema.
//
// Što se mijenja na jednom mjestu (CONFIG ispod): podaci Saveza i e-adresa, popis klubova te svi tekstovi
// (obavijest o zaštiti podataka, točke potvrde kluba i tekst potvrde). Za maloljetne (prema datumu rođenja)
// potvrda kluba dobiva dodatne rečenice o roditelju ili skrbniku; podaci o roditelju se ne prikupljaju.

(function () {
  'use strict';

  // ============================================================
  //  CONFIG
  // ============================================================
  const HCS = {
    naziv: 'Hrvatski curling savez',
    adresa: 'Zagreb, Vučetićev prilaz 3/11',
    email: 'tajnik@curling.hr',                 // na ovu adresu klubovi šalju PDF zahtjeva
    stranica: 'curling.hr/registracija/',
    naslov: 'Zahtjev za registraciju igrača'
  };

  // Napomena o rodu (kao čl. 1. Pravilnika o registraciji): prikazuje se u sekciji 1 i ispisuje u PDF-u ispod naslova.
  const NAPOMENA_ROD = 'Izrazi u ovom obrascu koji imaju rodno značenje odnose se jednako na muški i ženski rod.';

  const MALOLJETAN_DO = 18;   // mlađi od ovoga: potvrda kluba uključuje rečenice o roditelju ili skrbniku

  // Aktivni klubovi (kratko = prikaz u izborniku, naziv = naziv u tekstovima i PDF-u).
  // Isti popis kao u assets/js/prijava.js — kad se klub doda/ukloni, promijeniti na oba mjesta.
  const KLUBOVI = [
    { kratko: 'Vis',              naziv: 'Curling klub Vis' },
    { kratko: 'Čudnovati Čunjaš', naziv: 'Curling klub Čudnovati Čunjaš' },
    { kratko: 'Silent',           naziv: 'Curling klub Silent' },
    { kratko: 'Legija Zagreb',    naziv: 'Curling klub Legija Zagreb' },
    { kratko: 'Sisak',            naziv: 'Curling klub Sisak' }
  ];

  // --- Sekcija 2: obavijest Saveza o obradi podataka (čl. 14. GDPR-a: podaci se dobivaju od kluba) ---
  const ZASTITA_NASLOV = 'Zaštita osobnih podataka';
  const ZASTITA =
    'Hrvatski curling savez (Vučetićev prilaz 3, Zagreb; info@curling.hr) kao voditelj obrade obrađuje podatke iz ovog ' +
    'zahtjeva (ime i prezime, datum rođenja, državljanstvo i klub igrača te ime i prezime ovlaštene osobe kluba) radi ' +
    'registracije i vođenja Matične knjige registriranih igrača, provjere prava nastupa i organizacije natjecanja te vođenja ' +
    'rezultata i sportske statistike, na temelju Pravilnika o registraciji i legitimnog interesa Saveza i klubova (čl. 6. st. 1. ' +
    't. f Opće uredbe o zaštiti podataka). Podatke Savez dobiva od kluba. Ime i prezime, registarski broj, klub i sportski ' +
    'rezultati objavljuju se na mrežnim stranicama Saveza; datum rođenja i državljanstvo ne objavljuju se. Više o obradi, ' +
    'rokovima čuvanja i pravima ispitanika nalazi se u Izjavi o zaštiti podataka na mrežnim stranicama Saveza (curling.hr), ' +
    'a prava se ostvaruju na info@curling.hr.';

  // --- Sekcija 3: potvrda kluba (mal = igrač mlađi od 18 godina) ---
  // Usklađeno s Pravilnikom o registraciji (čl. 3, 5, 6, 11). Svaka točka: naslov + tekst; tekst je funkcija dobi.
  // Jednu registraciju po igraču (čl. 5) i prijelaz (čl. 11) provjerava Savez u Matičnoj knjizi, pa ih klub ne potvrđuje.
  const POTVRDE_NASLOV = 'Potvrda kluba';
  const POTVRDE = [
    { naslov: 'Članstvo i pristanak',
      tekst: (mal) => 'Igrač je član kluba. U pristupnici kluba pristao je na registraciju u Hrvatskom curling savezu ' +
        'i prihvatio Statut i opće akte Saveza.' +
        (mal ? ' Budući da je igrač mlađi od 18 godina, pristupnicu je potpisao i roditelj ili skrbnik, koji je suglasan ' +
               's registracijom i nastupima za klub.' : '') },
    { naslov: 'Točnost podataka',
      tekst: () => 'Podaci u zahtjevu su točni i odgovaraju podacima iz pristupnice. Klub odgovara za njihovu istinitost i bez ' +
        'odgode će Savezu javiti svaku promjenu.' },
    { naslov: 'Zdravstvena sposobnost',
      tekst: () => 'Klub je upoznat da igrač smije nastupiti na natjecanju samo s valjanim uvjerenjem o zdravstvenoj ' +
        'sposobnosti sportaša, u skladu s Pravilnikom o natjecanjima.' },
    { naslov: 'Obavijest o obradi podataka',
      tekst: (mal) => 'Klub je igrača' + (mal ? ' i roditelja ili skrbnika' : '') + ' upoznao s obradom osobnih podataka ' +
        'u Savezu opisanom u ovom zahtjevu.' },
    { naslov: 'Pristupnica',
      tekst: () => 'Pristupnicu igrača čuva klub. Savezu se ne dostavlja, a klub je predočuje na zahtjev Saveza.' },
    { naslov: 'Ovlaštenje',
      tekst: () => 'Zahtjev podnosi ovlaštena osoba kluba prijavljena Savezu, s adrese elektroničke pošte koju je klub prijavio ' +
        'Savezu.' }
  ];
  const POTVRDA_KUCICA = 'Kao ovlaštena osoba kluba potvrđujem da sam pročitao gornje točke te ih u ime kluba potvrđujem i prihvaćam.';

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

  function danas() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

  $('napomenaRod').textContent = NAPOMENA_ROD;
  $('emailHcs').innerHTML = `<a href="mailto:${HCS.email}">${HCS.email}</a>`;
  $('datum').value = danas();
  $('zastitaNaslov').textContent = ZASTITA_NASLOV;
  $('zastita').textContent = ZASTITA;
  $('potvrdaNaslov').textContent = POTVRDE_NASLOV;
  $('slazemTekst').textContent = POTVRDA_KUCICA;

  function klubOdabran() { return KLUBOVI.find((k) => k.kratko === $('klub').value) || null; }

  function maloljetan() {
    const d = jeDatum($('rodjen').value);
    if (!d || d > new Date()) return false;
    return starost(d, new Date()) < MALOLJETAN_DO;
  }

  // Točke potvrde kluba iscrtavaju se iznova kad se promijeni datum rođenja (punoljetan/maloljetan).
  function iscrtaj() {
    const mal = maloljetan();
    $('hintRodjen').textContent = mal
      ? 'Igrač je mlađi od 18 godina: klub u potvrdi (sekcija 3) potvrđuje i suglasnost roditelja ili skrbnika.'
      : '';
    const box = $('potvrde');
    box.innerHTML = '';
    POTVRDE.forEach((t, i) => {
      const p = document.createElement('p');
      const b = document.createElement('strong');
      b.textContent = `${i + 1}. ${t.naslov}. `;
      p.appendChild(b);
      p.appendChild(document.createTextNode(t.tekst(mal)));
      box.appendChild(p);
    });
  }

  ['rodjen'].forEach((id) => { $(id).addEventListener('input', iscrtaj); $(id).addEventListener('change', iscrtaj); });
  iscrtaj();

  // ============================================================
  //  Prikupljanje i provjera podataka
  // ============================================================
  function prikupi() {
    const greske = [];
    const err = (poruka, el) => greske.push({ poruka, el });

    const klub = klubOdabran();
    const ime = trim($('ime').value);
    const prezime = trim($('prezime').value);
    const rodjenISO = $('rodjen').value;
    const rodjen = jeDatum(rodjenISO);
    const drzavljanstvo = trim($('drzavljanstvo').value);
    const datum = $('datum').value;
    const ovlastena = trim($('ovlastena').value);

    if (!klub) err('Odaberite klub koji podnosi zahtjev.', $('klub'));
    if (!ime) err('Upišite ime igrača.', $('ime'));
    if (!prezime) err('Upišite prezime igrača.', $('prezime'));
    if (!rodjen) err('Upišite datum rođenja.', $('rodjen'));
    else if (rodjen > new Date()) err('Datum rođenja ne može biti u budućnosti.', $('rodjen'));
    else if (starost(rodjen, new Date()) > 110) err('Provjerite datum rođenja.', $('rodjen'));
    if (!drzavljanstvo) err('Upišite državljanstvo.', $('drzavljanstvo'));
    if (!$('slazem').checked) err('Označite potvrdu kluba (sekcija 3).', $('slazem'));
    if (!jeDatum(datum)) err('Odaberite datum.', $('datum'));
    if (!ovlastena) err('Upišite ime i prezime ovlaštene osobe kluba.', $('ovlastena'));
    else if (!/\s/.test(ovlastena)) err('Upišite i ime i prezime ovlaštene osobe kluba.', $('ovlastena'));

    const mal = maloljetan();
    return { greske, podaci: { klub, ime, prezime, rodjen: rodjenISO, drzavljanstvo, mal, datum, ovlastena } };
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
    const imePrezime = `${p.ime} ${p.prezime}`;

    doc.setProperties({
      title: `${HCS.naslov} — ${imePrezime}`,
      subject: p.klub.naziv,
      author: p.klub.naziv,
      creator: HCS.stranica
    });

    // Odlomak s mogućim podebljanim uvodom: [{ t, b }].
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

    // Polje: naziv lijevo, upisani podatak na crti.
    function polje(naziv, vrijednost, xNaziv, xCrta, xKraj) {
      font('normal', 10.5 * f); crna();
      tekst(naziv, xNaziv, y);
      font('bold', 11 * f); crna();
      tekst(vrijednost, xCrta + 1.5, y - 0.6);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
      doc.line(xCrta, y + 1.2, xKraj, y + 1.2);
    }

    function naslovSekcije(s) {
      rez(8 * f);
      font('bold', 10 * f); doc.setTextColor(153, 0, 0);
      tekst(s.toUpperCase(), L, y);
      doc.setDrawColor(153, 0, 0); doc.setLineWidth(0.3);
      doc.line(L, y + 1.3, L + W, y + 1.3);
      y += 6 * f;
    }

    // --- zaglavlje: logotip, naziv i adresa Saveza ---
    if (logo) { try { doc.addImage(logo, 'PNG', L, y, 22 * f, 22 * f); } catch (e) { /* bez logotipa */ } }
    crna();
    y += 22 * f + 4 * f;
    font('bold', 10); tekst(HCS.naziv, L, y); y += 4.6;
    font('normal', 10); tekst(HCS.adresa, L, y);
    y += 11 * f;

    // --- naslov ---
    font('bold', 13 * f); crna();
    tekst(HCS.naslov, L + W / 2, y, { align: 'center' });
    y += 5.5 * f;
    font('italic', 8 * f); doc.setTextColor(90, 90, 90);
    tekst(NAPOMENA_ROD, L + W / 2, y, { align: 'center' });
    y += 7.5 * f;

    // --- 1. klub i igrač ---
    naslovSekcije('1. Klub i igrač');
    const xp = L + 42;
    polje('Klub podnositelj:', p.klub.naziv, L + 2, xp, L + W);
    y += 9 * f;
    const polja = [['Ime:', p.ime], ['Prezime:', p.prezime], ['Datum rođenja:', formatDatum(p.rodjen)], ['Državljanstvo:', p.drzavljanstvo]];
    polja.forEach(([naziv, vrijednost]) => { polje(naziv, vrijednost, L + 2, xp, L + W); y += 9 * f; });
    y += 2 * f;

    // --- 2. zaštita osobnih podataka ---
    naslovSekcije('2. ' + ZASTITA_NASLOV);
    par(L, W, [{ t: ZASTITA }], 8.5 * f, 1.35);
    y += 5 * f;

    // --- 3. potvrda kluba ---
    naslovSekcije('3. ' + POTVRDE_NASLOV);
    POTVRDE.forEach((t, i) => {
      par(L, W, [{ t: `${i + 1}. ${t.naslov}.`, b: true }, { t: t.tekst(p.mal) }], 8.8 * f, 1.32);
      y += 1.6 * f;
    });
    y += 2.5 * f;

    // označena potvrda (kućica s kvačicom nacrtana linijama)
    {
      font('bold', 9 * f);
      const kv = 3.6 * f, lh = mm(9 * f) * 1.3;
      const redovi = doc.splitTextToSize(POTVRDA_KUCICA, W - kv - 3);
      const vis = Math.max(kv, redovi.length * lh);
      rez(vis + 2);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
      doc.rect(L, y - kv + 0.8, kv, kv);
      doc.setLineWidth(0.5);
      doc.line(L + kv * 0.2, y - kv * 0.45 + 0.8, L + kv * 0.43, y - kv * 0.12 + 0.8);
      doc.line(L + kv * 0.43, y - kv * 0.12 + 0.8, L + kv * 0.85, y - kv * 0.85 + 0.8);
      crna();
      redovi.forEach((red, i) => tekst(red, L + kv + 3, y + i * lh));
      y += vis;
    }

    // --- datum i ovlaštena osoba kluba (zahtjev se šalje e-poštom, bez crte za potpis) ---
    y += 9 * f;
    rez(10);
    polje('Datum:', formatDatum(p.datum), L, L + 15, L + 52);
    polje('Ovlaštena osoba kluba:', p.ovlastena, L + 62, L + 104, L + W);

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

  // Naziv: Registracija-<ime>-<prezime>-<klub>.pdf, npr. Registracija-Ivan-Horvat-Vis.pdf
  function nazivDatoteke(p) {
    const dio = (x) => bezDijakritika(String(x)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
    return ['Registracija', p.ime, p.prezime, p.klub.kratko].map(dio).join('-') + '.pdf';
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
      prikaziPoruku('ok', `<strong>PDF je izrađen (${ime}).</strong>Pošaljite ga Savezu e-poštom s adrese kluba na ` +
        `<a href="mailto:${HCS.email}">${HCS.email}</a>. Ispis i potpis nisu potrebni.` +
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
    $('datum').value = danas();
    iscrtaj();
    poruka.className = 'poruka';
    poruka.innerHTML = '';
    document.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
  });

  // Uklanja crveni rub čim se polje počne ispravljati.
  document.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
  document.addEventListener('change', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
})();
