#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generiraj-znacke.py
--------------------
Generira assets/js/znacke-data.js iz assets/json/prvenstva-data.json,
reproducirajuci logiku iz assets/js/prvenstva.js (computePlayerStats, nhc*,
playerBadges). Pokrece se bez argumenata - putevi su fiksni, isto kao kod
skripte/generiraj-vijesti.py.

Znacka "Zvijezda" (NHC bodovi): formula je rekonstruirana i potvrdena na svih
39 poznatih vrijednosti iz izvornog (rucno "zamrznutog") znacke-data.js (0
mismatcheva, provjereno 22.9.2026.). Vrijednost znacke = NAJVISI (peak, ikad
postignut) "5-sezona rolling" NHC zbroj kroz cijelu karijeru igraca, tj.
max_preko_svih_moguce_anchor_sezone(nhcContribution zbroj s tezinama
[1, 0.8, 0.6, 0.4, 0.2] za zadnjih 5 sezona od tog anchora unazad) - ISTA
nhcContribution/nhcSeasonWeight/nhcPoints logika kao za "trenutni" NHC prikaz
na stranici (getNhcBreakdown u prvenstva.js), samo evaluirana na anchoru koji
igracu daje najvecu vrijednost umjesto na trenutnoj/zadnjoj sezoni.

Znacka "Kirurg" (preciznost preciznih polaganja) sortira se UZLAZNO unutar
tiera (manja udaljenost od centra kuce = bolje), za razliku od svih ostalih
znacki koje sortiraju silazno (veca vrijednost = bolje).

Ako se doda nova znacka u BADGE_META u postojecem znacke-data.js koju ova
skripta ne zna izracunati, njena lista ce ispasti prazna - provjeri
TIER_THRESHOLDS i build_badges() ispod prije nego sto se to doda u produkciju.
"""
import json
import os
import re
from collections import defaultdict

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'json', 'prvenstva-data.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'js', 'znacke-data.js')

NHC_WEIGHTS = [1, 0.8, 0.6, 0.4, 0.2]

TIER_THRESHOLDS = {
    # badge: (broncani_min, srebrni_min, zlatni_min) - "min" znaci >=
    'Zvijezda': (200, 300, 400),
    'Osnivač': None,       # posebno (jednakost sa sezonom)
    'Pionir': None,        # posebno (jednakost s brojem prvenstva)
    'Svestranost': None,   # posebno
    'Veteran': (10, 15, 20),
    'Upornost': (50, 100, 150),
    'Par': (20, 40, 60),
    'Vjernost': (10, 15, 20),
    'Kovač': None,          # posebno (najbolja boja medalje)
    'Kolekcionar': (5, 10, 20),
    'Hat-trick': (3, 5, 10),
    'Prvak': (1, 5, 10),
    'Kirurg': None,          # posebno (<=30/20/10 cm, manje je bolje)
    'Skip': (25, 50, 100),
    'Vice-skip': (25, 50, 100),
    'Četvrti': (25, 50, 100),
    'Treći': (25, 50, 100),
    'Drugi': (25, 50, 100),
    'Prvi': (25, 50, 100),
    'Rezerva': (10, 25, 50),
}


def nhc_season_weight(season, anchor):
    offset = anchor - season
    if offset < 0 or offset >= len(NHC_WEIGHTS):
        return 0
    return NHC_WEIGHTS[offset]


def nhc_points(place, teams_count):
    if not place or not teams_count or teams_count <= 0:
        return 0.0
    x = teams_count - place + 1
    if x <= 0:
        return 0.0
    return 100.0 * (x * x) / (teams_count * teams_count)


def build_player_stats(data):
    stats = {}

    def ensure(name):
        if name not in stats:
            stats[name] = {
                'medals': defaultdict(int),
                'seasonSet': set(),
                'tournamentsSet': set(),
                'medalSeasons': set(),
                'disTournSet': set(),       # discipline iz PRVENSTAVA (za Svestranost sudjelovanje)
                'medalDisSet': set(),       # discipline u kojima je OSVOJIO medalju (Svestranost zlatni)
                'clubSeasons': defaultdict(set),  # klub -> {sezone}
                'minTournamentNum': {},     # (dis,kat) -> min p u kojem je sudjelovao
                'utakmica': 0, 'played': 0,
                'w': 0, 'd': 0, 'l': 0,
                'posCount': defaultdict(int),
                'skipCount': 0, 'viceCount': 0,
                'parPlayed': 0,
                'lsdThrows': [],
                'nhcEntries': [],  # [(season, place, teamsCount), ...] za Zvijezda peak-NHC
            }
        return stats[name]

    clubs = data.get('clubs', {})

    for t in data['tournaments']:
        dis, kat, p, season = t['dis'], t['kat'], t['p'], t['season']
        club_map = clubs.get(dis, {})
        tc = t.get('teamsCount') or len(t['standings'])
        for s in t['standings']:
            team = s['team']
            place = s.get('place')
            club = club_map.get(team, team)
            for name in t['rosterPool'].get(team, []):
                a = ensure(name)
                a['nhcEntries'].append((season, place, s.get('teamsCount') or tc))
                a['seasonSet'].add(season)
                a['tournamentsSet'].add(f"{season}-{dis}-{kat}-{p}")
                a['disTournSet'].add(dis)
                a['clubSeasons'][club].add(season)
                key = (dis, kat)
                if key not in a['minTournamentNum'] or p < a['minTournamentNum'][key]:
                    a['minTournamentNum'][key] = p
                if place is not None and 1 <= place <= 9:
                    a['medals'][place] += 1
                    if place <= 3:
                        a['medalSeasons'].add(season)
                        a['medalDisSet'].add(dis)

    for m in data['matches']:
        dis = m['dis']
        for roster, side in [(m.get('roster1') or [], 1), (m.get('roster2') or [], 2)]:
            for p in roster:
                name = p['name']
                a = ensure(name)
                a['utakmica'] += 1
                pos = p.get('position')
                if pos:
                    a['posCount'][pos] += 1
                if p.get('role') == 'Skip':
                    a['skipCount'] += 1
                elif p.get('role') == 'Vice-skip':
                    a['viceCount'] += 1
                if dis == 'MP' and m.get('played'):
                    a['parPlayed'] += 1
                if m.get('usesLSD') and p.get('lsd'):
                    a['lsdThrows'].append(p['lsd']['distance'])
                winner = m.get('winner')
                if winner == side:
                    a['w'] += 1
                elif winner in (1, 2):
                    a['l'] += 1
                elif m.get('played'):
                    a['d'] += 1
                if m.get('played'):
                    a['played'] += 1

    return stats


def longest_consecutive_run(season_set, season_index):
    """season_index: mapa {sezona: redni_broj_medu_sezonama_koje_uopce_postoje_u_bazi}.
    Koristimo indeks umjesto sirove godine jer sezona bez odigranih prvenstava ne
    smije prekinuti niz - "uzastopne sezone" znaci uzastopne sezone U KOJIMA JE
    BILO NATJECANJA."""
    if not season_set:
        return 0
    idxs = sorted(season_index[s] for s in season_set)
    best = cur = 1
    for i in range(1, len(idxs)):
        if idxs[i] == idxs[i - 1] + 1:
            cur += 1
            best = max(best, cur)
        else:
            cur = 1
    return best


def peak_nhc(nhc_entries, all_seasons_sorted):
    """Najveci moguci '5-sezona rolling' NHC zbroj kroz karijeru: isprobaj svaku
    sezonu iz baze kao anchor i vrati max. Vraca (peak_value, best_anchor)."""
    if not nhc_entries:
        return 0.0, None
    best = 0.0
    best_anchor = None
    for anchor in range(all_seasons_sorted[0], all_seasons_sorted[-1] + 1):
        total = 0.0
        for season, place, tc in nhc_entries:
            w = nhc_season_weight(season, anchor)
            if w:
                total += nhc_points(place, tc) * w
        if total > best:
            best = total
            best_anchor = anchor
    return best, best_anchor


def tier_for_threshold(value, thresholds):
    """thresholds = (broncani_min, srebrni_min, zlatni_min); vraca najvisi tier koji igrac dostize."""
    if value is None:
        return None
    b, s, z = thresholds
    if value >= z:
        return 'zlatni'
    if value >= s:
        return 'srebrni'
    if value >= b:
        return 'broncani'
    return None


def tier_for_max_threshold(value, thresholds):
    """Isto kao gore, ali 'manje je bolje' (npr. Kirurg) - thresholds = (max_broncani, max_srebrni, max_zlatni)."""
    if value is None:
        return None
    b, s, z = thresholds
    if value <= z:
        return 'zlatni'
    if value <= s:
        return 'srebrni'
    if value <= b:
        return 'broncani'
    return None


def build_badges(data):
    stats = build_player_stats(data)
    all_seasons_sorted = sorted(set(t['season'] for t in data['tournaments']))
    season_index = {s: i for i, s in enumerate(all_seasons_sorted)}
    founding_seasons = all_seasons_sorted[:3] if len(all_seasons_sorted) >= 3 else all_seasons_sorted

    badges = {name: {'zlatni': [], 'srebrni': [], 'broncani': []} for name in TIER_THRESHOLDS}

    def add(badge, tier, name, value):
        badges[badge][tier].append([name, value])

    for name, a in stats.items():
        # --- Zvijezda: peak 5-sezona rolling NHC kroz cijelu karijeru ---
        peak, _anchor = peak_nhc(a['nhcEntries'], all_seasons_sorted)
        peak_rounded = round(peak)
        tier = tier_for_threshold(peak_rounded, TIER_THRESHOLDS['Zvijezda'])
        if tier: add('Zvijezda', tier, name, peak_rounded)

        # --- prage bazirani znacke ---
        tier = tier_for_threshold(len(a['seasonSet']), TIER_THRESHOLDS['Veteran'])
        if tier: add('Veteran', tier, name, len(a['seasonSet']))

        tier = tier_for_threshold(a['played'], TIER_THRESHOLDS['Upornost'])
        if tier: add('Upornost', tier, name, a['played'])

        tier = tier_for_threshold(a['parPlayed'], TIER_THRESHOLDS['Par'])
        if tier: add('Par', tier, name, a['parPlayed'])

        max_club_seasons = max((len(s) for s in a['clubSeasons'].values()), default=0)
        tier = tier_for_threshold(max_club_seasons, TIER_THRESHOLDS['Vjernost'])
        if tier: add('Vjernost', tier, name, max_club_seasons)

        medals_total = a['medals'][1] + a['medals'][2] + a['medals'][3]
        tier = tier_for_threshold(medals_total, TIER_THRESHOLDS['Kolekcionar'])
        if tier: add('Kolekcionar', tier, name, medals_total)

        streak = longest_consecutive_run(a['medalSeasons'], season_index)
        tier = tier_for_threshold(streak, TIER_THRESHOLDS['Hat-trick'])
        if tier: add('Hat-trick', tier, name, streak)

        gold = a['medals'][1]
        tier = tier_for_threshold(gold, TIER_THRESHOLDS['Prvak'])
        if tier: add('Prvak', tier, name, gold)

        if a['lsdThrows']:
            best = round(min(a['lsdThrows']), 1)
            tier = tier_for_max_threshold(best, (30, 20, 10))
            if tier: add('Kirurg', tier, name, best)

        for badge, field in [('Skip', 'skipCount'), ('Vice-skip', 'viceCount')]:
            v = a[field]
            tier = tier_for_threshold(v, TIER_THRESHOLDS[badge])
            if tier: add(badge, tier, name, v)

        for badge, key in [('Prvi', 'Prvi'), ('Drugi', 'Drugi'), ('Treći', 'Treći'),
                            ('Četvrti', 'Četvrti'), ('Rezerva', 'Rezerva')]:
            v = a['posCount'].get(key, 0)
            tier = tier_for_threshold(v, TIER_THRESHOLDS[badge])
            if tier: add(badge, tier, name, v)

        # --- Kovač: najbolja boja medalje ikad osvojena ---
        if a['medals'][1] > 0:
            add('Kovač', 'zlatni', name, None)
        elif a['medals'][2] > 0:
            add('Kovač', 'srebrni', name, None)
        elif a['medals'][3] > 0:
            add('Kovač', 'broncani', name, None)

        # --- Osnivač: sudjelovanje u jednoj od prve 3 sezone saveza ---
        if len(founding_seasons) >= 1 and founding_seasons[0] in a['seasonSet']:
            add('Osnivač', 'zlatni', name, None)
        elif len(founding_seasons) >= 2 and founding_seasons[1] in a['seasonSet']:
            add('Osnivač', 'srebrni', name, None)
        elif len(founding_seasons) >= 3 and founding_seasons[2] in a['seasonSet']:
            add('Osnivač', 'broncani', name, None)

        # --- Pionir: sudjelovanje na 1./2./3. izdanju BILO KOJE kategorije/discipline ---
        min_p = min(a['minTournamentNum'].values()) if a['minTournamentNum'] else None
        if min_p == 1:
            add('Pionir', 'zlatni', name, None)
        elif min_p == 2:
            add('Pionir', 'srebrni', name, None)
        elif min_p == 3:
            add('Pionir', 'broncani', name, None)

        # --- Svestranost ---
        n_dis = len(a['disTournSet'])
        n_medal_dis = len(a['medalDisSet'])
        if n_medal_dis >= 3:
            g, s2, b2 = a['medals'][1], a['medals'][2], a['medals'][3]
            add('Svestranost', 'zlatni', name, f"🥇{g} 🥈{s2} 🥉{b2}")
        elif n_dis >= 3:
            add('Svestranost', 'srebrni', name, None)
        elif n_dis >= 2:
            add('Svestranost', 'broncani', name, None)

    # Sortiraj svaki tier: numericke vrijednosti silazno (osim ASCENDING_BADGES, gdje
    # je manja vrijednost bolja - Kirurg: udaljenost od centra kuce), None/string na
    # dnu po imenu.
    ASCENDING_BADGES = {'Kirurg'}

    def make_sort_key(badge):
        ascending = badge in ASCENDING_BADGES

        def sort_key(entry):
            v = entry[1]
            if isinstance(v, (int, float)):
                return (0, v if ascending else -v, entry[0])
            return (1, 0, entry[0])
        return sort_key

    for badge in badges:
        key_fn = make_sort_key(badge)
        for tier in badges[badge]:
            badges[badge][tier].sort(key=key_fn)

    return badges


def main():
    with open(DATA_FILE, encoding='utf-8') as f:
        data = json.load(f)
    new_badges = build_badges(data)

    # BADGE_ORDER, BADGE_META i BADGE_ICONS se ne racunaju - preuzimaju se
    # nepromijenjeni iz postojeceg znacke-data.js (ovaj skript samo prepisuje BADGES).
    content = open(OUTPUT_FILE, encoding='utf-8').read()
    m_order = re.search(r'const BADGE_ORDER = (\[.*?\]);', content)
    m_meta = re.search(r'const BADGE_META = (\{.*?\});', content)
    icons_start = content.index('const BADGE_ICONS = {')
    badges_start = content.index('const BADGES = {')
    icons_block = content[icons_start:badges_start].rstrip('\n')
    badge_order = json.loads(m_order.group(1))

    final_badges = {}
    for name in badge_order:
        final_badges[name] = new_badges.get(name, {'zlatni': [], 'srebrni': [], 'broncani': []})

    badges_js = 'const BADGES = ' + json.dumps(final_badges, ensure_ascii=False, separators=(', ', ': ')) + ';'
    out = f"const BADGE_ORDER = {m_order.group(1)};\n\nconst BADGE_META = {m_meta.group(1)};\n\n{icons_block}\n\n{badges_js}\n"

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f"Gotovo: {OUTPUT_FILE} ({sum(len(t) for b in final_badges.values() for t in b.values())} unosa znacki)")


if __name__ == '__main__':
    main()
