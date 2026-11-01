---
name: crea-missione
description: Aggiunge una missione a un percorso esistente di Pixelademy (scelto dall'utente): testo, esercizio, quiz e scena, con gli effetti su progressi e sblocchi. Usala quando l'utente chiede una nuova missione, un passo in più o un nuovo esercizio per un percorso specifico, o di modificare i testi di una missione.
---

# Aggiungere una missione a un percorso

Una missione **non si scrive a mano**: nasce dalla voce del percorso (`PATH_SEEDS` in `src/app/content/adventure-core/curriculum.ts`) e dall'**esercizio** che le associa (`EXERCISES` in `exercises.ts`). Teoria, codice di partenza, soluzione, output atteso, minigioco, scena e XP si derivano dai dati. Per un **percorso intero** usa la skill `crea-percorso`.

Prima di tutto chiedi **a quale percorso** (slug: `nuvole`, `mobilita`, `energia`, `statistica`, `outlier`, `probabilita`, `variabili`, `liste`) e quale concetto deve insegnare. Il pack delle sfide (`content/challenges/pack.ts`) funziona diversamente: ha le missioni scritte a mano e non è coperto da questa skill.

## Capisci prima il percorso
Leggi la voce del percorso e il suo `project`. Ogni missione **aggiunge una sezione allo stesso script**, quindi la nuova riceve il codice di tutte le precedenti. Guarda:
- `exercises` (se presente): la lista di esercizi, uno per missione, nell'ordine. Se manca, il percorso usa i primi N dei 10 concetti standard (`std-1…std-10`) e la nuova missione sarebbe `std-(N+1)`: in quel caso basta aggiungere un elemento a `missions` (max **10** in tutto).
- `missions`: `{ title, story }`, uno per esercizio. **Le due liste devono avere la stessa lunghezza.**
- `dashboard`: con esercizi propri è `false`; con i concetti standard i riquadri della Dashboard seguono le 10 sezioni (una missione standard in più può accendere un nuovo indicatore).
- Le variabili già usate dalle missioni precedenti (le sue e quelle dei vincoli degli esercizi): vedi l'elenco in `crea-percorso` («variabili riservate»).

## Passi
### 1. Scegli l'esercizio
- **Esiste già** in `exercises.ts` (es. `percentuale`, `mediana`, `liste-modifica`)? Se è adatto, usalo; controlla `requires` (esercizi che devono comparire prima nel percorso) e che, se `opening: true`, stia al primo posto: l'apertura è consentita **solo come prima missione**.
- **Non esiste?** È una piccola nuova funzionalità: definiscilo in `EXTRA` con `concept(p)` (topic, `theory` a 2–3 slide, `briefing`, `hint`, `starter`, `solution`, `lines`), `gameConfig(p)` (config del quiz), `viz(p)` (scena `value` o `pick`) e `game: QUIZ_GAME`. Poi:
  - aggiungi la funzione dei passi in `src/app/shared/components/games/quiz-steps.ts` e il `case` in `quizFor` (ogni passo: risposta giusta, 2–3 sviste spiegate, `hit`);
  - **verifica la soluzione con Python reale** (`python-solutions.spec.ts` lo fa per tutte le soluzioni).
  Il modello da copiare è un esercizio simile già presente (es. `percentuale`, `posizione`).
- La soluzione deve usare **solo i dati del progetto** (`p.a`, `p.b`, `p.c`, `p.k`, `p.cut`, `p.alert`…) e variabili con nomi nuovi, non quelli già usati; `lines` è la riga che la sezione stampa, nel formato `Etichetta: valore` (float Python con `pyFloat`).

### Attenzione: ogni esercizio stampa un'etichetta fissa
Ogni esercizio scrive la sua riga con **una chiave di etichetta** (`labels.<chiave>` del `project`), e la Dashboard e le scene leggono quella riga per chiave. **Due esercizi dello stesso percorso non possono usare la stessa chiave**: la scena della seconda missione leggerebbe il valore della prima (test che falliscono: «la scena è coerente con la validazione», «la soluzione vince»). Le chiavi sono 10 (`first, count, filtered, total, mean, alert, key, extreme, range, final`), da qui il massimo di 10 missioni.

| Chiave | Esercizi che la usano |
|---|---|
| `first` | `std-1`, `delta`, `conversione`, `media`, `frequenza`, `var-assegna` |
| `count` | `std-2`, `ordina`, `posizione`, `mediana`, `valore-atteso`, `var-calcola` |
| `filtered` | `std-3`, `percentuale`, `somma-sopra`, `moda`, `scostamento`, `liste-modifica` |
| `total` | `std-4`, `campo`, `somma-dadi` |
| `mean` | `std-5`, `varianza` |
| `alert` | `std-6`, `zscore` |
| `key` / `extreme` / `range` / `final` | `std-7` / `std-8` + `outlier` / `std-9` / `std-10` + `deviazione` |

Prima di scegliere l'esercizio guarda quali chiavi usano già le missioni del percorso e prendine uno con una chiave **libera**. Il testo della chiave (es. `count` = «Valore atteso del dado») appartiene al percorso e deve avere senso per la nuova riga: se non ce l'ha, o non c'è una chiave libera adatta, serve un **esercizio nuovo** che usi una chiave libera (e magari un'etichetta in più nel `project`).

### 2. Aggiungi la missione al percorso
In `curriculum.ts`, nella voce del percorso:
- aggiungi l'id in `exercises: [..., 'nuovo-id']` (se la lista esiste) e `{ title, story }` in `missions`, **in fondo**;
- il `title` è breve e dice cosa si fa; la `story` lega la richiesta al tema (eroe e dati del progetto) in 1–2 frasi, con tono incoraggiante. L'ultima missione di un percorso chiude di solito con «Il rapporto è completo!»: se aggiungi in fondo, **sposta quella frase** sulla nuova ultima.
- `labels` (nel `project`): aggiungi/usa una etichetta **non ripetuta** per la nuova riga; niente `:` nel testo.

### 3. Aggiorna i test
I test «per percorso» (`games`, `viz`, `content`, `validator`, `python-solutions`) girano da soli sulla nuova missione. Aggiorna invece quelli che hanno **numeri e bollettini attesi per quel percorso**, tipicamente in `esercizi.spec.ts` (le righe del bollettino, il numero e la difficoltà delle missioni, e il test «ogni missione ha una scena coerente») e, se tocchi la sequenza, in `path-unlock.spec.ts`. Se hai creato un esercizio nuovo, aggiungi il suo caso di quiz con gli helper del file (`quizCases`).

### 4. Verifica (obbligatoria)
1. `npm test -- --watch=false` e `npm run build -- --configuration development` verdi.
2. A vista (viewport ~393×852): selezionare il percorso, aprire la nuova missione (teoria, battaglia, task con scena ed editor) e giocarla con la soluzione.
3. Riepiloga all'utente: percorso, titolo, esercizio, riga che stampa, cosa è cambiato per i giocatori (sotto).

## Effetti da dire sempre all'utente
- **Aggiungi in fondo**: gli id delle missioni sono per posizione (`adventure-core-<slug>-NN`). Inserire una missione **in mezzo** sposta le successive e i progressi già salvati puntano alla missione sbagliata: lo si fa solo se l'utente accetta di perdere quei progressi.
- Chi aveva **completato** il percorso ora ha una missione in più da fare: il percorso torna «da completare». **I percorsi che lo richiedono (`requires`) si richiudono per chi non li ha ancora iniziati**: vale soprattutto per «Le Variabili» e «Le Liste», che bloccano tutti gli altri (chi ha già progressi in un percorso non lo perde). Se aggiungi a un percorso base, avvisa l'utente di questo prima di procedere.
- Se il percorso ha la Dashboard standard e aggiungi un concetto, compare un nuovo indicatore; la sezione già completata dagli utenti non cambia.
- Il numero massimo è 10 missioni per percorso e la difficoltà (1..N) cresce con la posizione: la nuova missione è la più difficile.
- Se si **modificano** solo testi (titolo, storia, teoria) nulla cambia per i progressi.

## Git
`main` è protetto: apri una issue, lavora su un branch (`feat/<n>-missione-<slug>`), apri una PR con `Closes #<n>` (vedi `CONTRIBUTING.md`) e chiedi conferma prima del merge.
