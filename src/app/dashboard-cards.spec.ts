import { PACKS } from './core/data/packs.generated';
import { buildDashboardCards } from './core/utils/dashboard-cards';

const path = PACKS[0].paths[0];
const project = path.project!;
const lastLines = (n: number) => {
  const v = path.missions[n - 1].validation;
  return v.kind === 'lines' ? v.expected : [];
};

describe('riquadri della Dashboard (funzione pura)', () => {
  it('a progetto completo ha 4 riquadri con grafici e tutti gli indicatori valorizzati', () => {
    const cards = buildDashboardCards(project, path.missions.length, lastLines(10));
    expect(cards.length).toBe(4);
    for (const c of cards) {
      expect(c.values, c.title).not.toBeNull();
      for (const s of c.stats) expect(s.text, `${c.title} · ${s.label}`).not.toBeNull();
    }
    const temp = cards[0];
    expect(temp.stats.find((s) => s.label === project.labels.mean)?.text).toContain(String(Math.round((project.a.values.reduce((x, y) => x + y, 0) / project.a.values.length) * 100) / 100));
    expect(temp.refs.some((r) => r.label.startsWith('soglia'))).toBe(true);
  });

  it('a progetto incompleto i grafici e gli indicatori delle sezioni mancanti restano bloccati', () => {
    const cards = buildDashboardCards(project, 1, lastLines(1));
    expect(cards[0].values).not.toBeNull(); // grafico della serie principale dalla missione 1
    expect(cards[1].values).toBeNull();
    expect(cards[3].values).toBeNull();
    expect(cards[1].stats.every((s) => s.text === null)).toBe(true);
  });

  it('è deterministico: stessi dati, stessi riquadri (l\'anteprima del link è uguale per tutti)', () => {
    const a = buildDashboardCards(project, 10, lastLines(10));
    const b = buildDashboardCards(project, 10, lastLines(10));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('percorsi brevi (3 missioni)', () => {
  // il percorso «Osservatorio» troncato a 3 missioni: i primi tre concetti standard
  const full = PACKS[0].paths[0];
  const proj = full.project!;
  const out = (full.missions[2].validation as { expected: string[] }).expected;

  it('mostrano solo i riquadri e gli indicatori che le loro missioni possono sbloccare', () => {
    const cards = buildDashboardCards(proj, 3, out, 3);
    expect(cards.map((c) => c.title)).toEqual([`${proj.a.label} (${proj.a.unit})`, `${proj.b.label} (${proj.b.unit})`, `${proj.c.label} (${proj.c.unit})`]);
    for (const c of cards) {
      expect(c.values, c.title).not.toBeNull();
      for (const s of c.stats) {
        expect(s.section).toBeLessThanOrEqual(3);
        expect(s.text, `${c.title} · ${s.label}`).not.toBeNull(); // niente lucchetti per sempre
      }
    }
    expect(cards.flatMap((c) => c.stats).length).toBe(3); // il primo valore, il conteggio, i valori filtrati
  });

  it('senza indicare il totale il comportamento è quello del percorso completo (10 sezioni)', () => {
    expect(buildDashboardCards(proj, 3, out).length).toBe(4);
  });

  it('un percorso di 2 missioni ha 2 riquadri', () => {
    expect(buildDashboardCards(proj, 2, out, 2).length).toBe(2);
  });
});
