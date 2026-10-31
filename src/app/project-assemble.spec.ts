import { PathSeed } from './content/adventure-core/curriculum';
import { assembleProject } from './content/adventure-core/project';
import { baseLineCount, composeProject, neededContext, shiftErrorLines } from './core/utils/project-context';
import { coversProject, projectCode, solutionSoFar } from './core/utils/project-code';

const seed = (n: number, exercises?: string[]): PathSeed => ({
  slug: 'prova', title: 'Prova', description: '', icon: '🧪', tags: [], characterSlug: 'aura', enemySlug: 'nuvola', exercises,
  project: {
    heading: 'BOLLETTINO DI PROVA',
    a: { name: 'temperature', label: 'Temperature', unit: '°C', values: [17, 19, 22, 28, 31, 26, 21] },
    b: { name: 'pioggia', label: 'Pioggia', unit: 'mm', values: [0, 2, 5, 0, 1, 7, 3] },
    c: { name: 'vento', label: 'Vento', unit: 'km/h', values: [12, 35, 48, 22, 61, 30, 55] },
    k: 3, cut: 40, cutName: 'soglia_vento', alert: 22,
    registry: { name: 'venti', entries: { nord: 18, est: 27, sud: 34, ovest: 21 }, key: 'sud', unit: 'km/h' },
    extreme: 'min',
    labels: { first: 'Prima', count: 'Conteggio', filtered: 'Filtrati', total: 'Totale', mean: 'Media', alert: 'Allerta', key: 'Chiave', extreme: 'Estremo', range: 'Escursione', final: 'Finale' },
  },
  missions: Array.from({ length: n }, (_, i) => ({ title: `M${i + 1}`, story: '' })),
});

describe('assembleProject (programma cumulativo)', () => {
  it('ogni passo estende il codice e il bollettino del precedente', () => {
    const steps = assembleProject(seed(10));
    expect(steps.length).toBe(10);
    expect(steps[0].base).toBe('');
    steps.forEach((s, i) => {
      expect(s.solution.startsWith(s.base)).toBe(true);
      if (i > 0) {
        expect(s.base).toBe(steps[i - 1].solution);
        expect(s.expected.slice(0, steps[i - 1].expected.length)).toEqual(steps[i - 1].expected);
        expect(s.expected.length).toBeGreaterThan(steps[i - 1].expected.length);
      }
    });
    expect(steps[0].expected[0]).toBe('=== BOLLETTINO DI PROVA ===');
  });

  it('la riga di chiusura c\'è solo con tutti i 10 concetti', () => {
    expect(assembleProject(seed(10)).at(-1)!.expected.at(-1)).toBe('=== FINE DEL BOLLETTINO ===');
    expect(assembleProject(seed(3)).at(-1)!.expected).not.toContain('=== FINE DEL BOLLETTINO ===');
  });

  it('rifiuta percorsi con meno di 1 o più di 10 missioni', () => {
    expect(() => assembleProject(seed(0))).toThrow(/da 1 a 10/);
    expect(() => assembleProject(seed(11))).toThrow(/da 1 a 10/);
  });
});

describe('codice del progetto', () => {
  const reference = 'a = [1]\nb = 2\nprint(a)';
  it('riconosce il codice coerente e scarta quello di versioni precedenti', () => {
    expect(coversProject('a = [1]\nb = 2\nprint(a)', reference)).toBe(true);
    expect(coversProject('a = [1]\nprint(a)', reference)).toBe(false);
    expect(projectCode('a = [1]\nb = 5', reference)).toBe('a = [1]\nb = 5');
    expect(projectCode('x = 1', reference)).toBe(reference);
    expect(projectCode(undefined, reference)).toBe(reference);
  });

  it('la soluzione «fino a qui» riusa il codice dell\'utente', () => {
    expect(solutionSoFar('a = [9]', 'a = [1]', 'a = [1]\nb = 2')).toBe('a = [9]\n\nb = 2');
    expect(solutionSoFar('', 'a = [1]', 'a = [1]\nb = 2')).toBe('a = [1]\nb = 2');
  });
});

describe('contesto del progetto', () => {
  const base = 'pioggia = [0, 2, 5]\ntemperature = [1, 2]\nmedia = sum(temperature) / len(temperature)\n';
  it('mostra solo le righe precedenti che la sezione usa', () => {
    const c = neededContext(base, 'totale = sum(pioggia)\n');
    expect(c.names).toEqual(['pioggia']);
    expect(c.code).toBe('pioggia = [0, 2, 5]');
  });

  it('senza codice precedente non serve nulla; ciò che la sezione definisce non conta', () => {
    expect(neededContext('', 'x = 1').code).toBe('');
    expect(neededContext(base, 'pioggia = [1]\nprint(pioggia)').names).toEqual([]);
  });

  it('compone il programma e riporta i numeri di riga dell\'errore a quelli dell\'editor', () => {
    expect(composeProject('a = 1\n', '\n\nb = 2\n')).toBe('a = 1\n\nb = 2\n');
    expect(composeProject('', 'b = 2')).toBe('b = 2');
    expect(baseLineCount('a = 1\nb = 2\n')).toBe(3);
    expect(baseLineCount('')).toBe(0);
    expect(shiftErrorLines('File "<exec>", line 7, in <module>', 3)).toBe('File "<exec>", line 4, in <module>');
    expect(shiftErrorLines('line 2', 3)).toBe('line 2');
  });
});
