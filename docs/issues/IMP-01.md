# IMP-01 — PO Improvement — Esecuzione Python in Web Worker (#80)

- Milestone: `v2.0-Optimizations` · PR: #156

## File creati o modificati
- `angular.json`
- `src/app/a11y.spec.ts`
- `src/app/code-editor.spec.ts`
- `src/app/core/services/python-runner.service.ts`
- `src/app/features/mission-detail/mission-detail.ts`
- `src/app/python-runner.spec.ts`
- `src/app/shared/components/code-editor.ts`
- `src/app/testing/mission-harness.ts`
- `tsconfig.app.json`
- `src/app/core/workers/`
- `src/app/python-worker-core.spec.ts`
- `tsconfig.worker.json`

## Decisioni e divergenze dal sorgente
**PO Improvement**. Pyodide ora gira in un Web Worker (`core/workers/python.worker.ts`, bundle separato con `webWorkerTsConfig` e `tsconfig.worker.json`); la logica è in `python-worker-core.ts` (provabile con un Pyodide finto) e il protocollo è `init`/`run` → `ready`/`init-error`/`result`. `PythonRunnerService` mantiene la stessa API (`run`, `loadRuntime`, `status`) e aggiunge: timeout di 5 s **dall'avvio dell'esecuzione** (non dal download), `stop()`, e ripartenza con un worker nuovo dopo un'interruzione (Pyodide si riscarica). L'editor mostra «■ Interrompi» durante l'esecuzione; senza supporto ai Worker il caricamento fallisce con lo stesso messaggio del download. Test: `python-runner.spec.ts` riscritto con un Worker finto (esecuzione, id, timeout, stop, retry, worker mancante), `python-worker-core.spec.ts` (ex test del runner) e il pulsante nell'editor. **Non verificato con Pyodide reale** (CDN bloccata in sessione): il bundle del worker si genera e il protocollo è provato con finti, ma l'interruzione di un vero `while True` nel browser va provata a mano. Interrompere ricarica Pyodide (qualche secondo senza cache: vedi IMP-02).

## Verifica dei criteri di accettazione
- **Given** un `while True`, **When** premo Esegui, **Then** dopo un timeout (es. 5 s) l'esecuzione è interrotta e vedo un messaggio, la UI resta reattiva.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
