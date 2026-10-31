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

### Prestazioni
Le pagine (tranne la home) si caricano alla prima visita; Monaco e il worker di Python sono ancora più tardi. Bundle iniziale in produzione: ~455 kB grezzi, ~122 kB trasferiti (era 644 kB prima del caricamento pigro; è salito con Service Worker, i18n e pacchetto sfide; budget: avviso 470 kB, errore 600 kB in `angular.json`). Misura con Lighthouse: `npm run build`, servire `dist/pixelademy/browser` su `:4300` e `npm run audit:lighthouse` (non è in CI).

### Offline e installazione (PWA)
Pyodide non viene più dalla CDN: la build lo copia in `/pyodide/` (da `node_modules/pyodide`, stessa versione) e un Service Worker (solo in produzione) mette in cache app e interprete. Dopo il primo uso si può giocare anche senza connessione; il sito è installabile (manifest e icone, rigenerabili con `node scripts/generate-icons.mjs`).
Prove nel browser (opzionali, richiedono Playwright; servire `dist/pixelademy/browser` su `:4300` con fallback SPA): `node scripts/check-offline.mjs` (Python online e offline, nessuna richiesta esterna) e `node scripts/check-infinite-loop.mjs` (interruzione di un ciclo infinito).
Peso: ~14 MB di Pyodide nel sito (scaricati solo quando si apre un task). I pacchetti Python aggiuntivi (es. pandas, vedi US IMP-06) non sono inclusi.

### Sfide in stile Kaggle (pandas)
Il pack `src/app/content/challenges` ha un percorso «Sfide con pandas»: un dataset (CSV nel codice di partenza), una domanda e `pandas`; le sfide si aprono direttamente sul task (`Mission.challenge`). I pacchetti Python extra non sono nel repository: `npm run pyodide:packages` (lanciato da `prebuild`) scarica pandas e le sue dipendenze in `public/pyodide/` verificando lo sha256 del lock file; se la rete manca avvisa e prosegue (le sfide non funzioneranno finché i file non ci sono). In CI serve `pip install pandas` per verificare le soluzioni con Python reale.

### Lingue (it/en)
L'interfaccia ha due dizionari tipizzati (`src/app/core/i18n/it.ts` e `en.ts`: se manca una chiave in inglese la compilazione fallisce). All'avvio si usa la lingua scelta (salvata con il consenso) o quella del browser; dalla navbar si cambia con IT/EN. **Tradotti**: navbar, consenso, modale «Privacy e dati» e home. **Non ancora tradotti** (restano in italiano): pagina missione e minigiochi, Dashboard del progetto, pagina «Il progetto», condivisione e tutti i contenuti didattici (teoria, missioni, consegne, percorsi).
