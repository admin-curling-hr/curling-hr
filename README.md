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
prvenstva/<sezona>/<dis-kat>/  — PDF zapisnici, fotografije (+ foto.txt) i videi (video.txt + sličice) po prvenstvu (npr. 2025-2026/M-S/)
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

Isto u `header.js`, gumb `#themeToggle` kruži kroz `auto → light → dark`, sprema izbor u
`localStorage` (`hcs-theme`) i postavlja `data-theme="light"` ili `data-theme="dark"` na
`<html>`. **Nema CSS `@media (prefers-color-scheme)` fallbacka nigdje u kodu** — tamni
način rada ovisi isključivo o tom atributu, pa čak i u "auto" načinu JS mora aktivno
očitati postavku sustava i postaviti atribut (ne smije se osloniti na to da CSS to sam
odradi).

**Gumbi prikazuju SLJEDEĆE stanje** (što će se dogoditi na klik), a ne trenutno: ikona
teme je ikona sljedeće teme u ciklusu (`auto` = monitor, `light` = sunce, `dark` = mjesec),
a oznaka jezika je jezik na koji se prelazi („EN" dok je prikazan hrvatski, „HR" dok je
engleski). Tooltipovi (`SWITCHER_TEXTS` u `header.js`) opisuju trenutno stanje i što će
klik napraviti.

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
   dirati**. Isti Action u `<head>` svake vijesti održava i blok s Open Graph oznakama
   (omeđen komentarima `og:start`/`og:end`; pregled kartice pri dijeljenju linka na
   Facebooku, WhatsAppu i sl.) i pritom sam commita i te izmjene. Ručno ga ne uređuj:
   mijenjaš samo meta tagove `naslov`/`excerpt`/`slika`, a blok se osvježi sam.

**YouTube video u vijesti.** U alatnoj traci editora je gumb 🎬: postavi kursor, klikni
ga, zalijepi YouTube poveznicu (`watch?v=`, `youtu.be/` ili `shorts/`) ili 11-znakovni ID,
upiši naslov i, ako je video okomit (Shorts / snimka uspravno), označi kvačicu **Okomiti
video**. U tekstu se prikaže kartica koju možeš **Urediti** ili **Ukloniti**. Vijest dobiva
„klikni za prikaz" pločicu (isto kao na stranici *O curlingu*): dok posjetitelj ne klikne,
stranica ne kontaktira YouTube; na klik se na istom mjestu pokreće player
(`youtube-nocookie.com`). Vodoravni video je 16:9 u širini teksta; okomiti ima uski okvir
9:16 (najviše 360 px širine i 80 % visine zaslona, na mobitelu puna širina stupca), pa nema
crnih rubova. Video mora biti na YouTube kanalu Saveza kao *Nije javno dostupno*.

Sličica videa je datoteka `video-ID.jpg` u mapi vijesti. Ako je u editoru **ne odabereš**,
skida je automatski GitHub Action „Dohvati sličice YouTube videa" nakon pusha (za okomite
videe uz automatsko rezanje crnih bočnih traka); nakon par minuta napravi **Fetch/Pull** u
GitHub Desktopu. Dok sličice nema, vidi se tamna pločica s naslovom. Ako je odabereš,
editor je smanji, pretvori u JPEG i stavi u ZIP, a Action je ne prepisuje. Ručno uređena
vijest (bez editora): vidi komentirani primjer u `vijesti/TEMPLATE.html`; stranica mora
uključiti `assets/js/video-facade.js`.

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
5. Ako je odigrano prvenstvo imalo skenirane zapisnike, fotografije ili videe, dodaj ih u
   `prvenstva/<sezona>/<disciplina-kategorija>/` (npr. `prvenstva/2026-2027/M-S/`):
   `PHC-...-Sustav.pdf` i `PHC-...-K1-1.pdf` i slično za zapisnike (vidi format imena u
   `skripte/split-zapisnici.py`), a fotografije i videe prema uputama u nastavku.

   **Fotografije — `foto.txt`.** Ako u mapi postoji `foto.txt`, on je *popis* fotografija:
   prikazuju se samo fotke s popisa, redoslijedom redaka. Dopušteni retci (prazni retci i
   retci koji počinju s `#` se preskaču):

   ```
   2                      ← 2.jpg, bez natpisa
   2: Natpis              ← 2.jpg s natpisom
   dodjela                ← dodjela.jpg (ili .jpeg/.png/.webp, što postoji)
   dodjela: Natpis
   dodjela-medalja.jpg    ← datoteka s točno tim imenom (jpg, jpeg, png, webp, gif)
   ```

   Ime datoteke ne smije imati razmake, dvotočku ni kosu crtu. Ako je datoteka drukčije
   nazvana (npr. `.JPG` velikim slovima), upiši puni naziv s nastavkom.

   Fotka s popisa koja ne postoji u mapi se tiho preskače (bez poruke).
   **Nova fotka koja nije u `foto.txt` neće se prikazati.** Ako `foto.txt` ne
   postoji, stranica (kao rezerva) traži `1.jpg`, `2.jpg`... redom do prve rupe; tako
   rade starije mape.

   **Videi — `video.txt` + YouTube.** Videi se ne drže u repou (veliki su), nego se
   objavljuju na YouTube kanalu Saveza kao **„Nije javno dostupno" (unlisted)**: ne mogu
   se pronaći pretragom, ali se otvaraju preko poveznice i mogu se ugraditi. Ne smiju biti
   „Privatno" (ne mogu se ugraditi). Za svaki video:

   1. Uploadaj ga na YouTube kanal (vidljivost *Nije javno dostupno*) i zapiši ID videa
      (11 znakova iz poveznice, `youtube.com/watch?v=`**`ID`**).
   2. Dodaj redak u `video.txt`: `N: ID_VIDEA Naslov videa`, npr.
      `1: PrINW32njmw Dodjela zlatnih medalja`. `N` je redni broj (po njemu se traži
      sličica `video-N.jpg`), ID videa mora imati točno 11 znakova, a iza njega ide
      razmak i naslov (naslov je neobavezan; znak `|` iza ID-a je dopušten, ali nije
      potreban). Prazni retci i retci koji počinju s `#` se preskaču, a nerazumljiv redak
      se tiho preskače (bez poruke), pa ako se video ne pojavi, provjeri redak. Commitaj.
   3. **Sličicu (`video-N.jpg`) po potrebi sam skida GitHub Action** „Dohvati sličice
      YouTube videa" (`.github/workflows/dohvati-slicice-videa.yml`, skripta
      `skripte/dohvati-slicice-videa.py`): kad se `video.txt` promijeni, za svaki redak
      kojemu nedostaje `video-N.jpg` skine YouTubeovu sličicu i sam commita. Nakon par
      minuta napravi **Fetch/Pull** u GitHub Desktopu da dobiješ sličice. Sličicu skida
      Action, a ne preglednik posjetitelja, pa posjetitelj nema kontakta s
      YouTubeom/Googleom prije klika (usklađeno s Izjavom o zaštiti podataka).
      Ako želiš vlastitu sličicu, samo je dodaj kao `video-N.jpg` (ne smije se zvati
      `N.jpg` jer bi se pomiješala s fotkama) — postojeće se nikad ne prepisuju.
      Sličicu možeš promijeniti brisanjem `video-N.jpg` i ponovnim pokretanjem Actiona
      (*Actions → Dohvati sličice YouTube videa → Run workflow*).

   `video.txt` je popis: videi se prikazuju redoslijedom redaka; ako sličica
   `video-N.jpg` ne postoji (npr. Action još nije prošao ili YouTube nije dao sličicu), video se
   svejedno prikazuje kao tamna pločica s naslovom. Vodoravni
   videi (16:9) izgledaju najbolje; YouTube okomite i kratke (≤ 3 min) automatski vodi
   kao *Shorts*, ali se ugrađuju jednako. Stari lokalni `1.mp4`, `2.mp4`... još rade kao
   rezerva (bez naslova), ali samo ako u `video.txt` nema nijednog YouTube retka.
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
| `dohvati-slicice-videa.py` | `prvenstva/**/video.txt` i video-pločice u `vijesti/*/index.html` | `video-N.jpg` / `video-ID.jpg` (sličice koje nedostaju, s YouTubea) | Automatski (GitHub Actions) |
| `split-zapisnici.py` | skenirani PDF prvenstva | pojedinačni PDF zapisnici po utakmici | Ručno |

## GitHub Actions (automatska generacija)

- `.github/workflows/generiraj-vijesti.yml` — okida se na svaki push koji mijenja
  `vijesti/**.html`, pokreće `skripte/generiraj-vijesti.py` i sam commita rezultat.
- `.github/workflows/generiraj-znacke.yml` — okida se na svaki push koji mijenja
  `assets/json/prvenstva-data.json`, pokreće generator značaka i sam commita
  rezultat.
- `.github/workflows/dohvati-slicice-videa.yml` — okida se na svaki push koji mijenja
  `prvenstva/**/video.txt` ili `vijesti/**/index.html` (i ručno, *Run workflow*), pokreće
  `skripte/dohvati-slicice-videa.py` i sam commita nove `video-N.jpg`.

## Domena i hosting

Sajt je na GitHub Pages, grana `main`. Nema `CNAME` datoteke u repou — prilagođena
domena (`curling.hr`) je podešena izravno u postavkama repozitorija
(*Settings → Pages → Custom domain*), a ne preko commitanog fajla.
