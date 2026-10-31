# IMP-02 — PO Improvement — Pyodide self-hosted e modalità offline (PWA) (#81)

- Milestone: `v2.0-Optimizations` · PR: #158

## File creati o modificati
- `README.md`
- `angular.json`
- `nginx.conf`
- `package-lock.json`
- `package.json`
- `src/app/app.config.ts`
- `src/app/core/workers/python-worker-core.ts`
- `src/app/core/workers/python.worker.ts`
- `src/index.html`
- `ngsw-config.json`
- `public/icons/`
- `public/manifest.webmanifest`
- `scripts/check-infinite-loop.mjs`
- `scripts/check-offline.mjs`
- `scripts/generate-icons.mjs`
- `src/app/pwa.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement**. (1) **Pyodide ospitato dal sito**: pacchetto `pyodide` 0.27.7 (versione esatta) in devDependencies, copiato dalla build in `/pyodide/` (6 file, ~14 MB, scaricati solo all'apertura di un task); nessuna richiesta alla CDN. (2) **Service Worker** (`@angular/service-worker`, attivo solo in produzione, `ngsw-config.json`): guscio dell'app in prefetch, `/pyodide/**` e icone in cache alla prima richiesta (lazy). (3) **PWA installabile**: `manifest.webmanifest`, icone 192/512 e maskable generate da `scripts/generate-icons.mjs`, tag in `index.html`; `nginx.conf` non mette in cache `ngsw-worker.js`/`ngsw.json`. **Verificato in un browser reale** (Playwright, build di produzione): Service Worker attivo; Python eseguito nel worker online, poi **offline** (`setOffline`) dopo il ricaricamento, senza alcuna richiesta fuori dal sito (`scripts/check-offline.mjs`); e (`scripts/check-infinite-loop.mjs`) un `while True` interrotto dopo 6,7 s con il messaggio previsto e successiva esecuzione corretta: questo chiude anche la verifica di #80 con Pyodide reale. La prova ha scoperto e corretto un difetto di #80: i worker di tipo modulo non hanno `importScripts`, ora Pyodide si carica con `import()` di `pyodide.mjs`. Test: `pwa.spec.ts` (manifest, icone con dimensioni vere, ngsw-config, versione e file copiati, worker senza CDN). Limiti: nessun pacchetto Python extra (pandas) offline; aggiornamenti dell'app solo al ricaricamento successivo (comportamento standard di ngsw); installazione su dispositivi reali non provata.

## Verifica dei criteri di accettazione
- **Given** ho già giocato online, **When** vado offline, **Then** le missioni già caricate funzionano (Service Worker + cache di Pyodide).
- **Given** la CDN è lenta, **When** apro il task, **Then** carico Pyodide dal mio dominio.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
