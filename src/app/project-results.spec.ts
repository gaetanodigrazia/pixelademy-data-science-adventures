import { PACKS } from './core/data/packs.generated';
import { parseResults } from './core/utils/project-results';

const path = PACKS[0].paths[0];
const labels = path.project!.labels;
const expected = (i: number) => (path.missions[i].validation as { expected: string[] }).expected;

describe('parseResults', () => {
  it('estrae numeri, liste e testo dalle righe del bollettino', () => {
    const r = parseResults(expected(9), labels);
    expect(r).toEqual({
      first: 28, count: 7, filtered: [48, 61, 55], total: 18, mean: 23.43, alert: 'ALLARME', key: 34, extreme: 17, range: 14, final: 54.67,
    });
  });

  it('lascia vuote le sezioni non ancora prodotte', () => {
    const r = parseResults(expected(2), labels);
    expect(r.filtered).toEqual([48, 61, 55]);
    expect(r.total).toBeUndefined();
    expect(r.mean).toBeUndefined();
    expect(r.alert).toBeUndefined();
  });

  it('ignora righe con valori non validi', () => {
    expect(parseResults([`${labels.count}: None`, `${labels.filtered}: [1, x]`], labels)).toEqual({
      first: undefined, count: undefined, filtered: undefined, total: undefined, mean: undefined, alert: undefined,
      key: undefined, extreme: undefined, range: undefined, final: undefined,
    });
  });
});
