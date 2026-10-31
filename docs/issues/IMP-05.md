# IMP-05 — PO Improvement — Anti-cheat leggero e punteggio trasparente (#84)

- Milestone: `v2.0-Optimizations` · PR: #155

## File creati o modificati
- `src/app/code-editor.spec.ts`
- `src/app/core/utils/scoring.ts`
- `src/app/features/mission-detail/mission-detail.ts`
- `src/app/scoring.spec.ts`
- `src/app/shared/components/code-editor.ts`
- `src/app/core/utils/scoring-config.ts`
- `src/app/mission-paste.spec.ts`

## Decisioni e divergenze dal sorgente
**PO Improvement**. `core/utils/scoring-config.ts` raccoglie tutti i parametri del punteggio (tempo, errori, somiglianza, soluzione vista, anti-incolla); `scoring.ts` li usa e calcola `pasteFactor`: ×0,6 se si sono incollati ≥ 40 caratteri, il codice è somiglianza ≥ 0,9 con la soluzione e il task è consegnato entro 5 s. L'editor emette `pasted` (evento `paste` della textarea e `onDidPaste` di Monaco); la pagina missione somma i caratteri incollati e la tabella «Calcolo degli XP» mostra la riga «Codice incollato quasi identico alla soluzione». I risultati delle formule esistenti non cambiano (i test del sorgente passano senza modifiche). Limiti: non è una misura anti-frode (chi digita la soluzione a mano non è rilevato) e l'evento di Monaco non è testato in jsdom; i valori sono una scelta mia da tarare.

## Verifica dei criteri di accettazione
- **Given** codice quasi identico alla soluzione incollato in < 5 s, **When** completo, **Then** XP ridotti e motivazione visibile nella tabella.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
