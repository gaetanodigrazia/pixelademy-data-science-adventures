import type { ChartLine, Tone } from '../../shared/components/bar-chart';
import type { ProjectSpec } from '../models/project.model';
import { parseResults } from './project-results';

export interface Stat {
  label: string;
  /** Valore prodotto dal programma dell'utente; `null` finché la missione non è completata. */
  text: string | null;
  /** Missione (1..10) che produce questo valore. */
  section: number;
  tone?: 'good' | 'bad';
}

/** Un riquadro della Dashboard: titolo, indicatori e grafico a barre (con evidenziazioni e linee di riferimento). */
export interface DashboardCard {
  title: string;
  stats: Stat[];
  /** `null` finché la missione che produce il grafico non è completata. */
  values: number[] | null;
  labels: string[];
  marks: Record<number, Tone>;
  refs: ChartLine[];
  chartSection: number;
}

const fmt = (n: number | undefined, unit = ''): string | null => (n === undefined ? null : `${Math.round(n * 100) / 100}${unit ? ' ' + unit : ''}`);

/**
 * I riquadri della Dashboard dopo `done` missioni completate. `lines` è l'output del bollettino fino a quella missione.
 * `total` è il numero di missioni del percorso: un percorso breve (es. 3) non ha le sezioni successive, quindi
 * gli indicatori e i riquadri che dipendono da quelle non compaiono (non si potrebbero mai sbloccare).
 * Funzione pura: la usano la pagina e lo script che genera l'immagine di anteprima per la condivisione.
 */
export function buildDashboardCards(p: ProjectSpec, done: number, lines: string[], total = 10): DashboardCard[] {

    const r = parseResults(lines, p.labels);
    const d = done;
    const L = p.labels;
    const alertTone = r.alert === undefined ? undefined : r.alert === 'OK' ? 'good' : 'bad';

    const aMarks: Record<number, Tone> = {};
    if (d >= 1) aMarks[p.k] = 'accent';
    if (d >= 8 && r.extreme !== undefined) {
      const i = p.a.values.indexOf(r.extreme);
      if (i >= 0 && !(i in aMarks)) aMarks[i] = 'good';
    }
    const aRefs: ChartLine[] = [];
    if (d >= 5 && r.mean !== undefined) aRefs.push({ value: r.mean, label: `media ${fmt(r.mean)}`, tone: 'accent' });
    if (d >= 6) aRefs.push({ value: p.alert, label: `soglia ${p.alert}`, tone: 'bad' });

    const cMarks: Record<number, Tone> = {};
    if (d >= 3) p.c.values.forEach((v, i) => v > p.cut && (cMarks[i] = 'accent'));
    const cRefs: ChartLine[] = [];
    if (d >= 3) cRefs.push({ value: p.cut, label: `soglia ${p.cut}`, tone: 'bad' });
    if (d >= 10 && r.final !== undefined) cRefs.push({ value: r.final, label: `media ${fmt(r.final)}`, tone: 'good' });

    const keys = Object.keys(p.registry.entries);
    const dMarks: Record<number, Tone> = d >= 7 ? { [keys.indexOf(p.registry.key)]: 'accent' } : {};

    const cards: DashboardCard[] = [
      {
        title: `${p.a.label} (${p.a.unit})`,
        stats: [
          { label: L.first, text: fmt(r.first, p.a.unit), section: 1 },
          { label: L.mean, text: fmt(r.mean, p.a.unit), section: 5 },
          { label: L.extreme, text: fmt(r.extreme, p.a.unit), section: 8 },
          { label: L.range, text: fmt(r.range, p.a.unit), section: 9 },
          { label: L.alert, text: r.alert ?? null, section: 6, tone: alertTone },
        ] as Stat[],
        values: d >= 1 ? p.a.values : null, labels: [] as string[], marks: aMarks, refs: aRefs, chartSection: 1,
      },
      {
        title: `${p.b.label} (${p.b.unit})`,
        stats: [
          { label: L.count, text: fmt(r.count), section: 2 },
          { label: L.total, text: fmt(r.total, p.b.unit), section: 4 },
        ] as Stat[],
        values: d >= 2 ? p.b.values : null, labels: [] as string[], marks: {} as Record<number, Tone>, refs: [] as ChartLine[], chartSection: 2,
      },
      {
        title: `${p.c.label} (${p.c.unit})`,
        stats: [
          { label: L.filtered, text: r.filtered ? `${r.filtered.length} su ${p.c.values.length}` : null, section: 3 },
          { label: L.final, text: fmt(r.final, p.c.unit), section: 10 },
        ] as Stat[],
        values: d >= 3 ? p.c.values : null, labels: [] as string[], marks: cMarks, refs: cRefs, chartSection: 3,
      },
      {
        title: `Registro (${p.registry.unit})`,
        stats: [{ label: L.key, text: fmt(r.key, p.registry.unit), section: 7 }] as Stat[],
        values: d >= 7 ? Object.values(p.registry.entries) : null, labels: keys, marks: dMarks, refs: [] as ChartLine[], chartSection: 7,
      },
    ];
    return cards.filter((c) => c.chartSection <= total).map((c) => ({ ...c, stats: c.stats.filter((s) => s.section <= total) }));
}
