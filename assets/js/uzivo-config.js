/* ============================================================
   UŽIVO — postavke (jedina datoteka koju treba uređivati)
   ============================================================
   Stavka "Uživo" u izborniku (između Početne i Vijesti) i stranica /uzivo/
   prikazuju rezultate natjecanja koja se vode u SoftPeelR-u.

   ukljuceno:
     "auto" — natjecanje se prikazuje od datuma prikaziOd do prikaziDo (uključivo,
              po zagrebačkom vremenu). Preporučeni način: upišite natjecanja unaprijed
              i stavka će se sama pojaviti i sama nestati.
     true   — prikazuju se SVA natjecanja s popisa, bez obzira na datume (za test).
     false  — stavka i prikaz su isključeni, bez obzira na datume.

   natjecanja: popis; svako natjecanje je jedan blok { ... }, odvojen zarezom.
     naziv      — naziv na hrvatskom (obavezno)
     nazivEn    — naziv na engleskom (neobavezno; ako ga nema, koristi se hrvatski)
     mjesto     — dvorana i grad (neobavezno)
     datumi     — tekst kako se prikazuje, npr. "07. – 08. 11. 2026." (neobavezno)
     softpeelr  — broj turnira s kraja SoftPeelR adrese, npr. .../tournaments/2260 → 2260 (obavezno)
     prikaziOd  — prvi dan prikaza, oblik "GGGG-MM-DD" (za "auto" način)
     prikaziDo  — zadnji dan prikaza, oblik "GGGG-MM-DD" (za "auto" način)

   Ako je istovremeno aktivno više natjecanja (npr. juniori i juniorke isti vikend),
   na stranici se pojavi izbor natjecanja.

   Pažnja na sintaksu: tekst u navodnicima, zarez iza svakog retka osim zadnjeg u bloku
   i iza svakog bloka osim zadnjeg. Ako datoteka ima grešku, stavka Uživo se ne prikazuje.

   Nakon commita GitHub Pages može posluživati staru verziju još nekoliko minuta.
   ============================================================ */

window.HCS_UZIVO = {
  ukljuceno: "auto",

  natjecanja: [
    {
      naziv: "4. prvenstvo Hrvatske (mješoviti curling)",
      nazivEn: "4th Croatian Championship (mix)",
      mjesto: "Intercable Arena Bruneck, Brunico, Italija",
      datumi: "07. – 08. 11. 2026.",
      softpeelr: 2388,
      prikaziOd: "2026-10-15",
      prikaziDo: "2026-11-11"
    },
    {
      naziv: "2. prvenstvo Hrvatske (juniori) i 4. prvenstvo Hrvatske (juniorke)",
      nazivEn: "2nd Croatian Championship (boys) and 4th Croatian Championship (girls)",
      mjesto: "Intercable Arena Bruneck, Brunico, Italija",
      datumi: "07. – 08. 11. 2026.",
      softpeelr: 2386,
      prikaziOd: "2026-10-15",
      prikaziDo: "2026-11-11"
    }
  ]
};
