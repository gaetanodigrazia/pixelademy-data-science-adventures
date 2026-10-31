/**
 * Nel task l'editor mostra solo la sezione da scrivere. Il resto del programma (le sezioni già fatte) resta nascosto e
 * si ricompone all'esecuzione; qui si ricava quali righe precedenti la sezione usa davvero, da mostrare in sola lettura.
 */

const NON_NAMES = new Set([
  'print', 'len', 'sum', 'max', 'min', 'round', 'range', 'abs', 'sorted', 'str', 'int', 'float', 'list', 'dict', 'set', 'enumerate', 'zip',
  'for', 'in', 'if', 'else', 'elif', 'while', 'def', 'return', 'pass', 'import', 'from', 'as', 'and', 'or', 'not', 'is', 'None', 'True', 'False',
  'append', 'extend', 'pop', 'remove', 'insert', 'sort', 'get', 'items', 'keys', 'values',
]);

/** Toglie stringhe e commenti, che non contengono nomi di variabili. */
function code(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').replace(/#.*$/, ''))
    .join('\n');
}

const identifiers = (text: string): Set<string> => new Set(code(text).match(/[A-Za-z_]\w*/g) ?? []);

/** Variabili e funzioni che un pezzo di codice definisce o modifica (assegnazioni, +=, append, def). */
function defined(text: string): Set<string> {
  const out = new Set<string>();
  for (const l of code(text).split('\n')) {
    const assign = l.match(/^\s*([A-Za-z_]\w*)\s*(?:=(?!=)|\+=|-=|\*=)/);
    if (assign) out.add(assign[1]);
    const call = l.match(/\b([A-Za-z_]\w*)\.(?:append|extend|pop|remove|insert|sort)\(/);
    if (call) out.add(call[1]);
    const def = l.match(/^def\s+([A-Za-z_]\w*)/);
    if (def) out.add(def[1]);
  }
  return out;
}

/** Istruzioni di primo livello (con il loro corpo rientrato); commenti e righe vuote a margine non ne aprono una. */
function statements(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) {
      if (line.startsWith('#')) continue;
      out.push(line);
    } else if (out.length) out[out.length - 1] += `\n${line}`;
  }
  return out;
}

export interface ProjectContext {
  /** Nomi che la sezione usa e che arrivano dal codice precedente. */
  names: string[];
  /** Le istruzioni precedenti che li definiscono, nell'ordine in cui compaiono. */
  code: string;
}

/**
 * Le righe di `base` (le sezioni già scritte) che la sezione usa senza definirle. `sections` sono il codice di partenza
 * (un modello, che spesso non nomina ciò che serve) e la soluzione della sezione: dalla seconda si capisce cosa serve,
 * ma non se ne mostra mai il codice, solo le righe precedenti che definiscono quei nomi.
 */
export function neededContext(base: string, ...sections: string[]): ProjectContext {
  if (!base.trim()) return { names: [], code: '' };
  const own = new Set(sections.flatMap((s) => [...defined(s)]));
  const used = [...new Set(sections.flatMap((s) => [...identifiers(s)]))].filter((n) => !NON_NAMES.has(n) && !own.has(n));
  const blocks = statements(base);
  const names = used.filter((n) => blocks.some((b) => defined(b).has(n)));
  const picked = blocks.filter((b) => [...defined(b)].some((n) => names.includes(n)));
  return { names, code: picked.join('\n') };
}

/** La sezione come appare nell'editor: senza le righe vuote iniziali (nel programma completo le separa una riga vuota). */
export const editorSection = (section: string): string => section.replace(/^\n+/, '');

/** Il programma completo: le sezioni precedenti, una riga vuota e la sezione scritta nell'editor (come nel codice di riferimento). */
export function composeProject(base: string, section: string): string {
  return base.trim() ? `${base.trimEnd()}\n\n${editorSection(section)}` : section;
}

/** Quante righe precedono la sezione nel programma completo (sezioni precedenti + riga vuota di separazione). */
export function baseLineCount(base: string): number {
  return base.trim() ? base.trimEnd().split('\n').length + 1 : 0;
}

/** Riporta i numeri di riga di un errore Python a quelli dell'editor (dove la sezione parte dalla riga 1). */
export function shiftErrorLines(error: string, offset: number): string {
  if (!offset) return error;
  return error.replace(/\bline (\d+)/g, (all, n: string) => (Number(n) > offset ? `line ${Number(n) - offset}` : all));
}
