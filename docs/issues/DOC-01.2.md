# DOC-01.2 — Skill «crea-percorso»: i percorsi nuovi si sbloccano dopo Variabili e Liste (#200)

- Milestone: `v2.0-Optimizations` · PR: #202

## File creati o modificati
- `.claude/`

## Decisioni e divergenze dal sorgente
La skill vive ora nel repository del progetto (.claude/skills/crea-percorso). Aggiunta la sezione sullo sblocco (requires: almeno variabili e liste; l'Osservatorio richiede tutti gli altri), l'obbligo di avvisare l'utente, gli esercizi dei percorsi base e il flusso PR. La copia nel repository pixelademy-2 non è stata toccata.

## Verifica dei criteri di accettazione
- La skill è nel repository (`.claude/skills/crea-percorso/SKILL.md`).
- Spiega `requires`, i percorsi base, gli esercizi nuovi e l'elenco dei requisiti dell'Osservatorio.
- Chiede conferma dei requisiti e lo dice all'utente nel riepilogo finale.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
