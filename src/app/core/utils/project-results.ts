import { Labels } from '../models/project.model';

/** I valori stampati dal bollettino dell'utente, già tipizzati. Una sezione manca finché la sua missione non è completata. */
export interface ProjectResults {
  first?: number;
  count?: number;
  filtered?: number[];
  total?: number;
  mean?: number;
  alert?: string;
  key?: number;
  extreme?: number;
  range?: number;
  final?: number;
}

/** Ordine delle sezioni: la missione N+1 aggiunge la riga della sezione N. */
export const SECTION_KEYS = ['first', 'count', 'filtered', 'total', 'mean', 'alert', 'key', 'extreme', 'range', 'final'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** Estrae i valori dalle righe «Etichetta: valore» del bollettino; le righe mancanti restano `undefined`. */
export function parseResults(lines: string[], labels: Labels): ProjectResults {
  const raw = (key: SectionKey): string | undefined => {
    const prefix = `${labels[key]}: `;
    return lines.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim();
  };
  const number = (key: SectionKey): number | undefined => {
    const v = raw(key);
    return v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  const list = (key: SectionKey): number[] | undefined => {
    const v = raw(key);
    if (v === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed) && parsed.every((x) => typeof x === 'number') ? (parsed as number[]) : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    first: number('first'),
    count: number('count'),
    filtered: list('filtered'),
    total: number('total'),
    mean: number('mean'),
    alert: raw('alert'),
    key: number('key'),
    extreme: number('extreme'),
    range: number('range'),
    final: number('final'),
  };
}
