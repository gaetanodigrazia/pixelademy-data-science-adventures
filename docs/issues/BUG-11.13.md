# BUG-11.13 — «Togli e aggiungi»: il quiz usa len() senza spiegarlo (#211)

- Milestone: `v2.0-Optimizations` · PR: #212

## File creati o modificati
- `src/app/content/adventure-core/exercises.ts`
- `src/app/esercizi.spec.ts`

## Decisioni e divergenze dal sorgente
Scelta la prima delle due strade proposte: la teoria di «Togli e aggiungi» ora ha la slide su len() (quanti elementi, come cambia dopo pop() e append()), quindi append, pop e len sono tutti spiegati prima del quiz. Il percorso resta di 3 missioni; la missione 3 approfondisce il conteggio. Aggiunto un test che verifica che la teoria nomini ogni funzione usata dal quiz.

## Verifica dei criteri di accettazione
- La teoria della missione spiega `len()` (quanti elementi ha la lista) e come cambia dopo pop() e append().
- Il quiz usa solo concetti spiegati nella teoria.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
