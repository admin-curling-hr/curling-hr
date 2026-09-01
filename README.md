# Hrvatski curling savez — web stranice

Službene web stranice Hrvatskog curling saveza.  
Hostano na GitHub Pages: https://curling.hr

## Dodavanje vijesti

1. Kreiraj novi file u mapi `_posts/`
2. Ime filea: `YYYY-MM-DD-naslov-vijesti.md`
3. Na vrhu filea obavezno stavi:

```markdown
---
layout: post
title: "Naslov vijesti"
date: 2026-01-15
categories: [Vijesti]
image: /assets/images/ime-slike.jpg  # opcionalno
excerpt: "Kratki opis koji se prikazuje na popisu vijesti."
---

Tekst vijesti ide ovdje...
```

4. Commitaj — vijest se automatski objavljuje.

## Dodavanje slika

Slike spremi u `/assets/images/` i referenciraj ih u postu:

```markdown
![Opis slike](/assets/images/ime-slike.jpg)
```

## Struktura

```
_layouts/     — predlošci stranica
_posts/       — vijesti (YYYY-MM-DD-naslov.md)
assets/
  css/        — stilovi
  js/         — JavaScript
  images/     — slike
vijesti/      — arhiva vijesti
kalendar/     — kalendar događanja
klubovi/      — popis klubova
o-curlingu/   — informacije o sportu
o-nama/       — info o savezu, kontakt
```
