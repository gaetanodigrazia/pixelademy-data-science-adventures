# IMP-06 — PO Improvement — Sfide in stile Kaggle (pandas) (#85)

- Milestone: `v2.0-Optimizations` · PR: #160

## File creati o modificati
- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `package.json`
- `src/app/core/models/mission.model.ts`
- `src/app/features/mission-detail/mission-detail.ts`
- `src/app/python-solutions.spec.ts`
- `scripts/fetch-pyodide-packages.mjs`
- `src/app/challenges.spec.ts`
- `src/app/content/challenges/`

## Decisioni e divergenze dal sorgente
**PO Improvement — parte verificabile**. Nuovo pack `challenges` (`content/challenges/pack.ts`): percorso «Sfide con pandas» con 3 sfide su un dataset di vendite (prezzo medio dei libri, categoria con più incasso con `groupby`, vendite sopra la media); ogni sfida aggiunge una sezione allo stesso programma (output cumulativo, validato riga per riga). `Mission.challenge` apre la pagina direttamente sul task (niente teoria, battaglia, fasi né «↺ Teoria»). Le soluzioni sono verificate con **pandas reale** (`python-solutions.spec.ts` ora valida ogni tipo di `ValidationSpec`; in CI `pip install pandas`). Pacchetti extra: `scripts/fetch-pyodide-packages.mjs` (`npm run pyodide:packages`, in `prebuild`) scarica pandas e dipendenze (numpy, python-dateutil, pytz, six) da CDN in `public/pyodide/` con controllo sha256 del lock file, senza far fallire la build se la rete manca; il Service Worker li tiene offline. Test: `challenges.spec.ts` (pack, pagina della sfida, piano di download). **NON fatto / non verificato**: (1) la **classifica locale** (XP in una classifica) non è implementata; (2) non ho potuto scaricare i pacchetti né eseguire pandas dentro Pyodide (CDN bloccata in sessione): l'esecuzione nel browser delle sfide è da provare (pandas locale è 3.0.5, quello di Pyodide 2.2.3: le sfide usano solo API comuni); (3) niente validazione specifica per DataFrame. Per questo la issue resta aperta.

## Verifica dei criteri di accettazione
- **Given** apro una challenge, **When** carico il dataset, **Then** posso lavorare con `pandas` in Pyodide e il risultato è validato con tolleranza.
- **Given** completo, **When** guardo, **Then** guadagno XP e compaio in una classifica locale.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).


## Seconda parte (completamento)
- **Classifica locale**: `PlayerState.records` (stato **v5**, migrazione 4 → 5), `GameStateService.recordResult` (record = più XP, a parità meno secondi; rigiocare può migliorarlo ma non dà altri XP), componente `Leaderboard` e pulsante «🏆 Classifica» nella home dei percorsi di sfide; la ricompensa dice «nuovo record!».
- **pandas verificato nel browser** (Pyodide 0.27.7, pandas 2.2.3 dal rilascio ufficiale su GitHub, sha256 controllati): le 3 sfide danno 11.83 / giochi 170.0 / 4 e passano la validazione (`scripts/check-challenges.mjs`).
- Il test reale ha trovato **due difetti** corretti in `python-worker-core`/`PythonRunnerService`: (1) Pyodide scriveva «Loading numpy, pandas…» nell'output del programma e falsava il confronto → messaggi silenziati; (2) il download di pandas consumava il timeout di 5 s → nuovo messaggio `started`: il timeout conta dal via del codice, con un tetto di 120 s per la preparazione dei pacchetti.
- Controprova dell'anti-incolla (#84) in un browser vero: incollare la soluzione ha dato ×0,60 nella tabella XP.
- Non fatto: una `ValidationSpec` specifica per DataFrame (le sfide stampano numeri/testo e la validazione a righe basta).
