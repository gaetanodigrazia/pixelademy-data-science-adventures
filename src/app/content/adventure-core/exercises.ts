import { MissionViz } from '../../core/models/mission.model';
import { pyFloat, pyRound } from '../../core/utils/py';
import { BUILDERS, Concept, data, gameConfig, list, num, ProjectSpec, r2, vizFor } from './concepts';

/**
 * Un esercizio: il concetto (teoria, consegna, codice di partenza e soluzione di una sezione del progetto), il minigioco che lo
 * allena e la scena di gioco guidata dal codice. Un percorso sceglie i suoi esercizi (`PathSeed.exercises`); se non lo fa usa i
 * primi dei 10 standard (`std-1`…`std-10`).
 */
export interface Exercise {
  id: string;
  /** Apre il progetto: definisce i dati e stampa il titolo del bollettino. Solo il primo esercizio di un percorso. */
  opening: boolean;
  concept(p: ProjectSpec): Concept;
  gameConfig(p: ProjectSpec): Record<string, unknown>;
  viz(p: ProjectSpec): MissionViz;
  /** Esercizi che devono comparire prima nello stesso percorso (ne riusano le variabili). */
  requires?: string[];
  /** Indice del minigioco standard (`GAME_IDS`)… */
  stdIndex?: number;
  /** …oppure l'id del minigioco dedicato. */
  game?: string;
}

/** Gli esercizi che hanno un minigioco a scelta multipla dedicato (`adventure-quiz`). */
export const QUIZ_GAME = 'adventure-quiz';

const STANDARD: Exercise[] = BUILDERS.map((build, i) => ({
  id: `std-${i + 1}`,
  opening: i === 0,
  concept: build,
  gameConfig: (p) => gameConfig(i, p),
  viz: (p) => vizFor(i, p),
  stdIndex: i,
}));

/** Apertura comune a tutti i percorsi: intestazione, dati della serie principale e titolo del bollettino. */
const opening = (p: ProjectSpec): string =>
  `# Bollettino automatico: ogni missione aggiunge una sezione.\n# Alla fine il programma stampa il bollettino completo.\n\n${data(p.a)}\nprint("=== ${p.heading} ===")\n\n`;

const header = (p: ProjectSpec): string => `=== ${p.heading} ===`;
/** Apertura del percorso «Le Variabili»: nessuna lista (non l'hanno ancora vista), solo il titolo del bollettino. */
const openingVars = (p: ProjectSpec): string =>
  `# Bollettino automatico: ogni missione aggiunge una sezione.\n# Alla fine il programma stampa il bollettino completo.\n\nprint("=== ${p.heading} ===")\n\n`;
/** Configurazione del quiz delle variabili: `th` è la soglia (`alert`), `k` la posizione della misura. */
const varQuiz = (id: string, p: ProjectSpec): Record<string, unknown> => ({
  exercise: id, name: 'misura', unit: p.a.unit, v: p.a.values, th: p.alert, thName: 'soglia', k: p.k,
});
const quiz = (id: string, p: ProjectSpec): Record<string, unknown> => ({
  exercise: id, name: p.a.name, unit: p.a.unit, v: p.a.values, th: p.cut, thName: p.cutName, k: p.k,
});
const above = (p: ProjectSpec): number[] => p.a.values.filter((x) => x > p.cut);

/** Gli indicatori statistici di una serie (varianza e deviazione sono «di popolazione»: si divide per n). */
export function stat(v: number[]) {
  const n = v.length;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sorted = [...v].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  let mode = v[0];
  for (const m of v) if (v.filter((x) => x === m).length > v.filter((x) => x === mode).length) mode = m;
  const variance = v.reduce((a, m) => a + (m - mean) ** 2, 0) / n;
  return { mean, median, mode, range: Math.max(...v) - Math.min(...v), variance, std: variance ** 0.5 };
}

/** Lo z-score di un valore rispetto alla serie `a` del progetto (deviazione di popolazione). */
const zOf = (p: ProjectSpec, x: number): number => (x - stat(p.a.values).mean) / stat(p.a.values).std;

const EXTRA: Exercise[] = [
  // ───────────── Variabili e indici dalla fine (apertura, difficoltà 1)
  {
    id: 'delta',
    opening: true,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('delta', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (value: string) => `# 1. Variazione tra il primo e l'ultimo valore\nvariazione = ${value}\nprint("${p.labels.first}:", variazione)\n`;
      const v = p.a.values;
      return {
        topic: 'Primo e ultimo elemento',
        theory: [
          { title: 'Contare dalla fine', body: `Con gli indici negativi si parte dalla fine: ${n}[-1] è l'ultimo elemento, ${n}[-2] il penultimo. ${n}[0] resta il primo.` },
          { title: 'Calcoli tra valori', body: `I valori letti da una lista si possono usare come numeri: ${n}[1] + ${n}[2] somma due elementi, ${n}[-1] - ${n}[0] sottrae il primo dall'ultimo.` },
          { title: 'Salvare e mostrare', body: 'Il risultato si salva in una variabile (variazione = …) e si mostra con print("Etichetta:", variazione).' },
        ],
        briefing: `Inizia il rapporto. Leggi il primo e l'ultimo valore di \`${n}\` (l'ultimo con l'indice -1) e salva in \`variazione\` la differenza ultimo − primo: ${p.labels.first.toLowerCase()}.`,
        hint: 'Il primo ha indice 0, l\'ultimo -1. La variazione è ultimo - primo, in quest\'ordine.',
        starter: opening(p) + body('None'),
        solution: opening(p) + body(`${n}[-1] - ${n}[0]`),
        lines: [header(p), `${p.labels.first}: ${num(v[v.length - 1] - v[0])}`],
      };
    },
    viz: (p) => {
      const v = p.a.values;
      return {
        kind: 'value', label: p.labels.first, name: p.a.name, unit: p.a.unit, values: v, marks: [0, v.length - 1],
        expected: [r2(v[v.length - 1] - v[0])],
        note: 'Leggi il primo e l\'ultimo valore (le barre gialle) e stampa la differenza ultimo − primo.',
      };
    },
  },
  // ───────────── Ordinare e prendere una fetta (difficoltà 2)
  {
    id: 'ordina',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('ordina', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (value: string) => `\n# 2. I tre valori più bassi\nmigliori = ${value}\nprint("${p.labels.count}:", migliori)\n`;
      return {
        topic: 'Ordinare e prendere una fetta',
        theory: [
          { title: 'sorted()', body: `sorted(${n}) restituisce una nuova lista ordinata dal più piccolo al più grande, senza modificare l'originale.` },
          { title: 'Le fette', body: `Una fetta (slice) prende una parte della lista: ${n}[:3] sono i primi tre elementi, ${n}[-3:] gli ultimi tre.` },
          { title: 'Insieme', body: `Le due cose si combinano: sorted(${n})[:3] sono i tre valori più bassi della serie.` },
        ],
        briefing: `Sezione 2. Metti in \`migliori\` i 3 valori più bassi di \`${n}\`: ordina la lista con sorted() e prendi i primi tre con [:3]. Il bollettino li stampa come lista.`,
        hint: 'Prima ordina (sorted), poi prendi la fetta [:3] della lista ordinata.',
        starter: body('[]'),
        solution: body(`sorted(${n})[:3]`),
        lines: [`${p.labels.count}: ${list([...p.a.values].sort((x, y) => x - y).slice(0, 3))}`],
      };
    },
    viz: (p) => ({
      kind: 'pick', label: p.labels.count, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [...p.a.values].sort((x, y) => x - y).slice(0, 3),
      note: 'Ordina la serie e stampa i 3 valori più bassi: le loro barre si illumineranno nel grafico.',
    }),
  },
  // ───────────── Contatore con condizione e percentuale (difficoltà 3)
  {
    id: 'percentuale',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('percentuale', p),
    concept: (p) => {
      const n = p.a.name;
      const sec = (loop: string, pct: string) =>
        `\n# 3. Quanti valori superano la soglia, in percentuale\n${p.cutName} = ${num(p.cut)}\nconteggio = 0\n\nfor m in ${n}:\n${loop}\n\npercentuale = ${pct}\nprint("${p.labels.filtered}:", percentuale)\n`;
      return {
        topic: 'Contare con una condizione',
        theory: [
          { title: 'Un contatore', body: 'Un contatore parte da 0 e cresce di 1 quando serve: conteggio = 0, poi conteggio += 1 dentro il ciclo.' },
          { title: 'Contare solo se…', body: 'Con un if dentro il ciclo si conta solo quando la condizione è vera: if m > soglia: conteggio += 1.' },
          { title: 'Percentuale', body: 'La percentuale è conteggio / quanti_sono * 100. round(x) arrotonda a un numero intero.' },
        ],
        briefing: `Sezione 3. Conta quanti valori di \`${n}\` superano \`${p.cutName}\` (${num(p.cut)}) e calcola in \`percentuale\` quanti sono sul totale, in percento e arrotondato a un numero intero.`,
        hint: 'Dentro il ciclo, if m > soglia: conteggio += 1. Dopo il ciclo: round(conteggio / len(lista) * 100).',
        starter: sec('    # aumenta conteggio se m supera la soglia\n    pass', '0   # conteggio / quanti sono * 100, arrotondata a intero'),
        solution: sec(`    if m > ${p.cutName}:\n        conteggio += 1`, `round(conteggio / len(${n}) * 100)`),
        lines: [`${p.labels.filtered}: ${pyRound((above(p).length / p.a.values.length) * 100)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.filtered, name: p.a.name, unit: p.a.unit, values: p.a.values, th: p.cut,
      expected: [pyRound((above(p).length / p.a.values.length) * 100)],
      note: `Conta i valori sopra la soglia ${num(p.cut)} e stampa la percentuale sul totale, arrotondata a intero.`,
    }),
  },
  // ───────────── Variabili e moltiplicazione (apertura, difficoltà 1)
  {
    id: 'conversione',
    opening: true,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('conversione', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (cost: string) =>
        `# 1. Il costo di una lettura\nkwh = ${n}[${p.k}]\ntariffa = 0.25   # euro per unità\ncosto = ${cost}\nprint("${p.labels.first}:", costo)\n`;
      return {
        topic: 'Variabili e operazioni',
        theory: [
          { title: 'Le variabili', body: `Una variabile dà un nome a un valore: kwh = ${n}[${p.k}] legge un elemento della lista e lo chiama kwh.` },
          { title: 'Le operazioni', body: 'Con i numeri si calcola: + somma, - sottrae, * moltiplica, / divide. costo = kwh * tariffa moltiplica due variabili.' },
          { title: 'Mostrare il risultato', body: 'print("Etichetta:", costo) scrive l\'etichetta e il valore calcolato.' },
        ],
        briefing: `Inizia il registro. Leggi in \`kwh\` l'elemento in posizione ${p.k} di \`${n}\` (si parte da 0), poi calcola in \`costo\` quanto costa moltiplicandolo per \`tariffa\` (0.25): ${p.labels.first.toLowerCase()}.`,
        hint: 'costo = kwh * tariffa. Ricorda che il primo elemento ha indice 0.',
        starter: opening(p) + body('None'),
        solution: opening(p) + body('kwh * tariffa'),
        lines: [header(p), `${p.labels.first}: ${num(p.a.values[p.k] * 0.25)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.first, name: p.a.name, unit: p.a.unit, values: p.a.values, marks: [p.k],
      expected: [r2(p.a.values[p.k] * 0.25)],
      note: 'Leggi la lettura evidenziata (barra gialla), moltiplicala per la tariffa 0.25 e stampa il costo.',
    }),
  },
  // ───────────── Posizione del massimo (difficoltà 2)
  {
    id: 'posizione',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('posizione', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (value: string) => `\n# 2. La posizione del valore più alto\nposizione_picco = ${value}\nprint("${p.labels.count}:", posizione_picco)\n`;
      const top = Math.max(...p.a.values);
      return {
        topic: 'Trovare una posizione',
        theory: [
          { title: 'Il valore più alto', body: `max(${n}) restituisce il valore più alto della lista.` },
          { title: 'La posizione di un valore', body: `${n}.index(valore) restituisce la posizione (l'indice) del valore nella lista: si parte da 0, come sempre.` },
          { title: 'Insieme', body: `${n}.index(max(${n})) dà la posizione del valore più alto: prima si trova il massimo, poi dove sta.` },
        ],
        briefing: `Sezione 2. Trova in \`posizione_picco\` la posizione (l'indice, da 0) del valore più alto di \`${n}\`: il bollettino la stampa.`,
        hint: `Usa max(${n}) per il valore e il metodo .index() per la sua posizione.`,
        starter: body('None'),
        solution: body(`${n}.index(max(${n}))`),
        lines: [`${p.labels.count}: ${p.a.values.indexOf(top)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.count, name: p.a.name, unit: p.a.unit, values: p.a.values, asIndex: true,
      expected: [p.a.values.indexOf(Math.max(...p.a.values))],
      note: 'Trova la posizione (indice, da 0) del valore più alto e stampala: si illuminerà la sua barra.',
    }),
  },
  // ───────────── Somma condizionata (difficoltà 3)
  {
    id: 'somma-sopra',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('somma-sopra', p),
    concept: (p) => {
      const n = p.a.name;
      const sec = (loop: string) =>
        `\n# 3. L'energia dei valori sopra soglia\n${p.cutName} = ${num(p.cut)}\neccesso = 0\n\nfor m in ${n}:\n${loop}\n\nprint("${p.labels.filtered}:", eccesso)\n`;
      return {
        topic: 'Sommare solo alcuni valori',
        theory: [
          { title: 'Accumulare', body: 'Un accumulatore parte da 0 e a ogni giro si aggiunge un valore: eccesso += m.' },
          { title: 'Solo se…', body: 'Con un if dentro il ciclo si somma soltanto quando la condizione è vera: if m > soglia: eccesso += m.' },
          { title: 'Cosa cambia rispetto a contare', body: 'Contare aggiunge 1 a ogni valore che passa; sommare aggiunge il valore stesso.' },
        ],
        briefing: `Sezione 3. Somma in \`eccesso\` solo i valori di \`${n}\` che superano \`${p.cutName}\` (${num(p.cut)}); gli altri non si aggiungono. Il bollettino stampa il totale.`,
        hint: 'Dentro il ciclo: if m > soglia: eccesso += m. Parti da eccesso = 0.',
        starter: sec('    # somma m a eccesso solo se supera la soglia\n    pass'),
        solution: sec(`    if m > ${p.cutName}:\n        eccesso += m`),
        lines: [`${p.labels.filtered}: ${num(above(p).reduce((a, b) => a + b, 0))}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.filtered, name: p.a.name, unit: p.a.unit, values: p.a.values, th: p.cut,
      expected: [r2(above(p).reduce((a, b) => a + b, 0))],
      note: `Somma solo i valori sopra la soglia ${num(p.cut)} e stampa il totale.`,
    }),
  },

  // ───────────── Statistica descrittiva (percorso «statistica»): media, mediana, moda, campo, varianza, deviazione standard
  {
    id: 'media',
    opening: true,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('media', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (tot: string, med: string) => `# 1. La media\ntotale = ${tot}\nmedia = ${med}\nprint("${p.labels.first}:", media)\n`;
      const v = p.a.values;
      return {
        topic: 'La media',
        theory: [
          { title: 'Un numero che riassume', body: 'La media aritmetica è il valore «tipico» di una serie: si sommano tutti i valori e si divide per quanti sono.' },
          { title: 'sum() e len()', body: `In Python sum(${n}) somma gli elementi della lista e len(${n}) li conta: media = sum(${n}) / len(${n}).` },
          { title: 'Attenzione agli estremi', body: 'La media è sensibile ai valori molto alti o molto bassi: un solo valore anomalo la sposta. Per questo servono anche altri indicatori.' },
        ],
        briefing: `Inizia il rapporto statistico. Calcola in \`totale\` la somma dei valori di \`${n}\` e in \`media\` il totale diviso per quanti sono: ${p.labels.first.toLowerCase()}.`,
        hint: `totale = sum(${n}); media = totale / len(${n}). Il risultato è un numero con la virgola (es. 5.0).`,
        starter: opening(p) + body('0   # somma dei valori', '0   # totale / quanti sono'),
        solution: opening(p) + body(`sum(${n})`, `totale / len(${n})`),
        lines: [header(p), `${p.labels.first}: ${pyFloat(stat(v).mean)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.first, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [stat(p.a.values).mean],
      note: 'Somma tutti i valori e dividi per quanti sono: stampa la media.',
    }),
  },
  {
    id: 'mediana',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('mediana', p),
    concept: (p) => {
      const n = p.a.name;
      if (p.a.values.length % 2 !== 0) throw new Error('L\'esercizio «mediana» usa un numero pari di valori (media dei due centrali).');
      const body = (ord: string, meta: string, med: string) =>
        `\n# 2. La mediana\nordinati = ${ord}\nmeta = ${meta}\nmediana = ${med}\nprint("${p.labels.count}:", mediana)\n`;
      return {
        topic: 'La mediana',
        theory: [
          { title: 'Il valore centrale', body: 'Ordina i valori dal più piccolo al più grande: la mediana è quello che sta in mezzo. Metà dei dati sta sotto, metà sopra.' },
          { title: 'Numero pari di valori', body: 'Con un numero pari di valori non c\'è un solo elemento al centro: la mediana è la media dei due centrali. Con len(ordinati) // 2 trovi la posizione del secondo dei due.' },
          { title: 'Perché serve', body: 'La mediana non si lascia spostare dai valori anomali: se un valore enorme entra nella serie, la media cambia molto, la mediana quasi niente.' },
        ],
        briefing: `Sezione 2. Usa la lista \`${n}\` della missione 1. Metti in \`ordinati\` i suoi valori in ordine crescente, in \`meta\` la posizione centrale (len // 2) e calcola in \`mediana\` la media dei due valori centrali: quello in posizione meta - 1 e quello in posizione meta.`,
        hint: `ordinati = sorted(${n}); meta = len(ordinati) // 2; mediana = (ordinati[meta - 1] + ordinati[meta]) / 2.`,
        starter: body(`[]   # i valori di ${n} in ordine crescente`, '0   # posizione centrale: len(ordinati) // 2', '0   # media dei due valori centrali'),
        solution: body(`sorted(${n})`, 'len(ordinati) // 2', '(ordinati[meta - 1] + ordinati[meta]) / 2'),
        lines: [`${p.labels.count}: ${pyFloat(stat(p.a.values).median)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.count, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [stat(p.a.values).median],
      note: 'Ordina i valori e stampa la mediana: la media dei due valori centrali.',
    }),
  },
  {
    id: 'moda',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('moda', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (loop: string) => `\n# 3. La moda\nmoda = ${n}[0]\nfor m in ${n}:\n${loop}\nprint("${p.labels.filtered}:", moda)\n`;
      return {
        topic: 'La moda',
        theory: [
          { title: 'Il valore più frequente', body: 'La moda è il valore che compare più volte nella serie. Non è detto che sia vicino alla media: dice cosa succede più spesso.' },
          { title: 'Contare le occorrenze', body: `${n}.count(x) dice quante volte x compare nella lista: ${n}.count(${p.a.values[0]}) conta quante volte c'è il valore ${p.a.values[0]}.` },
          { title: 'Tenere il migliore', body: 'Si scorre la lista tenendo in moda il valore visto più spesso finora: se m compare più volte della moda attuale, diventa lui la nuova moda.' },
        ],
        briefing: `Sezione 3. Trova in \`moda\` il valore che compare più volte in \`${n}\`: scorri la lista e, se m compare più volte della moda attuale (usa .count), aggiorna moda.`,
        hint: `if ${n}.count(m) > ${n}.count(moda): moda = m.`,
        starter: body('    # se m compare più volte di moda, diventa la nuova moda\n    pass'),
        solution: body(`    if ${n}.count(m) > ${n}.count(moda):\n        moda = m`),
        lines: [`${p.labels.filtered}: ${num(stat(p.a.values).mode)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.filtered, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [stat(p.a.values).mode],
      note: 'Trova il valore che compare più volte nella serie e stampalo: è la moda.',
    }),
  },
  {
    id: 'campo',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('campo', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (mx: string, mn: string, c: string) => `\n# 4. Il campo di variazione\nmassimo = ${mx}\nminimo = ${mn}\ncampo = ${c}\nprint("${p.labels.total}:", campo)\n`;
      return {
        topic: 'Il campo di variazione',
        theory: [
          { title: 'Quanto sono sparsi i dati', body: 'Media, mediana e moda dicono dov\'è il centro dei dati; ora serve sapere quanto sono sparsi attorno ad esso.' },
          { title: 'Il campo di variazione', body: 'È la distanza tra il valore più alto e il più basso: campo = massimo - minimo. È il modo più semplice di misurare la dispersione.' },
          { title: 'Limite', body: 'Dipende solo dai due estremi: un valore anomalo lo allarga molto, anche se tutti gli altri sono vicini.' },
        ],
        briefing: `Sezione 4. Sui valori di \`${n}\` (missione 1) calcola in \`massimo\` e \`minimo\` gli estremi (con max e min) e in \`campo\` la loro differenza.`,
        hint: `massimo = max(${n}); minimo = min(${n}); campo = massimo - minimo.`,
        starter: body(`0   # il valore più alto di ${n}`, `0   # il valore più basso di ${n}`, '0   # massimo - minimo'),
        solution: body(`max(${n})`, `min(${n})`, 'massimo - minimo'),
        lines: [`${p.labels.total}: ${num(stat(p.a.values).range)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.total, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [stat(p.a.values).range],
      note: 'Stampa la distanza tra il valore più alto e il più basso: il campo di variazione.',
    }),
  },
  {
    id: 'varianza',
    opening: false,
    requires: ['media'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('varianza', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (loop: string, tot: string) =>
        `\n# 5. La varianza\nscarti_quadrati = []\nfor m in ${n}:\n${loop}\nvarianza = ${tot}\nprint("${p.labels.mean}:", varianza)\n`;
      return {
        topic: 'La varianza',
        theory: [
          { title: 'Lo scarto dalla media', body: 'Lo scarto di un valore è la sua distanza dalla media: m - media. Alcuni scarti sono positivi, altri negativi, e sommati si annullerebbero.' },
          { title: 'Il quadrato', body: 'Elevando lo scarto al quadrato, (m - media) ** 2, i segni spariscono e gli scarti grandi pesano di più.' },
          { title: 'La varianza', body: 'È la media degli scarti al quadrato: sum(scarti_quadrati) / len(lista). Più è alta, più i dati sono sparsi attorno alla media.' },
        ],
        briefing: `Sezione 5. Per ogni valore di \`${n}\` aggiungi a \`scarti_quadrati\` il quadrato dello scarto dalla \`media\` calcolata nella missione 1; poi \`varianza\` è la media di questi quadrati.`,
        hint: 'Nel ciclo: scarti_quadrati.append((m - media) ** 2). Poi varianza = sum(scarti_quadrati) / len(scarti_quadrati).',
        starter: body('    # aggiungi (m - media) ** 2 a scarti_quadrati\n    pass', '0   # somma degli scarti al quadrato / quanti sono'),
        solution: body('    scarti_quadrati.append((m - media) ** 2)', 'sum(scarti_quadrati) / len(scarti_quadrati)'),
        lines: [`${p.labels.mean}: ${pyFloat(stat(p.a.values).variance)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.mean, name: p.a.name, unit: p.a.unit, values: p.a.values, th: stat(p.a.values).mean,
      expected: [stat(p.a.values).variance],
      note: 'La linea gialla è la media. Elevane al quadrato gli scarti, fanne la media e stampa la varianza.',
    }),
  },
  {
    id: 'deviazione',
    opening: false,
    requires: ['varianza'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('deviazione', p),
    concept: (p) => {
      const body = (d: string) => `\n# 6. La deviazione standard\ndeviazione = ${d}\nprint("${p.labels.final}:", deviazione)\n`;
      return {
        topic: 'La deviazione standard',
        theory: [
          { title: 'Tornare all\'unità di misura', body: 'La varianza è espressa in unità al quadrato (min², cm²…): difficile da leggere. La radice quadrata la riporta alla stessa unità dei dati.' },
          { title: 'La radice quadrata', body: 'In Python la radice quadrata di x è x ** 0.5 (elevare a un mezzo). Attenzione: x ** 2 è il quadrato, un\'altra cosa.' },
          { title: 'Come si legge', body: 'La deviazione standard è lo scarto «tipico» dalla media: la maggior parte dei dati sta tra media - deviazione e media + deviazione.' },
        ],
        briefing: `Sezione 6, l'ultima. Calcola in \`deviazione\` la deviazione standard: la radice quadrata della \`varianza\` calcolata prima (elevata a 0.5).`,
        hint: 'deviazione = varianza ** 0.5.',
        starter: body('0   # radice quadrata della varianza'),
        solution: body('varianza ** 0.5'),
        lines: [`${p.labels.final}: ${pyFloat(stat(p.a.values).std)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.final, name: p.a.name, unit: p.a.unit, values: p.a.values, th: stat(p.a.values).mean,
      expected: [stat(p.a.values).std],
      note: 'Fai la radice quadrata della varianza (** 0.5) e stampa la deviazione standard.',
    }),
  },

  // ───────────── Valori anomali (percorso «outlier»): z-score e conteggio degli outlier
  {
    id: 'zscore',
    opening: false,
    requires: ['deviazione'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('zscore', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (z: string) => `\n# 4. Lo z-score del valore più alto\nz_massimo = ${z}\nprint("${p.labels.alert}:", z_massimo)\n`;
      return {
        topic: 'Lo z-score',
        theory: [
          { title: 'Confrontare cose diverse', body: 'Un valore da solo dice poco: 46 minuti sono tanti o pochi? Dipende da media e dispersione dei dati. Lo z-score misura la distanza dalla media in «deviazioni standard».' },
          { title: 'La formula', body: 'z = (valore - media) / deviazione. Uno z di 0 vuol dire «esattamente nella media», +2 «due deviazioni sopra», -1 «una sotto».' },
          { title: 'Perché è utile', body: 'Lo z-score è lo stesso per qualsiasi unità di misura: serve a confrontare serie diverse e a riconoscere i valori insolitamente lontani dalla norma.' },
        ],
        briefing: `Sezione 4. Calcola in \`z_massimo\` lo z-score del valore più alto di \`${n}\`: (massimo - media) / deviazione, usando la \`media\` e la \`deviazione\` calcolate nelle missioni precedenti.`,
        hint: `z_massimo = (max(${n}) - media) / deviazione.`,
        starter: body('0   # (massimo - media) / deviazione'),
        solution: body(`(max(${n}) - media) / deviazione`),
        lines: [`${p.labels.alert}: ${pyFloat(zOf(p, Math.max(...p.a.values)))}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.alert, name: p.a.name, unit: p.a.unit, values: p.a.values, th: stat(p.a.values).mean,
      expected: [zOf(p, Math.max(...p.a.values))],
      note: 'La linea gialla è la media. Calcola quante deviazioni standard dista il valore più alto e stampa lo z-score.',
    }),
  },
  {
    id: 'outlier',
    opening: false,
    requires: ['deviazione'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('outlier', p),
    concept: (p) => {
      const n = p.a.name;
      const sec = (loop: string) =>
        `\n# 5. Quanti valori sono anomali (|z| > 2)\nsoglia_z = 2\nanomali = 0\n\nfor m in ${n}:\n${loop}\n\nprint("${p.labels.extreme}:", anomali)\n`;
      return {
        topic: 'Riconoscere gli outlier',
        theory: [
          { title: 'Cos\'è un outlier', body: 'Un outlier (valore anomalo) è un dato insolitamente lontano dagli altri: può essere un errore di misura oppure un evento raro e interessante. Prima di analizzare i dati va cercato.' },
          { title: 'La regola dello z-score', body: 'Una regola comune: un valore è anomalo se il suo z-score, in valore assoluto, supera 2 (o 3). abs(z) è il valore assoluto, cioè la distanza senza il segno.' },
          { title: 'Attenzione', body: 'Gli outlier gonfiano la deviazione standard: con dati pochi e molto sparsi la regola può non scattare. È uno strumento, non una verità assoluta.' },
        ],
        briefing: `Sezione 5. Scorri \`${n}\`, calcola lo z-score di ogni valore e conta in \`anomali\` quelli con abs(z) maggiore di \`soglia_z\`, usando \`media\` e \`deviazione\`.`,
        hint: 'Nel ciclo: z = (m - media) / deviazione; if abs(z) > soglia_z: anomali += 1.',
        starter: sec('    # calcola z e conta il valore se abs(z) supera la soglia\n    pass'),
        solution: sec('    z = (m - media) / deviazione\n    if abs(z) > soglia_z:\n        anomali += 1'),
        lines: [`${p.labels.extreme}: ${p.a.values.filter((m) => Math.abs(zOf(p, m)) > 2).length}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.extreme, name: p.a.name, unit: p.a.unit, values: p.a.values, th: stat(p.a.values).mean,
      expected: [p.a.values.filter((m) => Math.abs(zOf(p, m)) > 2).length],
      note: 'Conta i valori con z-score oltre 2 in valore assoluto (le barre più lontane dalla media) e stampa quanti sono.',
    }),
  },

  // ───────────── Probabilità (percorso «probabilita»): frequenza, valore atteso, scostamento, eventi con due dadi
  {
    id: 'frequenza',
    opening: true,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('frequenza', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (u: string, f: string) => `# 1. La frequenza relativa\nuscite = ${u}\nfrequenza = ${f}\nprint("${p.labels.first}:", frequenza)\n`;
      const hits = p.a.values.filter((x) => x === p.k).length;
      return {
        topic: 'La frequenza relativa',
        theory: [
          { title: 'Dai conteggi alle proporzioni', body: 'La frequenza relativa è la quota di volte in cui un evento è successo: uscite / lanci. Va da 0 (mai) a 1 (sempre).' },
          { title: 'count() e len()', body: `${n}.count(x) conta quante volte x compare nella lista; len(${n}) dice quanti lanci ci sono.` },
          { title: 'Frequenza e probabilità', body: 'La probabilità è ciò che ci aspettiamo; la frequenza è ciò che osserviamo. Con pochi lanci possono essere molto diverse, con tanti lanci tendono ad avvicinarsi.' },
        ],
        briefing: `Inizia il rapporto. Conta in \`uscite\` quante volte è uscito il ${p.k} in \`${n}\` e calcola in \`frequenza\` la frequenza relativa: uscite diviso il numero di lanci.`,
        hint: `uscite = ${n}.count(${p.k}); frequenza = uscite / len(${n}).`,
        starter: opening(p) + body(`0   # quante volte esce il ${p.k}`, '0   # uscite / numero di lanci'),
        solution: opening(p) + body(`${n}.count(${p.k})`, `uscite / len(${n})`),
        lines: [header(p), `${p.labels.first}: ${pyFloat(hits / p.a.values.length)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.first, name: p.a.name, unit: p.a.unit, values: p.a.values,
      marks: p.a.values.map((x, i) => (x === p.k ? i : -1)).filter((i) => i >= 0),
      expected: [p.a.values.filter((x) => x === p.k).length / p.a.values.length],
      note: `Le barre gialle sono i lanci in cui è uscito il ${p.k}: stampa la loro frequenza relativa (da 0 a 1).`,
    }),
  },
  {
    id: 'valore-atteso',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('valore-atteso', p),
    concept: (p) => {
      const body = (a: string) => `\n# 2. Il valore atteso di un dado\nfacce = [1, 2, 3, 4, 5, 6]\natteso = ${a}\nprint("${p.labels.count}:", atteso)\n`;
      return {
        topic: 'Il valore atteso',
        theory: [
          { title: 'Cosa aspettarsi', body: 'Il valore atteso è la media che otterresti ripetendo l\'esperimento infinite volte. Non è detto che sia un risultato possibile: un dado non fa mai 3.5.' },
          { title: 'Facce equiprobabili', body: 'Se tutte le facce hanno la stessa probabilità, il valore atteso è la media delle facce: sum(facce) / len(facce).' },
          { title: 'Teoria contro dati', body: 'Il valore atteso nasce dalla teoria (le facce del dado), non dai lanci osservati: lo confronteremo con la media dei lanci.' },
        ],
        briefing: 'Sezione 2. Definisci le `facce` di un dado (da 1 a 6) e calcola in `atteso` il valore atteso: la media delle facce.',
        hint: 'atteso = sum(facce) / len(facce).',
        starter: body('0   # media delle facce'),
        solution: body('sum(facce) / len(facce)'),
        lines: [`${p.labels.count}: ${pyFloat(3.5)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.count, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [3.5],
      note: 'Questa volta conta la teoria: stampa il valore atteso di un dado a sei facce (la media di 1, 2, 3, 4, 5, 6).',
    }),
  },
  {
    id: 'scostamento',
    opening: false,
    requires: ['valore-atteso'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('scostamento', p),
    concept: (p) => {
      const n = p.a.name;
      const body = (m: string, d: string) =>
        `\n# 3. Quanto si discostano i lanci dal valore atteso\nmedia = ${m}\nscostamento = ${d}\nprint("${p.labels.filtered}:", scostamento)\n`;
      return {
        topic: 'Dati contro teoria',
        theory: [
          { title: 'La media dei lanci', body: `La media osservata si calcola come sempre: sum(${n}) / len(${n}).` },
          { title: 'Lo scostamento', body: 'La distanza tra la media osservata e il valore atteso: abs(media - atteso). abs() toglie il segno, perché conta la distanza, non la direzione.' },
          { title: 'Arrotondare', body: 'I numeri con la virgola possono avere cifre in eccesso: round(x, 2) li arrotonda a 2 decimali. Più lanci fai, più lo scostamento tende a 0 (legge dei grandi numeri).' },
        ],
        briefing: `Sezione 3. Calcola in \`media\` la media dei lanci di \`${n}\` e in \`scostamento\` la distanza tra \`media\` e \`atteso\`, in valore assoluto e arrotondata a 2 decimali.`,
        hint: `media = sum(${n}) / len(${n}); scostamento = round(abs(media - atteso), 2).`,
        starter: body('0   # media dei lanci', '0   # distanza dal valore atteso, arrotondata a 2 decimali'),
        solution: body(`sum(${n}) / len(${n})`, 'round(abs(media - atteso), 2)'),
        lines: [`${p.labels.filtered}: ${pyFloat(Math.round(Math.abs(stat(p.a.values).mean - 3.5) * 100) / 100)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.filtered, name: p.a.name, unit: p.a.unit, values: p.a.values, th: 3.5,
      expected: [Math.round(Math.abs(stat(p.a.values).mean - 3.5) * 100) / 100],
      note: 'La linea gialla è il valore atteso (3.5). Stampa la distanza tra la media dei lanci e quella linea, arrotondata a 2 decimali.',
    }),
  },
  {
    id: 'somma-dadi',
    opening: false,
    requires: ['valore-atteso'],
    game: QUIZ_GAME,
    gameConfig: (p) => quiz('somma-dadi', p),
    concept: (p) => {
      const sec = (loop: string, prob: string) =>
        `\n# 4. La probabilità di fare 7 con due dadi\nfavorevoli = 0\nfor d1 in facce:\n    for d2 in facce:\n${loop}\n\nprobabilita = ${prob}\nprint("${p.labels.total}:", probabilita)\n`;
      return {
        topic: 'Probabilità di un evento',
        theory: [
          { title: 'Casi favorevoli su casi possibili', body: 'Con esiti equiprobabili, la probabilità di un evento è favorevoli / possibili. Con due dadi i casi possibili sono 6 × 6 = 36.' },
          { title: 'Due cicli annidati', body: 'Un ciclo dentro l\'altro prova tutte le coppie: per ogni d1 si scorrono tutti i d2. Dentro si conta se d1 + d2 vale 7.' },
          { title: 'Dall\'evento al numero', body: 'Il risultato è una proporzione tra 0 e 1. round(x, 4) tiene 4 decimali.' },
        ],
        briefing: 'Sezione 4. Conta in `favorevoli` le coppie di facce (d1, d2) la cui somma è 7, poi calcola in `probabilita` favorevoli diviso tutte le coppie possibili, arrotondato a 4 decimali.',
        hint: 'if d1 + d2 == 7: favorevoli += 1. Le coppie possibili sono len(facce) * len(facce).',
        starter: sec('        # conta la coppia se d1 + d2 vale 7\n        pass', '0   # favorevoli / coppie possibili, arrotondata a 4 decimali'),
        solution: sec('        if d1 + d2 == 7:\n            favorevoli += 1', 'round(favorevoli / (len(facce) * len(facce)), 4)'),
        lines: [`${p.labels.total}: ${pyFloat(Math.round((6 / 36) * 10000) / 10000)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.total, name: p.a.name, unit: p.a.unit, values: p.a.values,
      expected: [Math.round((6 / 36) * 10000) / 10000],
      note: 'Conta in quanti modi due dadi sommano 7 su 36 coppie possibili e stampa la probabilità, arrotondata a 4 decimali.',
    }),
  },
  // ───────────── Percorsi base: «Le Variabili» (var-*) e «Le Liste» (liste-modifica, dopo std-1 e std-2)
  // Variabili: nessuna lista (non l'hanno ancora vista): i numeri vengono dal progetto, `misura` = a[k], `soglia` = alert, `bonus` = cut.
  {
    id: 'var-assegna',
    opening: true,
    game: QUIZ_GAME,
    gameConfig: (p) => varQuiz('var-assegna', p),
    concept: (p) => {
      const m = p.a.values[p.k];
      const body = (value: string) => `# 1. Crea la variabile\nmisura = ${value}\nprint("${p.labels.first}:", misura)\n`;
      return {
        topic: 'Creare una variabile',
        theory: [
          { title: 'Dare un nome a un valore', body: `Una variabile è un nome che ricorda un valore: misura = ${num(m)} crea la variabile misura e le dà il valore ${num(m)}. Il segno = significa «assegna», non «è uguale».` },
          { title: 'Usare la variabile', body: `Dopo averla creata scrivi il nome al posto del valore: print(misura) mostra ${num(m)}. Il nome non va tra virgolette: tra virgolette sarebbe solo un testo.` },
          { title: 'Nomi chiari', body: 'Scegli nomi che dicono cosa contengono (misura, soglia, totale): senza spazi, senza accenti e senza iniziare con un numero.' },
        ],
        briefing: `Inizia il bollettino. Crea la variabile \`misura\` con il valore ${num(m)} (${p.a.unit}) e lascia che il bollettino la stampi: ${p.labels.first.toLowerCase()}.`,
        hint: 'Scrivi il nome della variabile, il segno = e il valore: misura = …',
        starter: openingVars(p) + body('None'),
        solution: openingVars(p) + body(num(m)),
        lines: [header(p), `${p.labels.first}: ${num(m)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.first, name: 'misura', unit: p.a.unit, values: [p.a.values[p.k]], expected: [p.a.values[p.k]],
      note: `Crea la variabile misura con il valore ${num(p.a.values[p.k])} e stampala: la barra si illumina.`,
    }),
  },
  {
    id: 'var-calcola',
    opening: false,
    requires: ['var-assegna'],
    game: QUIZ_GAME,
    gameConfig: (p) => varQuiz('var-calcola', p),
    concept: (p) => {
      const m = p.a.values[p.k];
      const body = (value: string) => `\n# 2. Quanto manca all'obiettivo\nsoglia = ${num(p.alert)}\ndifferenza = ${value}\nprint("${p.labels.count}:", differenza)\n`;
      return {
        topic: 'Fare i conti con le variabili',
        theory: [
          { title: 'Operazioni', body: 'Python calcola con + (somma), - (differenza), * (prodotto) e / (divisione). Il risultato si può salvare in una nuova variabile: totale = 3 + 4.' },
          { title: 'Variabili nei conti', body: 'Al posto dei numeri puoi usare i nomi delle variabili: differenza = misura - soglia usa i valori che misura e soglia hanno in quel momento.' },
          { title: "L'ordine conta", body: 'Nella sottrazione l\'ordine cambia il segno: misura - soglia e soglia - misura danno risultati opposti.' },
        ],
        briefing: `Sezione 2. La variabile \`soglia\` è già pronta (${num(p.alert)} ${p.a.unit}). Calcola in \`differenza\` quanto \`misura\` supera \`soglia\`: misura − soglia. Il bollettino la stampa.`,
        hint: 'Usa i nomi delle due variabili e il segno -, in questo ordine: misura - soglia.',
        starter: body('None'),
        solution: body('misura - soglia'),
        lines: [`${p.labels.count}: ${num(m - p.alert)}`],
      };
    },
    viz: (p) => ({
      kind: 'value', label: p.labels.count, name: 'differenza', unit: p.a.unit, values: [p.a.values[p.k], p.alert], expected: [r2(p.a.values[p.k] - p.alert)],
      note: 'Calcola misura − soglia (le due barre) e stampa la differenza.',
    }),
  },
  {
    id: 'liste-modifica',
    opening: false,
    game: QUIZ_GAME,
    gameConfig: (p) => ({ exercise: 'liste-modifica', name: p.b.name, unit: p.b.unit, v: p.b.values, th: p.cut, thName: p.cutName, k: p.k }),
    concept: (p) => {
      const b = p.b.name;
      const last = p.b.values[p.b.values.length - 1];
      const final = [...p.b.values.slice(0, -1), p.cut];
      const body = (code: string) => `\n# 2. Aggiungi e togli elementi\n${data(p.b)}\n${p.cutName} = ${num(p.cut)}\n${code}\nprint("${p.labels.filtered}:", ${b})\n`;
      return {
        topic: 'Aggiungere e togliere elementi: append() e pop()',
        theory: [
          { title: 'append(): aggiunge in coda', body: `${b}.append(valore) mette un elemento in fondo alla lista, che diventa più lunga di 1. Modifica la lista stessa: non crea una copia e non restituisce nulla.` },
          { title: 'pop(): toglie l\'ultimo', body: `${b}.pop() toglie l'ultimo elemento e lo restituisce: rimosso = ${b}.pop() salva in rimosso il valore tolto (qui ${num(last)}) e la lista diventa più corta di 1. Su una lista vuota dà errore.` },
          { title: 'Cambia la lista, non la riga prima', body: `Dopo append() e pop() la lista ha un contenuto nuovo: ogni istruzione lavora sulla lista com'è in quel momento, nell'ordine in cui le scrivi.` },
        ],
        briefing: `Sezione 2. Un articolo viene tolto dal carrello e un altro viene aggiunto. Con pop() togli l'ultimo elemento di \`${b}\` (salvalo in \`rimosso\`), poi aggiungi con append() la variabile \`${p.cutName}\` (${num(p.cut)} ${p.b.unit}). Il bollettino stampa la lista aggiornata.`,
        hint: `Due istruzioni, in quest'ordine: rimosso = ${b}.pop() e poi ${b}.append(${p.cutName}).`,
        starter: body(`rimosso = None   # togli l'ultimo elemento con pop()\n# aggiungi ${p.cutName} in coda con append()`),
        solution: body(`rimosso = ${b}.pop()\n${b}.append(${p.cutName})`),
        lines: [`${p.labels.filtered}: ${list(final)}`],
      };
    },
    viz: (p) => ({
      kind: 'pick', label: p.labels.filtered, name: p.b.name, unit: p.b.unit, values: [...p.b.values, p.cut], expected: [...p.b.values.slice(0, -1), p.cut],
      note: `Togli l'ultimo elemento, aggiungi ${num(p.cut)} e stampa la lista: si illuminano le barre rimaste e quella nuova.`,
    }),
  },
];

export const EXERCISES: Record<string, Exercise> = Object.fromEntries([...STANDARD, ...EXTRA].map((e) => [e.id, e]));

/** Gli esercizi di un percorso, nell'ordine delle sue missioni: quelli scelti, oppure i primi N dei 10 standard. */
export function exercisesFor(path: { slug: string; missions: unknown[]; exercises?: string[] }): Exercise[] {
  const ids = path.exercises ?? STANDARD.slice(0, path.missions.length).map((e) => e.id);
  if (ids.length !== path.missions.length) throw new Error(`Il percorso «${path.slug}» ha ${path.missions.length} missioni ma ${ids.length} esercizi.`);
  const list = ids.map((id) => {
    const e = EXERCISES[id];
    if (!e) throw new Error(`Esercizio sconosciuto «${id}» nel percorso «${path.slug}».`);
    return e;
  });
  list.forEach((e, i) => {
    for (const r of e.requires ?? []) if (!list.slice(0, i).some((x) => x.id === r)) throw new Error(`L'esercizio «${e.id}» richiede «${r}» prima di sé («${path.slug}»).`);
    if (e.opening !== (i === 0)) throw new Error(i === 0 ? `Il primo esercizio di «${path.slug}» deve aprire il progetto (non «${e.id}»).` : `L'esercizio «${e.id}» apre il progetto: può stare solo al primo posto («${path.slug}»).`);
  });
  return list;
}
