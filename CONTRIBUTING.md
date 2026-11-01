# Contribuire a Pixelademy

Grazie! Il progetto è pubblico e ogni contributo (percorsi, correzioni, miglioramenti) passa da una pull request.

## Il flusso
1. Cerca o apri una **issue** che descriva cosa vuoi fare, così ci si accorda prima di scrivere codice.
2. Fai un **fork** del repository e crea un branch dal `main` aggiornato, ad esempio `feat/123-nome-breve` o `fix/123-nome-breve`.
3. Sviluppa **con i test**: ogni comportamento nuovo o corretto ha il suo test.
4. Apri una **pull request** verso `main` con `Closes #<numero>` nella descrizione (il template ti guida).
5. La CI deve essere verde. Il proprietario rivede e fa il merge: `main` non accetta push diretti.

## Per partire
```bash
npm ci
npm test -- --watch=false
npm run build -- --configuration development
npm start
```
Per eseguire tutti i test serve `python3` nel PATH (con `pandas` per le sfide): le soluzioni delle missioni sono verificate con un Python reale.

## Regole sui contenuti
- I testi sono in italiano, chiari e rivolti a chi inizia; le linee guida sono in [`docs/CONTENUTI.md`](docs/CONTENUTI.md).
- Un nuovo percorso si aggiunge come dati (`src/app/content/adventure-core/curriculum.ts` ed `exercises.ts`), non con codice speciale. Il comando `/crea-percorso` e `README.md` spiegano la struttura.
- L'output della soluzione deve coincidere riga per riga con il bollettino atteso.
- Non usare dati personali né librerie che li raccolgano: il sito non traccia gli utenti.

## Stile del codice
- Angular standalone con segnali e `OnPush`, TypeScript rigoroso, niente `any` inutili.
- Interfaccia accessibile (la suite esegue axe) e utilizzabile da mobile (bersagli ≥ 44 px).
- Commit piccoli e ben descritti; per ogni issue lascia in `docs/issues/<ID>.md` le decisioni e le divergenze.

## Segnalare un problema
Apri una issue con i passi per riprodurlo, cosa ti aspettavi e cosa è successo (browser e dispositivo aiutano).
