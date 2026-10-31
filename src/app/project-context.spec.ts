import { PACKS } from './core/data/packs.generated';
import { stripBase } from './core/utils/scoring';
import { baseLineCount, composeProject, neededContext, shiftErrorLines } from './core/utils/project-context';

const path = PACKS[0].paths[0];
const solutionOf = (i: number) => stripBase(PACKS[0].solutions[path.missions[i].id], path.missions[i].projectBase ?? '');
const ctx = (i: number) => neededContext(path.missions[i].projectBase ?? '', path.missions[i].projectSection ?? '', solutionOf(i));

describe('codice essenziale: solo la sezione e le righe precedenti che servono', () => {
  it('missione 1 e 2: nessun codice precedente necessario', () => {
    expect(ctx(0).code).toBe('');
    expect(ctx(1).names).toEqual([]);
  });

  it('missione 3 (filtro): la sezione definisce già i propri dati, non serve nulla', () => {
    expect(ctx(2).names).toEqual([]);
  });

  it('missione 4 (somma): serve solo la serie della pioggia, non le altre', () => {
    const c = ctx(3);
    expect(c.names).toEqual(['pioggia']);
    expect(c.code).toContain('pioggia = [0, 2, 5, 0, 1, 7, 3]');
    expect(c.code).not.toContain('temperature');
    expect(c.code).not.toContain('vento');
  });

  it('missione 5 (media): serve la serie delle temperature', () => {
    const c = ctx(4);
    expect(c.names).toEqual(['temperature']);
    expect(c.code.split('\n').length).toBe(1);
  });

  it('missione 6 (allerta): serve `media` calcolata prima, e solo quella', () => {
    const c = ctx(5);
    expect(c.names).toEqual(['media']);
    expect(c.code).toContain('media = sum(temperature) / len(temperature)');
    expect(c.code).not.toContain('print(');
  });

  it('missione 10 (pipeline): serve `filtrati` con il ciclo che lo riempie', () => {
    const c = ctx(9);
    expect(c.names).toContain('filtrati');
    expect(c.code).toContain('filtrati = []');
    expect(c.code).toContain('filtrati.append(m)');
    expect(c.code).not.toContain('temperature');
  });

  it('le righe mostrate sono molto meno di tutto il progetto', () => {
    for (let i = 0; i < path.missions.length; i++) {
      const base = path.missions[i].projectBase ?? '';
      expect(ctx(i).code.split('\n').length, `missione ${i + 1}`).toBeLessThanOrEqual(Math.max(1, Math.ceil(base.split('\n').length / 2)));
    }
  });

  it('ricomporre base + sezione dà esattamente il codice di partenza completo', () => {
    for (const m of path.missions) expect(composeProject(m.projectBase ?? '', m.projectSection ?? m.starterCode)).toBe(m.starterCode);
  });

  it('non conta nomi dentro stringhe o commenti', () => {
    const r = neededContext('totale = 5\nmedia = 1\n', 'print("totale:", 3)  # media\n', 'print("media")\n');
    expect(r.names).toEqual([]);
  });

  it('riporta le righe degli errori a quelle dell\'editor', () => {
    const base = 'a = 1\nb = 2\nc = 3\n';
    expect(baseLineCount(base)).toBe(4); // 3 righe + la riga vuota di separazione
    expect(composeProject(base, '\n# nuova\nx = 1\n')).toBe('a = 1\nb = 2\nc = 3\n\n# nuova\nx = 1\n');
    // riga 5 del programma completo = riga 1 dell'editor
    expect(shiftErrorLines('File "<exec>", line 5, in <module>\nNameError: x', 4)).toBe('File "<exec>", line 1, in <module>\nNameError: x');
    expect(shiftErrorLines('line 2', 4)).toBe('line 2'); // errore nella parte nascosta: invariato
    expect(shiftErrorLines('line 9', 0)).toBe('line 9');
  });
});
