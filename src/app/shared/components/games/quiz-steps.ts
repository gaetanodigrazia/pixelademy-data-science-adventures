import { pyFloat, pyRound } from '../../../core/utils/py';
import { fmt, list } from './base-game';

export interface QuizOption {
  label: string;
  why: string;
}

export interface QuizStep {
  /** Cosa si chiede, scritto come nel codice (es. `attese[-1] → ?`). */
  prompt: string;
  correct: string;
  /** Sviste tipiche, ognuna con la spiegazione; si usano al massimo 3. */
  traps: QuizOption[];
  /** Spiegazione mostrata quando si risponde bene. */
  hit: string;
  /** Riga del codice evidenziata (0 = prima). */
  line: number;
  vars?: string;
}

export interface Quiz {
  title: string;
  goal: string;
  code: string[];
  steps: QuizStep[];
}

export interface QuizConfig {
  exercise: string;
  /** Nome della variabile con la serie (`attese`). */
  name: string;
  v: number[];
  th: number;
  thName: string;
  k: number;
}

const GENERIC = 'Ricalcola con calma: il passo precedente ti dà i numeri che servono.';
const str = (o: QuizOption[], correct: string, filler: string[] = []): QuizOption[] => {
  const seen = new Set([correct]);
  const out: QuizOption[] = [];
  for (const t of [...o, ...filler.map((label) => ({ label, why: GENERIC }))]) {
    if (!seen.has(t.label)) {
      seen.add(t.label);
      out.push(t);
    }
  }
  return out.slice(0, 3);
};
const near = (n: number): string[] => [n + 1, n - 1, n + 10, n * 2].map(fmt);

function delta(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const first = v[0];
  const last = v[v.length - 1];
  const pen = v[v.length - 2] ?? first;
  return {
    title: 'Primo e ultimo',
    goal: 'Esegui il codice a mano: scegli il risultato di ogni passo, fino alla variazione.',
    code: [`${n} = ${list(v)}`, `variazione = ${n}[-1] - ${n}[0]`],
    steps: [
      {
        prompt: `${n}[-1] → ?`, correct: fmt(last), line: 1,
        traps: str([
          { label: fmt(first), why: "Quello è il primo elemento: l'indice -1 conta dalla fine, non dall'inizio." },
          { label: fmt(pen), why: "Quello è il penultimo (indice -2): -1 è l'ultimo." },
          { label: fmt(Math.max(...v)), why: "Quello è il valore più alto, non l'ultimo." },
        ], fmt(last), near(last)),
        hit: `${n}[-1] → ${fmt(last)}: l'indice -1 è l'ultimo elemento.`,
      },
      {
        prompt: `${n}[0] → ?`, correct: fmt(first), line: 1,
        traps: str([
          { label: fmt(last), why: "Quello è l'ultimo: l'indice 0 è il primo." },
          { label: fmt(v[1] ?? last), why: 'Quello è il secondo (indice 1): si parte da 0.' },
          { label: fmt(Math.min(...v)), why: 'Quello è il valore più basso, non il primo.' },
        ], fmt(first), near(first)),
        hit: `${n}[0] → ${fmt(first)}: l'indice 0 è il primo elemento.`,
      },
      {
        prompt: `variazione = ${fmt(last)} - ${fmt(first)} → ?`, correct: fmt(last - first), line: 1, vars: `ultimo = ${fmt(last)} · primo = ${fmt(first)}`,
        traps: str([
          { label: fmt(first - last), why: 'Così sottrai al contrario: serve ultimo − primo, in quest\'ordine.' },
          { label: fmt(last + first), why: 'Hai sommato: la variazione è una sottrazione.' },
          { label: fmt(last), why: 'Hai dimenticato di togliere il primo valore.' },
        ], fmt(last - first), near(last - first)),
        hit: `variazione = ${fmt(last)} - ${fmt(first)} → ${fmt(last - first)}: quanto è cambiato il valore dal primo all'ultimo.`,
      },
    ],
  };
}

function ordina(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const asc = [...v].sort((a, b) => a - b);
  const desc = [...asc].reverse();
  const swapped = [...asc];
  [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  return {
    title: 'Ordina e prendi una fetta',
    goal: 'Esegui il codice a mano: scegli il risultato di sorted() e delle fette.',
    code: [`${n} = ${list(v)}`, `migliori = sorted(${n})[:3]`],
    steps: [
      {
        prompt: `sorted(${n}) → ?`, correct: list(asc), line: 1,
        traps: str([
          { label: list(desc), why: 'sorted() ordina dal più piccolo al più grande, non al contrario.' },
          { label: list(v), why: "sorted() restituisce una lista ordinata: i valori non restano nell'ordine originale." },
          { label: list(swapped), why: "Quasi: due valori sono scambiati. L'ordine crescente deve essere completo." },
        ], list(asc)),
        hit: `sorted(${n}) → ${list(asc)}: dal più piccolo al più grande.`,
      },
      {
        prompt: `sorted(${n})[:3] → ?`, correct: list(asc.slice(0, 3)), line: 1,
        traps: str([
          { label: list(asc.slice(-3)), why: '[:3] prende i primi tre (i più bassi), non gli ultimi.' },
          { label: list(v.slice(0, 3)), why: '[:3] va applicato alla lista ordinata, non a quella originale.' },
          { label: list(asc.slice(1, 4)), why: "[:3] parte dall'inizio (indice 0): il primo valore va incluso." },
        ], list(asc.slice(0, 3))),
        hit: `sorted(${n})[:3] → ${list(asc.slice(0, 3))}: i tre valori più bassi.`,
      },
      {
        prompt: `sorted(${n})[-3:] → ?`, correct: list(asc.slice(-3)), line: 1,
        traps: str([
          { label: list(asc.slice(0, 3)), why: '[-3:] prende gli ultimi tre, non i primi.' },
          { label: list(desc.slice(0, 3)), why: 'Gli ultimi tre restano in ordine crescente: sorted() non li rovescia.' },
          { label: list(asc.slice(-4, -1)), why: "[-3:] arriva fino alla fine: l'ultimo valore è incluso." },
        ], list(asc.slice(-3))),
        hit: `sorted(${n})[-3:] → ${list(asc.slice(-3))}: gli ultimi tre, cioè i più alti.`,
      },
    ],
  };
}

/** Un passo per ogni valore del ciclo: il contatore (o l'accumulatore) cambia solo se la condizione è vera. */
function loopSteps(c: QuizConfig, kind: 'conta' | 'somma'): QuizStep[] {
  const { v, th } = c;
  const name = kind === 'conta' ? 'conteggio' : 'eccesso';
  let total = 0;
  return v.map((m) => {
    const over = m > th;
    const before = total;
    const gain = kind === 'conta' ? 1 : m;
    total = r(total + (over ? gain : 0));
    const after = total;
    const cmp = `${fmt(m)} > ${fmt(th)} → ${over ? 'True' : 'False'}`;
    const lab = (x: number) => `${name} = ${fmt(x)}`;
    const traps: QuizOption[] = over
      ? [
          { label: lab(before), why: `${cmp}: la condizione è vera, quindi ${kind === 'conta' ? 'il conteggio sale di 1' : 'm si aggiunge'}.` },
          { label: lab(r(before + (kind === 'conta' ? m : 1))), why: kind === 'conta' ? 'Si conta 1 per ogni valore che passa, non si somma m.' : 'Si aggiunge il valore m, non 1 (quello è contare).' },
          { label: lab(0), why: `Il ${kind === 'conta' ? 'contatore' : 'totale'} non si azzera: conserva ciò che ha già.` },
        ]
      : [
          { label: lab(r(before + gain)), why: `${cmp}: la condizione è falsa, quindi ${kind === 'conta' ? 'il conteggio non cambia' : 'm non si aggiunge'}.` },
          { label: lab(r(before + (kind === 'conta' ? m : 1))), why: `${cmp}: il valore non supera la soglia, non conta.` },
          { label: lab(0), why: `Il ${kind === 'conta' ? 'contatore' : 'totale'} non si azzera: conserva ciò che ha già.` },
        ];
    return {
      prompt: `m = ${fmt(m)} · ${name} era ${fmt(before)} → ?`, correct: lab(after), line: 3, vars: `${name} = ${fmt(before)}`,
      traps: str(traps, lab(after), [lab(after + 1), lab(after + 2), lab(after - 1)]),
      hit: `${cmp}: ${over ? (kind === 'conta' ? 'conteggio += 1' : 'eccesso += m') : 'il ciclo salta il valore'} → ${lab(after)}.`,
    };
  });
}
const r = (n: number): number => Math.round(n * 100) / 100;

function percentuale(c: QuizConfig): Quiz {
  const { name: n, v, th, thName } = c;
  const count = v.filter((x) => x > th).length;
  const pct = pyRound((count / v.length) * 100);
  const raw = (count / v.length) * 100;
  return {
    title: 'Conta e calcola la percentuale',
    goal: 'Esegui il ciclo a mano: per ogni valore scegli come cambia conteggio, poi la percentuale.',
    code: [`${thName} = ${fmt(th)}`, 'conteggio = 0', `for m in ${n}:`, `    if m > ${thName}:`, '        conteggio += 1', `percentuale = round(conteggio / len(${n}) * 100)`],
    steps: [
      ...loopSteps(c, 'conta'),
      {
        prompt: `percentuale = round(${count} / ${v.length} * 100) → ?`, correct: String(pct), line: 5, vars: `conteggio = ${count} · len = ${v.length}`,
        traps: str([
          { label: fmt(count / v.length), why: 'Hai dimenticato di moltiplicare per 100: quella è una frazione, non una percentuale.' },
          { label: fmt(raw), why: 'Senza round() restano i decimali: round(x) li arrotonda a un numero intero.' },
          { label: String(count), why: 'Quello è il conteggio, non la percentuale sul totale.' },
          { label: String(pyRound((count / (v.length - 1)) * 100)), why: `Si divide per quanti sono i valori (${v.length}), non per ${v.length - 1}.` },
        ], String(pct), [String(pct + 1), String(pct - 1), String(pct + 10)]),
        hit: `percentuale = round(${count} / ${v.length} * 100) → ${pct}: la quota di valori sopra la soglia.`,
      },
    ],
  };
}

function conversione(c: QuizConfig): Quiz {
  const { name: n, v, k } = c;
  const kv = v[k];
  const nextV = v[(k + 1) % v.length];
  const prevV = v[k - 1] ?? v[v.length - 1];
  const cost = (x: number) => x * 0.25;
  return {
    title: 'Variabili e costo',
    goal: 'Esegui il codice a mano: scegli il valore di ogni variabile, fino al costo.',
    code: [`${n} = ${list(v)}`, `kwh = ${n}[${k}]`, 'tariffa = 0.25', 'costo = kwh * tariffa'],
    steps: [
      {
        prompt: `kwh = ${n}[${k}] → ?`, correct: fmt(kv), line: 1,
        traps: str([
          { label: fmt(prevV), why: `Quello è l'elemento ${k - 1}: l'indice ${k} è il ${k + 1}º, perché si parte da 0.` },
          { label: fmt(v[k + 1] ?? v[0]), why: `Quello è l'elemento ${k + 1}: l'indice ${k} è il ${k + 1}º, si parte da 0.` },
          { label: fmt(v[0]), why: `Quello è il primo (indice 0): qui serve l'indice ${k}.` },
        ], fmt(kv), near(kv)),
        hit: `kwh = ${n}[${k}] → ${fmt(kv)}: la lettura in posizione ${k}.`,
      },
      {
        prompt: `costo = ${fmt(kv)} * 0.25 → ?`, correct: fmt(cost(kv)), line: 3, vars: `kwh = ${fmt(kv)} · tariffa = 0.25`,
        traps: str([
          { label: fmt(kv / 0.25), why: 'Hai diviso: costo = kwh * tariffa, si moltiplica.' },
          { label: fmt(kv + 0.25), why: 'Hai sommato: per il costo serve la moltiplicazione.' },
          { label: fmt(kv * 2.5), why: 'Attenzione ai decimali: 0.25 è un quarto, non 2.5.' },
        ], fmt(cost(kv)), near(cost(kv))),
        hit: `costo = ${fmt(kv)} * 0.25 → ${fmt(cost(kv))}: la lettura per la tariffa.`,
      },
      {
        prompt: `Se kwh fosse ${fmt(nextV)} (la lettura dopo), costo → ?`, correct: fmt(cost(nextV)), line: 3, vars: `kwh = ${fmt(nextV)} · tariffa = 0.25`,
        traps: str([
          { label: fmt(cost(kv)), why: 'Quello è il costo della lettura di prima: qui kwh è cambiato.' },
          { label: fmt(nextV / 0.25), why: 'Hai diviso: si moltiplica per la tariffa.' },
          { label: fmt(nextV + 0.25), why: 'Hai sommato: serve la moltiplicazione.' },
        ], fmt(cost(nextV)), near(cost(nextV))),
        hit: `costo = ${fmt(nextV)} * 0.25 → ${fmt(cost(nextV))}: la stessa formula con un altro kwh.`,
      },
    ],
  };
}

function posizione(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const top = Math.max(...v);
  const low = Math.min(...v);
  const ti = v.indexOf(top);
  const li = v.indexOf(low);
  return {
    title: 'Trova la posizione',
    goal: 'Esegui il codice a mano: prima il valore più alto, poi la sua posizione.',
    code: [`${n} = ${list(v)}`, `posizione_picco = ${n}.index(max(${n}))`],
    steps: [
      {
        prompt: `max(${n}) → ?`, correct: fmt(top), line: 1,
        traps: str([
          { label: fmt(low), why: 'Quello è il minimo (min), non il massimo.' },
          { label: fmt(v[v.length - 1]), why: "Quello è l'ultimo valore, non il più alto." },
          { label: fmt(v.reduce((a, b) => a + b, 0)), why: 'Quella è la somma (sum), non il massimo.' },
        ], fmt(top), near(top)),
        hit: `max(${n}) → ${fmt(top)}: il valore più alto.`,
      },
      {
        prompt: `${n}.index(${fmt(top)}) → ?`, correct: String(ti), line: 1,
        traps: str([
          { label: String(ti + 1), why: `index() dà la posizione da 0: è ${ti}, non ${ti + 1}.` },
          { label: String(v.length - 1), why: "Quella è l'ultima posizione, non quella del valore più alto." },
          { label: fmt(top), why: 'Quello è il valore: index() restituisce la sua posizione.' },
        ], String(ti), near(ti)),
        hit: `${n}.index(${fmt(top)}) → ${ti}: il valore più alto sta in posizione ${ti} (si parte da 0).`,
      },
      {
        prompt: `${n}.index(${fmt(low)}) → ?`, correct: String(li), line: 1,
        traps: str([
          { label: String(li + 1), why: `index() dà la posizione da 0: è ${li}, non ${li + 1}.` },
          { label: String(ti), why: 'Quella è la posizione del valore più alto, non del più basso.' },
          { label: fmt(low), why: 'Quello è il valore: index() restituisce la sua posizione.' },
        ], String(li), near(li)),
        hit: `${n}.index(${fmt(low)}) → ${li}: la posizione del valore più basso.`,
      },
    ],
  };
}

function sommaSopra(c: QuizConfig): Quiz {
  const { name: n, thName, th } = c;
  return {
    title: 'Somma solo i valori alti',
    goal: 'Esegui il ciclo a mano: per ogni valore scegli come cambia eccesso.',
    code: [`${thName} = ${fmt(th)}`, 'eccesso = 0', `for m in ${n}:`, `    if m > ${thName}:`, '        eccesso += m'],
    steps: loopSteps(c, 'somma'),
  };
}

const pf = pyFloat;
const sumOf = (a: number[]): number => a.reduce((x, y) => x + y, 0);
const sortAsc = (a: number[]): number[] => [...a].sort((x, y) => x - y);
const nearF = (x: number): string[] => [x + 1, x - 1, x * 2, x + 0.5].map(pf);

function media(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const tot = sumOf(v);
  const len = v.length;
  const avg = tot / len;
  return {
    title: 'Calcola la media',
    goal: 'Esegui il codice a mano: scegli il valore di ogni passo, fino alla media.',
    code: [`${n} = ${list(v)}`, `totale = sum(${n})`, `media = totale / len(${n})`],
    steps: [
      {
        prompt: `totale = sum(${n}) → ?`, correct: fmt(tot), line: 1,
        traps: str([
          { label: fmt(Math.max(...v)), why: 'Quello è il valore più alto: sum() somma tutti gli elementi.' },
          { label: fmt(tot - v[0]), why: 'Hai lasciato fuori un elemento: sum() li somma tutti.' },
          { label: pf(avg), why: 'Quella è già la media: sum() dà soltanto la somma, senza dividere.' },
        ], fmt(tot), near(tot)),
        hit: `sum(${n}) → ${fmt(tot)}: la somma di tutti i valori.`,
      },
      {
        prompt: `len(${n}) → ?`, correct: String(len), line: 2,
        traps: str([
          { label: String(len - 1), why: `len() conta gli elementi: sono ${len}. ${len - 1} è l'ultimo indice, non la lunghezza.` },
          { label: fmt(tot), why: 'Quella è la somma (sum), non quanti elementi ci sono.' },
          { label: String(len + 1), why: `Gli elementi sono ${len}: len() non conta uno in più.` },
        ], String(len), near(len)),
        hit: `len(${n}) → ${len}: quanti sono i valori.`,
      },
      {
        prompt: `media = ${fmt(tot)} / ${len} → ?`, correct: pf(avg), line: 2, vars: `totale = ${fmt(tot)} · len = ${len}`,
        traps: str([
          { label: pf(len / tot), why: 'Hai diviso al contrario: serve il totale diviso per quanti sono.' },
          { label: fmt(tot * len), why: 'Hai moltiplicato: la media è una divisione.' },
          { label: fmt(tot), why: 'Quello è il totale: manca la divisione per quanti sono.' },
        ], pf(avg), nearF(avg)),
        hit: `media = ${fmt(tot)} / ${len} → ${pf(avg)}: il valore tipico della serie. In Python la divisione dà sempre un numero con la virgola.`,
      },
    ],
  };
}

function mediana(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const asc = sortAsc(v);
  const meta = v.length / 2;
  const lo = asc[meta - 1];
  const hi = asc[meta];
  const med = (lo + hi) / 2;
  return {
    title: 'Trova la mediana',
    goal: 'Esegui il codice a mano: ordina, trova il centro e fai la media dei due valori centrali.',
    code: [`ordinati = sorted(${n})`, 'meta = len(ordinati) // 2', 'mediana = (ordinati[meta - 1] + ordinati[meta]) / 2'],
    steps: [
      {
        prompt: `ordinati = sorted(${n}) → ?`, correct: list(asc), line: 0,
        traps: str([
          { label: list(v), why: 'sorted() ordina: i valori non restano nell\'ordine originale.' },
          { label: list([...asc].reverse()), why: 'sorted() ordina dal più piccolo al più grande, non al contrario.' },
          { label: list(Array.from(new Set(asc))), why: 'sorted() non elimina i doppioni: ogni valore resta con le sue ripetizioni.' },
        ], list(asc)),
        hit: `sorted(${n}) → ${list(asc)}: ora si vede cosa sta in mezzo.`,
      },
      {
        prompt: `meta = ${v.length} // 2 → ?`, correct: String(meta), line: 1,
        traps: str([
          { label: pf(meta), why: '// è la divisione intera: dà un numero intero, senza virgola.' },
          { label: String(meta - 1), why: `${v.length} // 2 è ${meta}: è la posizione del secondo dei due valori centrali.` },
          { label: String(v.length), why: 'Quella è la lunghezza: // 2 la dimezza.' },
        ], String(meta), near(meta)),
        hit: `meta = ${v.length} // 2 → ${meta}: la posizione del secondo valore centrale (si parte da 0).`,
      },
      {
        prompt: `ordinati[meta - 1] → ? (posizione ${meta - 1})`, correct: fmt(lo), line: 2,
        traps: str([
          { label: fmt(hi), why: `Quello è ordinati[${meta}], il secondo valore centrale.` },
          { label: fmt(asc[meta - 2] ?? asc[0]), why: `Quello è ordinati[${meta - 2}]: serve la posizione ${meta - 1}.` },
          { label: fmt(v[meta - 1]), why: 'Quello è della lista originale: gli indici si applicano a quella ordinata.' },
        ], fmt(lo), near(lo)),
        hit: `ordinati[${meta - 1}] → ${fmt(lo)}: il primo dei due valori centrali.`,
      },
      {
        prompt: `mediana = (${fmt(lo)} + ${fmt(hi)}) / 2 → ?`, correct: pf(med), line: 2, vars: `ordinati[${meta - 1}] = ${fmt(lo)} · ordinati[${meta}] = ${fmt(hi)}`,
        traps: str([
          { label: pf(lo + hi), why: 'Hai dimenticato di dividere per 2: la mediana è la media dei due valori centrali.' },
          { label: pf(sumOf(v) / v.length), why: 'Quella è la media di tutta la serie: la mediana usa solo i due valori centrali.' },
          { label: pf(hi), why: 'Hai preso un solo valore centrale: con un numero pari di dati serve la media dei due.' },
        ], pf(med), nearF(med)),
        hit: `mediana = (${fmt(lo)} + ${fmt(hi)}) / 2 → ${pf(med)}: metà dei dati sta sotto, metà sopra.`,
      },
    ],
  };
}

function moda(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const count = (x: number): number => v.filter((y) => y === x).length;
  const distinct = Array.from(new Set(v));
  const top = distinct.reduce((a, b) => (count(b) > count(a) ? b : a), v[0]);
  const others = distinct.filter((x) => x !== top);
  const second = others.reduce((a, b) => (count(b) > count(a) ? b : a), others[0]);
  const rare = others.reduce((a, b) => (count(b) < count(a) ? b : a), others[0]);
  const step = (x: number, why: string): QuizStep => ({
    prompt: `${n}.count(${fmt(x)}) → ?`, correct: String(count(x)), line: 3,
    traps: str([
      { label: String(count(x) + 1), why: `Conta di nuovo: ${fmt(x)} compare ${count(x)} ${count(x) === 1 ? 'volta' : 'volte'}.` },
      { label: fmt(x), why: 'Quello è il valore: count() restituisce quante volte compare.' },
      { label: String(v.indexOf(x)), why: 'Quella è la posizione (index), non quante volte compare.' },
    ], String(count(x)), [String(count(x) + 2), String(Math.max(0, count(x) - 1))]),
    hit: `${n}.count(${fmt(x)}) → ${count(x)}: ${why}`,
  });
  return {
    title: 'Trova la moda',
    goal: 'Esegui il codice a mano: conta quante volte compaiono i valori e scegli la moda.',
    code: [`moda = ${n}[0]`, `for m in ${n}:`, `    if ${n}.count(m) > ${n}.count(moda):`, '        moda = m'],
    steps: [
      step(top, 'è il valore che compare più spesso.'),
      step(second, 'compare meno del precedente.'),
      step(rare, 'compare poco.'),
      {
        prompt: 'Alla fine del ciclo moda = ?', correct: fmt(top), line: 3,
        traps: str([
          { label: String(count(top)), why: `Quello è quante volte compare la moda, non il valore stesso.` },
          { label: fmt(Math.max(...v)), why: 'Quello è il valore più alto: la moda è il più frequente, non il più grande.' },
          { label: pf(sumOf(v) / v.length), why: 'Quella è la media: la moda è un valore che compare davvero nella serie.' },
          { label: fmt(second), why: `${fmt(second)} compare solo ${count(second)} volte: ${fmt(top)} compare ${count(top)} volte.` },
        ], fmt(top), near(top)),
        hit: `moda → ${fmt(top)}: compare ${count(top)} volte, più di ogni altro valore.`,
      },
    ],
  };
}

function campo(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const mx = Math.max(...v);
  const mn = Math.min(...v);
  return {
    title: 'Il campo di variazione',
    goal: 'Esegui il codice a mano: trova gli estremi e la loro distanza.',
    code: [`massimo = max(${n})`, `minimo = min(${n})`, 'campo = massimo - minimo'],
    steps: [
      {
        prompt: `massimo = max(${n}) → ?`, correct: fmt(mx), line: 0,
        traps: str([
          { label: fmt(mn), why: 'Quello è il minimo (min), non il massimo.' },
          { label: fmt(v[v.length - 1]), why: 'Quello è l\'ultimo elemento, non il più alto.' },
          { label: fmt(sumOf(v)), why: 'Quella è la somma (sum), non il massimo.' },
        ], fmt(mx), near(mx)),
        hit: `max(${n}) → ${fmt(mx)}: il valore più alto.`,
      },
      {
        prompt: `minimo = min(${n}) → ?`, correct: fmt(mn), line: 1,
        traps: str([
          { label: fmt(mx), why: 'Quello è il massimo (max), non il minimo.' },
          { label: fmt(v[0]), why: 'Quello è il primo elemento, non il più basso.' },
          { label: '0', why: 'Lo zero non c\'è nella serie: min() restituisce un valore che esiste davvero.' },
        ], fmt(mn), near(mn)),
        hit: `min(${n}) → ${fmt(mn)}: il valore più basso.`,
      },
      {
        prompt: `campo = ${fmt(mx)} - ${fmt(mn)} → ?`, correct: fmt(mx - mn), line: 2, vars: `massimo = ${fmt(mx)} · minimo = ${fmt(mn)}`,
        traps: str([
          { label: fmt(mn - mx), why: 'Il segno è invertito: il campo è massimo − minimo, sempre positivo.' },
          { label: fmt(mx + mn), why: 'Hai sommato: il campo è una differenza.' },
          { label: fmt((mx + mn) / 2), why: 'Quello è il punto di mezzo tra gli estremi, non la loro distanza.' },
        ], fmt(mx - mn), near(mx - mn)),
        hit: `campo = ${fmt(mx)} - ${fmt(mn)} → ${fmt(mx - mn)}: tutti i dati stanno in una fascia larga ${fmt(mx - mn)}.`,
      },
    ],
  };
}

function varianza(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const avg = sumOf(v) / v.length;
  const sq = (m: number): number => (m - avg) ** 2;
  const squares = v.map(sq);
  const total = sumOf(squares);
  const vari = total / v.length;
  // tre valori con scarti diversi, per vedere come funziona il quadrato
  const picks = Array.from(new Set(v)).slice(0, 3);
  return {
    title: 'La varianza',
    goal: 'Esegui il codice a mano: scarti al quadrato, somma e media.',
    code: [`media = ${pf(avg)}`, 'scarti_quadrati = []', `for m in ${n}:`, '    scarti_quadrati.append((m - media) ** 2)', 'varianza = sum(scarti_quadrati) / len(scarti_quadrati)'],
    steps: [
      ...picks.map((m): QuizStep => ({
        prompt: `(m - media) ** 2 con m = ${fmt(m)} → ?`, correct: pf(sq(m)), line: 3, vars: `media = ${pf(avg)}`,
        traps: str([
          { label: pf(m - avg), why: 'Quello è lo scarto: manca ancora il quadrato (** 2).' },
          { label: pf((m - avg) * 2), why: '** 2 è il quadrato, non il doppio: lo scarto va moltiplicato per se stesso.' },
          { label: pf(Math.abs(m - avg)), why: 'Quello è il valore assoluto dello scarto: il quadrato lo moltiplica per se stesso.' },
        ], pf(sq(m)), nearF(sq(m))),
        hit: `(${fmt(m)} - ${pf(avg)}) ** 2 → ${pf(sq(m))}: ${m === avg ? 'è proprio sulla media, scarto 0' : 'più il valore è lontano dalla media, più il quadrato è grande'}.`,
      })),
      {
        prompt: 'sum(scarti_quadrati) → ?', correct: pf(total), line: 4, vars: `scarti_quadrati = ${list(squares.map((x) => Math.round(x * 100) / 100))}`,
        traps: str([
          { label: pf(vari), why: 'Quella è già la varianza: qui si somma soltanto.' },
          { label: pf(total - Math.max(...squares)), why: 'Hai lasciato fuori un valore: sum() li somma tutti.' },
          { label: pf(sumOf(v.map((m) => m - avg))), why: 'Così hai sommato gli scarti senza quadrato: si annullano (la somma fa 0).' },
        ], pf(total), nearF(total)),
        hit: `sum(scarti_quadrati) → ${pf(total)}.`,
      },
      {
        prompt: `varianza = ${pf(total)} / ${v.length} → ?`, correct: pf(vari), line: 4, vars: `somma = ${pf(total)} · len = ${v.length}`,
        traps: str([
          { label: pf(total), why: 'Manca la divisione per quanti sono i valori.' },
          { label: pf(total / (v.length - 1)), why: `Qui si divide per quanti sono i valori (${v.length}), non per ${v.length - 1}.` },
          { label: pf(vari ** 0.5), why: 'Quella è la radice (deviazione standard): la varianza è la media dei quadrati.' },
        ], pf(vari), nearF(vari)),
        hit: `varianza = ${pf(total)} / ${v.length} → ${pf(vari)}: la dispersione media dei dati, in unità al quadrato.`,
      },
    ],
  };
}

function deviazione(c: QuizConfig): Quiz {
  const { v } = c;
  const avg = sumOf(v) / v.length;
  const vari = sumOf(v.map((m) => (m - avg) ** 2)) / v.length;
  const sd = vari ** 0.5;
  return {
    title: 'La deviazione standard',
    goal: 'Esegui il codice a mano: radice della varianza e fascia «tipica» attorno alla media.',
    code: ['deviazione = varianza ** 0.5'],
    steps: [
      {
        prompt: `deviazione = ${pf(vari)} ** 0.5 → ?`, correct: pf(sd), line: 0, vars: `varianza = ${pf(vari)}`,
        traps: str([
          { label: pf(vari ** 2), why: '** 2 è il quadrato: per la radice serve ** 0.5.' },
          { label: pf(vari / 2), why: '** 0.5 non è la metà: è la radice quadrata (elevare a un mezzo).' },
          { label: pf(vari), why: 'Quella è la varianza: manca la radice quadrata.' },
        ], pf(sd), nearF(sd)),
        hit: `${pf(vari)} ** 0.5 → ${pf(sd)}: la radice quadrata della varianza, nella stessa unità dei dati.`,
      },
      {
        prompt: `media - deviazione = ${pf(avg)} - ${pf(sd)} → ?`, correct: pf(avg - sd), line: 0,
        traps: str([
          { label: pf(avg + sd), why: 'Quello è media + deviazione: il limite alto della fascia.' },
          { label: pf(sd - avg), why: 'Il segno è invertito: si toglie la deviazione dalla media.' },
          { label: pf(avg), why: 'Quella è la media: manca la sottrazione della deviazione.' },
        ], pf(avg - sd), nearF(avg - sd)),
        hit: `${pf(avg)} - ${pf(sd)} → ${pf(avg - sd)}: il limite basso della fascia tipica.`,
      },
      {
        prompt: `media + deviazione = ${pf(avg)} + ${pf(sd)} → ?`, correct: pf(avg + sd), line: 0,
        traps: str([
          { label: pf(avg - sd), why: 'Quello è media - deviazione: il limite basso.' },
          { label: pf(avg * sd), why: 'Hai moltiplicato: la fascia si ottiene sommando la deviazione.' },
          { label: pf(sd), why: 'Quella è solo la deviazione: va sommata alla media.' },
        ], pf(avg + sd), nearF(avg + sd)),
        hit: `${pf(avg)} + ${pf(sd)} → ${pf(avg + sd)}: la maggior parte dei dati sta tra ${pf(avg - sd)} e ${pf(avg + sd)}.`,
      },
    ],
  };
}

const meanOf = (a: number[]): number => sumOf(a) / a.length;
const sdOf = (a: number[]): number => (sumOf(a.map((m) => (m - meanOf(a)) ** 2)) / a.length) ** 0.5;
const r4 = (x: number): number => Math.round(x * 10000) / 10000;

function zscore(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const avg = meanOf(v);
  const sd = sdOf(v);
  const mx = Math.max(...v);
  const gap = mx - avg;
  const z = gap / sd;
  return {
    title: 'Lo z-score',
    goal: 'Esegui il codice a mano: distanza dalla media e poi in deviazioni standard.',
    code: [`media = ${pf(avg)}`, `deviazione = ${pf(sd)}`, `z_massimo = (max(${n}) - media) / deviazione`],
    steps: [
      {
        prompt: `max(${n}) → ?`, correct: fmt(mx), line: 2,
        traps: str([
          { label: fmt(Math.min(...v)), why: 'Quello è il minimo (min), non il massimo.' },
          { label: pf(avg), why: 'Quella è la media: max() restituisce il valore più alto.' },
          { label: fmt(v[v.length - 1]), why: 'Quello è l\'ultimo elemento, non il più alto.' },
        ], fmt(mx), near(mx)),
        hit: `max(${n}) → ${fmt(mx)}: il valore più alto.`,
      },
      {
        prompt: `max - media = ${fmt(mx)} - ${pf(avg)} → ?`, correct: pf(gap), line: 2,
        traps: str([
          { label: pf(avg - mx), why: 'Il segno è invertito: si toglie la media dal valore.' },
          { label: pf(mx + avg), why: 'Hai sommato: serve la differenza, cioè la distanza dalla media.' },
          { label: pf(mx), why: 'Manca la sottrazione della media.' },
        ], pf(gap), nearF(gap)),
        hit: `${fmt(mx)} - ${pf(avg)} → ${pf(gap)}: di quanto il valore supera la media.`,
      },
      {
        prompt: `z_massimo = ${pf(gap)} / ${pf(sd)} → ?`, correct: pf(z), line: 2, vars: `distanza = ${pf(gap)} · deviazione = ${pf(sd)}`,
        traps: str([
          { label: pf(sd / gap), why: 'Hai diviso al contrario: serve la distanza diviso la deviazione.' },
          { label: pf(gap * sd), why: 'Hai moltiplicato: lo z-score è un rapporto, una divisione.' },
          { label: pf(gap), why: 'Quella è la distanza in unità dei dati: manca la divisione per la deviazione.' },
        ], pf(z), nearF(z)),
        hit: `${pf(gap)} / ${pf(sd)} → ${pf(z)}: il valore dista ${pf(z)} deviazioni standard dalla media.`,
      },
    ],
  };
}

function outlier(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const avg = meanOf(v);
  const sd = sdOf(v);
  const zs = v.map((m) => (m - avg) / sd);
  const anomali = zs.filter((x) => Math.abs(x) > 2).length;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const zStep = (m: number): QuizStep => ({
    prompt: `z = (${fmt(m)} - ${pf(avg)}) / ${pf(sd)} → ?`, correct: pf((m - avg) / sd), line: 4, vars: `media = ${pf(avg)} · deviazione = ${pf(sd)}`,
    traps: str([
      { label: pf((avg - m) / sd), why: 'Il segno è invertito: z = (valore - media) / deviazione. Sotto la media è negativo.' },
      { label: pf(m - avg), why: 'Manca la divisione per la deviazione: così è solo la distanza.' },
      { label: pf(m / sd), why: 'Prima va sottratta la media, poi si divide.' },
    ], pf((m - avg) / sd), nearF((m - avg) / sd)),
    hit: `(${fmt(m)} - ${pf(avg)}) / ${pf(sd)} → ${pf((m - avg) / sd)}.`,
  });
  const boolStep = (m: number): QuizStep => {
    const zv = (m - avg) / sd;
    const yes = Math.abs(zv) > 2;
    return {
      prompt: `abs(${pf(zv)}) > 2 → ?`, correct: yes ? 'True' : 'False', line: 5,
      traps: str([
        { label: yes ? 'False' : 'True', why: `abs(${pf(zv)}) vale ${pf(Math.abs(zv))}: ${yes ? 'supera' : 'non supera'} 2.` },
      ], yes ? 'True' : 'False', ['None']),
      hit: `abs(${pf(zv)}) = ${pf(Math.abs(zv))}: ${yes ? 'oltre 2, il valore è anomalo e anomali sale di 1.' : 'non oltre 2, il valore è nella norma.'}`,
    };
  };
  return {
    title: 'Riconosci gli outlier',
    goal: 'Esegui il ciclo a mano su alcuni valori: z-score, soglia e conteggio finale.',
    code: [`media = ${pf(avg)}`, `deviazione = ${pf(sd)}`, 'anomali = 0', `for m in ${n}:`, '    z = (m - media) / deviazione', '    if abs(z) > 2:', '        anomali += 1'],
    steps: [
      zStep(lo),
      boolStep(lo),
      zStep(hi),
      boolStep(hi),
      {
        prompt: 'Alla fine del ciclo, su tutti i valori: anomali = ?', correct: String(anomali), line: 6,
        traps: str([
          { label: String(v.length), why: 'Quello è il numero di valori: si contano solo quelli con abs(z) > 2.' },
          { label: '0', why: `Almeno un valore ha abs(z) > 2: ${hi} supera la soglia.` },
          { label: String(anomali + 1), why: 'Hai contato un valore di troppo: controlla chi supera davvero la soglia.' },
        ], String(anomali), near(anomali)),
        hit: `anomali → ${anomali}: ${anomali === 1 ? 'un solo valore è' : `${anomali} valori sono`} oltre 2 deviazioni dalla media.`,
      },
    ],
  };
}

function frequenza(c: QuizConfig): Quiz {
  const { name: n, v, k } = c;
  const hits = v.filter((x) => x === k).length;
  const f = hits / v.length;
  return {
    title: 'La frequenza relativa',
    goal: 'Esegui il codice a mano: quante uscite, quanti lanci e la frequenza.',
    code: [`${n} = ${list(v)}`, `uscite = ${n}.count(${k})`, `frequenza = uscite / len(${n})`],
    steps: [
      {
        prompt: `uscite = ${n}.count(${k}) → ?`, correct: String(hits), line: 1,
        traps: str([
          { label: String(v.indexOf(k)), why: 'Quella è la posizione della prima uscita (index), non quante volte è uscito.' },
          { label: fmt(k), why: 'Quello è il valore cercato: count() dice quante volte compare.' },
          { label: String(hits + 1), why: `Conta di nuovo: il ${k} compare ${hits} ${hits === 1 ? 'volta' : 'volte'}.` },
        ], String(hits), near(hits)),
        hit: `${n}.count(${k}) → ${hits}: il ${k} è uscito ${hits} ${hits === 1 ? 'volta' : 'volte'}.`,
      },
      {
        prompt: `len(${n}) → ?`, correct: String(v.length), line: 2,
        traps: str([
          { label: String(v.length - 1), why: `len() conta tutti gli elementi: sono ${v.length}.` },
          { label: String(hits), why: 'Quello è il numero di uscite: len() conta tutti i lanci.' },
          { label: fmt(sumOf(v)), why: 'Quella è la somma dei valori, non quanti lanci ci sono.' },
        ], String(v.length), near(v.length)),
        hit: `len(${n}) → ${v.length}: i lanci totali.`,
      },
      {
        prompt: `frequenza = ${hits} / ${v.length} → ?`, correct: pf(f), line: 2, vars: `uscite = ${hits} · lanci = ${v.length}`,
        traps: str([
          { label: pf(v.length / hits), why: 'Hai diviso al contrario: serve uscite diviso lanci.' },
          { label: pf(f * 100), why: 'Quella è la percentuale: la frequenza relativa è una proporzione da 0 a 1.' },
          { label: pf(1 - f), why: 'Quella è la frequenza di tutti gli altri esiti, non del valore cercato.' },
        ], pf(f), nearF(f)),
        hit: `${hits} / ${v.length} → ${pf(f)}: il ${k} è uscito nel ${r4(f * 100)}% dei lanci.`,
      },
    ],
  };
}

function valoreAtteso(): Quiz {
  const faces = [1, 2, 3, 4, 5, 6];
  return {
    title: 'Il valore atteso',
    goal: 'Esegui il codice a mano: somma delle facce, quante sono e la loro media.',
    code: ['facce = [1, 2, 3, 4, 5, 6]', 'atteso = sum(facce) / len(facce)'],
    steps: [
      {
        prompt: 'sum(facce) → ?', correct: '21', line: 1,
        traps: str([
          { label: '720', why: 'Quello è il prodotto 1·2·3·4·5·6: sum() somma.' },
          { label: '20', why: 'Ricontrolla: 1 + 2 + 3 + 4 + 5 + 6 fa 21.' },
          { label: '6', why: 'Quello è il numero di facce (len), non la loro somma.' },
        ], '21', ['22', '36']),
        hit: 'sum(facce) → 21.',
      },
      {
        prompt: 'len(facce) → ?', correct: '6', line: 1,
        traps: str([
          { label: '21', why: 'Quella è la somma (sum): len() conta le facce.' },
          { label: '5', why: 'Le facce sono 6, da 1 a 6.' },
          { label: '7', why: 'Le facce sono 6: non c\'è lo zero.' },
        ], '6', ['12']),
        hit: 'len(facce) → 6.',
      },
      {
        prompt: 'atteso = 21 / 6 → ?', correct: '3.5', line: 1, vars: 'sum = 21 · len = 6',
        traps: str([
          { label: '3.0', why: '21 / 6 non è 3: 6 × 3 fa 18, ne mancano 3.' },
          { label: '4.0', why: '6 × 4 fa 24, troppo: il risultato sta tra 3 e 4.' },
          { label: '126', why: 'Hai moltiplicato: il valore atteso è una media, una divisione.' },
        ], '3.5', ['2.5']),
        hit: `atteso = 21 / 6 → ${pf(sumOf(faces) / faces.length)}: la media delle facce. Un dado non fa mai 3.5, ma in media sì.`,
      },
    ],
  };
}

function scostamento(c: QuizConfig): Quiz {
  const { name: n, v } = c;
  const avg = meanOf(v);
  const diff = Math.round(Math.abs(avg - 3.5) * 100) / 100;
  const signed = Math.round((avg - 3.5) * 100) / 100;
  return {
    title: 'Dati contro teoria',
    goal: 'Esegui il codice a mano: la media dei lanci e la sua distanza dal valore atteso.',
    code: [`${n} = ${list(v)}`, 'atteso = 3.5', `media = sum(${n}) / len(${n})`, 'scostamento = round(abs(media - atteso), 2)'],
    steps: [
      {
        prompt: `media = ${fmt(sumOf(v))} / ${v.length} → ?`, correct: pf(avg), line: 2, vars: `sum = ${fmt(sumOf(v))} · len = ${v.length}`,
        traps: str([
          { label: fmt(sumOf(v)), why: 'Quella è la somma: manca la divisione per il numero di lanci.' },
          { label: pf(v.length / sumOf(v)), why: 'Hai diviso al contrario: somma diviso lanci.' },
          { label: pf(sumOf(v) / (v.length + 1)), why: `Si divide per quanti sono i lanci (${v.length}).` },
        ], pf(avg), nearF(avg)),
        hit: `${fmt(sumOf(v))} / ${v.length} → ${pf(avg)}: la media dei lanci.`,
      },
      {
        prompt: `scostamento = round(abs(${pf(avg)} - 3.5), 2) → ?`, correct: pf(diff), line: 3, vars: `media = ${pf(avg)} · atteso = 3.5`,
        traps: str([
          { label: pf(signed), why: 'Senza abs() il risultato può uscire negativo: contano la distanza, non la direzione.' },
          { label: pf(avg + 3.5), why: 'Hai sommato: lo scostamento è una differenza.' },
          { label: pf(avg), why: 'Quella è la media: va confrontata con il valore atteso (3.5).' },
        ], pf(diff), nearF(diff)),
        hit: `abs(${pf(avg)} - 3.5) → ${pf(diff)}: la media dei lanci dista ${pf(diff)} dal valore atteso. Con più lanci tenderebbe a 0.`,
      },
    ],
  };
}

function sommaDadi(): Quiz {
  const facce = [1, 2, 3, 4, 5, 6];
  const fav = facce.flatMap((a) => facce.map((b) => a + b)).filter((x) => x === 7).length;
  const p = fav / 36;
  return {
    title: 'Due dadi, somma 7',
    goal: 'Esegui il codice a mano: conta le coppie che sommano 7 e calcola la probabilità.',
    code: ['favorevoli = 0', 'for d1 in facce:', '    for d2 in facce:', '        if d1 + d2 == 7:', '            favorevoli += 1', 'probabilita = round(favorevoli / (len(facce) * len(facce)), 4)'],
    steps: [
      {
        prompt: 'Con d1 = 2, quanti valori di d2 danno d1 + d2 == 7?', correct: '1', line: 3,
        traps: str([
          { label: '2', why: 'Solo d2 = 5 dà 7 con d1 = 2: 2 + 5.' },
          { label: '0', why: 'C\'è: 2 + 5 fa 7.' },
          { label: '6', why: 'Sono tutti i d2 possibili, non quelli che sommano 7.' },
        ], '1', ['3']),
        hit: 'Per ogni d1 c\'è esattamente un d2 che porta la somma a 7: 7 - d1.',
      },
      {
        prompt: 'Alla fine dei due cicli, favorevoli = ?', correct: String(fav), line: 4,
        traps: str([
          { label: '7', why: 'Quello è la somma cercata, non quante coppie la danno.' },
          { label: '36', why: 'Quelle sono tutte le coppie possibili, non solo le favorevoli.' },
          { label: '12', why: 'Per ogni d1 c\'è un solo d2: sono 6 coppie, una per faccia.' },
        ], String(fav), ['5']),
        hit: `favorevoli → ${fav}: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1).`,
      },
      {
        prompt: 'len(facce) * len(facce) → ?', correct: '36', line: 5,
        traps: str([
          { label: '12', why: 'Hai sommato (6 + 6): per le coppie si moltiplica.' },
          { label: '6', why: 'Quelle sono le facce di un dado: le coppie con due dadi sono 6 × 6.' },
          { label: '30', why: '6 × 6 fa 36.' },
        ], '36', ['42']),
        hit: 'len(facce) * len(facce) → 36: tutte le coppie possibili di due dadi.',
      },
      {
        prompt: `probabilita = round(${fav} / 36, 4) → ?`, correct: pf(r4(p)), line: 5, vars: `favorevoli = ${fav} · possibili = 36`,
        traps: str([
          { label: pf(r4(36 / fav)), why: 'Hai diviso al contrario: favorevoli diviso possibili.' },
          { label: pf(r4(fav / 6)), why: 'Si divide per tutte le coppie possibili (36), non per le facce.' },
          { label: pf(Math.round(p * 100) / 100), why: 'Qui si arrotonda a 4 decimali, non a 2.' },
        ], pf(r4(p)), ['0.5']),
        hit: `${fav} / 36 → ${pf(r4(p))}: circa 1 lancio su 6 fa 7.`,
      },
    ],
  };
}

/** Il quiz di un esercizio: codice mostrato e passi (domanda, risposta giusta, sviste spiegate). */
export function quizFor(c: QuizConfig): Quiz {
  switch (c.exercise) {
    case 'delta': return delta(c);
    case 'ordina': return ordina(c);
    case 'percentuale': return percentuale(c);
    case 'conversione': return conversione(c);
    case 'posizione': return posizione(c);
    case 'somma-sopra': return sommaSopra(c);
    case 'media': return media(c);
    case 'mediana': return mediana(c);
    case 'moda': return moda(c);
    case 'campo': return campo(c);
    case 'varianza': return varianza(c);
    case 'deviazione': return deviazione(c);
    case 'zscore': return zscore(c);
    case 'outlier': return outlier(c);
    case 'frequenza': return frequenza(c);
    case 'valore-atteso': return valoreAtteso();
    case 'scostamento': return scostamento(c);
    case 'somma-dadi': return sommaDadi();
    default: throw new Error(`Esercizio sconosciuto per il minigioco: ${c.exercise}`);
  }
}
