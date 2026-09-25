# Hrvatski curling savez — web stranice

Službene web stranice Hrvatskog curling saveza (HCS).
Statičan sajt, hostan na GitHub Pages: **https://curling.hr**

Nema baze ni backend servera — sve stranice su obični `.html` fajlovi, a podaci
(rezultati prvenstava, značke, vijesti) su JSON/JS datoteke koje se generiraju iz
Excel/Word predložaka u mapi `podaci/` ili ručno uređuju. Dvije od tih generacija
rade automatski preko GitHub Actionsa, ostalo je ručno.

Claude nema pristup za push u ovaj repo — svaka izmjena koju napravi Claude dolazi
kao gotov fajl za download, koji se onda ručno prebaci u GitHub Desktop i commita.

## Sadržaj

- [Struktura repozitorija](#struktura-repozitorija)
- [Kako radi dvojezičnost (HR/EN)](#kako-radi-dvojezičnost-hren)
- [Tema (svijetlo/tamno/auto)](#tema-svijetlotamnoauto)
- [Uobičajeni zadaci održavanja](#uobičajeni-zadaci-održavanja)
  - [Dodavanje vijesti](#1-dodavanje-vijesti)
  - [Ažuriranje statičnih stranica (Klubovi, O nama, Kalendar, O curlingu)](#2-ažuriranje-statičnih-stranica-klubovi-o-nama-kalendar-o-curlingu)
  - [Dodavanje novog prvenstva / rezultata](#3-dodavanje-novog-prvenstva--rezultata)
  - [Ažuriranje nastupa reprezentacije](#4-ažuriranje-nastupa-reprezentacije)
  - [Digitalizacija skeniranih zapisnika](#5-digitalizacija-skeniranih-zapisnika)
- [Skripte — pregled](#skripte--pregled)
- [GitHub Actions (automatska generacija)](#github-actions-automatska-generacija)
- [Domena i hosting](#domena-i-hosting)

## Struktura repozitorija

```
index.html              — Početna stranica
vijesti/                — Vijesti (arhiva + pojedinačni članci)
  index.html             — popis vijesti (čita vijesti.json)
  vijesti.json            — auto-generiran popis (NE uređivati ručno)
  TEMPLATE.html            — predložak za ručno dodavanje vijesti (rijetko se koristi, vidi niže)
  YYYY-MM-DD/index.html   — jedan članak po mapi (+ eventualne fotke u istoj mapi)
edit/index.html         — WYSIWYG editor za pisanje vijesti (Quill.js), radi lokalno u pregledniku
kalendar/index.html     — Kalendar natjecanja i treninga (ručno se uređuje)
klubovi/index.html      — Popis aktivnih/neaktivnih klubova (ručno se uređuje)
o-nama/index.html       — O savezu, kontakt, tijela, članarine, akti (+ PDF-ovi akata)
o-curlingu/index.html   — Objašnjenje pravila curlinga (ručno se uređuje)
prvenstva/index.html    — SPA za statistiku i rezultate PH (Pregled/Statistika/Postignuća)
reprezentacija/index.html — Nastupi hrvatskih reprezentacija na SP/EP
prvenstva/<sezona>/<dis-kat>/  — PDF zapisnici i fotografije po prvenstvu (npr. 2025-2026/M-S/)
assets/
  css/main.css           — zajednički stilovi (header, tema, vijesti-lightbox...)
  css/prvenstva.css      — stilovi specifični za SPA stranicu Prvenstva
  js/header.js            — zajednički header/nav, jezik, tema (učitava se na svakoj stranici)
  js/prvenstva.js         — cijela logika SPA-a (Prvenstva/Statistika/Postignuća/Reprezentacija)
  js/znacke-data.js       — podaci o značkama (auto-generirano, NE uređivati ručno)
  js/logo-data.js         — logotipi klubova kao base64 (generirano ručno iz PNG-ova, ne skriptom)
  js/vijesti-lightbox.js  — lightbox za fotografije u vijestima
  json/prvenstva-data.json      — svi rezultati PH (izvor istine za SPA + značke)
  json/reprezentacija-data.json — svi nastupi reprezentacije
podaci/                 — IZVORNE Excel/Word datoteke koje admin uređuje
  prvenstva-data.xlsx     — unos rezultata PH → generira prvenstva-data.json
  reprezentacija-data.xlsx — unos nastupa reprezentacije → generira reprezentacija-data.json
  hcs-web-data.xlsx       — radna bilježnica za Kalendar/Klubove/HOO (referenca, nije automatizirano)
  o-nama.docx, o-curlingu.docx — radni tekst za te dvije stranice (referenca, nije automatizirano)
skripte/                — Python skripte, pokreću se ručno (osim dvije koje idu preko GitHub Actionsa)
.github/workflows/      — GitHub Actions (automatska regeneracija vijesti.json i znacke-data.js)
```

## Kako radi dvojezičnost (HR/EN)

Sve upravlja `assets/js/header.js`, funkcija `applyLang(lang)`, koja se poziva pri
učitavanju stranice i na klik gumba za jezik (`#langToggle`). Odabir jezika se pamti u
`localStorage` (`hcs-lang`) i vrijedi za cijeli sajt.

Postoje četiri neovisna mehanizma, ovisno o vrsti sadržaja — kad dodaješ novi
prevedivi tekst, odaberi onaj koji odgovara:

| Atributi na elementu | Što mijenja | Kad koristiti |
|---|---|---|
| `data-hr="..." data-en="..."` | `el.textContent` | Obična tekstualna oznaka (naslov, gumb, ćelija tablice) |
| `data-title-hr="..." data-title-en="..."` | `el.title` | Tooltip (npr. na hover) |
| `data-hr-html="..." data-en-html="..."` | `el.innerHTML` | Odlomak s ugniježđenim HTML-om usred rečenice (npr. `<strong>`), vrijednosti moraju biti HTML-escapane (`&lt;strong&gt;`) |
| `data-label-hr="..." data-label-en="..."` | `el.dataset.label` | Ćelija tablice čiji se naziv stupca na mobitelu prikazuje preko CSS-a (`content: attr(data-label)`) |

`applyLang()` na kraju odašilje i `hcs-lang-change` event
(`document.dispatchEvent(new CustomEvent('hcs-lang-change', { detail: { lang } }))`),
tako da dinamički generirani dijelovi stranice (npr. značke) mogu reagirati na
promjenu jezika i sami se ponovno iscrtati.

Stranica `prvenstva/index.html` (SPA) je namjerno **izvan** ovog sustava — sav sadržaj
ondje (rezultati, statistika, postignuća) ostaje na hrvatskom, osim značaka
(`Postignuća igrača`), koje imaju svoj poseban prijevodni sloj u `assets/js/prvenstva.js`
(`BADGE_NAMES_EN`, `BADGE_META_EN`, `BADGE_TIER_LABELS_EN` iz `znacke-data.js`) —
hrvatski nazivi značaka i dalje služe kao interni identifikatori (URL, `data-badge`
atributi, ključevi u `BADGES` objektu), engleski su samo za prikaz. Nazivi klubova se
NIKAD ne prevode nigdje na sajtu (ostaju identični na oba jezika).

Kad dodaješ novu stranicu ili sekciju, uvijek koristi jedan od ova četiri mehanizma —
nikad ne hardkodiraj tekst samo na hrvatskom (osim na `prvenstva/index.html`, koja je
svjesno izuzeta).

## Tema (svijetlo/tamno/auto)

Isto u `header.js`, gumb `#themeToggle` kruži kroz `light → dark → auto`, sprema izbor u
`localStorage` (`hcs-theme`) i postavlja `data-theme="light"` ili `data-theme="dark"` na
`<html>`. **Nema CSS `@media (prefers-color-scheme)` fallbacka nigdje u kodu** — tamni
način rada ovisi isključivo o tom atributu, pa čak i u "auto" načinu JS mora aktivno
očitati postavku sustava i postaviti atribut (ne smije se osloniti na to da CSS to sam
odradi).

Boje su definirane kao CSS varijable u `assets/css/main.css` (`:root` za svijetlo,
`[data-theme="dark"]` za tamno) — nova komponenta treba koristiti te varijable
(`var(--bg)`, `var(--text)`, `var(--border)`...), ne hardkodirane boje, inače će
izgledati krivo u jednom od dva načina.

## Uobičajeni zadaci održavanja

### 1. Dodavanje vijesti

Najlakši način — koristi ugrađeni editor, ne piši HTML ručno:

1. Otvori `/edit/` na sajtu (`edit/index.html`) u pregledniku.
2. Napiši vijest (naslov, kratki opis, tekst, po želji naslovna slika i galerija fotki).
3. Klikni **Preuzmi** — preglednik generira ZIP koji sadrži gotovu mapu
   `vijesti/YYYY-MM-DD/` s `index.html` i svim fotkama, spreman da se raspakira
   izravno u korijen repozitorija.
4. Raspakiraj ZIP u repo, commitaj i pushaj.
5. GitHub Action (`generiraj-vijesti.yml`) automatski, u roku od par minuta,
   ponovno generira `vijesti/vijesti.json` i sam ga commita — **ne treba ga ručno
   dirati**.

Alternativa (rijetko potrebna): ručno kopirati `vijesti/TEMPLATE.html` u novu mapu
`vijesti/YYYY-MM-DD/index.html` i ispuniti meta-tagove `datum`/`naslov`/`excerpt`
prema uputama na vrhu tog fajla.

### 2. Ažuriranje statičnih stranica (Klubovi, O nama, Kalendar, O curlingu)

Ove četiri stranice **nisu automatizirane** — uređuju se ručno u HTML-u (svaki tekstualni
element treba oba jezika, vidi gore). `podaci/hcs-web-data.xlsx` (listovi Kalendar,
Klubovi, Info...) i `podaci/o-nama.docx`/`o-curlingu.docx` služe samo kao radna
bilježnica/nacrt za admina — ništa ih automatski ne čita niti pretvara u HTML.

Primjer iz prakse: kad se promijeni predsjednik kluba ili osvoji nova medalja, izmjena
ide izravno u `klubovi/index.html` (ćelija `Predsjednik`, ćelija `Osvojene medalje`).
Broj medalja po klubu **ne treba ručno zbrajati** — SPA stranica (Statistika → Klubovi,
svi filteri na "sve") to već računa iz `prvenstva-data.json` i može poslužiti kao izvor
istine za provjeru.

### 3. Dodavanje novog prvenstva / rezultata

1. Ažuriraj `podaci/prvenstva-data.xlsx` (listovi `Utakmice`, `Prvenstva`, `DBIgraci`,
   `DBEkipe`).
2. Pokreni lokalno:
   ```
   pip install pandas openpyxl --break-system-packages
   python3 skripte/generiraj-prvenstva-data.py podaci/prvenstva-data.xlsx assets/json/prvenstva-data.json
   ```
3. Commitaj `assets/json/prvenstva-data.json`.
4. GitHub Action (`generiraj-znacke.yml`) automatski pokreće generator značaka i sam
   commita rezultat u `assets/js/znacke-data.js` — ne treba ga ručno dirati (do
   25.9.2026. workflow je pozivao krivo ime skripte pa nije radio; ispravljeno je,
   vidi [Poznati problemi](#poznati-problemi--na-što-paziti) niže).
5. Ako je odigrano prvenstvo imalo skenirane zapisnike i fotografije, dodaj ih u
   `prvenstva/<sezona>/<disciplina-kategorija>/` (npr. `prvenstva/2026-2027/M-S/`) —
   `1.jpg`, `2.jpg`... za fotke, `PHC-...-Sustav.pdf` i `PHC-...-K1-1.pdf` i slično za
   zapisnike (vidi format imena u `skripte/split-zapisnici.py`).
6. Ako se pritom promijenio broj medalja nekog kluba, ažuriraj i
   `klubovi/index.html` ručno (vidi točku 2 gore).

### 4. Ažuriranje nastupa reprezentacije

1. Ažuriraj `podaci/reprezentacija-data.xlsx` (list `Curling`).
2. Pokreni lokalno:
   ```
   python3 skripte/generiraj-reprezentacija-data.py podaci/reprezentacija-data.xlsx assets/json/reprezentacija-data.json
   ```
3. Commitaj `assets/json/reprezentacija-data.json`. Nema automatskog workflowa za ovo.

### 5. Digitalizacija skeniranih zapisnika

`skripte/split-zapisnici.py` uzima jedan skenirani PDF cijelog prvenstva (jedna
stranica = jedna utakmica) i OCR-om (čita oznaku utakmice iz gornjeg desnog kuta)
razdvaja ga u pojedinačne, ispravno imenovane PDF-ove:

```
pip install pymupdf pytesseract pillow numpy --break-system-packages
python3 skripte/split-zapisnici.py ./skenirano.pdf ./assets/json/prvenstva-data.json ./output
```

Rezultat ide u `output/<sezona>/`, odatle se ručno premjesti u odgovarajuću mapu pod
`prvenstva/`.

## Skripte — pregled

| Skripta | Ulaz | Izlaz | Pokreće se |
|---|---|---|---|
| `generiraj-vijesti.py` | `vijesti/*/index.html` (meta tagovi) | `vijesti/vijesti.json` | Automatski (GitHub Actions) |
| `generiraj-znacke-data.py` | `assets/json/prvenstva-data.json` | `assets/js/znacke-data.js` | Automatski (GitHub Actions) |
| `generiraj-prvenstva-data.py` | `podaci/prvenstva-data.xlsx` | `assets/json/prvenstva-data.json` | Ručno |
| `generiraj-reprezentacija-data.py` | `podaci/reprezentacija-data.xlsx` | `assets/json/reprezentacija-data.json` | Ručno |
| `split-zapisnici.py` | skenirani PDF prvenstva | pojedinačni PDF zapisnici po utakmici | Ručno |

## GitHub Actions (automatska generacija)

- `.github/workflows/generiraj-vijesti.yml` — okida se na svaki push koji mijenja
  `vijesti/**.html`, pokreće `skripte/generiraj-vijesti.py` i sam commita rezultat.
- `.github/workflows/generiraj-znacke.yml` — okida se na svaki push koji mijenja
  `assets/json/prvenstva-data.json`, pokreće generator značaka i sam commita
  rezultat.

## Domena i hosting

Sajt je na GitHub Pages, grana `main`. Nema `CNAME` datoteke u repou — prilagođena
domena (`curling.hr`) je podešena izravno u postavkama repozitorija
(*Settings → Pages → Custom domain*), a ne preko commitanog fajla.
