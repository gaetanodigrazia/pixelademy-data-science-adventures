# BUG-11.14 — Statistica: il quiz di mediana e moda non mostra il vettore `onde` (#253)

- Milestone: `v2.0-Optimizations` · PR: #256

## File creati o modificati
- `src/app/shared/components/games/quiz-steps.ts`
- `src/app/quiz-vector.spec.ts`

## Decisioni e divergenze dal sorgente
Causa: i quiz «esegui il codice a mano» mostravano solo le istruzioni, non la definizione della serie: mancava in mediana, moda, campo, varianza (Statistica e Outlier), percentuale (Mobilità), somma-sopra (Energia), zscore e outlier. Correzione generale in quizFor (withVector): se il quiz nomina la serie ma il pannello non la definisce, la riga «onde = [...]» viene aggiunta in cima e le righe evidenziate dei passi scalano di una. Un test controlla tutte le missioni con quiz. Corretto anche un difetto preesistente della moda: i passi onde.count(x) evidenziavano «moda = m» invece della riga dell'if. Verificato a vista su telefono (mediana e moda).

## Verifica dei criteri di accettazione
- Ogni quiz che usa una serie ne mostra la definizione nel pannello del codice.
- Un test lo verifica per tutte le missioni.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
