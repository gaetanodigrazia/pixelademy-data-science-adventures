# BUG-11.15 — I suggerimenti rivelano la soluzione (#254)

- Milestone: `v2.0-Optimizations` · PR: #257

## File creati o modificati
- `.claude/skills/crea-missione/SKILL.md`
- `.claude/skills/crea-percorso/SKILL.md`
- `src/app/content/adventure-core/exercises.ts`
- `src/app/hints.spec.ts`

## Decisioni e divergenze dal sorgente
Un controllo automatico (hints.spec.ts) ha mostrato che 20 missioni su 36 avevano nel suggerimento la soluzione (es. «ordinati = sorted(onde); meta = len(ordinati) // 2; mediana = (…) / 2»): confronta il suggerimento con le righe nuove della soluzione e con la parte a destra delle assegnazioni. Riscritti tutti i suggerimenti colpiti (Mobilità, Energia, Statistica, Outlier, Probabilità, Variabili, Liste) a parole: che strumento usare, a cosa pensare, l'ordine dei passi, senza il codice. Ora i 36 passano. Limite: il controllo è euristico (righe e assegnazioni), non capisce se un suggerimento «quasi» spiega tutto con altre parole; i testi vanno comunque letti. Skill aggiornate.

## Verifica dei criteri di accettazione
- Il suggerimento orienta (che strumento usare, a cosa pensare) senza scrivere il codice della soluzione.
- Un test confronta il suggerimento con le righe nuove della soluzione di ogni missione.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
