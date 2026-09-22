#!/usr/bin/env python3
"""
generiraj-vijesti.py
--------------------
Skenira sve foldere u vijesti/ (format yyyy-mm-dd, svaki sadrži index.html),
čita meta tagove i generira vijesti.json u korijenu projekta.

Meta tagovi koje čita iz svakog index.html:
  <meta name="datum"   content="2026-09-11">
  <meta name="naslov"  content="Naslov vijesti">
  <meta name="excerpt" content="Kratki opis...">
  <meta name="slika"   content="">   (opcionalno, ime fajla u istom folderu, npr. "1.jpg")

Ime foldera mora biti u formatu: yyyy-mm-dd (datum je dovoljan jer nikad
nema dvije vijesti istog dana). Unutar foldera mora postojati index.html.
"""

import os
import json
import re
import sys

VIJESTI_DIR = os.path.join(os.path.dirname(__file__), '..', 'vijesti')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'vijesti.json')

def get_meta(html, name):
    """Čita vrijednost meta taga po imenu."""
    pattern = rf'<meta\s+name="{name}"\s+content="([^"]*)"'
    match = re.search(pattern, html, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Try reversed attribute order
    pattern2 = rf'<meta\s+content="([^"]*)"\s+name="{name}"'
    match2 = re.search(pattern2, html, re.IGNORECASE)
    return match2.group(1).strip() if match2 else None

def procesiraj_vijest(dirname):
    """Čita index.html iz foldera vijesti/<dirname>/ i vraća dict s podacima."""
    # Provjeri format imena foldera: yyyy-mm-dd
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', dirname):
        print(f"  PRESKACEM (krivi format imena foldera): {dirname}", file=sys.stderr)
        return None

    filepath = os.path.join(VIJESTI_DIR, dirname, 'index.html')
    if not os.path.isfile(filepath):
        print(f"  PRESKACEM (nema index.html): {dirname}", file=sys.stderr)
        return None

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()
    except Exception as e:
        print(f"  GREŠKA čitanja {dirname}/index.html: {e}", file=sys.stderr)
        return None

    naslov  = get_meta(html, 'naslov')
    datum   = get_meta(html, 'datum') or dirname
    excerpt = get_meta(html, 'excerpt')
    slika   = get_meta(html, 'slika') or None

    # Provjeri obavezne podatke
    if not naslov:
        print(f"  UPOZORENJE: {dirname}/index.html nema meta tag 'naslov'", file=sys.stderr)
        naslov = dirname
    if not excerpt:
        print(f"  UPOZORENJE: {dirname}/index.html nema meta tag 'excerpt'", file=sys.stderr)
        excerpt = ''

    # Prazna slika -> None
    if slika == '':
        slika = None

    return {
        'datum':   datum,
        'naslov':  naslov,
        'excerpt': excerpt,
        'slika':   slika,
    }

def main():
    print(f"Skeniram: {os.path.abspath(VIJESTI_DIR)}")

    if not os.path.isdir(VIJESTI_DIR):
        print(f"GREŠKA: Folder vijesti/ ne postoji!", file=sys.stderr)
        sys.exit(1)

    vijesti = []
    for dirname in sorted(os.listdir(VIJESTI_DIR)):
        full = os.path.join(VIJESTI_DIR, dirname)
        if not os.path.isdir(full):
            continue
        vijest = procesiraj_vijest(dirname)
        if vijest:
            vijesti.append(vijest)
            print(f"  ✓ {dirname} -> {vijest['datum']} | {vijest['naslov'][:50]}")

    # Sortiraj po datumu silazno (najnovije prve)
    vijesti.sort(key=lambda v: v['datum'], reverse=True)

    # Piši JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(vijesti, f, ensure_ascii=False, indent=2)

    print(f"\nGenerirano: {OUTPUT_FILE}")
    print(f"Ukupno vijesti: {len(vijesti)}")

if __name__ == '__main__':
    main()
