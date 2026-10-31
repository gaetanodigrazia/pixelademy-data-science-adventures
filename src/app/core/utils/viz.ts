import { MissionViz } from '../models/mission.model';

export interface VizOutcome {
  status: 'idle' | 'ok' | 'wrong' | 'error';
  message: string;
  /** Ultimo numero stampato (se c'è). */
  value?: number;
  /** Tutti i numeri stampati, nell'ordine. */
  printed?: number[];
  /** Testo stampato, in minuscolo (solo `alarm`). */
  text?: string;
  /** Posizione evidenziata nella serie (`list-read`, `dict`, `extreme`). */
  index?: number;
}

const NUMBER_RE = /-?\d+(?:\.\d+)?/g;
const TOL = 0.01;
const same = (a: number, b: number) => Math.abs(a - b) <= TOL;
const key = (v: MissionViz) => v.labels?.[v.index ?? 0] ?? '';

function idle(v: MissionViz): string {
  if (v.note) return v.note;
  switch (v.kind) {
    case 'list-read': return `Leggi la posizione ${v.index} di ${v.name} e stampala: l'eroe andrà a quella tacca.`;
    case 'count': return `Conta gli elementi di ${v.name} e stampa il numero: si accenderanno altrettanti sensori.`;
    case 'filter': return `Stampa i valori sopra la soglia ${v.th}: si illumineranno nel grafico.`;
    case 'sum': return 'Somma tutti i valori e stampa il totale: la linea si fermerà all\'altezza che hai calcolato.';
    case 'mean': return 'Calcola la media e stampala: la linea mostrerà dove cade il tuo valore.';
    case 'alarm': return `Confronta la media con la soglia ${v.th} e stampa ALLARME oppure OK: la spia si accenderà.`;
    case 'dict': return `Leggi la zona '${key(v)}' di ${v.name} e stampa il suo valore: la scheda si illuminerà.`;
    case 'extreme': return `Trova il valore ${v.mode === 'max' ? 'massimo' : 'minimo'} e stampalo: si illuminerà la sua barra.`;
    case 'range': return 'Calcola massimo meno minimo: la tua linea parte dal minimo e deve arrivare in cima alla barra più alta.';
    case 'pipeline': return `Filtra i valori sopra ${v.th}, calcola la media e stampala: la linea mostra dove cade il tuo valore.`;
    case 'pick': return 'Stampa i valori richiesti: le loro barre si illumineranno nel grafico.';
    case 'value': return 'Calcola il valore richiesto e stampalo: la scena ti dice se è giusto.';
  }
}

function failure(v: MissionViz, error: string): VizOutcome {
  if (v.kind === 'list-read' && /IndexError/.test(error)) {
    return { status: 'error', message: `Posizione fuori scala: ${v.name} ha le posizioni da 0 a ${v.values.length - 1}.` };
  }
  if (v.kind === 'dict' && /KeyError/.test(error)) {
    return { status: 'error', message: `Chiave inesistente in ${v.name}: scrivila tra apici, come nel registro.` };
  }
  return { status: 'error', message: 'Il programma si è fermato prima di finire: leggi l\'errore in console.' };
}

/** Confronto numerico con indicazione di direzione (troppo basso/alto) senza rivelare il risultato. */
function numeric(v: MissionViz, expected: number, value: number, extra: Partial<VizOutcome> = {}): VizOutcome {
  if (same(value, expected)) return { status: 'ok', message: 'Il valore coincide con quello atteso.', value, ...extra };
  return { status: 'wrong', message: value < expected ? 'La tua linea è troppo in basso.' : 'La tua linea è troppo in alto.', value, ...extra };
}

/** Traduce l'esito del programma (output/errore) in ciò che accade nel mondo di gioco. */
export function evaluateViz(v: MissionViz, ran: boolean, output: string, error: string): VizOutcome {
  if (!ran) return { status: 'idle', message: idle(v) };
  if (error) return failure(v, error);

  const text = output.trim();
  if (!text) return { status: 'wrong', message: 'Non hai stampato nulla: usa print().' };

  if (v.kind === 'alarm') {
    const got = text.toLowerCase();
    if (got !== 'allarme' && got !== 'ok') return { status: 'wrong', message: 'Stampa soltanto ALLARME oppure OK.', text: got };
    const ok = got === (v.expected as string).toLowerCase();
    return ok
      ? { status: 'ok', message: 'La spia segna lo stato giusto.', text: got }
      : { status: 'wrong', message: 'La spia segna lo stato opposto a quello dei dati.', text: got };
  }

  const printed = (text.match(NUMBER_RE) ?? []).map(Number);
  if (!printed.length) return { status: 'wrong', message: `Hai stampato «${text.slice(0, 24)}», non un numero.` };
  const expected = v.expected as number[];
  const value = printed[printed.length - 1];

  switch (v.kind) {
    case 'filter': {
      const rest = [...expected];
      let extras = 0;
      for (const n of printed) {
        const i = rest.findIndex((e) => same(e, n));
        if (i >= 0) rest.splice(i, 1);
        else extras++;
      }
      const ok = printed.length === expected.length && printed.every((n, i) => same(n, expected[i]));
      if (ok) return { status: 'ok', message: 'Passano esattamente i valori sopra la soglia.', printed };
      const parts = [
        extras ? (extras === 1 ? '1 valore non supera la soglia' : `${extras} valori non superano la soglia`) : '',
        rest.length ? (rest.length === 1 ? 'ne manca 1' : `ne mancano ${rest.length}`) : '',
      ].filter(Boolean);
      return { status: 'wrong', message: parts.length ? `${parts.join(', ')}.` : 'I valori giusti ci sono, ma l\'ordine non è quello originale.', printed };
    }
    case 'pick': {
      // come `filter`, ma senza soglia: contano i valori stampati e il loro ordine
      const rest = [...expected];
      let extras = 0;
      for (const n of printed) {
        const i = rest.findIndex((e) => same(e, n));
        if (i >= 0) rest.splice(i, 1);
        else extras++;
      }
      if (printed.length === expected.length && printed.every((n, i) => same(n, expected[i]))) return { status: 'ok', message: 'Sono esattamente i valori richiesti.', printed };
      const parts = [
        extras ? (extras === 1 ? '1 valore non è tra quelli richiesti' : `${extras} valori non sono tra quelli richiesti`) : '',
        rest.length ? (rest.length === 1 ? 'ne manca 1' : `ne mancano ${rest.length}`) : '',
      ].filter(Boolean);
      return { status: 'wrong', message: parts.length ? `${parts.join(', ')}.` : 'I valori giusti ci sono, ma in un altro ordine.', printed };
    }
    case 'value': {
      if (v.asIndex) {
        const at = Number.isInteger(value) && value >= 0 && value < v.values.length ? value : undefined;
        if (same(value, expected[0])) return { status: 'ok', message: `Posizione ${value}: è quella giusta.`, value, index: at };
        return {
          status: 'wrong',
          message: at !== undefined ? `La posizione ${value} (valore ${v.values[at]}) non è quella giusta.` : `${value} non è una posizione valida: gli indici vanno da 0 a ${v.values.length - 1}.`,
          value, index: at,
        };
      }
      const r = numeric(v, expected[0], value, { printed });
      r.message = r.status === 'ok' ? 'Il valore stampato è quello giusto.' : value < expected[0] ? 'Il valore stampato è troppo basso.' : 'Il valore stampato è troppo alto.';
      return r;
    }
    case 'count':
    case 'sum':
    case 'mean':
    case 'range':
    case 'pipeline': {
      const r = numeric(v, expected[0], value, { printed });
      if (v.kind === 'count' && r.status === 'wrong') r.message = value < expected[0] ? 'Hai acceso meno sensori di quelli che ci sono.' : 'Hai contato più sensori di quelli che ci sono.';
      return r;
    }
    case 'list-read':
    case 'dict':
    case 'extreme': {
      const found = v.values.findIndex((x) => same(x, value));
      if (same(value, expected[0])) {
        const at = v.kind === 'list-read' ? v.index : v.kind === 'dict' ? v.index : found;
        return { status: 'ok', message: `Letto ${value}: è il valore giusto.`, value, index: at };
      }
      if (found >= 0) {
        const where = v.kind === 'dict' ? `la zona '${v.labels?.[found]}'` : `la posizione ${found}`;
        const need = v.kind === 'list-read' ? `la ${v.index}` : v.kind === 'dict' ? `'${key(v)}'` : `il ${v.mode === 'max' ? 'massimo' : 'minimo'}`;
        return { status: 'wrong', message: `Hai letto ${where}, ma serviva ${need}.`, value, index: found };
      }
      return { status: 'wrong', message: `${value} non è nessun valore della serie.`, value };
    }
  }
}

/**
 * La parte di bollettino che la missione aggiunge: la scena legge solo la riga della propria sezione
 * (`Etichetta: valore`), senza le sezioni delle missioni precedenti.
 */
export function vizLine(output: string, v: MissionViz): string {
  const lines = output.split(/\r?\n/).map((l) => l.trim());
  const mine = v.label ? lines.find((l) => l.startsWith(`${v.label}:`)) : undefined;
  if (mine) return mine.slice(v.label!.length + 1).trim();
  return lines.filter((l) => l && !l.startsWith('===')).join(' ');
}
