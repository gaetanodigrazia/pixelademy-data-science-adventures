# DOC-01.4 — Skill «crea-personaggio» e «crea-missione»: correzioni dal collaudo (#205)

- Milestone: `v2.0-Optimizations` · PR: #206

## File creati o modificati
- `.claude/skills/crea-missione/SKILL.md`
- `.claude/skills/crea-personaggio/SKILL.md`

## Decisioni e divergenze dal sorgente
Collaudo delle skill su un eroe di prova (Nova) e su una missione di prova (ordina aggiunta a probabilita, poi scartata): emerso che content.spec.ts conta gli eroi e che due esercizi con la stessa chiave di etichetta collidono nello stesso percorso.

## Verifica dei criteri di accettazione
- `crea-personaggio` cita anche `content.spec.ts`, che conta gli eroi.
- `crea-missione` spiega che ogni esercizio stampa un'etichetta fissa (`first`, `count`, …) e che due esercizi dello stesso percorso non possono usare la stessa; include la tabella esercizio → etichetta.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
