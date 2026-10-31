# Pixelademy — Data Science Adventures

Piattaforma web gamificata (Angular 21, standalone, esbuild, Vitest) per imparare la data science (i concetti matematici e statistici dietro ai dati) usando Python come strumento.
Il progetto replica [`pixelademy-2`](https://github.com/gaetanodigrazia/pixelademy-2) seguendo il backlog di questo repository
(issue, milestone e board GitHub): ogni issue è sviluppata in un branch dedicato, mergiata su `main` e documentata in `docs/issues/`.
Indice di tracciabilità: [`docs/INDEX.md`](docs/INDEX.md).

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
