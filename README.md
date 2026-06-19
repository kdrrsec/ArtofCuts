# Art of Cuts — Barbershop Arnhem

Een gloednieuwe, clean one-page website voor barbershop **Art of Cuts** in Arnhem.
Geen build-stap, geen frameworks — gewoon HTML, CSS en een beetje JavaScript.

## Structuur

```
index.html    # alle secties (hero, over ons, diensten, afspraak, tijden, contact, footer)
styles.css    # design system (crème + ink + barber-rood, serif koppen) en scroll-reveal
script.js     # sticky nav (verbergt bij scrollen), mobiel menu, scroll-animaties, afspraak-preview
images/       # logo-icoon (razor), dienst-iconen (beard/cut-beard/child) en foto's
```

## Bekijken

Open `index.html` direct in de browser, of start een lokale server:

```bash
# Python
python -m http.server 5500
# daarna: http://localhost:5500
```

## Scroll-animaties

Elementen met het attribuut `data-reveal` faden naar boven in beeld zodra je
ernaartoe scrollt (via `IntersectionObserver`). Met `data-delay="1..4"` zet je
een trapsgewijze vertraging voor een mooi stagger-effect.

```html
<h2 data-reveal>Titel</h2>
<p data-reveal data-delay="1">Komt iets later in beeld…</p>
```

Respecteert `prefers-reduced-motion` voor gebruikers die minder beweging willen.

## Eigen afsprakensysteem

Calendly is verwijderd. De afspraaksectie (`#afspraak`) bevat nu een **eigen
boekings-UI** (dienst → dag → tijd) als preview. De achterkant (vaste tijdslots,
live beschikbaarheid, dubbele boekingen voorkomen, bevestigingsmail en een
beheerscherm) wordt aangesloten via Vercel Functions + database. De definitieve
look van dit blok volgt op basis van een aangeleverde screenshot.

## Inhoud aanpassen

Alle teksten, prijzen, openingstijden en contactgegevens staan rechtstreeks in
`index.html`. De foto's komen via Unsplash-URL's — vervang ze door eigen
foto's van de shop voor een persoonlijke uitstraling.
