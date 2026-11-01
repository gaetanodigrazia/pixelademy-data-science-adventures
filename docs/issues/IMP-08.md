# IMP-08 — PO Improvement — Telemetria privacy-first e feedback (#87)

- Milestone: `v2.0-Optimizations` · PR: #159

## File creati o modificati
- `src/app/core/models/player-state.model.ts`
- `src/app/core/services/game-state.service.ts`
- `src/app/core/utils/state-migrations.ts`
- `src/app/features/mission-detail/mission-detail.ts`
- `src/app/privacy-modal.spec.ts`
- `src/app/shared/components/privacy-modal.ts`
- `src/app/state-migrations.spec.ts`
- `netlify/functions/eventi.ts`
- `src/app/core/services/telemetry.service.ts`
- `src/app/core/utils/event-counter.ts`
- `src/app/mission-telemetry.spec.ts`
- `src/app/telemetry.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement**. Piano di misura in `docs/MISURE.md` (eventi `attempt`, `completed`, `abandoned`; indicatori: tentativi per completamento e quota di abbandono per missione). `netlify/functions/eventi.ts` + `core/utils/event-counter.ts` (`handleEvent` puro): contatori aggregati per missione su Netlify Blobs; dell'evento si usano solo `type` (3 valori) e `mission` (id valido), tutto il resto è scartato e non salvato; GET dei totali. Lato client `TelemetryService` invia `{type, mission}` senza cookie né referrer, **solo** con consenso al salvataggio e opt-in; la pagina missione registra tentativi, completamento e abbandono (anche all'uscita dalla pagina). La modale «Privacy e dati» ha la casella «Contribuisci con statistiche anonime (facoltativo)», spenta di default e disabilitata senza consenso. Lo stato passa a **v3** con la migrazione `2 → 3` (`telemetry: false`) sulla catena di #83. Test: `telemetry.spec.ts`, `mission-telemetry.spec.ts`, modale e migrazione. Non verificato: la funzione su Netlify reale (solo `handleEvent` con archivio finto); non c'è ancora una pagina di analisi dei totali.

## Verifica dei criteri di accettazione
- **Given** l'utente acconsente, **When** completa o abbandona una missione, **Then** si registra solo un evento aggregato anonimo (nessun ID, IP o cookie).

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).


## Rimozione
Le statistiche anonime sono state **rimosse** con la issue #181: nessuna schermata le mostrava (si leggevano solo con `GET /api/eventi`) e la scrittura era aperta a chiunque, quindi i numeri non erano affidabili; chiedere all'utente di attivarle non aveva senso. Tolti funzione Netlify, servizio, contatori, opzione e testo nella modale «Privacy e dati», campo `telemetry` dello stato (migrazione v5 → v6) e `docs/MISURE.md`.
