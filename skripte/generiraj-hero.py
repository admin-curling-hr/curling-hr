#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generiraj-hero.py
-----------------
Skenira assets/images/hero/ i generira assets/json/hero.json, popis naslovnih slika
za vrtnju na početnoj stranici (assets/js/hero.js prikazuje nekoliko najnovijih).

Pravila:
  - slika se zove po datumu objave: GGGG-MM-DD.jpg (ili .jpeg, .png, .webp);
    noviji datum = prikazuje se prva; datoteke s drugačijim imenom se preskaču
  - uz sliku ide GGGG-MM-DD.txt s natpisom: 1. redak hrvatski, 2. redak engleski
    (neobavezno; ako ga nema, koristi se hrvatski). Bez .txt slika nema natpisa.
  - preporučena veličina slike: 1100 x 200 px (tako se prikazuje na stranici)

Pokreće se automatski (GitHub Action generiraj-hero.yml) kad se išta promijeni u
assets/images/hero/; može se pokrenuti i ručno, bez argumenata:
    python3 skripte/generiraj-hero.py      (Windows: python skripte\\generiraj-hero.py)
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DIR = os.path.join(ROOT, 'assets', 'images', 'hero')
OUT = os.path.join(ROOT, 'assets', 'json', 'hero.json')
IME = re.compile(r'^(\d{4}-\d{2}-\d{2})\.(jpg|jpeg|png|webp)$', re.IGNORECASE)


def procitaj_natpis(datum):
    p = os.path.join(DIR, datum + '.txt')
    if not os.path.exists(p):
        return '', ''
    with open(p, encoding='utf-8-sig') as f:          # -sig: uklanja BOM koji dodaje Notepad
        redovi = [r.strip() for r in f.read().splitlines() if r.strip()]
    hr = redovi[0] if redovi else ''
    en = redovi[1] if len(redovi) > 1 else hr
    return hr, en


def main():
    if not os.path.isdir(DIR):
        print('Nema mape ' + DIR, file=sys.stderr)
        return 1
    slike = []
    for ime in sorted(os.listdir(DIR), reverse=True):
        m = IME.match(ime)
        if not m:
            if not ime.lower().endswith('.txt'):
                print('Preskačem (ime nije GGGG-MM-DD): ' + ime)
            continue
        hr, en = procitaj_natpis(m.group(1))
        if not hr:
            print('Upozorenje: nema natpisa za ' + ime)
        slike.append({'datum': m.group(1), 'slika': ime, 'hr': hr, 'en': en})
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'slike': slike}, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('hero.json: %d slika (najnovija: %s)' % (len(slike), slike[0]['slika'] if slike else '-'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
