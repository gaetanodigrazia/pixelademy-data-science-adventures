import { BUILDERS, CONCEPT_COUNT, ProjectSpec, buildConcept, gameConfig, num, vizFor } from './content/adventure-core/concepts';

const P: ProjectSpec = {
  heading: 'BOLLETTINO DI PROVA',
  a: { name: 'temperature', label: 'Temperature', unit: '°C', values: [17, 19, 22, 28, 31, 26, 21] },
  b: { name: 'pioggia', label: 'Pioggia', unit: 'mm', values: [0, 2, 5, 0, 1, 7, 3] },
  c: { name: 'vento', label: 'Vento', unit: 'km/h', values: [12, 35, 48, 22, 61, 30, 55] },
  k: 3,
  cut: 40,
  cutName: 'soglia_vento',
  alert: 22,
  registry: { name: 'venti', entries: { nord: 18, est: 27, sud: 34, ovest: 21 }, key: 'sud', unit: 'km/h' },
  extreme: 'min',
  labels: { first: 'Prima', count: 'Conteggio', filtered: 'Filtrati', total: 'Totale', mean: 'Media', alert: 'Allerta', key: 'Chiave', extreme: 'Estremo', range: 'Escursione', final: 'Finale' },
};

describe('concetti (10 missioni standard)', () => {
  it('sono 10, nell\'ordine fisso dei concetti', () => {
    expect(CONCEPT_COUNT).toBe(10);
    expect(BUILDERS.length).toBe(10);
  });

  it('ogni concetto ha teoria, suggerimento e una sezione di partenza diversa dalla soluzione', () => {
    for (let i = 0; i < CONCEPT_COUNT; i++) {
      const c = buildConcept(i, P);
      expect(c.theory.length, `teoria ${i + 1}`).toBeGreaterThan(0);
      expect(c.hint, `hint ${i + 1}`).not.toBe('');
      expect(c.starter, `starter ${i + 1}`).not.toBe(c.solution);
      expect(c.lines.length, `righe ${i + 1}`).toBeGreaterThan(0);
    }
  });

  it('la missione 1 apre il bollettino, la 10 lo chiude, ogni sezione stampa una riga con la sua etichetta', () => {
    const lines = Array.from({ length: CONCEPT_COUNT }, (_, i) => buildConcept(i, P).lines);
    expect(lines[0][0]).toBe('=== BOLLETTINO DI PROVA ===');
    expect(lines[9].at(-1)).toBe('=== FINE DEL BOLLETTINO ===');
    expect(lines.flat().filter((l) => l.startsWith('===')).length).toBe(2);
    const labels = Object.values(P.labels);
    labels.forEach((label, i) => expect(lines[i].some((l) => l.startsWith(`${label}:`)), label).toBe(true));
  });

  it('i valori attesi seguono i dati del progetto', () => {
    expect(buildConcept(0, P).lines[1]).toBe('Prima: 28');
    expect(buildConcept(1, P).lines[0]).toBe('Conteggio: 7');
    expect(buildConcept(3, P).lines[0]).toBe('Totale: 18');
    expect(buildConcept(4, P).lines[0]).toBe(`Media: ${num((17 + 19 + 22 + 28 + 31 + 26 + 21) / 7)}`);
    expect(buildConcept(5, P).lines[0]).toBe('Allerta: ALLARME');
    expect(buildConcept(6, P).lines[0]).toBe('Chiave: 34');
    expect(buildConcept(7, P).lines[0]).toBe('Estremo: 17');
    expect(buildConcept(8, P).lines[0]).toBe('Escursione: 14');
  });

  it('configurazione del gioco e scena usano i dati veri e hanno il tipo previsto', () => {
    const kinds = ['list-read', 'count', 'filter', 'sum', 'mean', 'alarm', 'dict', 'extreme', 'range', 'pipeline'];
    kinds.forEach((k, i) => expect(vizFor(i, P).kind).toBe(k));
    expect(gameConfig(0, P)).toEqual({ unit: '°C', v: P.a.values, k: 3 });
    expect(gameConfig(2, P)).toEqual({ unit: 'km/h', v: P.c.values, th: 40 });
    expect(vizFor(2, P).expected).toEqual([48, 61, 55]);
  });
});
