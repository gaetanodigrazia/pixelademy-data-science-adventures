import { PACKS } from './core/data/packs.generated';
import { stripBase } from './core/utils/scoring';

/** Una riga di codice «normalizzata»: senza commenti, spazi di troppo e il punto e virgola finale. */
const norm = (l: string): string => l.replace(/#.*$/, '').replace(/\s+/g, ' ').trim();

/** Le righe che la soluzione aggiunge rispetto al codice di partenza (cioè ciò che l'utente deve scrivere). */
function newLines(m: { starterCode: string; projectBase?: string }, solution: string): string[] {
  const starter = new Set(stripBase(m.starterCode, m.projectBase ?? '').split('\n').map(norm));
  return stripBase(solution, m.projectBase ?? '').split('\n').map(norm).filter((l) => l && !starter.has(l));
}

/**
 * Il suggerimento orienta (quale strumento usare, a cosa pensare) ma **non scrive la soluzione**: nessuna riga nuova della soluzione
 * e nessuna espressione di assegnazione (`media = totale / len(onde)`, la parte dopo il `=`) deve comparire nel testo.
 */
describe('suggerimenti: non rivelano la soluzione', () => {
  const cases = PACKS[0].paths.flatMap((p) => p.missions.map((m) => ({ id: m.id, m })));
  it.each(cases)('$id', ({ m }) => {
    const solution = PACKS[0].solutions[m.id];
    const hint = norm(m.hint).replace(/[.;]\s*$/, '');
    const leaks: string[] = [];
    for (const line of newLines(m, solution)) {
      const l = line.replace(/:$/, '');
      if (l.length >= 6 && hint.includes(l)) leaks.push(line);
      const rhs = /^[\w\[\]'". ]+?\s[+\-*/]?=\s(.+)$/.exec(line)?.[1]?.trim();
      if (rhs && rhs.length >= 8 && hint.includes(rhs)) leaks.push(`…= ${rhs}`);
    }
    expect(leaks, `il suggerimento di ${m.id} contiene la soluzione:\n  «${m.hint}»\n  righe: ${leaks.join(' | ')}`).toEqual([]);
  });
});
