# DOC-01.3 — Nuove skill «crea-personaggio» e «crea-missione» (#203)

- Milestone: `v2.0-Optimizations` · PR: #204

## File creati o modificati
- `.claude/skills/crea-missione/`
- `.claude/skills/crea-personaggio/`

## Decisioni e divergenze dal sorgente
Solo documentazione: due nuove skill in .claude/skills, scritte dal codice (sprites.ts, characters.ts, curriculum.ts, exercises.ts, quiz-steps.ts, test). Non c'erano versioni precedenti da copiare.

## Verifica dei criteri di accettazione
- `.claude/skills/crea-personaggio/SKILL.md` descrive sprite, voce in `characters.ts`, assegnazione e test da aggiornare.
- `.claude/skills/crea-missione/SKILL.md` descrive come aggiungere una missione a un percorso scelto, con gli effetti su progressi e sblocchi.
- Entrambe avvisano l'utente degli effetti e seguono il flusso issue → branch → PR.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
