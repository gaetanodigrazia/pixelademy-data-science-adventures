# BUG-05.5 — Il pulsante «Cerca eroi» è coperto dal badge di Netlify (#229)

- Milestone: `v2.0-Optimizations` · PR: #231

## File creati o modificati
- `src/app/features/dashboard/dashboard.ts`
- `scripts/check-home-bottom.mjs`

## Decisioni e divergenze dal sorgente
Nella home resta uno spazio libero di 72 px in fondo (padding-bottom del main): il badge di Netlify, fisso in basso a destra, non copre più «Cerca eroi». Misurato su build di produzione: 84 px liberi sotto il pulsante a 1280×800 e a 1280×650, 122 px su telefono (scripts/check-home-bottom.mjs). Il badge in sé non si toglie dal codice: è un'impostazione del sito su Netlify (se è il «Netlify Drawer», si disattiva da Site configuration).

## Verifica dei criteri di accettazione
- In fondo alla home resta uno spazio libero, così i pulsanti in basso non finiscono sotto il badge (desktop e telefono).

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
