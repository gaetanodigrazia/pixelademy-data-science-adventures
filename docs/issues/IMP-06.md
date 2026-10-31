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
