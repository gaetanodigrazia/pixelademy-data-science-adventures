# BUG-04.9 — La corsa bonus dura troppo: deve durare 15 secondi (#221)

- Milestone: `v2.0-Optimizations` · PR: #222

## File creati o modificati
- `.claude/skills/crea-missione/SKILL.md`
- `.claude/skills/crea-percorso/SKILL.md`
- `scripts/check-runner.mjs`
- `src/app/core/models/mission.model.ts`
- `src/app/runner.spec.ts`
- `src/app/shared/components/games/runner.ts`

## Decisioni e divergenze dal sorgente
La corsa dura 15 secondi: conto alla rovescia generale (visibile in alto e nella barra), ostacoli che si susseguono con 4,5→2,5 s per rispondere (scade = errore, si passa oltre), 500 ms tra un ostacolo e l'altro; allo scadere finisce con «Tempo!» e il punteggio. Serbatoio di ≥40 ostacoli (serie concatenate con seed diversi) così chi risponde in fretta non finisce prima: una prima prova durava solo 9 s perché gli ostacoli (12) finivano. Con prefers-reduced-motion niente tempo: 6 ostacoli. Misurato su build di produzione: 15,1–15,2 s in tutte le missioni, telefono e desktop.

## Verifica dei criteri di accettazione
- Conto alla rovescia di 15 secondi, visibile; allo scadere la corsa finisce con il punteggio.
- Gli ostacoli arrivano uno dopo l'altro, con pochi secondi per rispondere a ciascuno.
- Con «riduci movimento» (senza tempo) la corsa è di pochi ostacoli.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
