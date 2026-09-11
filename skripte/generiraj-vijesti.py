#!/usr/bin/env python3
"""
generiraj-vijesti.py
--------------------
Skenira sve HTML fileove u folderu vijesti/, čita meta tagove
i generira vijesti.json u korijenu projekta.

Meta tagovi koje čita iz svakog filea:
  <meta name="datum"   content="2026-09-11">
  <meta name="naslov"  content="Naslov vijesti">
  <meta name="excerpt" content="Kratki opis...">
  <meta name="slika"   content="">   (opcionalno)

Ime filea mora biti u formatu: yyyy-mm-dd-slug.html
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

def procesiraj_vijest(filepath):
    """Čita jedan HTML file i vraća dict s podacima."""
    filename = os.path.basename(filepath)
    
    # Skip TEMPLATE.html
    if filename.upper() == 'TEMPLATE.HTML':
        return None
    
    # Provjeri format imena: yyyy-mm-dd-slug.html
    date_match = re.match(r'^(\d{4}-\d{2}-\d{2})-(.+)\.html$', filename)
    if not date_match:
        print(f"  PRESKACEM (krivi format imena): {filename}", file=sys.stderr)
        return None
    
    datum_iz_naziva = date_match.group(1)
    slug = filename.replace('.html', '')  # cijelo ime bez .html
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()
    except Exception as e:
        print(f"  GREŠKA čitanja {filename}: {e}", file=sys.stderr)
        return None
    
    naslov  = get_meta(html, 'naslov')
    datum   = get_meta(html, 'datum') or datum_iz_naziva
    excerpt = get_meta(html, 'excerpt')
    slika   = get_meta(html, 'slika') or None
    
    # Provjeri obavezne podatke
    if not naslov:
        print(f"  UPOZORENJE: {filename} nema meta tag 'naslov'", file=sys.stderr)
        naslov = slug
    if not excerpt:
        print(f"  UPOZORENJE: {filename} nema meta tag 'excerpt'", file=sys.stderr)
        excerpt = ''
    
    # Prazna slika -> None
    if slika == '':
        slika = None
    
    return {
        'slug':    slug,
        'naslov':  naslov,
        'datum':   datum,
        'excerpt': excerpt,
        'slika':   slika,
    }

def main():
    print(f"Skeniram: {os.path.abspath(VIJESTI_DIR)}")
    
    if not os.path.isdir(VIJESTI_DIR):
        print(f"GREŠKA: Folder vijesti/ ne postoji!", file=sys.stderr)
        sys.exit(1)
    
    vijesti = []
    for filename in sorted(os.listdir(VIJESTI_DIR)):
        if not filename.endswith('.html'):
            continue
        filepath = os.path.join(VIJESTI_DIR, filename)
        vijest = procesiraj_vijest(filepath)
        if vijest:
            vijesti.append(vijest)
            print(f"  ✓ {filename} -> {vijest['datum']} | {vijest['naslov'][:50]}")
    
    # Sortiraj po datumu silazno (najnovije prve)
    vijesti.sort(key=lambda v: v['datum'], reverse=True)
    
    # Piši JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(vijesti, f, ensure_ascii=False, indent=2)
    
    print(f"\nGenerirano: {OUTPUT_FILE}")
    print(f"Ukupno vijesti: {len(vijesti)}")

if __name__ == '__main__':
    main()
