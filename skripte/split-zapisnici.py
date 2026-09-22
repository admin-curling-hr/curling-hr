#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Requirements - zapisnici:
-------------------------
pymupdf
pytesseract
pillow
numpy


split-zapisnici.py (v4 — novi format oznake, koji nosi sve podatke)
---------------------------------------------------------------------
Python port skripte split-zapisnici.mjs (Node.js), radi dosljednosti s
ostatkom repoa (generate-data.py, generate-wc-data.py). Logika, kalibracija
polja i redoslijed OCR pokušaja su namjerno identični .mjs verziji - ovo
NIJE prepisano "od oka", nego 1:1 preneseno i ponovno testirano na istom
stvarnom skenu (18. prvenstvo Hrvatske, Žene/Seniori, 6 stranica, 6/6 točno).

Uzima jedan skenirani PDF cijelog prvenstva (jedna stranica = jedna utakmica;
dokument može sadržavati i više disciplina/kategorija zajedno) i za svaku
stranicu pravi zaseban, optimiziran (manji) PDF s imenom po konvenciji:

  PHC-{sezona1}-{sezona2}-{disciplina}-{kategorija}-{skupina}-{faza}-{utakmica}.pdf
  npr:  PHC-2025-2026-Ž-S-A-K1-1.pdf

Sve datoteke idu u podmapu s nazivom sezone (npr. output/2025-2026/).

==== NOVI FORMAT OZNAKE (od rujna 2026.) ====
Na obrascu "Prijava i Zapisnik s utakmice" u gornjem desnom kutu prve (sive)
trake stoji POTPUNA oznaka utakmice, npr. "PHC-2025-2026-Ž-S-A-K1-1" —
sezona1, sezona2, disciplina, kategorija, skupina, faza (K=kolo skupne faze,
P=plasman, D=doigravanje, broj iza), utakmica/par. Skripta tu oznaku samo
OCR-a i rekonstruira iz nje naziv datoteke — ne treba čitati poseban redak
"Natjecanje" niti unakrsno provjeravati s phc-data.json za skupinu/fazu.

==== STARI FORMAT OZNAKE (do rujna 2026., npr. "PHC-M-20-01-01") ====
Radi kompatibilnosti sa starijim skeniranim zapisnicima, skripta i dalje zna
čitati stari, kraći kod koji NE nosi sezonu/kategoriju/skupinu — za te
slučajeve pada natrag na staru logiku (čitanje "Natjecanje" retka za
tip/sezonu, best-effort skupina "A" osim ako phc-data.json ima podatak).

Skripta automatski proba NOVI format prvo, pa tek ako ne uspije STARI format.

POZADINA OZNAKE JE SIVA (skenirano) — polje s kodom ima teksturirano
sivo/mrljavo polje iza crnog teksta. Prije OCR-a slika se posvijetli
(linear: vrijednost*1.4 + 10, isto kao sharp .linear(1.4, 10)) pa se
kontrast normalizira na puni raspon 0-255 — poznati, ranije riješen problem.

KORIŠTENJE:
  python3 split-zapisnici.py <input.pdf> [phc-data.json] [outputDir]

PRIMJER:
  python3 split-zapisnici.py ./Ž-S-Zapisnici.pdf ./phc-data.json ./output

Ovisnosti: pip install pymupdf pytesseract pillow numpy --break-system-packages
(i sustavski paket "tesseract-ocr" mora biti instaliran za sam OCR engine).

Ako OCR ne uspije pročitati kod ni jednim pokušajem:
  - u interaktivnom terminalu (TTY), skripta pita korisnika izravno;
  - u neinteraktivnom okruženju (npr. kad ovo pokreće Claude u sandboxu),
    stranica se PRESKAČE, sprema se izrezak koda u <outputDir>/_rucno/ za
    naknadni pregled, i na kraju se ispisuje popis preskočenih stranica.
"""

import io
import os
import re
import sys
from collections import Counter

import fitz  # PyMuPDF
import numpy as np
import pytesseract
from PIL import Image

# ---- Podešavanja ----
RENDER_SCALE = 3.0
# NAPOMENA o JPEG_QUALITY: izvorna .mjs skripta koristi sharp/mozjpeg s
# quality=68 i time postiže ~150-165 KB po datoteci. Pillow-ov (standardni
# libjpeg, bez mozjpeg-a) enkoder je primjetno manje učinkovit pri ISTOM
# nominalnom quality broju - ista postavka 68 ovdje daje ~210 KB. Baždareno
# nazad na quality=42 kako bi krajnja veličina datoteke odgovarala izvornoj
# (~150-165 KB), provjereno na istom skenu kao .mjs verzija.
JPEG_QUALITY = 42
GRAYSCALE = False  # finalni PDF ostaje u boji (crvena/žuta pozadina ekipa je bitna u curlingu)
MAX_WIDTH_PX = 1400

# Polje s NOVIM kodom (baždareno na stvarnom skenu, rujan 2026. — gornji
# desni dio sive trake s nazivima ekipa). Fraction (0-1) širine/visine
# stranice, neovisno o RENDER_SCALE.
NEW_CODE_BOX = (0.6926, 0.1333, 1.0, 0.1611)

# Polja STAROG predloška ("Prijava i Zapisnik s utakmice" prije rujna 2026.),
# zadržana radi obrade starijih skenova. Dva poznata rasporeda: noviji
# (otprilike sezona 2017/18+) i stariji (2016/17 i ranije, blok pomaknut niže).
OLD_FIELD_BOXES_NEW = {
    'code':       (0.66, 0.145, 0.95, 0.185),
    'natjecanje': (0.115, 0.187, 0.95, 0.216),
    'datum':      (0.115, 0.208, 0.65, 0.238),
    'mjesto':     (0.115, 0.229, 0.95, 0.260),
}
OLD_FIELD_BOXES_OLD = {
    'code':       (0.66, 0.170, 0.95, 0.205),
    'natjecanje': (0.115, 0.198, 0.95, 0.228),
    'datum':      (0.115, 0.222, 0.65, 0.252),
    'mjesto':     (0.115, 0.246, 0.95, 0.276),
}
OLD_FIELD_BOX_LAYOUTS = {'new': OLD_FIELD_BOXES_NEW, 'old': OLD_FIELD_BOXES_OLD}

DEBUG_CROPS = os.environ.get('DEBUG_CROPS') == '1'
IS_TTY = sys.stdin.isatty()

# Kaskada PSM (page-segmentation-mode) načina koje probamo za polje s kodom,
# redom, dok jedan ne uspije - isti redoslijed kao u .mjs verziji
# (Tesseract.PSM.SINGLE_LINE=7, AUTO=3, SPARSE_TEXT=11, RAW_LINE=13).
CODE_PSM_CASCADE = [7, 3, 11, 13]


def fail(msg):
    print(f"\nGREŠKA: {msg}\n", file=sys.stderr)
    sys.exit(1)


# --- Pomoćne funkcije za rasterizaciju/OCR ---
def render_page(doc, page_num, scale):
    """page_num je 1-indeksiran (kao u pdf.js), vraća PIL.Image u boji."""
    page = doc[page_num - 1]
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    return img


def crop_and_ocr(img, box, psm, debug_label, out_dir):
    """box = (fx0,fy0,fx1,fy1) kao udio širine/visine slike."""
    fx0, fy0, fx1, fy1 = box
    w, h = img.size
    x0, y0 = round(w * fx0), round(h * fy0)
    x1, y1 = round(w * fx1), round(h * fy1)
    cw, ch = x1 - x0, y1 - y0

    if cw < 20 or ch < 20:
        return ''

    crop = img.crop((x0, y0, x1, y1)).convert('L')  # grayscale
    # 3x uvećanje, oba smjera (isto kao sharp .resize({width: cw*3}), koji
    # zadržava omjer stranica - ovdje je omjer uvijek 1:1 pa je to prosto cw*3 x ch*3)
    crop = crop.resize((cw * 3, ch * 3), Image.LANCZOS)

    # Polje s kodom ima sivu/mrljavu (skeniranu) pozadinu iza crnog teksta —
    # posvijetli sliku PRIJE normalizacije kontrasta (isto kao sharp
    # .linear(1.4, 10).normalize()) - znatno olakšava OCR-u razaznati slova
    # od pozadine (bezopasno i za bijelu pozadinu - bijelo ostaje bijelo).
    arr = np.asarray(crop, dtype=np.float32)
    arr = np.clip(arr * 1.4 + 10, 0, 255)
    lo, hi = arr.min(), arr.max()
    if hi > lo:
        arr = (arr - lo) * (255.0 / (hi - lo))
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    processed = Image.fromarray(arr, mode='L')

    if DEBUG_CROPS and debug_label:
        dbg_dir = os.path.join(out_dir, '_debug')
        os.makedirs(dbg_dir, exist_ok=True)
        processed.save(os.path.join(dbg_dir, f'{debug_label}.png'))

    config = f'--psm {psm}'
    text = pytesseract.image_to_string(processed, lang='eng', config=config)
    return text.strip()


# --- NOVI format koda: PHC-{sezona1}-{sezona2}-{disc}-{kat}-{skupina}-{faza}-{utakmica} ---
NEW_CODE_RE = re.compile(
    r'PHC-(\d{4})-(\d{4})-([A-ZŽĆČŠĐ]+)-([A-ZŽĆČŠĐ]+)-([A-Z])-([A-Z]\d+)-(\d+)',
    re.IGNORECASE,
)


def parse_new_code(text):
    m = NEW_CODE_RE.search(text)
    if not m:
        return None
    disc = m.group(3).upper()
    if disc == 'Z':
        disc = 'Ž'  # OCR često ne prepozna dijakritiku
    return {
        'format': 'new',
        'season1': m.group(1), 'season2': int(m.group(2)),
        'disc': disc, 'kat': m.group(4).upper(), 'skupina': m.group(5).upper(),
        'faza': m.group(6).upper(), 'utakmica': m.group(7),
    }


# --- STARI format koda: PHC-{disc}-{tournNum}-{koloNum}-{utaNum} ---
OLD_CODE_RE = re.compile(r'PHC-([A-ZŽĆČŠĐ]+)-(\d+)-(\d+)-(\d+)', re.IGNORECASE)


def parse_old_code(text):
    m = OLD_CODE_RE.search(text)
    if not m:
        return None
    disc = m.group(1).upper()
    if disc == 'Z':
        disc = 'Ž'
    return {'format': 'old', 'disc': disc, 'tournNum': int(m.group(2)),
            'koloNum': int(m.group(3)), 'utaNum': int(m.group(4))}


def parse_season_from_text(text):
    m = re.search(r'sezona\D{0,3}(\d{4})\D{1,3}(\d{4})', text, re.IGNORECASE)
    if not m:
        return None
    y1, y2 = int(m.group(1)), int(m.group(2))
    return y2 if y2 == y1 + 1 else None


def ocr_code(img, debug_label_base, out_dir):
    """Prvo proba NOVI format (standard od rujna 2026.) na baždarenoj poziciji;
    ako ne uspije, pada na STARI format i dva stara rasporeda polja."""
    for psm in CODE_PSM_CASCADE:
        text = crop_and_ocr(img, NEW_CODE_BOX, psm, f'{debug_label_base}_new_{psm}', out_dir)
        code = parse_new_code(text)
        if code:
            return code, text, None
    for layout_name, boxes in OLD_FIELD_BOX_LAYOUTS.items():
        for psm in CODE_PSM_CASCADE:
            text = crop_and_ocr(img, boxes['code'], psm, f'{debug_label_base}_{layout_name}_{psm}', out_dir)
            code = parse_old_code(text)
            if code:
                return code, text, layout_name
    return None, '', None


def ask_manual_code(img, p, out_dir):
    debug_dir = os.path.join(out_dir, '_rucno')
    os.makedirs(debug_dir, exist_ok=True)
    fx0 = min(NEW_CODE_BOX[0], OLD_FIELD_BOXES_NEW['code'][0], OLD_FIELD_BOXES_OLD['code'][0])
    fy0 = min(NEW_CODE_BOX[1], OLD_FIELD_BOXES_NEW['code'][1], OLD_FIELD_BOXES_OLD['code'][1])
    fx1 = max(NEW_CODE_BOX[2], OLD_FIELD_BOXES_NEW['code'][2], OLD_FIELD_BOXES_OLD['code'][2])
    fy1 = max(NEW_CODE_BOX[3], OLD_FIELD_BOXES_NEW['code'][3], OLD_FIELD_BOXES_OLD['code'][3])
    w, h = img.size
    x0, y0 = round(w * fx0), round(h * fy0)
    x1, y1 = round(w * fx1), round(h * fy1)
    img_path = os.path.join(debug_dir, f'stranica_{p}_kod.png')
    img.crop((x0, y0, x1, y1)).save(img_path)

    print(f"\n  ⚠ Stranica {p}: OCR nije uspio pročitati kod. Izrezak spremljen: {img_path}")

    if not IS_TTY:
        print("  (neinteraktivno okruženje — stranica se preskače, pregledajte izrezak ručno)")
        return None

    while True:
        answer = input('    Upišite kod s te stranice (npr. PHC-2025-2026-Ž-S-A-K1-1), ili "preskoci": ').strip()
        if answer.lower() == 'preskoci':
            return None
        code = parse_new_code(answer) or parse_old_code(answer)
        if code:
            return code
        print('    Nisam prepoznao format.')


# --- STARI format: tip faze/skupina se moraju odrediti iz "Natjecanje" retka i phc-data.json ---
def parse_rink(mjesto_text):
    m = re.search(r'staza\s+([A-Za-zČŽŠĐĆ])', mjesto_text, re.IGNORECASE)
    return m.group(1).upper() if m else None


def faza_to_phase(faza):
    type_map = {'K': 'group', 'D': 'playoff', 'P': 'placement'}
    return type_map.get(faza[0]), int(faza[1:])


def find_json_match(phc_data, season, disc, kat, faza, rink):
    if not phc_data or not rink:
        return None
    ptype, num = faza_to_phase(faza)
    candidates = [
        mm for mm in phc_data.get('matches', [])
        if mm.get('season') == season and mm.get('dis') == disc
        and (mm.get('kat') or 'S') == kat
        and (mm.get('phase') or {}).get('type') == ptype
        and (mm.get('phase') or {}).get('num') == num
        and (mm.get('rink') or '').upper() == rink
    ]
    return candidates[0] if len(candidates) == 1 else None


def main():
    if len(sys.argv) < 2:
        fail(
            'Nedostaju argumenti.\n\n'
            'Korištenje: python3 split-zapisnici.py <input.pdf> [phc-data.json] [outputDir]\n'
            'Primjer:    python3 split-zapisnici.py ./Ž-S-Zapisnici.pdf ./phc-data.json ./output'
        )

    input_pdf = sys.argv[1]
    data_path = sys.argv[2] if len(sys.argv) > 2 else './phc-data.json'
    out_dir = sys.argv[3] if len(sys.argv) > 3 else './output'

    if not os.path.exists(input_pdf):
        fail(f'Ne postoji ulazni PDF: {input_pdf}')
    os.makedirs(out_dir, exist_ok=True)

    phc_data = None
    if os.path.exists(data_path):
        import json
        with open(data_path, encoding='utf-8') as f:
            phc_data = json.load(f)
    else:
        print(f'(napomena: {data_path} nije pronađen — nastavljam bez unakrsne provjere s bazom, potrebno samo za stari format koda)')

    doc = fitz.open(input_pdf)
    page_count = doc.page_count
    print(f'Ulazni PDF ima {page_count} stranica. Pokrećem OCR...\n')

    new_pages = []   # stranice s NOVIM formatom koda - vec imaju sve podatke
    old_pages = []   # stranice sa STARIM formatom koda - trebaju daljnju obradu
    skipped = []
    images = {}      # p -> PIL.Image (drzimo u memoriji do spremanja)

    for p in range(1, page_count + 1):
        print(f'  Stranica {p}/{page_count}: obrada...', end='', flush=True)
        img = render_page(doc, p, RENDER_SCALE)
        images[p] = img

        code, _raw_text, layout_name = ocr_code(img, f'p{p}_code', out_dir)
        final_code = code
        if not final_code:
            final_code = ask_manual_code(img, p, out_dir)

        if not final_code:
            skipped.append(p)
            print(f'\r  Stranica {p}/{page_count}: PRESKOČENO.                              ')
            continue

        if final_code['format'] == 'new':
            new_pages.append({'p': p, **final_code})
            fc = final_code
            print(f"\r  Stranica {p}/{page_count}: gotovo -> "
                  f"PHC-{fc['season1']}-{fc['season2']}-{fc['disc']}-{fc['kat']}-{fc['skupina']}-{fc['faza']}-{fc['utakmica']}"
                  "                              ")
        else:
            boxes = OLD_FIELD_BOX_LAYOUTS.get(layout_name, OLD_FIELD_BOXES_NEW)
            natjecanje = crop_and_ocr(img, boxes['natjecanje'], 3, f'p{p}_natjecanje', out_dir)
            datum = crop_and_ocr(img, boxes['datum'], 3, f'p{p}_datum', out_dir)
            mjesto = crop_and_ocr(img, boxes['mjesto'], 3, f'p{p}_mjesto', out_dir)
            page_season = parse_season_from_text(natjecanje)
            old_pages.append({'p': p, **final_code, 'natjecanje': natjecanje, 'datum': datum,
                               'mjesto': mjesto, 'pageSeason': page_season})
            fc = final_code
            print(f"\r  Stranica {p}/{page_count}: gotovo (stari format: {fc['disc']}, "
                  f"kolo {fc['koloNum']}, utakmica {fc['utaNum']})                              ")

    if not new_pages and not old_pages:
        fail('Nijedna stranica nije uspješno pročitana. Provjerite kvalitetu skena ili kalibraciju polja s kodom.')

    # --- Sastavi popis "assignments" (stranica -> konačni naziv datoteke) ---
    assignments = []  # dict: p, filename, seasonTag, confirmed

    # NOVI format: naziv se direktno sastavlja iz OCR-anog koda
    for pg in new_pages:
        season_tag = f"{pg['season1']}-{pg['season2']}"
        filename = f"PHC-{season_tag}-{pg['disc']}-{pg['kat']}-{pg['skupina']}-{pg['faza']}-{pg['utakmica']}.pdf"
        assignments.append({'p': pg['p'], 'filename': filename, 'seasonTag': season_tag, 'confirmed': True})

    # STARI format: ista logika kao .mjs v3 (grupiranje po disciplini/kolu, odredivanje tipa
    # iz "Natjecanje" retka, plasman-brojevi, sezona iz teksta/naziva datoteke, kat = default 'S')
    if old_pages:
        disciplines = sorted({pg['disc'] for pg in old_pages})
        old_assignments = []

        for disc_name in disciplines:
            disc_pages = [pg for pg in old_pages if pg['disc'] == disc_name]
            kolo_groups = {}
            for pg in disc_pages:
                kolo_groups.setdefault(pg['koloNum'], []).append(pg)
            sorted_kolos = sorted(kolo_groups.keys())
            playoff_idx = 0

            for kolo_num in sorted_kolos:
                members = kolo_groups[kolo_num]
                ptype, group_num = None, None
                for m in members:
                    km = re.search(r'(\d+)\s*\.?\s*kolo', m['natjecanje'], re.IGNORECASE)
                    if km:
                        ptype, group_num = 'group', int(km.group(1))
                        break
                if not ptype:
                    for m in members:
                        if re.search(r'za\s*\d+\s*\.?\s*mjesto', m['natjecanje'], re.IGNORECASE):
                            ptype = 'placement'
                            break
                if not ptype:
                    ptype = 'playoff'

                if ptype == 'group':
                    for m in members:
                        old_assignments.append({'p': m['p'], 'disc': disc_name, 'faza': f'K{group_num}',
                                                 'matchNum': m['utaNum'], 'm': m})
                elif ptype == 'playoff':
                    playoff_idx += 1
                    for m in members:
                        old_assignments.append({'p': m['p'], 'disc': disc_name, 'faza': f'D{playoff_idx}',
                                                 'matchNum': m['utaNum'], 'm': m})
                else:
                    sorted_members = sorted(members, key=lambda m: m['utaNum'])
                    n = len(sorted_members)
                    for i, m in enumerate(sorted_members):
                        placement_num = 2 * (n - 1 - i) + 1
                        old_assignments.append({'p': m['p'], 'disc': disc_name, 'faza': f'P{placement_num}',
                                                 'matchNum': 1, 'm': m})

        from_pages = [pg['pageSeason'] for pg in old_pages if pg['pageSeason']]
        if from_pages:
            old_season = Counter(from_pages).most_common(1)[0][0]
        else:
            fn_match = re.search(r'(\d{4})\s*[-/]\s*(\d{4})', os.path.basename(input_pdf))
            old_season = int(fn_match.group(2)) if fn_match and int(fn_match.group(2)) == int(fn_match.group(1)) + 1 else None
        if not old_season:
            fail('(stari format) Nisam uspio odrediti sezonu ni iz stranica ni iz naziva datoteke za stranice sa starim kodom.')

        old_kat = 'S'  # stari kod ne nosi kategoriju - default Seniori
        old_season_tag = f'{old_season - 1}-{old_season}'

        not_in_db = 0
        for a in old_assignments:
            rink = parse_rink(a['m']['mjesto'])
            json_match = find_json_match(phc_data, old_season, a['disc'], old_kat, a['faza'], rink)
            group = (json_match or {}).get('group', 'A')
            match_num = (json_match or {}).get('matchNum', a['matchNum'])
            filename = f"PHC-{old_season_tag}-{a['disc']}-{old_kat}-{group}-{a['faza']}-{match_num}.pdf"
            if not json_match:
                not_in_db += 1
            assignments.append({'p': a['p'], 'filename': filename, 'seasonTag': old_season_tag,
                                 'confirmed': bool(json_match)})
        if not_in_db:
            print(f"\n(napomena: {not_in_db} stranica sa STARIM formatom koda nije potvrđeno u {data_path} — skupina/broj su procjena.)")

    assignments.sort(key=lambda a: a['p'])

    # --- Generiraj datoteke ---
    print(f'\nSpremam {len(assignments)} datoteka...\n')

    season_dirs = {}
    for a in assignments:
        season_dir = os.path.join(out_dir, a['seasonTag'])
        if a['seasonTag'] not in season_dirs:
            os.makedirs(season_dir, exist_ok=True)
            season_dirs[a['seasonTag']] = season_dir

        img = images[a['p']]
        pipeline_img = img
        if pipeline_img.width > MAX_WIDTH_PX:
            new_h = round(MAX_WIDTH_PX * pipeline_img.height / pipeline_img.width)
            pipeline_img = pipeline_img.resize((MAX_WIDTH_PX, new_h), Image.LANCZOS)
        if GRAYSCALE:
            pipeline_img = pipeline_img.convert('L')

        jpeg_buf = io.BytesIO()
        pipeline_img.save(jpeg_buf, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        jpeg_bytes = jpeg_buf.getvalue()

        out_doc = fitz.open()
        out_page = out_doc.new_page(width=pipeline_img.width, height=pipeline_img.height)
        rect = fitz.Rect(0, 0, pipeline_img.width, pipeline_img.height)
        out_page.insert_image(rect, stream=jpeg_bytes)
        out_path = os.path.join(season_dirs[a['seasonTag']], a['filename'])
        out_doc.save(out_path)
        out_doc.close()

        size_kb = round(os.path.getsize(out_path) / 1024)
        check = '✓' if a['confirmed'] else '?'
        print(f"  stranica {a['p']} -> {a['seasonTag']}/{a['filename']}  ({size_kb} KB)  [{check}]")

    print(f'\nGotovo. {len(assignments)} datoteka spremljeno.')
    if skipped:
        print(f"PRESKOČENE stranice (OCR nije uspio): {', '.join(map(str, skipped))} — "
              f"pregledajte izreske u {os.path.join(out_dir, '_rucno')}")


if __name__ == '__main__':
    main()
