# BUG-05.4 — Da mobile non si scorre la pagina toccando dentro il compilatore (#213)

- Milestone: `v2.0-Optimizations` · PR: #214

## File creati o modificati
- `src/app/shared/components/code-editor.ts`
- `scripts/check-touch-scroll.mjs`
- `src/app/core/utils/touch-scroll.ts`
- `src/app/touch-scroll.spec.ts`

## Decisioni e divergenze dal sorgente
Causa: Monaco gestisce i tocchi da sé (preventDefault), quindi un dito che parte dall'editor non scorreva la pagina; touch-action da solo non basta (provato: nessun effetto). Soluzione: utility forwardTouchScroll sul contenitore dell'editor, in cattura: un trascinamento verticale (>8px e più verticale che orizzontale) scorre il contenitore scorrevole più vicino con un po' d'inerzia e non arriva a Monaco; un tocco o un gesto orizzontale restano a Monaco (cursore, tastiera, selezione). In più alwaysConsumeMouseWheel: false per rotella/trackpad. Contro: da touch non si scorre più il contenuto interno dell'editor con il dito (resta con cursore e tastiera). Verificato su build di produzione con tocchi reali (CDP): prima non scorreva, ora sì in entrambi i versi; script scripts/check-touch-scroll.mjs.

## Verifica dei criteri di accettazione
- Un trascinamento verticale che parte dentro l'editor scorre la pagina.
- Toccare l'editor continua a metterlo a fuoco e a mostrare la tastiera.
- Con la rotella/trackpad su desktop la pagina scorre quando l'editor non ha altro da scorrere.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
