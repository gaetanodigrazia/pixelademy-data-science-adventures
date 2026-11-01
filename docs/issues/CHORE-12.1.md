# CHORE-12.1 — Rimuovere le statistiche anonime (opzione, testo, raccolta) (#181)

- Milestone: `v2.0-Optimizations` · PR: #182

## File creati o modificati
- `netlify/functions/eventi.ts`
- `scripts/check-editor-prod.mjs`
- `scripts/check-path-unlock.mjs`
- `scripts/check-task-scroll.mjs`
- `src/app/core/i18n/en.ts`
- `src/app/core/i18n/it.ts`
- `src/app/core/models/player-state.model.ts`
- `src/app/core/services/game-state.service.ts`
- `src/app/core/services/telemetry.service.ts`
- `src/app/core/utils/event-counter.ts`
- `src/app/core/utils/state-migrations.ts`
- `src/app/features/mission-detail/mission-detail.ts`
- `src/app/mission-telemetry.spec.ts`
- `src/app/privacy-modal.spec.ts`
- `src/app/shared/components/privacy-modal.ts`
- `src/app/state-migrations.spec.ts`
- `src/app/telemetry.spec.ts`

## Decisioni e divergenze dal sorgente
Rimosse le statistiche anonime (#87): nessuna schermata le mostrava (si leggevano solo con `GET /api/eventi`) e la scrittura era aperta a chiunque, quindi i numeri non erano affidabili. **Tolto**: funzione Netlify `eventi`, `event-counter.ts`, `TelemetryService` e le chiamate nella pagina missione (tentativi, completamenti, abbandoni), la casella «Contribuisci con statistiche anonime», il testo che la spiegava e i messaggi (italiano e inglese), `setTelemetry`, il campo `telemetry` dello stato, `docs/MISURE.md`, `telemetry.spec.ts` e `mission-telemetry.spec.ts`. **Stato**: nuova versione 6 con migrazione 5 → 6 che scarta `telemetry` dai salvataggi vecchi (v3-v5) conservando tutto il resto; ora, caricando un salvataggio con consenso, lo si **riscrive subito** nella versione corrente (prima restava com'era fino al primo cambiamento). Test: modale senza casella né testo sulle statistiche, migrazione 5 → 6, riscrittura al caricamento, nessuna scrittura senza consenso; gli script di prova non scrivono più `telemetry`. Verificato sulla build di produzione in un browser: 0 occorrenze di `api/eventi`/testo nella build, modale senza opzione, nessuna richiesta `/api/` navigando, XP di un salvataggio vecchio con `telemetry: true` conservati. `docs/issues/IMP-08.md` e l'indice riportano la rimozione. Restano le funzioni `mi-piace` e `profilo`.

## Verifica dei criteri di accettazione
- **Given** la modale «Privacy e dati», **When** la apro, **Then** non c'è nessuna opzione né testo sulle statistiche.
- **Given** una missione giocata, **When** eseguo il codice, supero la missione o esco, **Then** non parte nessuna richiesta di rete (a parte Python/asset).
- **Given** un salvataggio precedente con `telemetry`, **When** carico l'app, **Then** i progressi restano e il campo scompare dallo stato.
- **Given** il repository, **When** cerco `telemetry`, `api/eventi` o `event-counter`, **Then** compaiono solo nella documentazione storica (docs/issues).
- **Given** la CI, **When** gira, **Then** test e build sono verdi.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
