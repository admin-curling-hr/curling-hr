#!/usr/bin/env python3
"""
generate-data.py

Pretvara Export.xlsx (izvoz iz baze prvenstava) u phc-data.json koji koristi
web aplikacija (index.html).

Upotreba:
    python3 generate-data.py Export.xlsx phc-data.json

Ako se drugi argument izostavi, izlaz ide u "phc-data.json" u trenutnoj mapi.

Potrebne biblioteke: pandas, openpyxl
    pip install pandas openpyxl --break-system-packages

Excel mora imati listove: Utakmice, Prvenstva, DBIgraci, DBEkipe
(Parametri list se trenutno ne koristi).
"""

import sys
import json
import os
import pandas as pd

DIS_LABELS = {'M': 'Muškarci', 'Ž': 'Žene', 'MC': 'Mješoviti curling', 'MP': 'Mješoviti parovi'}
KAT_LABELS = {'S': 'Seniori', 'J': 'Juniori', 'V': 'Veterani'}


def parse_phase(f):
    f = str(f)
    if f.startswith('K'):
        n = int(f[1:])
        return {'type': 'group', 'num': n, 'label': f'{n}. kolo'}
    if f.startswith('D'):
        n = int(f[1:])
        return {'type': 'playoff', 'num': n, 'label': f'Doigravanje – krug {n}'}
    if f.startswith('P'):
        n = int(f[1:])
        label = 'Finale' if n == 1 else f'Utakmica za {n}. mjesto'
        return {'type': 'placement', 'num': n, 'label': label}
    return {'type': 'unknown', 'num': 0, 'label': f}


def fmt_date(v):
    try:
        return pd.to_datetime(v, dayfirst=True).strftime('%Y-%m-%d')
    except Exception:
        return None


def build(export_path, out_path):
    xl = pd.ExcelFile(export_path)
    um = pd.read_excel(xl, sheet_name='Utakmice')
    pv = pd.read_excel(xl, sheet_name='Prvenstva')
    ig = pd.read_excel(xl, sheet_name='DBIgraci')
    ek = pd.read_excel(xl, sheet_name='DBEkipe')

    # --- lookup tablice ---
    player_lookup = {}
    for _, r in ig.iterrows():
        if pd.notna(r['Br']):
            player_lookup[int(r['Br'])] = r['Ime i prezime']

    def pname(code):
        if pd.isna(code):
            return None
        return player_lookup.get(int(code), f"Igrač #{int(code)}")

    team_lookup = {}
    for _, r in ek.iterrows():
        if pd.notna(r['Skraceno']) and r['Skraceno'] != '-':
            team_lookup[(r['Disc'], r['Skraceno'])] = r['Ekipa']

    def tname(disc, short):
        if pd.isna(short):
            return short
        return team_lookup.get((disc, short), short)

    def roster(row, suffix):
        positions = [
            ('Pr' + suffix, 'Prvi'), ('Dr' + suffix, 'Drugi'),
            ('Tr' + suffix, 'Treći'), ('Ce' + suffix, 'Četvrti'),
            ('Re' + suffix, 'Rezerva'),
        ]
        skip_code = row.get('Sk' + suffix)
        vice_code = row.get('Vi' + suffix)
        pd_code = row.get('Pd' + suffix)
        pl_code = row.get('Pl' + suffix)
        ppa = row.get('PP' + suffix + 'a')
        ppb = row.get('PP' + suffix + 'b')
        out = []
        for i, (col, label) in enumerate(positions):
            code = row.get(col)
            if pd.isna(code):
                continue
            name = pname(code)
            badge = None
            if pd.notna(skip_code) and code == skip_code:
                badge = 'Skip'
            elif pd.notna(vice_code) and code == vice_code:
                badge = 'Vice-skip'
            lsd = None
            if pd.notna(pd_code) and code == pd_code and pd.notna(ppa):
                lsd = {'rotation': 'D', 'distance': round(float(ppa), 1)}
            elif pd.notna(pl_code) and code == pl_code and pd.notna(ppb):
                lsd = {'rotation': 'L', 'distance': round(float(ppb), 1)}
            out.append({'order': i + 1, 'name': name, 'position': label, 'role': badge, 'lsd': lsd})
        return out

    # --- utakmice ---
    d = um.dropna(subset=['Ekipa1', 'Ekipa2']).copy()
    matches = []
    for _, r in d.iterrows():
        ends = []
        oe = int(r['OE']) if pd.notna(r['OE']) else None
        scheduled_ends = int(r['En']) if pd.notna(r.get('En')) else 8
        extra_end_allowed = bool(r['EE']) if pd.notna(r.get('EE')) else True
        pw1 = int(r['Pw1']) if pd.notna(r.get('Pw1')) and r['Pw1'] > 0 else None
        pw2 = int(r['Pw2']) if pd.notna(r.get('Pw2')) and r['Pw2'] > 0 else None
        for i in range(1, 12):
            v = r.get(f'E{i}')
            if pd.notna(v):
                ends.append(int(v))

        phase = parse_phase(r['Faza'])
        uses_lsd = bool(r['PP']) if pd.notna(r['PP']) else False
        throws1, throws2 = [], []
        if uses_lsd:
            a1, b1 = r.get('PP1a'), r.get('PP1b')
            a2, b2 = r.get('PP2a'), r.get('PP2b')
            if pd.notna(a1):
                throws1.append(round(float(a1), 1))
            if pd.notna(b1):
                throws1.append(round(float(b1), 1))
            if pd.notna(a2):
                throws2.append(round(float(a2), 1))
            if pd.notna(b2):
                throws2.append(round(float(b2), 1))

        kat = r['Kat'] if pd.notna(r['Kat']) else 'S'
        dis = r['Dis']
        pk = int(r['PK']) if r.get('PK') in (1, 2) else None
        # Ako PK nije upisan u Excelu (npr. utakmica otkazana pa se to preskočilo), a imamo oba
        # bacanja preciznog polaganja za obje ekipe, izračunaj pobjednika: manji ZBROJ oba bacanja
        # pobjeđuje. Pravilo potvrđeno na 258 utakmica gdje je PK poznat - poklapa se u 257 (99.6%).
        # Ako su zbrojevi identični, ne možemo odrediti pobjednika pa PK ostaje prazan.
        if pk is None and len(throws1) == 2 and len(throws2) == 2:
            sum1, sum2 = sum(throws1), sum(throws2)
            if sum1 < sum2:
                pk = 1
            elif sum2 < sum1:
                pk = 2

        matches.append({
            'id': f"{int(r['Sez'])}-{dis}-{kat}-{int(r['Prv'])}-{r['Sku'] if pd.notna(r['Sku']) else 'X'}-{r['Faza']}-{int(r['Uta'])}",
            'season': int(r['Sez']),
            'dis': dis, 'disLabel': DIS_LABELS.get(dis, dis),
            'kat': kat, 'katLabel': KAT_LABELS.get(kat, kat),
            'p': int(r['Prv']),
            'group': r['Sku'] if pd.notna(r['Sku']) else None,
            'phase': phase,
            'matchNum': int(r['Uta']),
            'date': fmt_date(r['Datum']),
            'time': str(r['Vrijeme']) if pd.notna(r['Vrijeme']) else None,
            'city': r['Mjesto'] if pd.notna(r['Mjesto']) else None,
            'venue': r['Dvorana'] if pd.notna(r['Dvorana']) else None,
            'rink': r['Staza'] if pd.notna(r['Staza']) else None,
            'played': bool(r['Odig']) if pd.notna(r['Odig']) else False,
            'usesLSD': uses_lsd,
            'throws1': throws1, 'throws2': throws2,
            'pk': pk,
            'team1': tname(dis, r['Ekipa1']), 'team2': tname(dis, r['Ekipa2']),
            'team1Short': r['Ekipa1'] if pd.notna(r['Ekipa1']) else None,
            'team2Short': r['Ekipa2'] if pd.notna(r['Ekipa2']) else None,
            'score1': float(r['Kam1']) if pd.notna(r['Kam1']) else None,
            'score2': float(r['Kam2']) if pd.notna(r['Kam2']) else None,
            'winner': int(r['Pob']) if r['Pob'] in (1, 2) else None,
            'ends': ends, 'numEnds': oe,
            'scheduledEnds': scheduled_ends, 'extraEndAllowed': extra_end_allowed,
            'powerPlay1': pw1, 'powerPlay2': pw2,
            'roster1': roster(r, '1'), 'roster2': roster(r, '2'),
        })

    # --- prvenstva ---
    tournaments = {}
    for _, r in pv.iterrows():
        kat = r['Kat'] if pd.notna(r['Kat']) else 'S'
        dis = r['Dis']
        key = (int(r['Sez']), dis, kat, int(r['Prv']))
        if key not in tournaments:
            tournaments[key] = {
                'season': int(r['Sez']), 'dis': dis, 'disLabel': DIS_LABELS.get(dis, dis),
                'kat': kat, 'katLabel': KAT_LABELS.get(kat, kat),
                'p': int(r['Prv']),
                'teamsCount': int(r['BrEkipa']) if pd.notna(r['BrEkipa']) else None,
                'sustav': str(r['Sustav']).strip() if pd.notna(r.get('Sustav')) else None,
                'standings': [], 'rosterPool': {},
            }
        t = tournaments[key]
        place = int(r['Mjesto']) if pd.notna(r['Mjesto']) else None
        full_name = tname(dis, r['Ekipa'])
        t['standings'].append({'team': full_name, 'place': place})
        players = []
        for i in range(1, 12):
            code = r.get(f'I{i}')
            if pd.notna(code):
                players.append(pname(code))
        t['rosterPool'][full_name] = players

    for t in tournaments.values():
        t['standings'].sort(key=lambda x: (x['place'] is None, x['place']))
    tournaments_list = list(tournaments.values())

    # --- klubovi (grupiranje ekipa po klubu, po disciplini) ---
    clubs = {}
    for _, r in ek.iterrows():
        if pd.notna(r['Ekipa']) and r['Ekipa'] != '-' and pd.notna(r['Klub']) and r['Klub'] != '-':
            clubs.setdefault(r['Disc'], {})[r['Ekipa']] = r['Klub']

    # --- mjesto i e-adresa po klubu (ako postoje te kolone u DBEkipe) ---
    club_meta = {}
    if 'Mjesto' in ek.columns or 'E-adresa' in ek.columns:
        ek_valid = ek[(ek.get('Klub', '-') != '-') & ek['Klub'].notna()]
        for klub, group in ek_valid.groupby('Klub'):
            mjesto = None
            email = None
            if 'Mjesto' in group.columns:
                vals = group['Mjesto'].dropna()
                vals = vals[vals != '-']
                if len(vals):
                    mjesto = vals.mode().iloc[0]  # najčešća vrijednost (otporno na tipfelere)
            if 'E-adresa' in group.columns:
                vals = group['E-adresa'].dropna()
                vals = vals[vals != '-']
                if len(vals):
                    email = vals.mode().iloc[0]
            if mjesto or email:
                entry = {}
                if mjesto:
                    entry['mjesto'] = mjesto
                if email:
                    entry['email'] = email
                club_meta[klub] = entry

    combined = {'matches': matches, 'tournaments': tournaments_list, 'clubs': clubs, 'clubMeta': club_meta}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False)

    print(f"Gotovo: {len(matches)} utakmica, {len(tournaments_list)} prvenstava -> {out_path}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Upotreba: python3 generate-data.py Export.xlsx [phc-data.json]")
        sys.exit(1)
    export_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'phc-data.json'
    if not os.path.exists(export_path):
        print(f"Datoteka ne postoji: {export_path}")
        sys.exit(1)
    build(export_path, out_path)
