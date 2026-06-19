# Art of Cuts — Barbershop Arnhem

Een gloednieuwe, clean one-page website voor barbershop **Art of Cuts** in Arnhem.
Geen build-stap, geen frameworks — gewoon HTML, CSS en een beetje JavaScript.

## Structuur

```
index.html    # alle secties (hero, over ons, diensten, afspraak, tijden, contact, footer)
styles.css    # design system (donker + crème + goud) en scroll-reveal stijlen
script.js     # sticky nav, mobiel menu, scroll-animaties, Calendly placeholder
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

## Calendly later koppelen

De afspraaksectie (`#afspraak`) bevat nu een **placeholder**. Vervang in
`index.html` het blok `<div class="calendly"> … </div>` door de officiële embed:

```html
<div class="calendly-inline-widget"
     data-url="https://calendly.com/JOUW-LINK"
     style="min-width:320px;height:640px;"></div>
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
```

De demo-knop in `script.js` (`#calendlyDemo`) kan daarna weg.

## Inhoud aanpassen

Alle teksten, prijzen, openingstijden en contactgegevens staan rechtstreeks in
`index.html`. De foto's komen via Unsplash-URL's — vervang ze door eigen
foto's van de shop voor een persoonlijke uitstraling.
