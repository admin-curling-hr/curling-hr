// pristupnica.js — pristupnica za prijem novih članova Curling kluba Vis (stranica vis/pristupnica.html).
// Podaci se upisuju samo u pregledniku; PDF (cilj: najviše 2 A4 stranice) izrađuje se na uređaju pomoću jsPDF
// (vis/vendor/jspdf) i fonta s hrvatskim slovima (vis/fonts). Ništa se ne šalje niti sprema.
// Stranica je samostalna: ne koristi nijednu datoteku izvan mape vis/.
//
// Tekstove (izjave, obavijest o zaštiti podataka, privole) i e-adresu kluba mijenja se u CONFIG-u ispod.
// Ostatak koda i raspored PDF-a ne treba dirati.

(function () {
  'use strict';

  // ============================================================
  //  CONFIG
  // ============================================================
  const KLUB = {
    naziv: 'Curling klub Vis',
    email: 'vis@curling.hr',                          // na ovu adresu članovi šalju PDF
    stranica: 'curling.hr/vis/pristupnica.html',
    kontaktPodaci: 'vis@curling.hr'       // adresa za zahtjeve o osobnim podacima (stoji u Obavijesti)
  };

  const MALOLJETAN_DO = 18;   // mlađi od ovoga: otvaraju se podaci o roditelju/staratelju

  // Tekstovi koji se razlikuju za punoljetne i maloljetne članove pišu se kao v(punoljetni, maloljetni).
  // Maloljetni se prikazuje čim datum rođenja pokaže da član ima manje od MALOLJETAN_DO godina: tada sve izjave,
  // obavijest i privole govore o članu u trećem licu, a daje ih roditelj/staratelj u njegovo ime.
  // v(null, 'tekst') znači da se odlomak prikazuje samo za maloljetne članove.
  const v = (clan, mal) => ({ clan, mal });

  const IZJAVA_CLANA = {
    naslov: v('Izjava člana', 'Izjava roditelja/staratelja u ime člana'),
    tekst: v(
      'Ovom Pristupnicom potvrđujem da su svi uneseni podaci točni, prihvaćam Statut Curling kluba Vis te se obvezujem pravovremeno plaćati članarinu.',
      'Ovom Pristupnicom, kao roditelj/staratelj člana mlađeg od 18 godina, potvrđujem da su svi uneseni podaci točni te u njegovo ime prihvaćam Statut Curling kluba Vis. Obvezujem se da će se članarina za člana pravovremeno plaćati.')
  };

  const ZDRAVLJE = {
    naslov: 'Izjava o zdravstvenoj sposobnosti',
    uvod: v(
      'Ovom Pristupnicom izjavljujem sljedeće.',
      'Ovom Pristupnicom, kao roditelj/staratelj člana mlađeg od 18 godina, u njegovo ime izjavljujem sljedeće.'),
    tocke: [
      { lead: 'Zdravstvena sposobnost.',
        tekst: v(
          'Zdravstveno sam sposoban/na za bavljenje curlingom. Valjanu liječničku potvrdu o sposobnosti za bavljenje sportom dostavit ću klubu te je obnavljati prije isteka valjanosti. Klub ću bez odgode obavijestiti o svakoj promjeni zdravstvenog stanja zbog koje je sigurno bavljenje sportom ograničeno; pritom nisam dužan/na navoditi dijagnozu.',
          'Član je zdravstveno sposoban za bavljenje curlingom. Valjanu liječničku potvrdu o sposobnosti člana za bavljenje sportom dostavit ću klubu te je obnavljati prije isteka valjanosti. Klub ću bez odgode obavijestiti o svakoj promjeni zdravstvenog stanja člana zbog koje je sigurno bavljenje sportom ograničeno; pritom nisam dužan/na navoditi dijagnozu.') },
      { lead: 'Upoznatost s rizicima i pravilima.',
        tekst: v(
          'Upoznat/a sam da curling, kao i svaki sport, nosi rizik ozljeda (osobito padovi na ledu i udarci opremom), da sam upućen/a u osnovna sigurnosna pravila (obuća i metla, ponašanje na ledu) te da ću ih se pridržavati zajedno s uputama odgovorne osobe.',
          'Suglasan/na sam sa sudjelovanjem člana na treninzima i natjecanjima. Upoznat/a sam da curling, kao i svaki sport, nosi rizik ozljeda (osobito padovi na ledu i udarci opremom), da je član upućen u osnovna sigurnosna pravila (obuća i metla, ponašanje na ledu) te da će ih se pridržavati zajedno s uputama odgovorne osobe.') },
      { lead: 'Prihvaćanje uobičajenog rizika.',
        tekst: v(
          'Na treninzima, utakmicama i ostalim aktivnostima Curling kluba Vis i Hrvatskog curling saveza sudjelujem dobrovoljno i prihvaćam uobičajene rizike svojstvene ovom sportu. Ova izjava ne isključuje odgovornost kluba, Hrvatskog curling saveza ili drugih osoba u slučajevima u kojima je šteta prouzročena namjerom ili krajnjom nepažnjom.',
          'Član na treninzima, utakmicama i ostalim aktivnostima Curling kluba Vis i Hrvatskog curling saveza sudjeluje dobrovoljno i uz moju suglasnost, a u njegovo ime prihvaćam uobičajene rizike svojstvene ovom sportu. Ova izjava ne isključuje odgovornost kluba, Hrvatskog curling saveza ili drugih osoba u slučajevima u kojima je šteta prouzročena namjerom ili krajnjom nepažnjom.') },
      { lead: 'Prijava ozljede i osiguranje.',
        tekst: v(
          'Ozljedu ili nezgodu na treningu ili natjecanju odmah ću prijaviti treneru ili odgovornoj osobi kako bi se događaj evidentirao. Klub ne osigurava člana od posljedica nezgode; osiguranje od nezgode po želji osiguravam samostalno.',
          'Ozljedu ili nezgodu člana na treningu ili natjecanju član će odmah prijaviti treneru ili odgovornoj osobi (a ja ću to učiniti čim saznam) kako bi se događaj evidentirao. Klub ne osigurava člana od posljedica nezgode; osiguranje od nezgode po želji osiguravam samostalno.') }
    ],
  };

  const OBAVIJEST = {
    naslov: 'Obavijest o zaštiti osobnih podataka',
    uvod: { lead: 'Voditelj obrade:',
      tekst: v(
        'Curling klub Vis, Poljana Borisa Hanžekovića 43, 10000 Zagreb, ' + KLUB.kontaktPodaci + '. Ova obavijest daje se sukladno Općoj uredbi o zaštiti podataka (GDPR).',
        'Curling klub Vis, Poljana Borisa Hanžekovića 43, 10000 Zagreb, ' + KLUB.kontaktPodaci + '. Ova obavijest daje se sukladno Općoj uredbi o zaštiti podataka (GDPR). Budući da je član mlađi od 18 godina, obavijest se daje roditelju/staratelju, koji u ime člana ostvaruje i prava navedena niže.') },
    zaglavlje: ['Podaci', 'Svrha', 'Pravna osnova', 'Rok čuvanja'],
    redovi: [
      [v('Ime i prezime, OIB, adresa, e-adresa i telefon člana',
         'Ime i prezime, OIB, adresa, e-adresa i telefon člana te ime i prezime, e-adresa i telefon roditelja/staratelja'),
       'Vođenje evidencije (popisa) članova, naplata članarine, komunikacija s članovima',
       'Zakonska obveza kluba kao udruge (vođenje popisa članova) i članski odnos / legitimni interes kluba',
       'Dok traje članstvo i 3 godine nakon prestanka; popis članova prema propisima o udrugama'],
      ['Ime i prezime, HCS registarski broj, datum rođenja, državljanstvo i klub',
       'Sudjelovanje na natjecanjima i prijava natjecatelja; datum rođenja za razvrstavanje u kategorije, državljanstvo za provjeru prava nastupa na međunarodnim natjecanjima',
       'Legitimni interes kluba i člana za sudjelovanje u natjecanjima',
       'Za vrijeme trajanja natjecanja; rezultati i podaci o natjecateljima se čuvaju trajno kao sportski arhiv'],
      ['Datum izdavanja i isteka uvjerenja o zdravstvenoj sposobnosti sportaša, podatak da je član sposoban i preslika uvjerenja; dijagnoze i nalazi se ne prikupljaju',
       'Provjera sposobnosti za bavljenje sportom (sigurnost treninga i natjecanja)',       
       v('Izričita privola',
         'Izričita privola roditelja/staratelja u ime člana'),
       'Do isteka valjanosti uvjerenja ili povlačenja privole; zatim se preslika vraća članu ili uništava'],
      ['Fotografije i videozapisi s treninga, natjecanja i događanja',
       'Objava fotografija i videozapisa člana',       
       v('Dobrovoljna privola, vidi dolje',
         'Dobrovoljna privola roditelja/staratelja, vidi dolje'),
       'Do povlačenja privole ili zahtjeva za uklanjanje']
    ],
    odlomci: [
      { lead: 'Primatelji podataka: ',
        tekst: 'Hrvatski curling savez, organizatori natjecanja u Hrvatskoj i inozemstvu te Svjetska curling federacija (registracija članova i natjecatelja, rezultati i statistika natjecanja, fotografije i videozapisi); pružatelj usluge e-pošte (Microsoft). Uvjerenja o zdravstvenoj sposobnosti sportaša ne šalju se Savezu ni drugim primateljima (Savezu klub samo potvrđuje da postoji valjana potvrda), a pristup imaju samo ovlaštene osobe kluba. Podaci se ne šalju drugim primateljima, osim kad to zahtijeva zakon.' },
      { lead: 'Je li davanje podataka obvezno: ',
        tekst: v(
          'Podaci iz Pristupnice potrebni su za članstvo i bez njih se ne može postati članom. Privole za fotografije i videozapise su dobrovoljne. Za sudjelovanje na treninzima i natjecanjima potrebna je valjana liječnička potvrda o sposobnosti za bavljenje sportom.',
          'Podaci iz Pristupnice (uključujući podatke roditelja/staratelja) potrebni su za članstvo i bez njih se ne može postati članom. Privole za fotografije i videozapise su dobrovoljne. Za sudjelovanje člana na treninzima i natjecanjima potrebna je valjana liječnička potvrda o sposobnosti za bavljenje sportom.') },
      { lead: 'Vaša prava: ',
        tekst: v(
          'Pravo na pristup podacima, ispravak, brisanje, ograničenje obrade, prigovor te prenosivost podataka. Privolu možete povući u bilo kojem trenutku, bez utjecaja na zakonitost obrade prije povlačenja. Zahtjev pošaljite na ' + KLUB.kontaktPodaci + '; odgovorit ćemo najkasnije u roku od mjesec dana. Ako smatrate da se podaci obrađuju protivno propisima, imate pravo na pritužbu Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, azop.hr.',
          'Pravo na pristup podacima, ispravak, brisanje, ograničenje obrade, prigovor te prenosivost podataka (gdje se primjenjuje). Ta prava u ime člana ostvaruje roditelj/staratelj. Privolu možete povući u bilo kojem trenutku, bez utjecaja na zakonitost obrade prije povlačenja. Zahtjev pošaljite na ' + KLUB.kontaktPodaci + '; odgovorit ćemo najkasnije u roku od mjesec dana. Ako smatrate da se podaci obrađuju protivno propisima, imate pravo na pritužbu Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, azop.hr.') }
    ]
  };

  const PRIVOLE = {
    naslov: 'Privole',
    uvod: 'Označite odgovor uz svaku točku.',
    tocke: [
      { id: 'foto-klub', lead: 'Fotografije i videozapisi.',
        tekst: v('Objavljivanje mojih fotografija i videozapisa na kanalima Curling kluba Vis i Hrvatskog curling saveza (internetske stranice i društvene mreže).',
                 'Objavljivanje fotografija i videozapisa člana na kanalima Curling kluba Vis i Hrvatskog curling saveza (internetska stranica i društvene mreže kluba).') },
      { id: 'potvrda-lijecnik', lead: 'Liječničko uvjerenje.',
        tekst: v('Evidencija datuma izdavanja i isteka uvjerenja o zdravstvenoj sposobnosti sportaša i čuvanje preslike uvjerenja do isteka valjanosti. Klub ne traži i ne prikuplja dijagnoze ni nalaze. Ako ne pristanete, klub ne bilježi ni ne čuva podatke iz uvjerenja, ali je član dužan na traženje pokazati valjano uvjerenje. Bez valjanog uvjerenja nije moguće sudjelovati na treninzima i natjecanjima.',
                 'Evidencija datuma izdavanja i isteka uvjerenja o zdravstvenoj sposobnosti člana i čuvanje preslike uvjerenja do isteka valjanosti. Klub ne traži i ne prikuplja dijagnoze ni nalaze. Ako ne pristanete, klub ne bilježi ni ne čuva podatke iz uvjerenja, ali je član dužan na traženje pokazati valjano uvjerenje. Bez valjanog uvjerenja nije moguće sudjelovati na treninzima i natjecanjima.') }
    ],
    napomene: [
      v(null, 'Kada član postane punoljetan, može zatražiti da sam potvrdi ili promijeni odgovore koje je u njegovo ime dao roditelj/staratelj.')
    ]
  };

  const POTVRDA = {
    naslov: 'Potvrda',
    tekst: v(
      'Potvrđujem da sam pročitao/la obavijest o zaštiti osobnih podataka te potvrđujem sve gore navedene izjave i označene odgovore na privole.',
      'Potvrđujem da sam roditelj/staratelj člana mlađeg od 18 godina, da sam pročitao/la obavijest o zaštiti osobnih podataka te da u njegovo ime dajem sve gore navedene izjave i označene odgovore na privole.')
  };

  // Razrješava v(…) u tekstove za punoljetnog ili maloljetnog člana (odlomci s vrijednošću null se izostavljaju).
  function tekstovi(mal) {
    const r = (o) => {
      if (Array.isArray(o)) return o.map(r).filter((x) => x !== null);
      if (o && typeof o === 'object') {
        if ('clan' in o && 'mal' in o) return o[mal ? 'mal' : 'clan'];
        const out = {};
        Object.keys(o).forEach((k) => { out[k] = r(o[k]); });
        return out;
      }
      return o;
    };
    return r({ IZJAVA_CLANA, ZDRAVLJE, OBAVIJEST, PRIVOLE, POTVRDA });
  }

  // ============================================================
  //  Pomoćne funkcije
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const trim = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = (n) => String(n).padStart(2, '0');

  function danas() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function formatDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${parseInt(m[3], 10)}. ${parseInt(m[2], 10)}. ${m[1]}.` : '';
  }
  function bezDijakritika(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }
  function jeDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  function starost(rodjen, ref) {
    let a = ref.getFullYear() - rodjen.getFullYear();
    const m = ref.getMonth() - rodjen.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < rodjen.getDate())) a--;
    return a;
  }
  // OIB: kontrolna znamenka po ISO 7064 (MOD 11,10)
  function oibIspravan(s) {
    if (!/^\d{11}$/.test(s)) return false;
    let a = 10;
    for (let i = 0; i < 10; i++) {
      a = (a + Number(s[i])) % 10;
      if (a === 0) a = 10;
      a = (a * 2) % 11;
    }
    return (11 - a) % 10 === Number(s[10]);
  }
  // Tko potvrđuje: član, a za maloljetnog člana roditelj/staratelj u njegovo ime (isti tekst na stranici i u PDF-u).
  function potvrditelj(mal, ime, roditelj) {
    if (!mal) return ime ? `${ime} (član)` : '—';
    if (!roditelj) return 'roditelj/staratelj' + (ime ? ` (u ime člana ${ime})` : '');
    return `${roditelj} (roditelj/staratelj, u ime člana ${ime || 'člana'})`;
  }
  const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const telOk = (s) => /^[+0-9][0-9 ()\/.\-]{5,}$/.test(s) && (s.match(/\d/g) || []).length >= 6;

  // ============================================================
  //  Prikaz tekstova na stranici
  // ============================================================
  const lead = (l, t) => `<strong>${esc(l)}</strong> ${esc(t)}`;

  function iscrtajIzjave(S) {
    const { IZJAVA_CLANA, ZDRAVLJE } = S;
    let h = `<h3>${esc(IZJAVA_CLANA.naslov)}</h3><p>${esc(IZJAVA_CLANA.tekst)}</p>`;
    h += `<h3>${esc(ZDRAVLJE.naslov)}</h3><p>${esc(ZDRAVLJE.uvod)}</p><ol>`;
    ZDRAVLJE.tocke.forEach((t, i) => {
      h += `<li>${lead(`${i + 1}. ${t.lead}`, t.tekst)}`;
      h += '</li>';
    });
    h += '</ol>';
    $('izjave').innerHTML = h;
  }

  function iscrtajObavijest(S) {
    const { OBAVIJEST } = S;
    let h = `<p>${lead(OBAVIJEST.uvod.lead, OBAVIJEST.uvod.tekst)}</p>`;
    h += '<div class="tablica-wrap"><table class="svrhe"><thead><tr>' + OBAVIJEST.zaglavlje.map((z) => `<th>${esc(z)}</th>`).join('') + '</tr></thead><tbody>';
    OBAVIJEST.redovi.forEach((r) => {
      h += '<tr>' + r.map((c, i) => `<td data-label="${esc(OBAVIJEST.zaglavlje[i])}">${esc(c)}</td>`).join('') + '</tr>';
    });
    h += '</tbody></table></div>';
    OBAVIJEST.odlomci.forEach((o) => { h += `<p>${lead(o.lead, o.tekst)}</p>`; });
    $('obavijest').innerHTML = h;
  }

  function iscrtajPrivole(S) {
    const { PRIVOLE } = S;
    let h = `<p>${esc(PRIVOLE.uvod)}</p>`;
    PRIVOLE.tocke.forEach((t, i) => {
      h += `<div class="privola"><p>${t.lead ? lead(`${i + 1}. ${t.lead}`, t.tekst) : `<strong>${i + 1}.</strong> ${esc(t.tekst)}`}</p>` +
        `<div class="opcije" role="radiogroup" data-grupa="${t.id}">` +
        `<label class="opcija u-redu"><input type="radio" name="pr-${t.id}" value="da"><span>Pristajem</span></label>` +
        `<label class="opcija u-redu"><input type="radio" name="pr-${t.id}" value="ne"><span>Ne pristajem</span></label>` +
        '</div></div>';
    });
    PRIVOLE.napomene.forEach((n) => { h += `<p>${esc(n)}</p>`; });
    $('privole').innerHTML = h;
  }

  // Tekstovi se iscrtavaju iznova kad se promijeni dobna skupina (punoljetan / maloljetan); već dani odgovori ostaju.
  let prikazanoMal = null;
  function iscrtajTekstove(mal) {
    if (prikazanoMal === mal) return;
    const polja = [...document.querySelectorAll('#izjave input, #privole input')];
    const stanje = polja.map((el) => ({ id: el.id, name: el.name, value: el.value, type: el.type, checked: el.checked, text: el.value }));
    const S = tekstovi(mal);
    iscrtajIzjave(S);
    iscrtajObavijest(S);
    iscrtajPrivole(S);
    stanje.forEach((st) => {
      if (st.type === 'radio') {
        const el = document.querySelector(`input[name="${st.name}"][value="${st.value}"]`);
        if (el && st.checked) el.checked = true;
      } else if (st.id && $(st.id)) {
        $(st.id).value = st.text;
      }
    });
    prikazanoMal = mal;
  }

  $('privatnost').innerHTML = `Podaci se upisuju samo u Vašem pregledniku, ne šalju se nikamo i nigdje se ne spremaju. PDF se izrađuje na Vašem uređaju.`;
  $('datum').value = danas();

  // ============================================================
  //  Stanje obrasca (maloljetnik, brojevi kartica, potvrda)
  // ============================================================
  function maloljetan() {
    const d = jeDatum($('rodjen').value);
    if (!d || d > new Date()) return false;
    return starost(d, new Date()) < MALOLJETAN_DO;
  }

  function osvjezi() {
    const mal = maloljetan();
    iscrtajTekstove(mal);
    $('kartRoditelj').classList.toggle('hidden', !mal);
    $('reqEmail').style.display = mal ? 'none' : '';
    $('reqTel').style.display = mal ? 'none' : '';
    $('potvrdaTekst').textContent = tekstovi(mal).POTVRDA.tekst;
    const ime = trim(`${$('ime').value} ${$('prezime').value}`);
    const r = trim(`${$('rIme').value} ${$('rPrezime').value}`);
    const tko = potvrditelj(mal, ime, r);
    $('potvrdjuje').textContent = tko;
    // Kartica roditelja/staratelja je „1a” da ostale kartice zadrže iste brojeve bez obzira na dob člana.
    let n = 0;
    document.querySelectorAll('main .card').forEach((k) => {
      const b = k.querySelector('h2 .br');
      if (!b) return;
      b.textContent = k.id === 'kartRoditelj' ? '1a' : ++n;
    });
  }

  // ============================================================
  //  Prikupljanje i provjera podataka
  // ============================================================
  function oznaci(el, loseje) { if (el) el.classList.toggle('invalid', !!loseje); }
  function oznaciGrupu(el, loseje) { if (el) el.classList.toggle('grupa-invalid', !!loseje); }

  function prikupi() {
    const greske = [];
    const zahtijevaj = (id, poruka, ok) => {
      const el = $(id);
      const v = trim(el.value);
      const dobro = ok ? ok(v) : !!v;
      oznaci(el, !dobro);
      if (!dobro) greske.push({ poruka, el });
      return v;
    };
    const mal = maloljetan();
    const p = { maloljetan: mal };

    p.ime = zahtijevaj('ime', 'Upišite ime člana.');
    p.prezime = zahtijevaj('prezime', 'Upišite prezime člana.');
    p.oib = zahtijevaj('oib', 'OIB mora imati 11 znamenki i biti ispravan (provjerite unos).', oibIspravan);
    p.adresa = zahtijevaj('adresa', 'Upišite adresu.');
    p.mjesto = zahtijevaj('mjesto', 'Upišite mjesto.');
    p.drzava = zahtijevaj('drzava', 'Upišite državu.');
    p.drzavljanstvo = zahtijevaj('drzavljanstvo', 'Upišite državljanstvo.');

    // datum rođenja
    {
      const el = $('rodjen');
      const d = jeDatum(el.value);
      const sad = new Date();
      const dobro = !!d && d <= sad && starost(d, sad) <= 110;
      oznaci(el, !dobro);
      if (!dobro) greske.push({ poruka: 'Upišite ispravan datum rođenja.', el });
      p.rodjen = el.value;
    }

    // e-adresa i telefon člana: obavezni samo za punoljetne; ako su upisani, moraju biti ispravni
    const opcionalno = (id, poruka, nazivObavezno, ok) => {
      const el = $(id);
      const v = trim(el.value);
      let dobro = true, por = poruka;
      if (!v) { dobro = mal; por = nazivObavezno; }
      else dobro = ok(v);
      oznaci(el, !dobro);
      if (!dobro) greske.push({ poruka: por, el });
      return v;
    };
    p.email = opcionalno('email', 'E-adresa nije ispravna.', 'Upišite e-adresu člana.', emailOk);
    p.tel = opcionalno('tel', 'Telefon nije ispravan.', 'Upišite telefon člana.', telOk);

    if (mal) {
      p.rIme = zahtijevaj('rIme', 'Upišite ime roditelja/staratelja.');
      p.rPrezime = zahtijevaj('rPrezime', 'Upišite prezime roditelja/staratelja.');
      p.rEmail = zahtijevaj('rEmail', 'Upišite ispravnu e-adresu roditelja/staratelja.', emailOk);
      p.rTel = zahtijevaj('rTel', 'Upišite ispravan telefon roditelja/staratelja.', telOk);
    }

    // privole
    p.privole = {};
    PRIVOLE.tocke.forEach((t, i) => {
      const sel = document.querySelector(`input[name="pr-${t.id}"]:checked`);
      const grupa = document.querySelector(`[data-grupa="${t.id}"]`);
      oznaciGrupu(grupa, !sel);
      if (!sel) greske.push({ poruka: `Privole, točka ${i + 1}: označite „Pristajem“ ili „Ne pristajem“.`, el: document.querySelector(`input[name="pr-${t.id}"]`) });
      p.privole[t.id] = sel ? sel.value : '';
    });

    // potvrda i datum
    {
      const el = $('potvrda');
      oznaci(el, !el.checked);
      if (!el.checked) greske.push({ poruka: 'Označite potvrdu na kraju obrasca.', el });
    }
    p.datum = zahtijevaj('datum', 'Upišite datum.', (v) => !!jeDatum(v));
    return { greske, podaci: p };
  }

  // ============================================================
  //  PDF (cilj: najviše 2 A4 stranice)
  // ============================================================
  let logoCache;
  async function ucitajLogo() {
    if (logoCache !== undefined) return logoCache;
    try {
      const r = await fetch('logo.png');
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

  // Fontovi (Liberation Sans, podskup s hrvatskim slovima) dohvaćaju se iz vis/fonts/ i drže u memoriji kao base64.
  const FONT_DATOTEKE = {
    regular: 'fonts/liberation-sans-subset-regular.ttf',
    bold:    'fonts/liberation-sans-subset-bold.ttf',
    italic:  'fonts/liberation-sans-subset-italic.ttf'
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

    const L = 15, W = 180, TOP = 13, DONJE = 279;
    const PT = 0.3528;                       // mm po točki
    let y = TOP;
    const crna = () => doc.setTextColor(20, 20, 20);
    const tekst = (s, x, yy, opt) => doc.text(s, x, yy, opt);
    const font = (stil, velicina) => { doc.setFont('Lib', stil); doc.setFontSize(velicina); };
    const nova = () => { doc.addPage(); y = TOP; };
    const treba = (h) => { if (y + h > DONJE) nova(); };

    const { IZJAVA_CLANA, ZDRAVLJE, OBAVIJEST, PRIVOLE, POTVRDA } = tekstovi(p.maloljetan);   // tekstovi za dob člana
    const imeClana = `${p.ime} ${p.prezime}`;
    doc.setProperties({
      title: `Pristupnica — ${KLUB.naziv}`,
      subject: `Pristupnica za prijem novih članova: ${imeClana}`,
      author: KLUB.naziv,
      creator: KLUB.stranica
    });

    // --- zaglavlje: naziv kluba lijevo (kurziv), logotip desno ---
    font('italic', 11); crna();
    tekst(KLUB.naziv, L, y + 7);
    if (logo) { try { doc.addImage(logo, 'PNG', L + W - 16, y - 1, 16, 16); } catch (e) { /* bez logotipa */ } }
    y += 17 * Math.max(f, 0.8);

    // --- naslov ---
    const sredina = L + W / 2;
    font('bold', 15 * f); crna();
    tekst('Pristupnica', sredina, y, { align: 'center' });
    y += 5 * f;
    font('normal', 9.5 * f);
    tekst('za prijem novih članova', sredina, y, { align: 'center' });
    y += 3 * f;

    // --- odlomak s podebljanim uvodom: zalomi riječi po širini, bez poravnanja ---
    function razlomi(segs, w, fs) {
      doc.setFontSize(fs);
      doc.setFont('Lib', 'normal');
      const razmak = doc.getTextWidth(' ');
      const rijeci = [];
      segs.forEach((s) => String(s.t).split(/\s+/).filter(Boolean).forEach((r) => {
        doc.setFont('Lib', s.b ? 'bold' : 'normal');
        rijeci.push({ t: r, b: !!s.b, w: doc.getTextWidth(r) });
      }));
      const linije = [];
      let tek = [], sirina = 0;
      rijeci.forEach((r) => {
        const nova_ = tek.length ? sirina + razmak + r.w : r.w;
        if (tek.length && nova_ > w) { linije.push(tek); tek = [r]; sirina = r.w; }
        else { tek.push(r); sirina = nova_; }
      });
      if (tek.length) linije.push(tek);
      // spoji uzastopne riječi istog stila u nizove (run)
      return linije.map((ln) => {
        const runs = [];
        ln.forEach((r) => {
          const zadnji = runs[runs.length - 1];
          if (zadnji && zadnji.b === r.b) zadnji.t += ' ' + r.t;
          else { if (zadnji) zadnji.t += ' '; runs.push({ t: r.t, b: r.b }); }
        });
        return runs;
      });
    }

    function kucica(x, yy, kv, oznacena) {
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25);
      doc.rect(x, yy, kv, kv);
      if (oznacena) {
        doc.setLineWidth(0.5);
        doc.line(x + kv * 0.2, yy + kv * 0.55, x + kv * 0.43, yy + kv * 0.82);
        doc.line(x + kv * 0.43, yy + kv * 0.82, x + kv * 0.85, yy + kv * 0.15);
      }
    }

    // opt: indent (mm), iza (razmak iza odlomka), kucica: undefined | true | false (crta kućicu uz prvi redak)
    function par(segs, pt, opt) {
      opt = opt || {};
      const fs = pt * f, lh = fs * PT * 1.2, ind = opt.indent || 0;
      const linije = razlomi(segs, W - ind, fs);
      linije.forEach((ln, i) => {
        treba(lh);
        const base = y + lh * 0.78;
        crna();
        if (i === 0 && opt.kucica !== undefined) {
          const kv = fs * PT * 0.95;
          kucica(L + ind - kv - 1.8, base - kv + 0.5, kv, opt.kucica);
        }
        let x = L + ind;
        ln.forEach((r) => { font(r.b ? 'bold' : 'normal', fs); tekst(r.t, x, base); x += doc.getTextWidth(r.t); });
        y += lh;
      });
      y += (opt.iza === undefined ? 1.1 : opt.iza) * f;
    }

    // red s izborom „Pristajem / Ne pristajem” (kućice nacrtane linijama)
    function izbor(oznacenaVrijednost, indent) {
      const fs = 8 * f, lh = fs * PT * 1.45, kv = fs * PT * 0.95;
      treba(lh);
      font('normal', fs); crna();
      const base = y + lh * 0.78;
      let x = L + indent;
      [['da', 'Pristajem'], ['ne', 'Ne pristajem']].forEach(([v, t]) => {
        kucica(x, base - kv + 0.5, kv, oznacenaVrijednost === v);
        tekst(t, x + kv + 1.5, base);
        x += kv + 1.5 + doc.getTextWidth(t) + 10;
      });
      y += lh + 0.8 * f;
    }

    function naslov(t) {
      treba(16);
      y += 3.4 * f;
      font('bold', 9.8 * f); crna();
      tekst(t, L, y + 3.4 * f);
      y += 4.7 * f;
      doc.setDrawColor(130, 130, 130); doc.setLineWidth(0.2);
      doc.line(L, y, L + W, y);
      y += 1.8 * f;
    }

    // --- tablica s retcima ćelija (tekst se zalama; ćelije bez ruba/s ispunom) ---
    const SIVO = [232, 232, 232];
    function redak(cells, minH, pt, PAD, gore) {
      PAD = PAD === undefined ? 1.6 : PAD;
      const fs = pt * f, lh = fs * PT * 1.18;
      const pripremi = cells.map((c) => {
        doc.setFont('Lib', c.bold ? 'bold' : 'normal'); doc.setFontSize(fs);
        let cfs = fs;
        if (c.sazmi && c.text) {
          // jedan redak: smanji font ćelije (do 6,5 pt) dok tekst ne stane u širinu
          const sirina = doc.getTextWidth(String(c.text));
          cfs = Math.max(6.5, Math.min(fs, fs * (c.w - 2 * PAD - 0.5) / sirina));
          doc.setFontSize(cfs);
          if (doc.getTextWidth(String(c.text)) <= c.w - 2 * PAD) return { c, cfs, lines: [String(c.text)] };
          doc.setFontSize(cfs);
        }
        return { c, cfs, lines: c.text ? doc.splitTextToSize(String(c.text), c.w - 2 * PAD) : [''] };
      });
      const h = Math.max(minH * f, Math.max(...pripremi.map((x) => x.lines.length)) * lh + 2 * PAD);
      if (y + h > DONJE) nova();
      let x = L;
      pripremi.forEach(({ c, lines, cfs }) => {
        if (c.fill) { doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]); doc.rect(x, y, c.w, h, 'F'); }
        if (!c.bezRuba) { doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25); doc.rect(x, y, c.w, h); }
        doc.setFont('Lib', c.bold ? 'bold' : 'normal'); doc.setFontSize(cfs); crna();
        const pomak = gore ? 0 : (h - 2 * PAD - lh * lines.length) / 2;
        lines.forEach((ln, i) => tekst(ln, x + PAD, y + PAD + lh * (i + 0.82) + pomak));
        x += c.w;
      });
      y += h;
    }

    // --- osobni podaci člana ---
    naslov('Osobni podaci člana');
    const L1 = 24, V1 = 64, L2 = 36, V2 = W - L1 - V1 - L2;
    const par2 = (l1, v1, l2, v2) => redak([
      { text: l1 + ':', w: L1, bold: true, fill: SIVO }, { text: v1, w: V1 },
      { text: l2 + ':', w: L2, bold: true, fill: SIVO }, { text: v2, w: V2 }], 7, 9);
    par2('Ime', p.ime, 'Prezime', p.prezime);
    par2('OIB', p.oib, 'Datum rođenja', formatDatum(p.rodjen));
    par2('Adresa', p.adresa, 'Mjesto', p.mjesto);
    par2('Država', p.drzava, 'Državljanstvo', p.drzavljanstvo);
    par2('E-adresa', p.email, 'Telefon', p.tel);

    if (p.maloljetan) {
      naslov('Podaci o roditelju/staratelju (za članove mlađe od 18 godina)');
      par2('Ime', p.rIme, 'Prezime', p.rPrezime);
      par2('E-adresa', p.rEmail, 'Telefon', p.rTel);
    }

    // --- izjave ---
    naslov(IZJAVA_CLANA.naslov);
    par([{ t: IZJAVA_CLANA.tekst }], 8.2);

    naslov(ZDRAVLJE.naslov);
    par([{ t: ZDRAVLJE.uvod }], 8.2, { iza: 1.4 });
    ZDRAVLJE.tocke.forEach((t, i) => {
      par([{ t: `${i + 1}. ${t.lead}`, b: true }, { t: t.tekst }], 8.2, { iza: 1.4 });
    });

    // --- obavijest o zaštiti osobnih podataka ---
    treba(78 * f);   // naslov, uvod i početak tablice ostaju zajedno
    naslov(OBAVIJEST.naslov);
    par([{ t: OBAVIJEST.uvod.lead, b: true }, { t: OBAVIJEST.uvod.tekst }], 7.8, { iza: 1.6 });
    const sir = [40, 52, 54, W - 146];
    redak(OBAVIJEST.zaglavlje.map((z, i) => ({ text: z, w: sir[i], bold: true, fill: SIVO })), 5.5, 7.4, 1.1, true);
    OBAVIJEST.redovi.forEach((r) => redak(r.map((c, i) => ({ text: c, w: sir[i] })), 5.5, 7.2, 1.1, true));
    y += 2 * f;
    OBAVIJEST.odlomci.forEach((o) => par([{ t: o.lead, b: true }, { t: o.tekst }], 7.8, { iza: 1.4 }));

    // --- privole ---
    naslov(PRIVOLE.naslov);
    par([{ t: PRIVOLE.uvod }], 8, { iza: 1.4 });
    PRIVOLE.tocke.forEach((t, i) => {
      par(t.lead ? [{ t: `${i + 1}. ${t.lead}`, b: true }, { t: t.tekst }] : [{ t: `${i + 1}.`, b: true }, { t: t.tekst }], 8, { iza: 0.6 });
      izbor(p.privole[t.id], 4);
    });
    PRIVOLE.napomene.forEach((n) => par([{ t: n }], 7.8, { iza: 1.2 }));

    // --- potvrda, datum i potvrđuju ---
    naslov('Potvrda');
    par([{ t: POTVRDA.tekst, b: true }], 8.2, { indent: 6, kucica: true, iza: 3 });
    y += 2 * f;
    // Datum je uzak (širina prema tekstu), a ostatak retka dobiva potvrditelj: isti tekst kao na web obrascu
    // (član, a za maloljetnog roditelj/staratelj u njegovo ime), u jednom redu.
    const tw = (t, bold) => { doc.setFont('Lib', bold ? 'bold' : 'normal'); doc.setFontSize(9 * f); return doc.getTextWidth(t); };
    const sir_ = (t, bold) => tw(t, bold) + 2 * 1.6 + 1.5;
    const datumTxt = formatDatum(p.datum);
    const wDatumL = sir_('Datum:', true), wDatum = sir_(datumTxt), wPotvrdaL = sir_('Potvrđuje:', true), razmak1 = 5;
    redak([
      { text: 'Datum:', w: wDatumL, bold: true, fill: SIVO }, { text: datumTxt, w: wDatum },
      { text: '', w: razmak1, bezRuba: true },
      { text: 'Potvrđuje:', w: wPotvrdaL, bold: true, fill: SIVO },
      { text: potvrditelj(p.maloljetan, imeClana, p.maloljetan ? `${p.rIme} ${p.rPrezime}` : ''), w: W - wDatumL - wDatum - razmak1 - wPotvrdaL, sazmi: true }
    ], 7.5, 9);

    // --- podnožje: crta i napomena o izradi ---
    const sad = new Date();
    const vrijeme = `${sad.getDate()}. ${sad.getMonth() + 1}. ${sad.getFullYear()}. ${pad2(sad.getHours())}:${pad2(sad.getMinutes())}`;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25);
      doc.line(L, 284, L + W, 284);
      font('normal', 7.5); doc.setTextColor(110, 110, 110);
      tekst(`Izrađeno na ${KLUB.stranica}, ${vrijeme}`, L, 288.3);
      tekst(`stranica ${i}/${n}`, L + W, 288.3, { align: 'right' });
    }
    return doc;
  }

  const MJERILA = [1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68];
  async function izradiPdf(p) {
    const logo = await ucitajLogo();
    const fontovi = await ucitajFontove();
    let doc = null;
    // Pokušaj stati na 2 A4 stranice: ako ne stane, malo smanji fontove i razmake.
    for (const f of MJERILA) {
      doc = crtaj(p, logo, fontovi, f);
      if (doc.getNumberOfPages() <= 2) break;
    }
    return doc;
  }

  // Naziv: CK-Vis-Pristupnica-Prezime-Ime.pdf
  function nazivDatoteke(p) {
    const dio = (x) => bezDijakritika(String(x)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
    return ['CK', 'Vis', 'Pristupnica', dio(p.prezime.slice(0, 30)), dio(p.ime.slice(0, 30))].join('-') + '.pdf';
  }

  // ============================================================
  //  Gumbi i događaji
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
      const li = greske.map((g) => `<li>${esc(g.poruka)}</li>`).join('');
      prikaziPoruku('err', `<strong>Obrazac još nije potpun:</strong><ul>${li}</ul>`);
      const prvi = greske.find((g) => g.el);
      if (prvi) { prvi.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); try { prvi.el.focus({ preventScroll: true }); } catch (x) { /* nema fokusa */ } }
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
      prikaziPoruku('ok', `<strong>PDF je izrađen (${esc(ime)}).</strong>Pošaljite ga klubu e-poštom na <a href="mailto:${KLUB.email}">${KLUB.email}</a>.` +
        (stranica > 2 ? ' Napomena: pristupnica nije stala na dvije stranice.' : ''));
      poruka.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      prikaziPoruku('err', '<strong>PDF nije moguće izraditi.</strong>' + (err && err.message ? esc(err.message) : ''));
    } finally {
      btn.disabled = false;
    }
  });

  $('btnOcisti').addEventListener('click', () => {
    if (!window.confirm('Obrisati sve upisane podatke?')) return;
    $('forma').reset();
    $('datum').value = danas();
    poruka.className = 'poruka';
    poruka.innerHTML = '';
    document.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
    document.querySelectorAll('.grupa-invalid').forEach((x) => x.classList.remove('grupa-invalid'));
    osvjezi();
  });

  // Uklanja crveni rub čim se polje počne ispravljati.
  const ocisti = (e) => {
    const t = e.target;
    if (!t.classList) return;
    t.classList.remove('invalid');
    const g = t.closest && t.closest('.grupa-invalid');
    if (g) g.classList.remove('grupa-invalid');
  };
  document.addEventListener('input', (e) => { ocisti(e); osvjezi(); });
  document.addEventListener('change', (e) => { ocisti(e); osvjezi(); });
  osvjezi();
})();
