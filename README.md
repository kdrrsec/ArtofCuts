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

Het boekingssysteem draait op Vercel Functions + Neon Postgres.

### Klant-flow
1. Dienst, kapper, dag en tijd kiezen
2. Voornaam + achternaam invullen (mail/telefoon optioneel)
3. Bevestigen → tijdslot is bezet voor anderen
4. Annuleren via persoonlijke link op `/annuleren`

### Kapper-portaal
- Open `/beheer` (niet publiek gelinkt; `/beheer.html` redirect naar `/beheer`)
- Inloggen met `PORTAL_PASSWORD`
- Agenda per dag en per kapper inzien
- **Extra opening**: dagen sluiten, eigen uren instellen, tijdslots toevoegen of blokkeren

### Setup op Vercel
1. Voeg **Neon Postgres** toe via Vercel Storage
2. Zet environment variables (zie `.env.example`):
   - `DATABASE_URL`
   - `PORTAL_PASSWORD`
3. Deploy opnieuw

De database-tabel wordt automatisch aangemaakt bij de eerste API-call.

## Inhoud aanpassen

Alle teksten, prijzen, openingstijden en contactgegevens staan rechtstreeks in
`index.html`. De foto's komen via Unsplash-URL's — vervang ze door eigen
foto's van de shop voor een persoonlijke uitstraling.
