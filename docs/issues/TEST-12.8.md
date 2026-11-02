# TEST-12.8 — Script di prova del flusso reale del bonus (battaglia → sorteggio → platform) (#233)

- Milestone: `v2.0-Optimizations` · PR: #234

## File creati o modificati
- `scripts/check-bonus-flow.mjs`

## Decisioni e divergenze dal sorgente
Solo uno script di prova (non fa parte della CI). Verifica sulla build di produzione, con Math.random forzato: 0 errori + sorteggio favorevole → «Bonus sbloccato» e platform visibile; sorteggio sfavorevole → nessun bonus; 1 errore (consentito) → bonus; 2 errori → nessun bonus e suggerimento «Finisci la battaglia con al massimo 1 errore…». Tutti e quattro gli scenari passano.

## Verifica dei criteri di accettazione
- Quattro scenari verificati nel browser (telefono).
- Documentato in testa allo script.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
