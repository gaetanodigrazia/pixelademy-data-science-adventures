import { Labels, ProjectSpec, Series } from '../../core/models/project.model';
import { MissionViz, TheorySlide } from '../../core/models/mission.model';

export type { Labels, ProjectSpec, Series };

export interface Concept {
  topic: string;
  theory: TheorySlide[];
  briefing: string;
  hint: string;
  /** Sezione da completare (con le righe di dati e la stampa già pronte). */
  starter: string;
  /** Sezione completata. */
  solution: string;
  /** Righe che questa sezione aggiunge all'output del bollettino. */
  lines: string[];
}

export const r2 = (n: number): number => Math.round(n * 100) / 100;
export const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
export const num = (n: number): string => String(r2(n));
export const list = (a: number[]): string => `[${a.map(num).join(', ')}]`;
const dict = (d: Record<string, number>): string => `{${Object.entries(d).map(([k, x]) => `'${k}': ${num(x)}`).join(', ')}}`;
export const data = (s: Series): string => `${s.name} = ${list(s.values)}   # ${s.label} (${s.unit})`;

export type Builder = (p: ProjectSpec) => Concept;

export const BUILDERS: Builder[] = [
  // 1. leggere un valore
  (p) => ({
    topic: 'Leggere un valore da una lista',
    theory: [
      { title: 'Le liste', body: `Una lista raccoglie più valori in un solo oggetto: ${p.a.name} = [${p.a.values.slice(0, 3).map(num).join(', ')}, ...]. I valori sono separati da virgole.` },
      { title: 'Gli indici', body: `Ogni elemento ha una posizione, detta indice, e si parte da 0: ${p.a.name}[0] è il primo valore, ${p.a.name}[1] il secondo.` },
      { title: 'Mostrare un risultato', body: `La funzione print() scrive nella console: print("Valore:", ${p.a.name}[2]) mostra il terzo elemento dopo l'etichetta.` },
    ],
    briefing: `Inizia il bollettino. Leggi da \`${p.a.name}\` l'elemento in posizione ${p.k} (si parte da 0) e salvalo in \`rilevazione\`: ${p.labels.first.toLowerCase()}.`,
    hint: `Per leggere un elemento scrivi nome_lista[indice]. Ricorda che il primo elemento ha indice 0.`,
    starter: `# Bollettino automatico: ogni missione aggiunge una sezione.\n# Alla fine il programma stampa il bollettino completo.\n\n${data(p.a)}\nprint("=== ${p.heading} ===")\n\n# 1. Leggi la rilevazione in posizione ${p.k} (si parte da 0)\nrilevazione = None\nprint("${p.labels.first}:", rilevazione)\n`,
    solution: `# Bollettino automatico: ogni missione aggiunge una sezione.\n# Alla fine il programma stampa il bollettino completo.\n\n${data(p.a)}\nprint("=== ${p.heading} ===")\n\n# 1. Leggi la rilevazione in posizione ${p.k} (si parte da 0)\nrilevazione = ${p.a.name}[${p.k}]\nprint("${p.labels.first}:", rilevazione)\n`,
    lines: [`=== ${p.heading} ===`, `${p.labels.first}: ${num(p.a.values[p.k])}`],
  }),
  // 2. contare osservazioni
  (p) => ({
    topic: 'Contare le osservazioni',
    theory: [
      { title: 'Quanti elementi?', body: 'Prima di analizzare dei dati è utile sapere quante osservazioni abbiamo. In Python lo si chiede con len(lista).' },
      { title: 'Salvare in una variabile', body: 'Un risultato si può salvare in una variabile: conteggio = len(dati). Poi si mostra con print().' },
    ],
    briefing: `Aggiungi la sezione 2. La lista \`${p.b.name}\` contiene le rilevazioni di ${p.b.label.toLowerCase()} (${p.b.unit}). Conta quante sono, salva il numero in \`conteggio\` e lascia che il bollettino lo stampi.`,
    hint: 'Python mette a disposizione una funzione che restituisce la lunghezza di una lista.',
    starter: `\n# 2. Conta le rilevazioni di ${p.b.label.toLowerCase()}\n${data(p.b)}\nconteggio = None\nprint("${p.labels.count}:", conteggio)\n`,
    solution: `\n# 2. Conta le rilevazioni di ${p.b.label.toLowerCase()}\n${data(p.b)}\nconteggio = len(${p.b.name})\nprint("${p.labels.count}:", conteggio)\n`,
    lines: [`${p.labels.count}: ${p.b.values.length}`],
  }),
  // 3. filtrare una lista
  (p) => {
    const kept = p.c.values.filter((x) => x > p.cut);
    return {
      topic: 'Filtrare una lista',
      theory: [
        { title: 'Il ciclo for', body: `for m in ${p.c.name}: ripete le istruzioni indentate una volta per ogni elemento, assegnandolo a m.` },
        { title: 'La condizione if', body: 'if m > 10: esegue il blocco indentato solo se la condizione è vera. Operatori utili: >, <, >=, <=, ==.' },
        { title: 'Costruire una nuova lista', body: 'Si parte da una lista vuota, filtrati = [], e si aggiungono elementi con filtrati.append(m).' },
      ],
      briefing: `Sezione 3. Costruisci \`filtrati\` con i valori di \`${p.c.name}\` (${p.c.unit}) strettamente maggiori di \`${p.cutName}\`, mantenendo l'ordine originale.`,
      hint: "Dentro il ciclo for, usa un if per decidere se aggiungere l'elemento con append().",
      starter: `\n# 3. Filtra i valori di ${p.c.label.toLowerCase()} sopra soglia\n${data(p.c)}\n${p.cutName} = ${num(p.cut)}\nfiltrati = []\n\nfor m in ${p.c.name}:\n    # aggiungi m a filtrati solo se supera la soglia\n    pass\n\nprint("${p.labels.filtered}:", filtrati)\n`,
      solution: `\n# 3. Filtra i valori di ${p.c.label.toLowerCase()} sopra soglia\n${data(p.c)}\n${p.cutName} = ${num(p.cut)}\nfiltrati = []\n\nfor m in ${p.c.name}:\n    if m > ${p.cutName}:\n        filtrati.append(m)\n\nprint("${p.labels.filtered}:", filtrati)\n`,
      lines: [`${p.labels.filtered}: ${list(kept)}`],
    };
  },
  // 4. sommare valori
  (p) => ({
    topic: 'Sommare i valori',
    theory: [
      { title: 'Accumulare', body: 'Per sommare si usa un accumulatore: parte da 0 e a ogni giro del ciclo si scrive totale += m.' },
      { title: 'Scorciatoia', body: 'La funzione sum(lista) fa lo stesso lavoro in un colpo solo. Qui però esercitati con il ciclo for.' },
    ],
    briefing: `Sezione 4. Somma tutte le rilevazioni di \`${p.b.name}\` (${p.b.unit}) nella variabile \`totale\`.`,
    hint: 'Parti da totale = 0 e, dentro il ciclo, aggiungi ogni elemento con +=.',
    starter: `\n# 4. Somma le rilevazioni di ${p.b.label.toLowerCase()}\ntotale = 0\n\nfor m in ${p.b.name}:\n    # aggiungi m al totale\n    pass\n\nprint("${p.labels.total}:", totale)\n`,
    solution: `\n# 4. Somma le rilevazioni di ${p.b.label.toLowerCase()}\ntotale = 0\n\nfor m in ${p.b.name}:\n    totale += m\n\nprint("${p.labels.total}:", totale)\n`,
    lines: [`${p.labels.total}: ${num(p.b.values.reduce((x, y) => x + y, 0))}`],
  }),
  // 5. calcolare una media
  (p) => ({
    topic: 'Calcolare la media',
    theory: [
      { title: 'La media aritmetica', body: 'La media è la somma dei valori divisa per il loro numero: media = somma / quantità.' },
      { title: 'Divisione e arrotondamento', body: "In Python l'operatore / restituisce un numero decimale. Con round(x, 2) lo arrotondi a 2 cifre dopo la virgola." },
    ],
    briefing: `Sezione 5. Calcola la media delle rilevazioni di \`${p.a.name}\` (${p.a.unit}) e salvala in \`media\`: il bollettino la stampa arrotondata a 2 decimali.`,
    hint: 'Combina sum() e len(): somma diviso quantità.',
    starter: `\n# 5. Calcola la media di ${p.a.label.toLowerCase()}\nmedia = 0\nprint("${p.labels.mean}:", round(media, 2))\n`,
    solution: `\n# 5. Calcola la media di ${p.a.label.toLowerCase()}\nmedia = sum(${p.a.name}) / len(${p.a.name})\nprint("${p.labels.mean}:", round(media, 2))\n`,
    lines: [`${p.labels.mean}: ${num(mean(p.a.values))}`],
  }),
  // 6. confrontare soglie
  (p) => ({
    topic: 'Confrontare con una soglia',
    theory: [
      { title: 'Scegliere con if/else', body: 'if condizione: ... else: ... esegue il primo blocco se la condizione è vera, altrimenti il secondo.' },
      { title: 'Testo in una variabile', body: 'Una stringa si scrive tra apici: stato = "OK". Attenzione a maiuscole e ortografia.' },
    ],
    briefing: `Sezione 6. Confronta \`media\` con \`soglia_allerta\`: se la media è strettamente maggiore della soglia, \`stato\` vale "ALLARME", altrimenti "OK".`,
    hint: "Serve un if con l'operatore > e un ramo else che assegnano una stringa a stato.",
    starter: `\n# 6. Allerta: confronta la media con la soglia\nsoglia_allerta = ${num(p.alert)}\nstato = None   # "ALLARME" se media > soglia_allerta, altrimenti "OK"\nprint("${p.labels.alert}:", stato)\n`,
    solution: `\n# 6. Allerta: confronta la media con la soglia\nsoglia_allerta = ${num(p.alert)}\nif media > soglia_allerta:\n    stato = "ALLARME"\nelse:\n    stato = "OK"\nprint("${p.labels.alert}:", stato)\n`,
    lines: [`${p.labels.alert}: ${mean(p.a.values) > p.alert ? 'ALLARME' : 'OK'}`],
  }),
  // 7. dizionari
  (p) => ({
    topic: 'Usare i dizionari',
    theory: [
      { title: 'Coppie chiave-valore', body: "Un dizionario associa un nome (chiave) a un valore: registro = {'nord': 18, 'sud': 34}." },
      { title: 'Leggere con la chiave', body: "Si legge con le parentesi quadre e la chiave: registro['sud'] restituisce 34." },
    ],
    briefing: `Sezione 7. Il dizionario \`${p.registry.name}\` associa a ogni zona un valore (${p.registry.unit}). Leggi il valore della zona '${p.registry.key}' e salvalo in \`risultato\`.`,
    hint: "Con i dizionari l'indice non è un numero ma la chiave, scritta tra apici.",
    starter: `\n# 7. Leggi un valore dal registro\n${p.registry.name} = ${dict(p.registry.entries)}\nrisultato = None\nprint("${p.labels.key}:", risultato)\n`,
    solution: `\n# 7. Leggi un valore dal registro\n${p.registry.name} = ${dict(p.registry.entries)}\nrisultato = ${p.registry.name}['${p.registry.key}']\nprint("${p.labels.key}:", risultato)\n`,
    lines: [`${p.labels.key}: ${num(p.registry.entries[p.registry.key])}`],
  }),
  // 8. minimo o massimo
  (p) => {
    const isMax = p.extreme === 'max';
    const fn = isMax ? 'max' : 'min';
    return {
      topic: 'Trovare minimo e massimo',
      theory: [
        { title: 'Valori estremi', body: 'Il massimo è il valore più alto di una serie, il minimo il più basso. Sono utili per trovare picchi e record.' },
        { title: 'max() e min()', body: 'Python offre max(lista) e min(lista): restituiscono direttamente il valore estremo della lista.' },
      ],
      briefing: `Sezione 8. Trova il valore ${isMax ? 'massimo' : 'minimo'} tra le rilevazioni di \`${p.a.name}\` (${p.a.unit}) e salvalo in \`estremo\`.`,
      hint: `Esiste una funzione già pronta che restituisce il valore ${isMax ? 'più alto' : 'più basso'} di una lista.`,
      starter: `\n# 8. Trova il valore ${isMax ? 'massimo' : 'minimo'}\nestremo = None\nprint("${p.labels.extreme}:", estremo)\n`,
      solution: `\n# 8. Trova il valore ${isMax ? 'massimo' : 'minimo'}\nestremo = ${fn}(${p.a.name})\nprint("${p.labels.extreme}:", estremo)\n`,
      lines: [`${p.labels.extreme}: ${num(isMax ? Math.max(...p.a.values) : Math.min(...p.a.values))}`],
    };
  },
  // 9. funzioni
  (p) => ({
    topic: 'Creare funzioni',
    theory: [
      { title: 'Definire una funzione', body: 'def nome(parametro): apre una funzione. Il blocco indentato è il suo corpo e return restituisce il risultato.' },
      { title: 'Riusare il codice', body: `Una funzione si scrive una volta e si chiama quante volte serve: escursione(${p.a.name}) esegue il suo corpo con quei dati.` },
      { title: 'Escursione', body: "L'escursione di una serie è la differenza tra il valore massimo e il minimo." },
    ],
    briefing: `Sezione 9. Completa la funzione \`escursione(valori)\` in modo che restituisca la differenza tra massimo e minimo della lista: il bollettino la usa su \`${p.a.name}\`.`,
    hint: 'Dentro la funzione usa return con una sottrazione tra due valori estremi della lista.',
    starter: `\n# 9. Funzione per l'escursione (massimo - minimo)\ndef escursione(valori):\n    # restituisci massimo - minimo\n    return 0\n\nprint("${p.labels.range}:", escursione(${p.a.name}))\n`,
    solution: `\n# 9. Funzione per l'escursione (massimo - minimo)\ndef escursione(valori):\n    return max(valori) - min(valori)\n\nprint("${p.labels.range}:", escursione(${p.a.name}))\n`,
    lines: [`${p.labels.range}: ${num(Math.max(...p.a.values) - Math.min(...p.a.values))}`],
  }),
  // 10. pipeline
  (p) => {
    const kept = p.c.values.filter((x) => x > p.cut);
    return {
      topic: 'Una piccola pipeline di analisi',
      theory: [
        { title: 'Passo dopo passo', body: 'Una pipeline combina più operazioni in sequenza: i dati escono da un passo ed entrano nel successivo.' },
        { title: 'Filtra, aggrega, riporta', body: 'Nel tuo bollettino hai già filtrato i valori (sezione 3) e calcolato una media (sezione 5): ora li metti in fila.' },
        { title: 'Controllare i dati', body: 'Prima di dividere per len(lista) assicurati che la lista non sia vuota, altrimenti la divisione fallisce.' },
      ],
      briefing: `Ultima sezione! Riusa \`filtrati\` (sezione 3): calcola la media dei suoi valori in \`media_filtrati\`. Il bollettino la stampa arrotondata e chiude il rapporto.`,
      hint: 'Riusa il calcolo della media della sezione 5, ma applicato alla lista filtrati.',
      starter: `\n# 10. Media dei valori filtrati (riusa filtrati)\nmedia_filtrati = 0\nprint("${p.labels.final}:", round(media_filtrati, 2))\nprint("=== FINE DEL BOLLETTINO ===")\n`,
      solution: `\n# 10. Media dei valori filtrati (riusa filtrati)\nmedia_filtrati = sum(filtrati) / len(filtrati)\nprint("${p.labels.final}:", round(media_filtrati, 2))\nprint("=== FINE DEL BOLLETTINO ===")\n`,
      lines: [`${p.labels.final}: ${num(mean(kept))}`, '=== FINE DEL BOLLETTINO ==='],
    };
  },
];

export const CONCEPT_COUNT = BUILDERS.length;

export function buildConcept(index: number, spec: ProjectSpec): Concept {
  return BUILDERS[index](spec);
}

/** Configurazione del minigioco della missione: i dati del progetto, così si gioca il concetto sui dati veri. */
export function gameConfig(index: number, p: ProjectSpec): Record<string, unknown> {
  switch (index) {
    case 0: return { unit: p.a.unit, v: p.a.values, k: p.k };
    case 1: return { unit: p.b.unit, v: p.b.values };
    case 2: return { unit: p.c.unit, v: p.c.values, th: p.cut };
    case 3: return { unit: p.b.unit, v: p.b.values };
    case 4: return { unit: p.a.unit, v: p.a.values };
    case 5: return { unit: p.a.unit, v: p.a.values, th: p.alert };
    case 6: return { unit: p.registry.unit, d: p.registry.entries, key: p.registry.key };
    case 7: return { unit: p.a.unit, v: p.a.values, mode: p.extreme };
    case 8: return { unit: p.a.unit, v: p.a.values };
    default: return { unit: p.c.unit, v: p.c.values, th: p.cut };
  }
}

/** Scena di gioco guidata dal codice per la missione: usa i dati del progetto e la riga di bollettino della sezione. */
export function vizFor(index: number, p: ProjectSpec): MissionViz {
  const L = p.labels;
  const keys = Object.keys(p.registry.entries);
  const kept = p.c.values.filter((x) => x > p.cut);
  const A = { name: p.a.name, unit: p.a.unit, values: p.a.values };
  const B = { name: p.b.name, unit: p.b.unit, values: p.b.values };
  const C = { name: p.c.name, unit: p.c.unit, values: p.c.values };
  switch (index) {
    case 0: return { kind: 'list-read', label: L.first, ...A, index: p.k, expected: [p.a.values[p.k]] };
    case 1: return { kind: 'count', label: L.count, ...B, expected: [p.b.values.length] };
    case 2: return { kind: 'filter', label: L.filtered, ...C, th: p.cut, expected: kept };
    case 3: return { kind: 'sum', label: L.total, ...B, expected: [r2(p.b.values.reduce((x, y) => x + y, 0))] };
    case 4: return { kind: 'mean', label: L.mean, ...A, expected: [r2(mean(p.a.values))] };
    case 5: return { kind: 'alarm', label: L.alert, ...A, th: p.alert, expected: mean(p.a.values) > p.alert ? 'ALLARME' : 'OK' };
    case 6: return { kind: 'dict', label: L.key, name: p.registry.name, unit: p.registry.unit, values: Object.values(p.registry.entries), labels: keys, index: keys.indexOf(p.registry.key), expected: [p.registry.entries[p.registry.key]] };
    case 7: return { kind: 'extreme', label: L.extreme, ...A, mode: p.extreme, expected: [p.extreme === 'max' ? Math.max(...p.a.values) : Math.min(...p.a.values)] };
    case 8: return { kind: 'range', label: L.range, ...A, expected: [r2(Math.max(...p.a.values) - Math.min(...p.a.values))] };
    default: return { kind: 'pipeline', label: L.final, ...C, th: p.cut, expected: [r2(mean(kept))] };
  }
}
