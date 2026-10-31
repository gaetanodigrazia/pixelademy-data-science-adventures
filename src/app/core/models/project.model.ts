export interface Series {
  /** Nome della variabile Python. */
  name: string;
  /** Descrizione per le missioni e per la dashboard. */
  label: string;
  unit: string;
  values: number[];
}

/** Etichette delle righe stampate dal bollettino: una per missione, nello stesso ordine. */
export interface Labels {
  first: string;
  count: string;
  filtered: string;
  total: string;
  mean: string;
  alert: string;
  key: string;
  extreme: string;
  range: string;
  final: string;
}

/**
 * Il progetto di un percorso: un solo bollettino con dati condivisi. Ogni missione aggiunge una sezione
 * allo stesso script; completarle tutte produce il programma che stampa il bollettino intero.
 */
export interface ProjectSpec {
  heading: string;
  /** Serie principale: lettura per indice, media, allerta, estremo ed escursione. */
  a: Series;
  /** Serie per contare e sommare. */
  b: Series;
  /** Serie da filtrare e sintetizzare. */
  c: Series;
  /** Posizione letta nella missione 1. */
  k: number;
  /** Soglia usata per filtrare `c` (variabile `cutName`). */
  cut: number;
  cutName: string;
  /** Soglia dell'allerta sulla media di `a`. */
  alert: number;
  registry: { name: string; entries: Record<string, number>; key: string; unit: string };
  extreme: 'min' | 'max';
  labels: Labels;
}
