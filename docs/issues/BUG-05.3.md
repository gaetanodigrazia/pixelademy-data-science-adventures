# BUG-05.3 — Il menu del profilo non si chiude cliccando fuori (#184)

- Milestone: `v2.0-Optimizations` · PR: #188

## File creati o modificati
- `src/app/navbar.spec.ts`
- `src/app/shared/components/navbar.ts`

## Decisioni e divergenze dal sorgente
Il menu del profilo si chiudeva solo con il suo pulsante o con Esc. Ora `Navbar` ascolta `document:click` (listener di host, pulito da Angular alla distruzione) e, se il menu è aperto e il clic non passa dal `.profile` (menu o pulsante, verificato con `composedPath`), lo chiude; i clic dentro non lo chiudono, il pulsante lo chiude come prima e a menu chiuso non succede nulla; il clic su un altro pulsante o link della barra lo chiude. Su telefono un tocco genera lo stesso evento `click`. Verificato in un browser reale (Playwright, dev server) su desktop con mouse e su telefono con tocco: clic dentro → resta aperto, fuori → si chiude, pulsante → si chiude. Test: 5 nuovi in `navbar.spec.ts` (fuori, altri elementi della barra, dentro, pulsante/Esc/menu chiuso, riapertura), con la pagina agganciata al documento come in un browser.

## Verifica dei criteri di accettazione
- **Given** il menu aperto, **When** clicco o tocco fuori dal menu e dal suo pulsante, **Then** si chiude.
- **Given** il menu aperto, **When** clicco dentro il menu, **Then** resta aperto.
- **Given** il menu aperto, **When** clicco il pulsante del profilo, **Then** si chiude (come prima) e non si riapre.
- **Given** il menu aperto, **When** premo Esc, **Then** si chiude (come prima).
- **Given** il menu chiuso, **When** clicco fuori, **Then** non succede nulla.
- **Given** il menu aperto, **When** apro un'altra pagina o clicco un altro pulsante della barra, **Then** si chiude.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
