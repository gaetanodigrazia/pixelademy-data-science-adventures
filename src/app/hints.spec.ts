import { PACKS } from './core/data/packs.generated';
import { stripBase } from './core/utils/scoring';

/** Una riga di codice «normalizzata»: senza commenti, spazi di troppo e il punto e virgola finale. */
const norm = (l: string): string => l.replace(/#.*$/, '').replace(/\s+/g, ' ').trim();

/** Le righe che la soluzione aggiunge rispetto al codice di partenza (cioè ciò che l'utente deve scrivere). */
function newLines(m: { starterCode: string; projectBase?: string }, solution: string): string[] {
  const starter = new Set(stripBase(m.starterCode, m.projectBase ?? '').split('\n').map(norm));
  return stripBase(solution, m.projectBase ?? '').split('\n').map(norm).filter((l) => l && !starter.has(l));
}

/** Le righe nuove della soluzione (o la parte destra delle assegnazioni) che compaiono nel testo. */
function leaksIn(text: string, m: { starterCode: string; projectBase?: string; id: string }): string[] {
  const t = norm(text).replace(/[.;]\s*$/, '');
  const leaks: string[] = [];
  for (const line of newLines(m, PACKS[0].solutions[m.id])) {
    const l = line.replace(/:$/, '');
    if (l.length >= 6 && t.includes(l)) leaks.push(line);
    const rhs = /^[\w\[\]'". ]+?\s[+\-*/]?=\s(.+)$/.exec(line)?.[1]?.trim();
    // solo le espressioni (chiamate, operazioni, indici): un valore da stampare come "ALLARME" fa parte della consegna, non del metodo
    if (rhs && rhs.length >= 8 && /[()\[\]+\-*/]/.test(rhs) && t.includes(rhs)) leaks.push(`…= ${rhs}`);
  }
  return leaks;
}

/**
 * Il suggerimento orienta (quale strumento usare, a cosa pensare) ma **non scrive la soluzione**: nessuna riga nuova della soluzione
 * e nessuna espressione di assegnazione (`media = totale / len(onde)`, la parte dopo il `=`) deve comparire nel testo.
 */
describe('suggerimenti: non rivelano la soluzione', () => {
  const cases = PACKS[0].paths.flatMap((p) => p.missions.map((m) => ({ id: m.id, m })));
  it.each(cases)('$id', ({ m }) => {
    const leaks = leaksIn(m.hint, m);
    expect(leaks, `il suggerimento di ${m.id} contiene la soluzione:\n  «${m.hint}»\n  righe: ${leaks.join(' | ')}`).toEqual([]);
  });
});

/**
 * La nota della scena di gioco (sopra il gioco, prima di eseguire) dice **cosa stampare**, non **come calcolarlo**: niente codice
 * (`** 0.5`, `max(x)`, `[:3]`…) e niente metodo («elevane al quadrato gli scarti, fanne la media…»).
 */
const CODE = /\*\*|\w\(|\.\w+\(|\/\/|\[|\]|==|\+=|\*/;
/** Verbi di calcolo che spiegano il metodo: la nota dice cosa stampare, non cosa fare per ottenerlo. */
const METHOD = /\b(somma|dividi|moltiplica|elevane|elevata|radice|ordina|calcola|conta|trova|leggi|togli|aggiungi|crea|fai|fanne)\b/i;

describe('note della scena: dicono cosa stampare, non come calcolarlo', () => {
  const cases = PACKS[0].paths.flatMap((p) => p.missions.filter((m) => m.viz?.note).map((m) => ({ id: m.id, m, note: m.viz!.note! })));
  it.each(cases)('$id', ({ m, note }) => {
    expect(note, `nota con codice: «${note}»`).not.toMatch(CODE);
    expect(note, `nota che spiega il metodo: «${note}»`).not.toMatch(METHOD);
    expect(leaksIn(note, m), `la nota contiene la soluzione: «${note}»`).toEqual([]);
    expect(note, 'deve dire cosa stampare').toMatch(/stampa/i);
  });
});

/**
 * Il «Cosa fare» dice cosa calcolare e come si chiamano le variabili, ma non contiene gli operatori né le espressioni della soluzione
 * (`**`, `//`, `[:3]`, `.count`, `sorted(`, formule).
 */
const BRIEF_CODE = /\*\*|\/\/|\[:|\.(count|index|append|pop)\b|\bsorted\(|\babs\(/;

describe('«Cosa fare»: niente operatori né espressioni della soluzione', () => {
  const cases = PACKS[0].paths.flatMap((p) => p.missions.map((m) => ({ id: m.id, m })));
  it.each(cases)('$id', ({ m }) => {
    expect(m.briefing, `«Cosa fare» con codice: «${m.briefing}»`).not.toMatch(BRIEF_CODE);
    expect(leaksIn(m.briefing, m), `«Cosa fare» con la soluzione: «${m.briefing}»`).toEqual([]);
  });
});
