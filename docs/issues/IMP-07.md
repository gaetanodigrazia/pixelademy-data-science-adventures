# IMP-07 — PO Improvement — Performance e bundle (#86)

- Milestone: `v2.0-Optimizations` · PR: #157

## File creati o modificati
- `README.md`
- `angular.json`
- `package.json`
- `src/app/app.routes.ts`
- `src/app/routes.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement**. Misurato in produzione: bundle iniziale **643,7 kB → 434,1 kB** grezzi (148,7 → 116,7 kB trasferiti), e sparisce l'avviso di budget. Interventi: (1) pagine missione, Dashboard del progetto e info con `loadComponent` (la home resta eager); (2) tolto dagli stili globali il CSS di Monaco (`editor.main.css`, 68 kB), che il bundle dell'editor già porta nel suo chunk lazy: verificato in un browser reale (Playwright) che l'editor mantiene tema, evidenziazione e layout; (3) budget stretti in `angular.json` (avviso 450 kB, errore 600 kB). Lighthouse (build di produzione servita in locale, profilo mobile di default): performance 0,75, FCP 0,6 s, **LCP 0,6 s** (obiettivo < 2,5 s), CLS 0, ma **TBT 1.270 ms** (alto, non indagato: probabilmente avvio di Angular e canvas della mappa). Non ho messo Lighthouse in CI (non verificabile da qui): `npm run audit:lighthouse` documentato nel README. I minigiochi restano nel bundle iniziale (il pack li importa staticamente): renderli lazy richiede cambiare `GameDefinition`, rimandato.

## Verifica dei criteri di accettazione
- **Given** connessione 4G, **When** apro la home, **Then** LCP < 2,5 s; Monaco e giochi caricati in lazy per rotta.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
