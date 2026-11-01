---
name: crea-percorso
description: Crea (o modifica) un percorso di Pixelademy simile al primo, «Osservatorio delle Nuvole»: da 1 a 10 missioni (anche percorsi brevi di 3) che costruiscono un unico programma Python (il «bollettino»), con minigioco e scena di gioco per ogni missione e, a scelta, la Dashboard dei risultati. Usala quando l'utente chiede un nuovo percorso, un nuovo tema/progetto, un percorso «con» o «senza» Dashboard, o di cambiare i dati/le etichette di un percorso esistente.
---

# Creare un percorso di Pixelademy

**Obiettivo della piattaforma:** imparare la **data science** e i concetti matematici e statistici che ci stanno dietro; Python è lo strumento (conoscerlo bene è comunque un obiettivo). Scegli temi, esercizi e testi con questo focus, senza presentare Pixelademy come «un corso di Python». In futuro: challenge in stile Kaggle (es. pandas).

Un percorso è **una sola voce** di `PATH_SEEDS` in `src/app/content/adventure-core/curriculum.ts`. Il resto (teoria, codice di partenza, soluzioni, output atteso, minigioco, scena di gioco, XP, Dashboard) viene **derivato dai dati**: non si scrivono missioni a mano.

## Come funziona (da sapere prima di toccare qualcosa)

- Le 10 missioni sono sempre **gli stessi 10 concetti Python**, in questo ordine, definiti in `concepts.ts` (`BUILDERS`): 1 leggere un valore da una lista · 2 contare (`len`) · 3 filtrare (`for`+`if`) · 4 sommare · 5 media · 6 soglia (`if/else`) · 7 dizionari · 8 minimo/massimo · 9 funzioni · 10 mini‑pipeline.
- Ogni missione **aggiunge una sezione allo stesso script**: il bollettino stampa una riga in più. La validazione confronta l'**output completo** (`validation.kind = 'lines'`).
- Ogni missione ha **un minigioco** (`GAME_IDS[i]`, configurato da `gameConfig`) e **una scena di gioco nel task** (`vizFor`, guidata dall'output del programma). Entrambi usano i dati del progetto.
- La **Dashboard** (`/progetto/:id`) legge le righe «Etichetta: valore» stampate dal programma dell'utente (`parseResults` + `labels`) e le mostra in 4 riquadri: serie `a`, `b`, `c` e registro.

Non vanno modificati per un nuovo percorso: `concepts.ts`, `games.ts`, i componenti in `shared/components`, `pack.ts`, `solutions.ts`, `project.ts`. Se un percorso richiede qualcosa che i concetti non coprono, è una **nuova funzionalità**, non un percorso: dillo all'utente.

## Sblocco dei percorsi (`requires`) — avvisa sempre l'utente
I percorsi si sbloccano a catena (`PathSeed.requires`, slug dei percorsi da completare prima):
- **Percorsi base**: «Le Variabili» (`variabili`, 2 missioni: assegnare e calcolare con i nomi, senza liste) e «Le Liste» (`liste`, 3 missioni: leggere, contare, aggiungere con `append`; richiede `variabili`). Si completano per primi e **bloccano tutti gli altri percorsi**.
- **Ogni nuovo percorso deve avere almeno `requires: ['variabili', 'liste']`**. Se manca, il percorso non resterebbe in coda al percorso di apprendimento. Se il tema ne richiede altri (es. il percorso usa concetti di `mobilita`), aggiungili all'elenco.
- **Osservatorio delle Nuvole** (`nuvole`) è il traguardo: richiede **tutti gli altri percorsi**. Quando crei un percorso nuovo, **aggiungi il suo slug anche a `requires` di `nuvole`** (e, per un percorso di un altro pack, il suo id completo, come `challenges-pandas`): la lista non si aggiorna da sola. Il test `path-unlock.spec.ts` fallisce se l'elenco non coincide.
- Un percorso con requisiti si vede nel catalogo con il lucchetto e l'elenco di quelli che mancano; chi aveva già fatto missioni del percorso lo trova comunque sbloccato.
- Un requisito con slug che non esiste non blocca; un ciclo (A richiede B e B richiede A) li chiude entrambi: evitalo.

**Cosa dire all'utente** (prima di scrivere e nel riepilogo finale): «Il percorso `<titolo>` resterà bloccato finché non avrai completato almeno *Le Variabili* e *Le Liste*» (più gli eventuali altri requisiti scelti), e che l'Osservatorio delle Nuvole si aprirà solo dopo questo percorso. Chiedi conferma se vuole requisiti diversi o aggiuntivi: non toglierli senza che lo chieda.

## Percorsi brevi (da 1 a 9 missioni)
Il numero di missioni è la lunghezza di `missions`: un percorso di **N missioni usa i primi N concetti**, con difficoltà 1..N (la scala resta «su 10»: una missione di difficoltà 3 si vede come 3/10). Esempio con i concetti standard: i primi N dei 10. `mobilita` ed `energia` invece hanno **esercizi propri** (vedi sotto).
- **Si compilano comunque tutti i campi di `project`** (serie `a`, `b`, `c`, `k`, `cut`, `alert`, `registry`, `extreme` e le 10 `labels`): le sezioni che il percorso non raggiunge non compaiono né nel codice né nel bollettino, ma i tipi li richiedono. Usa valori plausibili.
- Il bollettino ha il titolo e **una riga per sezione**; la riga di chiusura `=== FINE DEL BOLLETTINO ===` c'è solo con tutti i 10 concetti.
- La **Dashboard** mostra solo i riquadri e gli indicatori che quelle missioni possono sbloccare (con 3 missioni: 3 riquadri, uno con un solo indicatore ciascuno; il registro e gli indicatori di media, soglia, estremi e totale mancano). Anche l'immagine di condivisione ha 3 riquadri, l'ultimo a tutta larghezza.
- Scegli i dati pensando alle sole sezioni raggiunte: per 3 missioni contano `a` e `k` (missione 1), `b` (2: si contano le righe) e `c`, `cut`, `cutName` (3).

## Esercizi propri (`exercises` nella voce)
Per non ripetere gli stessi esercizi di «Osservatorio delle Nuvole», una voce può avere `exercises: ['id1', 'id2', …]` (uno per missione, in ordine di difficoltà). Gli id stanno in `content/adventure-core/exercises.ts` (`EXERCISES`):
- standard: `std-1` … `std-10` (i 10 concetti del primo percorso);
- percorsi base: `var-assegna` (apre: `misura = …`) e `var-calcola` (`differenza = misura - soglia`) per «Le Variabili»; `liste-modifica` (`rimosso = lista.pop()` e `lista.append(x)`, ha i suoi dati) per «Le Liste», che usa `std-1`, `liste-modifica` e `std-2` (len): append e pop si spiegano **prima** di contare, perché il minigioco del conteggio li usa. Variabili riservate: `misura, soglia, differenza`;
- propri: `delta` (apre: ultimo − primo), `ordina` (le 3 più piccole), `percentuale` (quota sopra la soglia, `round`), `conversione` (apre: valore × tariffa), `posizione` (indice del massimo), `somma-sopra` (somma dei valori sopra soglia).
- statistica (percorso `statistica`, serie con numero **pari** di valori): `media` (apre), `mediana`, `moda`, `campo`, `varianza` (richiede `media`), `deviazione` (richiede `varianza`). I risultati sono float Python (`5.0`): nei bollettini usa `pyFloat`. Variabili riservate: `totale, media, ordinati, meta, mediana, moda, massimo, minimo, campo, scarti_quadrati, varianza, deviazione`.
- outlier (percorso `outlier`, serie con media e deviazione interi): `zscore` e `outlier` (entrambi richiedono `deviazione`, quindi dopo `media` → `varianza` → `deviazione`). Variabili riservate: `z_massimo, soglia_z, anomali, z`.
- probabilità (percorso `probabilita`, `a` = lanci di un dado, `k` = faccia): `frequenza` (apre), `valore-atteso`, `scostamento` e `somma-dadi` (richiedono `valore-atteso`). Variabili riservate: `uscite, frequenza, facce, atteso, media, scostamento, favorevoli, probabilita`.
- Regole (verificate da `exercisesFor`): tanti id quante le missioni; **il primo esercizio deve aprire il progetto** (`delta`, `conversione`, `std-1`) e gli altri no.
- Gli esercizi propri giocano col **quiz «Esegui il codice a mano»** (`adventure-quiz`, `quiz-steps.ts`) e hanno una scena `value`/`pick`. Usano la serie `a`, `k`, `cut`/`cutName`; nomi di variabili riservati: `variazione, migliori, percentuale, kwh, tariffa, costo, posizione_picco, eccesso`.
- Con esercizi propri metti **`dashboard: false`**: i riquadri della Dashboard seguono le 10 sezioni standard.
- Un esercizio nuovo = una nuova funzionalità: definiscilo in `EXTRA` (concetto, config del gioco, scena), aggiungi i passi in `quiz-steps.ts` e verifica la soluzione con Python reale.

## Passi

### 1. Raccogli (o proponi) i dati
Chiedi solo ciò che manca all'utente; per il resto proponi valori sensati e mostrali prima di scrivere.

| Campo | Cosa è | Vincoli |
|---|---|---|
| `slug` | id breve del percorso (`'marea'`) | minuscolo, senza spazi, **unico**; compare negli id `adventure-core-<slug>-01..10` |
| `title`, `description`, `icon`, `tags` | testi del catalogo | evita parole che compaiono in altri percorsi (il test del catalogo cerca «nuvole») |
| `characterSlug`, `enemySlug` | eroe e nemico | devono esistere (vedi passo 4) |
| `project.heading` | titolo del bollettino, MAIUSCOLO | stampato come `=== HEADING ===` |
| `project.a` | serie principale (lettura, media, soglia, estremo, escursione) | almeno 5 valori numerici **distinti** (meglio 7: le scene riconoscono i valori per uguaglianza); `name` identificatore Python valido |
| `project.b` | serie da contare e sommare | 5–8 valori (anche ripetuti, anche 0) |
| `project.c` | serie da filtrare | 5–8 valori; con `cut` **almeno 2 valori sopra e almeno 1 sotto** |
| `project.k` | posizione letta nella missione 1 | intero valido (`0 ≤ k < len(a)`); meglio `0 < k < len(a)-1`, così non coincide con gli indici «banali» `0` e `-1` che il minigioco chiede comunque |
| `project.cut` / `cutName` | soglia del filtro e nome della variabile | `cutName` identificatore valido |
| `project.alert` | soglia dell'allerta sulla **media di `a`** | non uguale alla media (altrimenti il gioco «esatto» è ambiguo); sia `ALLARME` sia `OK` vanno bene |
| `project.registry` | dizionario `{name, entries, key, unit}` | 4 chiavi consigliate (almeno 3; stringhe minuscole senza spazi), `key` presente, valori numerici |
| `project.extreme` | `'min'` o `'max'` | missione 8 |
| `project.labels` | **10 etichette** (anche nei percorsi brevi: le chiavi sono obbligatorie) della riga stampata da ogni sezione | tutte diverse; nessuna contiene `:`; leggibili come titolo di un indicatore |
| `missions` | **da 1 a 10** `{title, story}` | uno per concetto, nell'ordine sopra (vedi «Percorsi brevi»); la storia deve legarsi al tema e alla sezione (es. missione 6 = allerta) |
| `dashboard` | `true` (default) o `false` | vedi passo 5 |

**Nomi Python da non usare** per `a.name`, `b.name`, `c.name`, `registry.name`, `cutName` (collisioni con le variabili fisse del bollettino o con funzioni): `rilevazione`, `conteggio`, `filtrati`, `totale`, `media`, `soglia_allerta`, `stato`, `risultato`, `estremo`, `escursione`, `valori`, `m`, `media_filtrati`, `list`, `dict`, `sum`, `len`, `max`, `min`, `round`, `print`. I cinque nomi devono essere **tutti diversi**.

Valori: preferisci interi (o al massimo 2 decimali). Le unità (`unit`) sono testo libero (`°C`, `cm`, `kWh`).

### 2. Aggiungi la voce a `PATH_SEEDS`
Modello (copia e sostituisci; la struttura esatta è `PathSeed` in `curriculum.ts`, un esempio completo è il percorso `nuvole`):

```ts
{
  slug: 'marea',
  title: 'Sentinelle del Mare',
  description: 'Costruisci il rapporto delle maree: livelli, onde e correnti, una sezione per missione.',
  icon: '🌊',
  tags: ['python', 'oceano', 'segnali'],
  characterSlug: 'cora',
  enemySlug: 'onda',
  // dashboard: false,            // ← solo per un percorso SENZA Dashboard (vedi passo 5)
  project: {
    heading: 'RAPPORTO DELLE MAREE',
    a: { name: 'livelli', label: 'Livello della marea', unit: 'cm', values: [120, 135, 150, 142, 128, 160, 110] },
    b: { name: 'boe', label: 'Segnali delle boe', unit: 'segnali', values: [3, 5, 2, 8, 6, 4, 7] },
    c: { name: 'onde', label: 'Altezza delle onde', unit: 'cm', values: [60, 140, 95, 180, 75, 160, 120] },
    k: 2, cut: 100, cutName: 'soglia_onde', alert: 150,
    registry: { name: 'correnti', entries: { alfa: 85, beta: 120, gamma: 64, delta: 99 }, key: 'gamma', unit: 'cm/s' },
    extreme: 'max',
    labels: {
      first: 'Livello alle 12', count: 'Boe in ascolto', filtered: 'Onde alte', total: 'Segnali totali', mean: 'Livello medio',
      alert: 'Allerta marea', key: 'Corrente gamma', extreme: 'Livello massimo', range: 'Escursione di marea',
      final: 'Altezza media delle onde alte',
    },
  },
  missions: [ /* da 1 a 10 × { title, story } */ ],
},
```

Le chiavi di `labels` sono fisse (`first, count, filtered, total, mean, alert, key, extreme, range, final`) e corrispondono alle 10 sezioni nell'ordine.

### 3. Non toccare i test «per percorso»
I test (`games.spec`, `viz.spec`, `content.spec`, `validator.spec`, …) iterano su **tutti** i percorsi e sono indipendenti dal loro numero: verificano minigioco, scena, validazione e soluzione di ogni missione del nuovo percorso. Se ne fallisce uno per il nuovo percorso, quasi sempre è un dato che viola i vincoli del passo 1.

### 4. Eroe e nemico
- **Riusa** quelli esistenti se il tema lo consente: eroi `aura`, `nilo`, `cora`, `teo`; nemici `nuvola`, `ingorgo`, `onda`, `dispersione` (`characters.ts`). Gli eroi hanno `unlockLevel: 1` (sempre disponibili).
- **Nuovo eroe/nemico**: aggiungi lo sprite in `sprites.ts` (griglia di caratteri, `.` trasparente, ogni lettera deve essere nella `palette`; righe di uguale lunghezza, ~12×12) e la voce in `CHARACTERS` / `ENEMIES` con id `` `${PACK_ID}-<slug>` ``. Il test degli sprite controlla righe e palette.

### 5. Con o senza Dashboard
- **Con Dashboard (default)**: non serve altro. Compaiono il pulsante «📊 Dashboard» nella mappa e nel riepilogo missione, la presentazione del progetto sulla missione 1 con i 4 riquadri e la pagina `/progetto/<id>`. I 4 riquadri sono: `a`, `b`, `c` e il registro, con i grafici costruiti dalle etichette: per questo le `labels` devono essere fedeli.
- Con la Dashboard, a **progetto completo** compare «🔗 Condividi su LinkedIn» (anche dal riepilogo dell'ultima missione). Si condivide un link a `/condividi/<slug>/`, una pagina con i meta-tag Open Graph che LinkedIn mostra come post con la Dashboard in grande. **L'immagine (1200×627) e la pagina si generano da sole a ogni build** (`npm run share`, parte da `prebuild`) per ogni percorso con Dashboard, a partire dagli stessi dati: non vanno create né committate. Quindi `heading`, i titoli (`label`, `unit`) e le `labels` finiscono nell'immagine: tieni le `labels` sotto ~30 caratteri (vanno a capo su due righe) e i titoli `label (unit)` sotto ~40. Gli indirizzi assoluti usano la variabile `URL` di Netlify (in locale `SHARE_ORIGIN`, altrimenti `http://localhost:4300`).
- **Senza Dashboard**: aggiungi `dashboard: false` alla voce. Il percorso resta un progetto cumulativo (stesso bollettino, stessi giochi e scene) ma senza pagina dei grafici: sparisce il pulsante Dashboard, la presentazione parla solo del bollettino e `/progetto/<id>` risponde «Percorso non trovato». Il codice del progetto non è consultabile da una pagina dedicata.
- Se l'utente non specifica nulla, **chiedi** se vuole la Dashboard (consiglia di sì: è la parte più motivante).

### 6. Verifica (obbligatoria prima di dire «fatto»)
1. `npm test -- --watch=false` → tutto verde.
2. `npm run build -- --configuration development` → nessun errore.
3. Controllo a vista (consigliato, schermo da telefono ~393×852): selezionare il percorso dal catalogo («Cambia / cerca»), aprire la missione 1 (presentazione), il task (scena + editor) e, se c'è, la Dashboard. Playwright/Chromium è preinstallato; Pyodide non è raggiungibile dal sandbox: simula `window.loadPyodide` con uno script di inizializzazione.
4. Controlla che `requires` del nuovo percorso contenga almeno `variabili` e `liste`, e che il suo slug sia nei `requires` di `nuvole`.
5. Riepiloga all'utente: titolo, tema, dati scelti, eroe/nemico, se ha la Dashboard e **da quali percorsi è sbloccato** («richiede almeno Le Variabili e Le Liste»).

### 7. Git
`main` è protetto: lavora su un **branch** (`feat/<numero-issue>-percorso-<slug>`), apri una PR con `Closes #<issue>` (segui `.github/pull_request_template.md` e `CONTRIBUTING.md`) e **chiedi conferma prima di fare il merge**.

## Errori frequenti
- Dimenticare `requires` (il percorso risulterebbe sbloccato fin dall'inizio) o di aggiungere lo slug ai `requires` di `nuvole`.
- `b`, `c` o `a` con valori che rendono vuoto il filtro (`cut` troppo alto) → la missione 10 divide per zero.
- Etichette uguali o contenenti `:` → la Dashboard non trova i valori.
- Nome di serie uguale a una variabile fissa (`media`, `totale`…) → il codice della missione si sovrascrive da solo.
- Registro con 1–2 chiavi → il minigioco «Archivio chiavi» ha pochi cassetti e richieste ripetitive: usane 4.
- Valori ripetuti in `a` → la scena riconosce il valore stampato per uguaglianza e può evidenziare la posizione sbagliata.
