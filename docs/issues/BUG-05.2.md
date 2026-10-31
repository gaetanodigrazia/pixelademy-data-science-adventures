# BUG-05.2 — Mappa enorme su telefono e cataloghi che non scorrono (#169)

- Milestone: `v2.0-Optimizations` · PR: #170

## File creati o modificati
- `scripts/check-responsive.mjs`
- `src/app/core/utils/map-layout.ts`
- `src/app/features/dashboard/dashboard.ts`
- `src/app/map-layout.spec.ts`
- `src/app/catalog-scroll.spec.ts`

## Decisioni e divergenze dal sorgente
**1. Mappa enorme** (dopo #167 era 344×705 px): su telefono ora 3 blocchi per riga (tela 600), righe di 120 unità, blocchi da 84 unità (≈ 48 px sullo schermo, ~44 anche a 320 px) e tela alta 280 unità minimo: per 10 missioni **344×333 px**, un terzo dello schermo. Layout largo invariato. **2. Catalogo che non scorre**: le voci (`.result`) erano figlie flex di una colonna con overflow e si **comprimevano** (`flex-shrink`): con 7 percorsi i testi si sovrapponevano. Ora `.result { flex: none }` e l'elenco scorre davvero (`overflow-y: auto`, `overscroll-behavior: contain`): misurato 7 voci, contenuto 1.341 px in una finestra di 480 px, nessuna voce compressa. **3. Tastiera**: il campo di ricerca non prende più il fuoco da solo sui dispositivi touch (`pointer: coarse`), altrimenti apriva la tastiera sopra la lista; con mouse resta come prima. **4. Scelta eroe**: la riga degli eroi nella home non va a capo ma scorre in orizzontale. Test: `map-layout.spec.ts` aggiornato (altezza ≤ 340 px per 10 missioni, blocchi ≥ 44 px anche su 320 px) e `catalog-scroll.spec.ts` (regole CSS di scorrimento e autofocus con/senza touch). `scripts/check-responsive.mjs` ora verifica altezza della mappa (≤ 360 px), che l'elenco scorra, che nessuna voce sia compressa e che il campo di ricerca non abbia il fuoco: 0 problemi. Visto anche negli screenshot a 360×640. **Limite**: le regole CSS in jsdom sono verificate come testo del sorgente (jsdom non calcola il layout): la prova vera è lo script nel browser.

## Verifica dei criteri di accettazione
- **Given** un telefono da 360×640, **When** apro la home, **Then** la mappa di un percorso da 10 missioni è alta al massimo ~340 px, con blocchi ≥ 44 px, ed entra insieme ad altro contenuto.
- **Given** lo stesso telefono, **When** apro il catalogo dei percorsi con 7 voci, **Then** ogni voce ha l'altezza naturale e la lista scorre dentro la finestra; nessun testo si sovrappone.
- **Given** un dispositivo touch, **When** apro un catalogo, **Then** il campo di ricerca non prende il fuoco da solo (la tastiera non si apre).
- **Given** molti eroi, **When** guardo il riquadro «Eroe» della home, **Then** gli eroi stanno su una riga che scorre in orizzontale.
- **Given** schermo largo, **When** apro home e cataloghi, **Then** nulla cambia.
- **Given** lo script di layout mobile, **When** lo eseguo, **Then** controlla altezza della mappa e scorrimento dei cataloghi.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).
