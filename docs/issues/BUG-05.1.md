# BUG-05.1 — Mappa troppo piccola su telefono: le missioni non si toccano (#167)

- Milestone: `v2.0-Optimizations` · PR: #168

## File creati o modificati
- `README.md`
- `scripts/check-responsive.mjs`
- `src/app/a11y.spec.ts`
- `src/app/features/dashboard/dashboard.ts`
- `src/app/shared/components/world-map.ts`
- `src/app/core/utils/map-layout.ts`
- `src/app/map-layout.spec.ts`

## Decisioni e divergenze dal sorgente
**Causa (misurata)**: a 360×640 il riquadro della mappa riceveva solo lo spazio rimasto sotto titolo, livello e riquadri Percorso/Eroe e la regola «niente scroll» lo schiacciava a **33×23 px** (blocchi di ~3 px). Difetto presente anche nel sorgente. **Correzione**: (1) `core/utils/map-layout.ts` (puro e testato): layout largo (tela 800, 4 blocchi per riga, blocchi da 40) invariato; layout da telefono (tela 400, 2 per riga a serpentina, blocchi da 56 unità ≈ 48 px, tela più alta); `hitRadius` (area di tocco ≥ 28 px di raggio sullo schermo) e `nodeAt` (il blocco più vicino). (2) `WorldMap`: sceglie il layout con `matchMedia('(max-width: 760px)')` e lo ricalcola se lo schermo cambia o ruota (con pulizia dell'ascolto), tela larga quanto lo schermo, titolo che si rimpicciolisce per stare nella tela, suggerimento «TOCCA UN BLOCCO · TOCCA ANCORA PER ENTRARE». (3) Home: sotto i 760 px la pagina scorre in verticale e la mappa tiene la sua altezza. **Misurato dopo**: tela 344×705 px, blocchi di 48 px, tocco a 30 px dal centro che apre la missione; su schermo largo la mappa è identica a prima (verificato). `scripts/check-responsive.mjs` ora controlla anche la mappa e il tocco, imposta `locale: it-IT` (il browser di prova è inglese e l'interfaccia lo segue dalla #82) ed esenta i link dentro i paragrafi dalla regola dei 44 px (WCAG 2.5.8). Test: `map-layout.spec.ts` (layout, serpentina, bordi, raggio di tocco, `nodeAt`, componente con `matchMedia` finto: tocco vicino/lontano, blocco bloccato, cambio di layout e pulizia). Ho dato 20 s di timeout ai test axe (quattro audit in un test, al limite dei 5 s). **Non verificato**: dispositivi reali e la rotazione fisica (solo ridimensionamento simulato); su telefono in orizzontale (≤ 760 px) vale il layout stretto.

## Verifica dei criteri di accettazione
- **Given** uno schermo da telefono (≤ 760 px di larghezza, tocco), **When** apro la home, **Then** la mappa è larga quanto lo schermo e alta quanto serve a mostrare tutte le missioni; la pagina scorre in verticale.
- **Given** la mappa su telefono, **When** guardo un blocco missione, **Then** misura almeno 44×44 px.
- **Given** la mappa su telefono, **When** tocco un blocco (anche un po' fuori dal bordo), **Then** l'eroe lo raggiunge; toccando di nuovo il blocco selezionato si entra nella missione; un blocco bloccato trema.
- **Given** uno schermo largo, **When** apro la home, **Then** la mappa resta come prima (4 blocchi per riga, nessuno scroll).
- **Given** il telefono, **When** ruoto o ridimensiono la finestra, **Then** la mappa si adatta senza ricaricare.
- **Given** la mappa su telefono, **When** controllo con lo script di layout mobile, **Then** nessuno scroll orizzontale e bersagli ≥ 44 px.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
