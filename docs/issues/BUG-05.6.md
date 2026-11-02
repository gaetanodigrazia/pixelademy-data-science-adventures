# BUG-05.6 — Il menu della barra in alto (mobile) non si chiude cliccando fuori (#239)

- Milestone: `v2.0-Optimizations` · PR: #240

## File creati o modificati
- `src/app/navbar.spec.ts`
- `src/app/shared/components/navbar.ts`

## Decisioni e divergenze dal sorgente
Il menu della barra in alto (telefono, aperto dal pulsante ☰) si chiude con un clic o tocco fuori dalla barra: stesso listener sul documento del menu del profilo, che resta com'era. Dentro la barra non si chiude da solo (il pulsante lo apre/chiude, le voci e il logo lo chiudono perché cambiano pagina). Verificato su build di produzione con tocchi veri: apre → tocco sulla pagina lo chiude → riaperto → tocco sulla barra resta aperto. Quattro test nuovi.

## Verifica dei criteri di accettazione
- Menu aperto + clic/tocco fuori dalla barra: si chiude.
- Clic dentro la barra (voci, pulsante del menu) non lo chiude da solo.
- Il menu del profilo continua a chiudersi come prima.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
