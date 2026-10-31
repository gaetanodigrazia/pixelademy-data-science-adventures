# IMP-03 — PO Improvement — Internazionalizzazione (it/en) (#82)

- Milestone: `v2.0-Optimizations` · PR: #161

## File creati o modificati
- `README.md`
- `src/app/app.config.ts`
- `src/app/core/models/player-state.model.ts`
- `src/app/core/services/game-state.service.ts`
- `src/app/core/utils/state-migrations.ts`
- `src/app/features/dashboard/dashboard.ts`
- `src/app/shared/components/navbar.ts`
- `src/app/shared/components/privacy-modal.ts`
- `src/app/state-migrations.spec.ts`
- `src/app/core/i18n/`
- `src/app/i18n.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement — parte iniziale** (la issue è XL e non è completata). Infrastruttura: `core/i18n` con dizionari tipizzati `it.ts`/`en.ts` (67 chiavi; il tipo `Record<I18nKey, string>` fa fallire la compilazione se manca una traduzione), `I18nService` (`t()` con segnaposto, `detect()` all'avvio da `provideAppInitializer`: scelta salvata, altrimenti lingua del browser; aggiorna `<html lang>`), pipe `t` e selettore IT/EN nella navbar (con `aria-pressed`). La lingua scelta si salva con il consenso: `PlayerState.locale` e migrazione **v3 → v4**. Tradotti: navbar, consenso, modale «Privacy e dati» (messaggi inclusi) e home. Test: `i18n.spec.ts` (stesse chiavi e segnaposto nelle due lingue, `pickLocale`, persistenza, interfaccia in inglese) e `state-migrations.spec.ts`. **Non fatto**: pagina missione e minigiochi, Dashboard del progetto, pagina «Il progetto», condivisione, e soprattutto i **contenuti didattici** dei 6 percorsi (teoria, storie, consegne sono generate da template in italiano in `concepts.ts`/`exercises.ts`): tradurli richiede estrarre i testi dai template, lavoro grosso da pianificare. In inglese l'esperienza è quindi mista.

## Verifica dei criteri di accettazione
- **Given** lingua del browser en, **When** apro, **Then** testi UI e contenuti in inglese.
- **Given** scelgo la lingua dal menu, **When** cambio, **Then** la scelta persiste (con consenso).

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
