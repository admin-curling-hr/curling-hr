// prijava.js — obrazac za prijavu ekipe (stranica /prijava/, bez poveznice u izborniku).
// Podaci se upisuju samo u pregledniku; PDF (jedna A4 stranica) izrađuje se na uređaju pomoću jsPDF
// (assets/vendor/jspdf) i fonta s hrvatskim slovima (assets/fonts/liberation-sans-subset-*.ttf). Ništa se ne šalje niti sprema.
//
// Što se mijenja na jednom mjestu (CONFIG ispod): natjecanja, discipline s pozicijama igrača, uzrasti,
// raspon sezona, popis aktivnih klubova, e-adresa Saveza te tekstovi pojašnjenja i zaštite podataka.

(function () {
  'use strict';

  // ============================================================
  //  CONFIG
  // ============================================================
  const HCS = {
    naziv: 'Hrvatski curling savez',
    adresa: 'Zagreb, Vučetićev prilaz 3/11',
    email: 'natjecanja@curling.hr',            // na ovu adresu klubovi šalju PDF
    stranica: 'curling.hr/prijava/'
  };

  // Novo natjecanje (npr. kup): dodati još jedan redak. "naslov" je naslov obrasca u PDF-u, "kratica" ulazi u
  // naziv datoteke, "pravila" su napomene ispod tablica (iza prvog retka koji ovisi o disciplini).
  const NATJECANJA = [
    { id: 'ph', naziv: 'Prvenstvo Hrvatske u curlingu', kratica: 'PHC', naslov: 'Inicijalna prijava ekipe',
      pravila: [
        'Ekipa se može sastojati i od igrača iz drugih klubova, uz obaveznu suglasnost tih klubova.',
        'Svi prijavljeni igrači moraju biti registrirani u Matičnoj knjizi igrača HCS-a.',
        'Klub može prijaviti proizvoljan broj ekipa.',
        'Tijekom cijelog prvenstva u pojedinom natjecanju igrač smije igrati samo za jednu ekipu.'
      ] }
  ];

  // pozicije: redoslijed unosa; "obavezno: false" = nije obavezno popuniti (npr. rezerva).
  // skip: true = obavezno označiti skipa i vice-skipa (kod mješovitih parova ta uloga ne postoji).
  // uvod: prvi redak napomena ispod tablica (broj igrača).
  const DISCIPLINE = [
    { id: 'M',  kod: 'M',  naziv: 'Muškarci', skip: true,
      uvod: 'Klub za natjecanje inicijalno prijavljuje ekipu s najmanje 4, a najviše s 5 igrača.',
      pozicije: [ { n: 'Četvrti' }, { n: 'Treći' }, { n: 'Drugi' }, { n: 'Prvi' }, { n: 'Rezerva', obavezno: false } ] },
    { id: 'Z',  kod: 'Ž',  naziv: 'Žene', skip: true,
      uvod: 'Klub za natjecanje inicijalno prijavljuje ekipu s najmanje 4, a najviše s 5 igrača.',
      pozicije: [ { n: 'Četvrta' }, { n: 'Treća' }, { n: 'Druga' }, { n: 'Prva' }, { n: 'Rezerva', obavezno: false } ] },
    { id: 'MC', kod: 'MC', naziv: 'Mješoviti curling', skip: true,
      uvod: 'Klub za natjecanje inicijalno prijavljuje ekipu s 4 igrača.',
      pozicije: [ { n: 'Četvrti/a' }, { n: 'Treći/a' }, { n: 'Drugi/a' }, { n: 'Prvi/a' } ] },
    { id: 'MP', kod: 'MP', naziv: 'Mješoviti parovi', skip: false,
      uvod: 'Klub za natjecanje inicijalno prijavljuje ekipu od 2 igrača (žena i muškarac).',
      pozicije: [ { n: 'Žena' }, { n: 'Muškarac' } ] }
  ];

  const UZRASTI = [
    { id: 'S', naziv: 'Seniori' },
    { id: 'J', naziv: 'Juniori' },
    { id: 'V', naziv: 'Veterani' }
  ];

  // Pojašnjenje uzrasta: prikazuje se ispod izbornika na stranici i kao fusnota uz „Uzrast" u PDF-u.
  const UZRAST_POJASNJENJE = [
    'Juniori su igrači koji još nemaju 21 godinu na dan 30.6. prije natjecanja.',
    'Seniori nemaju dobno ograničenje.',
    'Veterani su igrači koji imaju 50 godina na dan 30.6. prije natjecanja.'
  ];

  // Napomena iznad tablice sastava (web i PDF); prikazuje se za discipline s ulogama (M, Ž, MC).
  const NAPOMENA_POZICIJE = 'U svakoj utakmici prvenstva ekipa može promijeniti pozicije i uloge svih igrača prijavljenih u ovoj inicijalnoj prijavi.';

  const SEZONA_OD = 2026;   // prva sezona: 2026-2027
  const SEZONA_DO = 2039;   // zadnja sezona: 2039-2040

  // Aktivni klubovi (kratko = prikaz u izborniku, naziv = naziv u PDF-u).
  const KLUBOVI = [
    { kratko: 'Vis',              naziv: 'Curling klub Vis' },
    { kratko: 'Čudnovati Čunjaš', naziv: 'Curling klub Čudnovati Čunjaš' },
    { kratko: 'Silent',           naziv: 'Curling klub Silent' },
    { kratko: 'Legija Zagreb',    naziv: 'Curling klub Legija Zagreb' },
    { kratko: 'Sisak',            naziv: 'Curling klub Sisak' }
  ];

  // Izjave i suglasnosti: prikazuju se u sekciji 5 (iznad datuma i predstavnika) i ispisuju u PDF-u.
  // Predstavnik kluba mora označiti potvrdu (IZJAVA_POTVRDA) da bi mogao preuzeti PDF.
  // Tekstove po potrebi mijenjati ovdje; ne diraju se ostatak koda ni raspored PDF-a.
  const IZJAVE_NASLOV = 'Izjave i suglasnosti';
  const IZJAVE = [
    { naslov: 'Ovlaštenje i točnost podataka',
      tekst: 'Predstavnik kluba ovlašten je prijaviti ekipu u ime kluba. Podaci u obrascu su točni, a svi prijavljeni igrači upoznati su s prijavom i pristali su nastupiti u ekipi.' },
    { naslov: 'Zaštita osobnih podataka',
      tekst: 'Podatke iz obrasca (ime i prezime igrača, registarski broj, klub, ime trenera i predstavnika kluba) obrađuje Hrvatski curling savez kao voditelj obrade radi organizacije natjecanja. Ime i prezime, klub i ekipa objavljuju se u sastavima, rezultatima i sportskom arhivu, u skladu s Izjavom o zaštiti podataka objavljenoj na internetskim stranicama Saveza. Klub je o tome obavijestio igrače i trenera, a za maloljetne igrače pribavio je privolu roditelja ili skrbnika za objavu imena, fotografija i videozapisa. Prava (pristup, ispravak, brisanje, povlačenje privole) ostvaruju se na info@curling.hr.' },
    { naslov: 'Zdravstvena sposobnost',
      tekst: 'Klub se obvezuje da će svaki prijavljeni igrač imati valjano uvjerenje o zdravstvenoj sposobnosti sportaša prema Zakonu o sportu i da će je predočiti povjereniku natjecanja najkasnije prilikom prijave na pojedinu utakmicu; bez nje igrač ne smije nastupiti.' },
    { naslov: 'Odgovornost, ozljede i osiguranje',
      tekst: 'Igrači nastupaju na vlastitu odgovornost. Klub je upoznat da Savez ne odgovara za ozljede i štetu koje igrači ili drugi sudionici pretrpe ili uzrokuju tijekom natjecanja, putovanja i boravka te da su osiguranje od nezgode i osiguranje od odgovornosti za štetu briga igrača.' },
    { naslov: 'Obveze kluba',
      tekst: 'Klub se obvezuje pridržavati Pravilnika o natjecanjima, službenih pravila curlinga Svjetske curling federacije, propozicija natjecanja i odluka povjerenika natjecanja; kotizaciju platiti u zadanom roku (bez uplate ekipa ne može nastupiti) te sam snositi putne troškove, troškove smještaja i ostale troškove ekipe, osim onih koje prema odluci Upravnog odbora podmiruje Savez.' }
  ];
  const IZJAVA_POTVRDA = 'Kao predstavnik kluba potvrđujem da sam pročitao/la gornje izjave te ih u ime kluba primam na znanje i prihvaćam.';

  // ============================================================
  //  Pomoćne funkcije
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const trim = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function opcije(sel, lista, prazno, valFn, lblFn) {
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = prazno;
    sel.appendChild(o0);
    lista.forEach((x) => {
      const o = document.createElement('option');
      o.value = valFn(x);
      o.textContent = lblFn(x);
      sel.appendChild(o);
    });
  }

  function formatDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${parseInt(m[3], 10)}. ${parseInt(m[2], 10)}. ${m[1]}.` : '';
  }

  function danas() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function bezDijakritika(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd');
  }

  // ============================================================
  //  Inicijalizacija obrasca
  // ============================================================
  const sezone = [];
  for (let g = SEZONA_OD; g <= SEZONA_DO; g++) sezone.push(`${g}-${g + 1}`);

  opcije($('natjecanje'), NATJECANJA, '— odaberite —', (x) => x.id, (x) => x.naziv);
  opcije($('disciplina'), DISCIPLINE, '— odaberite —', (x) => x.id, (x) => x.naziv);
  opcije($('uzrast'), UZRASTI, '— odaberite —', (x) => x.id, (x) => x.naziv);
  opcije($('sezona'), sezone, '— odaberite —', (x) => x, (x) => x);
  opcije($('klub'), KLUBOVI, '— odaberite —', (x) => x.kratko, (x) => x.kratko);
  if (NATJECANJA.length === 1) $('natjecanje').value = NATJECANJA[0].id;   // jedino natjecanje je već odabrano

  $('datum').value = danas();
  $('emailHcs').innerHTML = `<a href="mailto:${HCS.email}">${HCS.email}</a>`;

  $('hintUzrast').textContent = UZRAST_POJASNJENJE.join('\n');
  $('izjaveNaslov').textContent = IZJAVE_NASLOV;
  IZJAVE.forEach((iz, i) => {
    const d = document.createElement('p');
    const b = document.createElement('strong');
    b.textContent = `${i + 1}. ${iz.naslov}. `;
    d.appendChild(b);
    d.appendChild(document.createTextNode(iz.tekst));
    $('izjaveBlok').appendChild(d);
  });
  $('slazemTekst').textContent = IZJAVA_POTVRDA;

  // ============================================================
  //  Igrači (ovisno o disciplini)
  // ============================================================
  function disciplina() { return DISCIPLINE.find((d) => d.id === $('disciplina').value) || null; }

  function procitajIgrace() {
    return [...document.querySelectorAll('#igraci .igrac')].map((r) => ({
      ime: r.querySelector('.in-ime').value,
      klub: r.querySelector('.in-klub').value,
      reg: r.querySelector('.in-reg').value,
      skip: !!(r.querySelector('.in-skip') && r.querySelector('.in-skip').checked),
      vice: !!(r.querySelector('.in-vice') && r.querySelector('.in-vice').checked)
    }));
  }

  let prethodnaDisc = null;

  function iscrtajIgrace() {
    const box = $('igraci');
    const d = disciplina();
    const staro = procitajIgrace();
    const staroDisc = prethodnaDisc;
    prethodnaDisc = d;

    if (!d) {
      box.className = 'igraci';
      box.innerHTML = '<p class="prazno-igraci">Odaberite disciplinu da biste mogli upisati sastav ekipe.</p>';
      $('napomenaSastav').textContent = '';
      return;
    }

    const uloge = d.skip;
    $('napomenaSastav').textContent = uloge ? NAPOMENA_POZICIJE : '';
    box.className = 'igraci' + (uloge ? '' : ' bez-uloga');
    const glava = `
      <div class="igraci-head">
        <div>Pozicija</div><div>Ime i prezime</div><div>HCS registarski broj</div>
        ${uloge ? '<div class="c">Skip</div><div class="c">Vice-skip</div>' : ''}
        <div>Klub (ako nije iz kluba koji prijavljuje)</div>
      </div>`;
    const klubOpcije = '<option value="">—</option>' + KLUBOVI.map((k) => `<option value="${k.kratko}">${k.kratko}</option>`).join('');
    // Skip i vice-skip ne mogu biti rezerva, pa te pozicije nemaju kvačice (prazna ćelija drži poravnanje stupaca).
    const retci = d.pozicije.map((p, i) => `
      <div class="igrac" data-i="${i}">
        <div class="poz">${p.n}<small>${p.obavezno === false ? 'neobavezno' : ''}</small></div>
        <div class="f-ime"><span class="m-lbl">Ime i prezime</span>
          <input type="text" class="in-ime" maxlength="80" aria-label="Ime i prezime: ${p.n}"></div>
        <div class="f-reg"><span class="m-lbl">HCS registarski broj</span>
          <input type="text" class="in-reg" maxlength="10" inputmode="numeric" aria-label="Registarski broj iz Matične knjige igrača: ${p.n}"></div>
        ${uloge ? (p.obavezno === false ? `
        <div class="chk chk-prazno"></div><div class="chk chk-prazno"></div>` : `
        <label class="chk"><span class="m-lbl">Skip</span><input type="checkbox" class="in-skip" aria-label="Skip: ${p.n}"></label>
        <label class="chk"><span class="m-lbl">Vice-skip</span><input type="checkbox" class="in-vice" aria-label="Vice-skip: ${p.n}"></label>`) : ''}
        <div class="f-klub"><span class="m-lbl">Klub (samo ako igrač nije iz kluba koji prijavljuje)</span>
          <select class="in-klub" aria-label="Klub igrača, ako nije iz kluba koji prijavljuje: ${p.n}">${klubOpcije}</select></div>
      </div>`).join('');
    box.innerHTML = glava + retci;

    // Pri promjeni discipline s istom vrstom unosa (muškarci/žene/mješoviti curling) zadrži već upisano.
    if (staroDisc && staroDisc.skip === d.skip) {
      box.querySelectorAll('.igrac').forEach((r, i) => {
        const s = staro[i];
        if (!s) return;
        r.querySelector('.in-ime').value = s.ime;
        r.querySelector('.in-klub').value = s.klub;
        r.querySelector('.in-reg').value = s.reg;
        const cs = r.querySelector('.in-skip'), cv = r.querySelector('.in-vice');
        if (cs) cs.checked = s.skip;
        if (cv) cv.checked = s.vice;
      });
    }

    osvjeziPravila();
  }

  // Napomene ispod tablica: prvi redak ovisi o disciplini, ostali o natjecanju (isti tekst ide u PDF).
  function pravilaTekst() {
    const d = disciplina();
    const n = NATJECANJA.find((x) => x.id === $('natjecanje').value) || NATJECANJA[0];
    return d ? [d.uvod].concat(n.pravila || []) : [];
  }
  function osvjeziPravila() {
    const lista = pravilaTekst();
    const box = $('pravila');
    box.textContent = lista.join('\n');
    box.classList.toggle('hidden', !lista.length);
  }
  $('natjecanje').addEventListener('change', osvjeziPravila);

  $('disciplina').addEventListener('change', iscrtajIgrace);

  // Skip i vice-skip: najviše jedan od svakog, a isti igrač ne može biti oboje.
  $('igraci').addEventListener('change', (e) => {
    const t = e.target;
    if (!t.classList || !(t.classList.contains('in-skip') || t.classList.contains('in-vice')) || !t.checked) return;
    const ista = t.classList.contains('in-skip') ? 'in-skip' : 'in-vice';
    const druga = ista === 'in-skip' ? 'in-vice' : 'in-skip';
    document.querySelectorAll('#igraci .' + ista).forEach((c) => { if (c !== t) c.checked = false; });
    const red = t.closest('.igrac');
    const d = red && red.querySelector('.' + druga);
    if (d) d.checked = false;
  });

  iscrtajIgrace();

  // ============================================================
  //  Provjera i prikupljanje podataka
  // ============================================================
  function oznaci(el, loseje) { if (el) el.classList.toggle('invalid', !!loseje); }

  function prikupi() {
    document.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));
    const greske = [];       // { poruka, el }
    const err = (poruka, el) => { greske.push({ poruka, el }); oznaci(el, true); };

    const nat = NATJECANJA.find((x) => x.id === $('natjecanje').value);
    const dis = disciplina();
    const uz = UZRASTI.find((x) => x.id === $('uzrast').value);
    const sez = $('sezona').value;
    const klub = KLUBOVI.find((x) => x.kratko === $('klub').value);

    if (!nat) err('Odaberite natjecanje.', $('natjecanje'));
    if (!dis) err('Odaberite disciplinu.', $('disciplina'));
    if (!uz) err('Odaberite uzrast.', $('uzrast'));
    if (!sez) err('Odaberite sezonu.', $('sezona'));
    if (!klub) err('Odaberite klub koji prijavljuje.', $('klub'));

    const ekipa = trim($('ekipa').value);

    const igraci = [];
    if (dis) {
      const redovi = [...document.querySelectorAll('#igraci .igrac')];
      let skipRed = -1, viceRed = -1;
      const viđeniReg = new Map();
      redovi.forEach((r, i) => {
        const p = dis.pozicije[i];
        const ime = trim(r.querySelector('.in-ime').value);
        const kl = trim(r.querySelector('.in-klub').value);
        const reg = trim(r.querySelector('.in-reg').value);
        const sk = !!(r.querySelector('.in-skip') && r.querySelector('.in-skip').checked);
        const vi = !!(r.querySelector('.in-vice') && r.querySelector('.in-vice').checked);
        const obavezno = p.obavezno !== false;
        const upisano = !!(ime || kl || reg || sk || vi);
        const ulogaTekst = sk ? 'Skip' : (vi ? 'Vice-skip' : '');

        if (obavezno || upisano) {
          if (!ime) err(`Upišite ime i prezime igrača: ${p.n}.`, r.querySelector('.in-ime'));
          if (!reg) err(`Upišite HCS registarski broj igrača: ${p.n}${ime ? ' (' + ime + ')' : ''}.`, r.querySelector('.in-reg'));
        }
        if (reg) {
          const k = reg.toLowerCase().replace(/\s+/g, '');
          if (viđeniReg.has(k)) {
            err(`HCS registarski broj ${reg} upisan je dvaput (${viđeniReg.get(k)} i ${p.n}).`, r.querySelector('.in-reg'));
          } else {
            viđeniReg.set(k, p.n);
          }
        }
        if (sk) skipRed = i;
        if (vi) viceRed = i;
        igraci.push({ pozicija: p.n, ime, klub: kl, reg, uloga: ulogaTekst, popunjen: !!ime });
      });
      if (dis.skip && skipRed < 0) {
        err('Označite skipa ekipe.', document.querySelector('#igraci .in-skip'));
      }
      if (dis.skip && viceRed < 0) {
        err('Označite vice-skipa ekipe.', document.querySelector('#igraci .in-vice'));
      }
    }

    if (!$('slazem').checked) err('Potvrdite da ste pročitali izjave i suglasnosti (sekcija 5).', $('slazem'));

    const trener = trim($('trener').value);
    const datum = $('datum').value;
    const predstavnik = trim($('predstavnik').value);
    if (!datum) err('Odaberite datum.', $('datum'));
    if (!predstavnik) err('Upišite ime i prezime predstavnika kluba.', $('predstavnik'));

    return { greske, podaci: { nat, dis, uz, sez, klub, ekipa, igraci, trener, datum, predstavnik } };
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

  // Fontovi (Liberation Sans, podskup s hrvatskim slovima) dohvaćaju se iz assets/fonts/ i drže u memoriji
  // kao base64, jer ih jsPDF tako prima. Standardni PDF fontovi nemaju č, ć, đ, š, ž.
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

    const L = 18, W = 174, DONJE = 276;
    let y = 16;
    const crna = () => doc.setTextColor(20, 20, 20);
    const tekst = (s, x, yy, opt) => doc.text(s, x, yy, opt);
    const font = (stil, velicina) => { doc.setFont('Lib', stil); doc.setFontSize(velicina); };
    const uloge = p.dis.skip;

    doc.setProperties({
      title: `${p.nat.naslov} — ${p.nat.naziv}, ${p.dis.naziv}, ${p.uz.naziv}, ${p.sez}`,
      subject: `${p.nat.naziv} ${p.sez}: ${p.klub.naziv}${p.ekipa ? ', ' + p.ekipa : ''}`,
      author: HCS.naziv,
      creator: HCS.stranica
    });

    // --- zaglavlje: naziv Saveza lijevo (kurziv), logotip desno ---
    font('italic', 11); crna();
    tekst(HCS.naziv, L, y + 7);
    if (logo) { try { doc.addImage(logo, 'PNG', L + W - 19, y - 3, 19, 19); } catch (e) { /* bez logotipa */ } }
    y += 24;

    // --- naslov (središnje poravnat) ---
    const sredina = L + W / 2;
    font('bold', 15 * f); crna();
    tekst(p.nat.naslov, sredina, y, { align: 'center' });
    y += 11 * f;

    // --- fusnote: brojevi se dodjeljuju redom pojavljivanja u tablicama ---
    const fusnote = [];
    const br = (tekstFusnote) => { fusnote.push(tekstFusnote); return `(${fusnote.length})`; };

    // --- tablica s retcima proizvoljnih ćelija ---
    const PAD = 1.8;
    const SIVO = [217, 217, 217];
    function redak(cells, minH, velicina) {
      const fs = velicina * f;
      doc.setFontSize(fs);
      const lh = fs * 0.3528 * 1.18;
      const pripremi = cells.map((c) => {
        doc.setFont('Lib', c.bold ? 'bold' : 'normal');
        const lines = (c.sup !== undefined || c.center) ? String(c.text || '').split('\n') : (c.text ? doc.splitTextToSize(String(c.text), c.w - 2 * PAD) : ['']);
        return { c, lines };
      });
      const h = Math.max(minH * f, Math.max(...pripremi.map((x) => x.lines.length)) * lh + 2 * PAD);
      if (y + h > DONJE) { doc.addPage(); y = 15; }
      let x = L;
      pripremi.forEach(({ c, lines }) => {
        if (c.fill) { doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]); doc.rect(x, y, c.w, h, 'F'); }
        if (!c.bezRuba) { doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.rect(x, y, c.w, h); }
        doc.setFont('Lib', c.bold ? 'bold' : 'normal'); doc.setFontSize(fs); crna();
        const baza = (i) => y + PAD + lh * (i + 0.82) + (h - 2 * PAD - lh * lines.length) / 2;
        if (c.sup !== undefined || c.center) {
          // jedan ili više redaka (\n); eksponent (broj fusnote) i sufiks (npr. dvotočka) idu iza zadnjeg retka
          lines.forEach((ln, i) => {
            const zadnji = i === lines.length - 1;
            const sw = doc.getTextWidth(ln);
            doc.setFontSize(fs * 0.62);
            const supW = zadnji && c.sup ? doc.getTextWidth(c.sup) : 0;
            doc.setFontSize(fs);
            const sufW = zadnji && c.sufiks ? doc.getTextWidth(c.sufiks) : 0;
            const ukupno = sw + supW + sufW;
            const x0 = c.center ? x + (c.w - ukupno) / 2 : x + PAD;
            const yy = baza(i);
            tekst(ln, x0, yy);
            if (zadnji && c.sup) { doc.setFontSize(fs * 0.62); tekst(c.sup, x0 + sw, yy - fs * 0.3528 * 0.38); doc.setFontSize(fs); }
            if (zadnji && c.sufiks) tekst(c.sufiks, x0 + sw + supW, yy);
          });
        } else {
          lines.forEach((ln, i) => tekst(ln, x + PAD, baza(i)));
        }
        x += c.w;
      });
      y += h;
    }

    // Podaci s web obrasca u tri retka po dva para: Natjecanje | Sezona, Disciplina | Uzrast, (razmak) Klub | Ekipa
    const W1 = 28, V1 = 62, W2 = 22, V2 = W - W1 - V1 - W2;
    const lab = (text, w, sup) => Object.assign({ text, sufiks: ':', w, bold: true }, sup ? { sup } : { sup: '' });
    const dvaPara = (l1, v1, l2, v2, sup2) => redak([lab(l1, W1), { text: v1, w: V1 }, lab(l2, W2, sup2), { text: v2, w: V2 }], 8.5, 10.5);
    dvaPara('Natjecanje', p.nat.naziv, 'Sezona', p.sez);
    dvaPara('Disciplina', p.dis.naziv, 'Uzrast', p.uz.naziv, br(UZRAST_POJASNJENJE.join(' ')));
    y += 4 * f;
    dvaPara('Klub', p.klub.kratko, 'Ekipa', p.ekipa, br('Ako klub prijavljuje više od jedne ekipe, navesti ime ekipe'));
    y += 9 * f;

    // Napomena o promjeni pozicija i uloga (samo discipline s ulogama), iznad tablice sastava
    if (uloge) {
      font('normal', 8.5 * f); crna();
      const lhN = 8.5 * f * 0.3528 * 1.3;
      doc.splitTextToSize(NAPOMENA_POZICIJE, W).forEach((red) => { tekst(red, L, y); y += lhN; });
      y += 3 * f;
    }

    // Sastav ekipe: Pozicija, Ime i prezime, HCS registarski broj, [S/V], Klub
    const st = uloge ? [28, 52, 34, 16, 44] : [34, 58, 34, 48];
    const iKlub = uloge ? 4 : 3;
    const zaglavlje = [{ text: '', w: st[0], bezRuba: true }];
    zaglavlje.push({ text: 'Ime i prezime', w: st[1], bold: true, fill: SIVO });
    zaglavlje.push({ text: 'HCS registarski\nbroj', sup: br('Registarski broj iz Matične knjige igrača HCS-a'), w: st[2], bold: true, fill: SIVO });
    if (uloge) zaglavlje.push({ text: 'S/V', sup: br('S = skip, V = vice skip'), w: st[3], bold: true, fill: SIVO, center: true });
    zaglavlje.push({ text: 'Klub', sup: br('Ako je igrač iz drugog kluba, navesti ime kluba'), w: st[iKlub], bold: true, fill: SIVO });
    redak(zaglavlje, 7.5, 9.5);

    p.igraci.forEach((g, i) => {
      const rez = p.dis.pozicije[i].obavezno === false;
      const labela = rez
        ? { text: g.pozicija, sup: br('Rezerva nije obavezna'), sufiks: ':', w: st[0], bold: true }
        : { text: g.pozicija, sufiks: ':', sup: '', w: st[0], bold: true };
      const cells = [labela, { text: g.ime, w: st[1] }, { text: g.reg, w: st[2] }];
      if (uloge) cells.push({ text: g.uloga ? g.uloga.charAt(0) : '', w: st[3], bold: true, center: true });
      cells.push({ text: g.klub, w: st[iKlub] });
      redak(cells, 8.5, 10.5);
    });
    y += 9 * f;

    // Trener
    redak([{ text: '', w: st[0], bezRuba: true }, { text: 'Ime i prezime', w: W - st[0], bold: true, fill: SIVO }], 7.5, 9.5);
    redak([{ text: 'Trener', sup: br('Trener nije obavezan'), sufiks: ':', w: st[0], bold: true }, { text: p.trener, w: W - st[0] }], 8.5, 10.5);
    y += 6 * f;

    // --- fusnote i pravila ---
    const blok = (linije, velicina, razmak) => {
      font('normal', velicina * f); crna();
      const lh = velicina * f * 0.3528 * razmak;
      linije.forEach((ln) => {
        doc.splitTextToSize(ln, W).forEach((red) => {
          if (y + lh > DONJE) { doc.addPage(); y = 15; }
          tekst(red, L, y);
          y += lh;
        });
      });
    };
    blok(fusnote.map((t, i) => `(${i + 1}) ${t}`), 8.5, 1.3);
    y += 4 * f;
    blok(pravilaTekst(p), 9, 1.3);

    // --- izjave i suglasnosti ---
    y += 5 * f;
    font('bold', 9 * f); crna();
    if (y + 5 > DONJE) { doc.addPage(); y = 15; }
    tekst(IZJAVE_NASLOV, L, y);
    y += 4.2 * f;
    IZJAVE.forEach((iz, i) => { blok([`${i + 1}. ${iz.naslov}. ${iz.tekst}`], 7.8, 1.22); y += 1.4 * f; });
    y += 2 * f;
    // označena potvrda (kućica s kvačicom nacrtana linijama)
    {
      const kv = 3.4 * f, lh = 8 * f * 0.3528 * 1.25;
      const redovi = doc.splitTextToSize(IZJAVA_POTVRDA, W - kv - 3);
      font('bold', 8 * f);
      const vis = Math.max(kv, redovi.length * lh);
      if (y + vis > DONJE) { doc.addPage(); y = 15; }
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
      doc.rect(L, y - kv + 0.8, kv, kv);
      doc.setLineWidth(0.5);
      doc.line(L + kv * 0.2, y - kv * 0.45 + 0.8, L + kv * 0.43, y - kv * 0.12 + 0.8);
      doc.line(L + kv * 0.43, y - kv * 0.12 + 0.8, L + kv * 0.85, y - kv * 0.85 + 0.8);
      redovi.forEach((red, i) => tekst(red, L + kv + 3, y + i * lh));
      y += vis;
    }

    // --- datum i predstavnik kluba (obrazac se šalje e-poštom, bez crte za potpis) ---
    y += 7 * f;
    redak([{ text: 'Datum', sufiks: ':', sup: '', w: 22, bold: true }, { text: formatDatum(p.datum), w: 30 },
           { text: '', w: 14, bezRuba: true },
           { text: 'Predstavnik kluba', sufiks: ':', sup: '', w: 42, bold: true }, { text: p.predstavnik, w: W - 22 - 30 - 14 - 42 }], 8.5, 10.5);

    // --- podnožje: crta i napomena o izradi ---
    const sad = new Date();
    const p2 = (v) => String(v).padStart(2, '0');
    const vrijeme = `${sad.getDate()}. ${sad.getMonth() + 1}. ${sad.getFullYear()}. ${p2(sad.getHours())}:${p2(sad.getMinutes())}`;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25);
      doc.line(L, 283, L + W, 283);
      font('normal', 7.5); doc.setTextColor(110, 110, 110);
      tekst(`Izrađeno na ${HCS.stranica}, ${vrijeme}` + (n > 1 ? ` · stranica ${i}/${n}` : ''), L, 287.5);
    }
    return doc;
  }

  async function izradiPdf(p) {
    const logo = await ucitajLogo();
    const fontovi = await ucitajFontove();
    let doc = null;
    // Pokušaj stati na jednu A4 stranicu: ako ne stane, malo smanji fontove i razmake.
    for (const f of [1, 0.94, 0.88, 0.82, 0.76, 0.7]) {
      doc = crtaj(p, logo, fontovi, f);
      if (doc.getNumberOfPages() === 1) break;
    }
    return doc;
  }

  // Naziv: PHC-sezona-disciplina-uzrast-Prijava-klub[-ekipa].pdf, npr. PHC-2026-2027-M-S-Prijava-Vis.pdf
  function nazivDatoteke(p) {
    const dio = (x) => bezDijakritika(String(x)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
    return [p.nat.kratica, p.sez, p.dis.kod, p.uz.id, 'Prijava', p.klub.kratko].concat(p.ekipa ? [p.ekipa.slice(0, 30)] : [])
      .map(dio).join('-') + '.pdf';
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
    const { greske, podaci } = prikupi();
    if (greske.length) {
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
      prikaziPoruku('ok', `<strong>PDF je izrađen (${ime}).</strong>Pošaljite ga Savezu e-poštom na <a href="mailto:${HCS.email}">${HCS.email}</a>.` +
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
    if (NATJECANJA.length === 1) $('natjecanje').value = NATJECANJA[0].id;
    $('datum').value = danas();
    prethodnaDisc = null;
    iscrtajIgrace();
    poruka.className = 'poruka';
    poruka.innerHTML = '';
    document.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
  });

  // Uklanja crveni rub čim se polje počne ispravljati.
  document.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
  document.addEventListener('change', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
})();
