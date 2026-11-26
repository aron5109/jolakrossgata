# Jólakrossgátan

Jólakrossgáta fyrir Jólahorn Reykjanesbæjar. Í desember 2026 opnar ein gáta á miðnætti að íslenskum tíma, frá 1. til 24. desember. Eldri gátur eru áfram opnar.

Gátan og vísbendingarnar birtast þegar ýtt er á **Byrja**. Þá hefst tímamælingin. Tíminn birtist þegar rétt lausn hefur verið staðfest með **Athuga lausn**. Upphafstími og svör vistast í vafranum, svo hægt er að halda áfram eftir endurhleðslu eða heimsækja aðra gáta á meðan. Tíminn heldur áfram að líða á meðan.

Útlitið sækir í vínrautt og gyllt þema [Jólastjörnuspár](https://github.com/aron5109/jolastjornuspa) og dagavalið í [Jóladagatalinu](https://github.com/aron5109/joladagatalid). Vefurinn notar HTML, CSS og JavaScript og getur keyrt á GitHub Pages. Dagsetningarlæsingin byggir á klukku tækisins. Gátugögn og lausnir fylgja vefnum og eru sýnileg í frumkóðanum.

## Keyra og prófa

Keyrðu í rót verkefnisins:

```sh
python3 -m http.server 8000 --directory site
```

Opnaðu [localhost:8000](http://localhost:8000/). Á localhost má velja sýnidag með `?previewDate=2026-12-01` eða `?previewDate=2026-12-24`. Nota má `?dagur=12` til að tengja beint á gátu sem hefur opnað. Sýnidagurinn hefur aðeins áhrif á dagatalið. Tímamæling notar raunverulegan tíma.

## Orð og vísbendingar

Öll [þemu, orð og vísbendingar](content/december-2026.mjs) eru í einum lista, í röð frá 1. til 24. desember. Eftir breytingar þarf að endurgera og staðfesta gátureitina með Node.js:

```sh
node scripts/build-puzzles.mjs
node scripts/build-puzzles.mjs --check
```

Leikurinn notar gögnin í `site/puzzles.mjs`. Í reitina fara stafir orðanna, með íslenskum sérstöfum og án bila eða bandstrika.

Staðbundnar heimildir fyrir vísbendingar eru meðal annars [Reykjanesbær](https://www.reykjanesbaer.is/), [Visit Reykjanesbær](https://visitreykjanesbaer.is/), [Visit Reykjanes](https://www.visitreykjanes.is/) og [Ljósanótt](https://www.ljosanott.is/um-ljosanott).

## Birting

GitHub Actions staðfestir gátugögn við pull request. Til að birta úr `main` þarf að velja **GitHub Actions** í **Settings → Pages → Source**. Að birtingu lokinni er vefslóðin [aron5109.github.io/jolakrossgata](https://aron5109.github.io/jolakrossgata/).
