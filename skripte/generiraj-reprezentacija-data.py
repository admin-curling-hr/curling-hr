#!/usr/bin/env python3
"""
generate-wc-data.py

Pretvara wc-data.xlsx (nastupi hrvatskih reprezentacija na međunarodnim - svjetskim i
europskim - prvenstvima) u wc-data.json koji koristi web aplikacija (index.html), za
prikaz na stranici "Reprezentacija".

Upotreba:
    python3 generate-wc-data.py wc-data.xlsx wc-data.json

Excel mora imati list "Curling" sa stupcima:
    Dis, Kat, Nat, Sezona, Mjesto, Država, Plasman, Sudionika, Skor, Skip, I2, I3, I4, I5
"""

import sys
import json
import pandas as pd

# Rezervni nazivi ako kolona "Naziv" u Excelu za neki redak nedostaje - inače se uvijek
# koristi stvarni puni naziv natjecanja upisan u bazi.
NAT_LABELS_FALLBACK = {
    'ECC': 'European Championship',
    'ECCC': 'European Championship C-group',
    'WCPQ': 'World Championship Pre-Qualifier',
    'WMXCC': 'World Mixed Championship',
    'EMCC': 'European Mixed Championship',
    'WMDQE': 'World Mixed-Doubles Qualifier',
    'WMDCC': 'World Mixed-Doubles Championship',
    'WJBCC': 'World Junior Championship B-group',
    'EYOF': 'European Youth Olympic Festival',
    'WSCC': 'World Senior Championship',
}

DIS_LABELS = {'M': 'Muškarci', 'Ž': 'Žene', 'MC': 'Mješoviti curling', 'MP': 'Mješoviti parovi'}
KAT_LABELS = {'S': 'Seniori', 'J': 'Juniori', 'V': 'Veterani'}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    in_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'wc-data.json'

    df = pd.read_excel(in_path, sheet_name='Curling')

    entries = []
    for _, r in df.iterrows():
        players = []
        for col, label in [('Skip', 'Skip'), ('I2', 'Igrač 2'), ('I3', 'Igrač 3'), ('I4', 'Igrač 4'), ('I5', 'Igrač 5')]:
            if pd.notna(r.get(col)):
                players.append({'name': str(r[col]).strip(), 'role': label})

        nat = str(r['Nat']).strip()
        nat_label = str(r['Naziv']).strip() if pd.notna(r.get('Naziv')) else NAT_LABELS_FALLBACK.get(nat, nat)

        # "Sezona" je sad puna oznaka (npr. "2025-2026") - internо i dalje koristimo samo
        # "kasniju" godinu (2026) za filtriranje/sortiranje, isto kao ostatak aplikacije.
        sezona_raw = str(r['Sezona']).strip()
        season_year = int(sezona_raw.split('-')[-1]) if '-' in sezona_raw else int(sezona_raw)

        wcdb = int(r['WCDB']) if pd.notna(r.get('WCDB')) else None

        entries.append({
            'dis': r['Dis'],
            'kat': r['Kat'],
            'nat': nat,
            'natLabel': nat_label,
            'season': season_year,
            'datum': str(r['Datum']).strip() if pd.notna(r.get('Datum')) else None,
            'mjesto': r['Mjesto'],
            'drzava': r['Država'],
            'plasman': int(r['Plasman']) if pd.notna(r['Plasman']) else None,
            'sudionika': int(r['Sudionika']) if pd.notna(r['Sudionika']) else None,
            'skor': r['Skor'],
            'wcdb': wcdb,
            'players': players,
        })

    entries.sort(key=lambda e: (-e['season'], e['dis'], e['kat']))

    out = {'entries': entries}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)

    print(f"Gotovo: {len(entries)} nastupa -> {out_path}")


if __name__ == '__main__':
    main()
