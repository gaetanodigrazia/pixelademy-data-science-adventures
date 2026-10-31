# Pixelademy — Data Science Adventures

[![CI](https://github.com/gaetanodigrazia/pixelademy-data-science-adventures/actions/workflows/ci.yml/badge.svg)](https://github.com/gaetanodigrazia/pixelademy-data-science-adventures/actions/workflows/ci.yml)

Piattaforma web gamificata (Angular 21, standalone, esbuild, Vitest) per imparare la data science (i concetti matematici e statistici dietro ai dati) usando Python come strumento.
Il progetto replica [`pixelademy-2`](https://github.com/gaetanodigrazia/pixelademy-2) seguendo il backlog di questo repository
(issue, milestone e board GitHub): ogni issue è sviluppata in un branch dedicato, mergiata su `main` e documentata in `docs/issues/`.
Indice di tracciabilità: [`docs/INDEX.md`](docs/INDEX.md). Linee guida per i testi: [`docs/CONTENUTI.md`](docs/CONTENUTI.md).

## Comandi
```bash
npm ci
npm test -- --watch=false
npm run build -- --configuration development
npm start
```
`.npmrc` abilita `legacy-peer-deps` (workaround a un bug di npm 10 con i peer di jsdom).

## Content pack
Un pack è una cartella `src/app/content/<id>/pack.ts` che esporta (default) un `ContentPack`. `npm run packs` li scopre e genera
`src/app/core/data/packs.generated.ts` (non committato; lo lanciano in automatico `npm start`, `npm test` e `npm run build`).

## Build e deploy
- **Netlify** (consigliato: servono le Functions per «Mi piace» e condivisione del profilo): build e pubblicazione sono quelle impostate su Netlify; `netlify.toml` configura solo le funzioni (esbuild, `@napi-rs/canvas` esterno, font incluso).
- **Docker**: `docker build -t pixelademy .` produce un'immagine nginx che serve la SPA (con fallback su `index.html`), **senza** Functions.

## Test
Gli output attesi di ogni missione sono verificati **con un Python reale**: `python-solutions.spec.ts` esegue `python3` su ogni soluzione di riferimento
e confronta l'output con il bollettino atteso. Per eseguire la suite in locale serve quindi `python3` nel PATH (in CI c'è già).
`npm run test:coverage` stampa la copertura (a oggi: ~89% delle istruzioni, ~91% in `core/utils`; l'intera suite gira in circa 15 secondi). Le utility pure (`progress`, `validator`, `scoring`, `py`, `project-*`, `dashboard-cards`, `viz`) hanno ciascuna il proprio spec; quelle di condivisione e «Mi piace» arrivano con le loro issue.

### Accessibilità
`a11y.spec.ts` esegue [axe-core](https://github.com/dequelabs/axe-core) su home, catalogo, missione (presentazione, teoria, battaglia, task), Dashboard e modale privacy; `contrast.spec.ts` misura il contrasto (≥ 4,5:1) delle coppie di colori del tema in `src/styles.css`.

### Layout mobile
`npm run check:responsive` (con `npm start` attivo e Playwright installato) controlla a 360×640 con puntatore touch: nessuno scroll orizzontale, modali dentro lo schermo, bersagli toccabili ≥ 44 px. Non fa parte della CI.

## Condivisione su LinkedIn
A progetto completo la Dashboard offre «Condividi su LinkedIn»: si condivide un link a `/condividi/<percorso>/`, una pagina con i meta-tag Open Graph (`og:image`) che LinkedIn mostra come grande foto nel post.
Immagine e pagina si generano a ogni build con `scripts/generate-share-assets.mjs` (`npm run share`, lanciato da `prebuild`; usa `URL` di Netlify per gli indirizzi assoluti, `SHARE_ORIGIN` in locale) e non sono nel repository.
Se LinkedIn mostra una vecchia anteprima, aggiornala con https://www.linkedin.com/post-inspector/.
