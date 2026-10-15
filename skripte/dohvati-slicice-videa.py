#!/usr/bin/env python3
"""
dohvati-slicice-videa.py
------------------------
Skida YouTubeove sličice koje nedostaju, i sprema ih lokalno uz stranicu (posjetitelji ih dobivaju
s naše domene, bez kontakta s YouTubeom/Googleom prije klika). Postojeće sličice se NIKAD ne prepisuju
(ručno napravljena ili učitana sličica ima prednost). Skida se pri objavi, a ne u pregledniku posjetitelja.

1) Prvenstva: za svaki YouTube redak u prvenstva/<sezona>/<dis-kat>/video.txt oblika
       N: ID_VIDEA Naslov
   treba postojati video-N.jpg u istoj mapi.

2) Vijesti: za svaki video u vijesti/<datum>/index.html (button.video-tile, a u starijim vijestima
   button.video-facade, s data-yt="ID") treba postojati video-ID.jpg u istom folderu. Ako button ima
   klasu video-tile-okomit (odnosno video-facade-okomit; okomiti video / Shorts), s preuzete se
   sličice režu crne bočne trake, ako ih ima.

Sličica je JPEG širine najviše 640 px. Redoslijed pokušaja: maxresdefault (1280x720, 16:9) pa mqdefault
(320x180, 16:9). Slike uže od 320 px (YouTubeov "nema slike" prikaz) odbacuju se.

Pokretanje (iz korijena repozitorija):
    pip install pillow
    python3 skripte/dohvati-slicice-videa.py                # prvenstva/ i vijesti/
    python3 skripte/dohvati-slicice-videa.py neka/mapa      # samo prvenstva-oblik u drugoj mapi (testiranje)

Okolinske varijable (samo za testiranje): YT_THUMB_BASE (zadano https://i.ytimg.com/vi) i VIJESTI_ROOT
(zadano vijesti; prazno = preskoči vijesti).
Skripta uvijek završava s kodom 0 (neuspjeh jednog videa ne smije srušiti workflow);
neuspjesi se ispisuju kao GitHub upozorenja (::warning::).
"""

import io
import os
import re
import sys
import urllib.error
import urllib.request

from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'prvenstva'
VIJESTI_ROOT = os.environ.get('VIJESTI_ROOT', 'vijesti' if len(sys.argv) <= 1 else '')
BASE = os.environ.get('YT_THUMB_BASE', 'https://i.ytimg.com/vi').rstrip('/')
VARIANTS = ['maxresdefault', 'mqdefault']
MIN_WIDTH = 320
MAX_WIDTH = 640

# Isti oblik retka kao u assets/js/prvenstva.js (loadVideoTxt)
YT_LINE = re.compile(r'^\s*(\d+)\s*:\s*([A-Za-z0-9_-]{11})(?:(?:\s*\|\s*|\s+)(.*?))?\s*$')


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'curling-hr-thumbnail-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read()


def get_thumbnail(video_id):
    """Vraća PIL sliku ili None."""
    for variant in VARIANTS:
        url = f'{BASE}/{video_id}/{variant}.jpg'
        try:
            data = fetch(url)
            img = Image.open(io.BytesIO(data))
            img.load()
        except (urllib.error.URLError, OSError, ValueError) as e:
            print(f'  - {variant}: nije dostupno ({e})')
            continue
        if img.width < MIN_WIDTH:
            print(f'  - {variant}: premala slika ({img.width}x{img.height}), odbacujem')
            continue
        print(f'  + {variant}: {img.width}x{img.height}')
        return img
    return None


def crop_side_bars(img):
    """Odreže crne bočne trake (okomiti video u 16:9 sličici). Vraća izrezanu sliku ili original."""
    gray = img.convert('L').point(lambda v: 255 if v > 24 else 0)
    bbox = gray.getbbox()
    if not bbox:
        return img
    left, _top, right, _bottom = bbox
    if right - left < 0.75 * img.width and (right - left) / img.height < 0.9:
        return img.crop((left, 0, right, img.height))
    return img


def save_jpeg(img, target):
    img = img.convert('RGB')
    if img.width > MAX_WIDTH:
        img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
    img.save(target, 'JPEG', quality=82, optimize=True)


# Otvarajući <button ...> tag s klasom video-tile ili video-facade (redoslijed atributa nije bitan)
FACADE_TAG = re.compile(r'<button\b[^>]*>', re.I)


def news_videos(html):
    """Vraća [(id, okomit)] za sve video buttone (video-tile / video-facade) u HTML-u vijesti."""
    found = []
    for m in FACADE_TAG.finditer(html):
        tag = m.group(0)
        cls = re.search(r'\bclass="([^"]*)"', tag)
        yt = re.search(r'\bdata-yt="([A-Za-z0-9_-]{11})"', tag)
        if not cls or not yt:
            continue
        klase = cls.group(1).split()
        if 'video-tile' not in klase and 'video-facade' not in klase:
            continue
        found.append((yt.group(1), 'video-tile-okomit' in klase or 'video-facade-okomit' in klase))
    return found


def main():
    created = 0
    failed = 0
    skipped = 0

    def process(target, vid, okomit=False):
        nonlocal created, failed
        print(f'{target}  (YouTube {vid}{", okomito" if okomit else ""})')
        img = get_thumbnail(vid)
        if img is None:
            failed += 1
            print(f'::warning file={os.path.dirname(target)}::Nije uspjelo skidanje sličice za video {vid}. '
                  f'Dodaj {os.path.basename(target)} ručno.')
            return
        if okomit:
            img = crop_side_bars(img)
        save_jpeg(img, target)
        created += 1

    # 1) prvenstva
    for dirpath, _dirs, files in sorted(os.walk(ROOT)):
        if 'video.txt' not in files:
            continue
        with open(os.path.join(dirpath, 'video.txt'), encoding='utf-8') as f:
            lines = f.read().splitlines()
        for line in lines:
            m = YT_LINE.match(line)
            if not m:
                continue
            n, vid = m.group(1), m.group(2)
            target = os.path.join(dirpath, f'video-{int(n)}.jpg')
            if os.path.exists(target):
                skipped += 1
                continue
            process(target, vid)

    # 2) vijesti
    if VIJESTI_ROOT and os.path.isdir(VIJESTI_ROOT):
        for name in sorted(os.listdir(VIJESTI_ROOT)):
            page = os.path.join(VIJESTI_ROOT, name, 'index.html')
            if not os.path.isfile(page):
                continue
            with open(page, encoding='utf-8') as f:
                html = f.read()
            seen = set()
            for vid, okomit in news_videos(html):
                if vid in seen:
                    continue
                seen.add(vid)
                target = os.path.join(VIJESTI_ROOT, name, f'video-{vid}.jpg')
                if os.path.exists(target):
                    skipped += 1
                    continue
                process(target, vid, okomit)

    print(f'Gotovo: stvoreno {created}, već postoji {skipped}, neuspjelo {failed}.')


if __name__ == '__main__':
    main()
