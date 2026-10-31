# IMP-04 — PO Improvement — Persistenza versionata con migrazioni (#83)

- Milestone: `v2.0-Optimizations` · PR: #154

## File creati o modificati
- `src/app/core/models/player-state.model.ts`
- `src/app/core/services/game-state.service.ts`
- `src/app/privacy-modal.spec.ts`
- `src/app/shared/components/privacy-modal.ts`
- `src/app/core/utils/state-migrations.ts`
- `src/app/state-migrations.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement** (assente nel sorgente). `PlayerState` ha ora `schemaVersion` (corrente: 2). `core/utils/state-migrations.ts`: catena di passi `n → n+1` (v1 senza versione → v2), rifiuto di dati di versioni future o non validi, file di esportazione con intestazione. `GameStateService` migra al caricamento (dati corrotti o futuri → stato iniziale, senza eccezioni), risalva con la versione corrente e offre `exportProgress()`/`importProgress()`; nella modale «Privacy e dati» i pulsanti «Esporta i progressi (file)» e «Importa i progressi (file)». La chiave resta `pixelademy.player.v1` per non invalidare i salvataggi esistenti (la versione sta nel contenuto). Test con fixture di versioni precedenti: `state-migrations.spec.ts` e il test della modale. Limiti: l'esportazione non è cifrata e l'importazione sostituisce lo stato corrente (nessuna fusione).

## Verifica dei criteri di accettazione
- **Given** salvataggio v1, **When** carico una versione con schema v2, **Then** viene migrato senza perdite.
- **Given** dati corrotti, **When** carico, **Then** si ripristina lo stato iniziale senza crash.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
