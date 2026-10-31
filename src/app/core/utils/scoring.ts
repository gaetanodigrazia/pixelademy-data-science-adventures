/** Tempo di riferimento (s) entro cui non si perde XP: cresce con la difficoltà. */
export function parSeconds(difficulty: number): number {
  return 60 + 30 * difficulty;
}

export interface ScoreInput {
  baseXp: number;
  difficulty: number;
  /** Secondi passati sul task (esclusi i caricamenti dell'interprete). */
  seconds: number;
  /** Esecuzioni fallite (errore di Python o output sbagliato). */
  errors: number;
  code: string;
  reference: string;
  /** Soluzione di riferimento aperta prima di superare il task. */
  solutionViewed: boolean;
}

export interface ScoreBreakdown {
  baseXp: number;
  seconds: number;
  errors: number;
  timeFactor: number;
  errorFactor: number;
  /** Somiglianza con la soluzione di riferimento, 0..1. */
  similarity: number;
  similarityFactor: number;
  viewedFactor: number;
  xp: number;
}

const tokens = (code: string): string[] =>
  code.replace(/#.*$/gm, '').match(/[A-Za-z_]\w*|\d+(?:\.\d+)?|"[^"]*"|'[^']*'|\S/g) ?? [];

/** Somiglianza 0..1 tra due codici: distanza di Levenshtein sui token, senza commenti né spazi. */
export function codeSimilarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 1;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return 1 - prev[y.length] / longest;
}

/**
 * XP guadagnati = base × tempo × errori × somiglianza × soluzione.
 * - tempo: 1 entro il tempo di riferimento, poi scende fino a 0,7 a tre volte il riferimento;
 * - errori: −10% per ogni esecuzione fallita (minimo 0,5);
 * - somiglianza: da 0,7 (codice molto diverso) a 1 (identico alla soluzione di riferimento);
 * - soluzione: dimezza se è stata aperta prima di superare il task.
 */
export function scoreAttempt(i: ScoreInput): ScoreBreakdown {
  const par = parSeconds(i.difficulty);
  const timeFactor = i.seconds <= par ? 1 : Math.max(0.7, 1 - (0.3 * (i.seconds - par)) / (2 * par));
  const errorFactor = Math.max(0.5, 1 - 0.1 * i.errors);
  const similarity = codeSimilarity(i.code, i.reference);
  const similarityFactor = 0.7 + 0.3 * similarity;
  const viewedFactor = i.solutionViewed ? 0.5 : 1;
  const xp = Math.max(1, Math.round(i.baseXp * timeFactor * errorFactor * similarityFactor * viewedFactor));
  return { baseXp: i.baseXp, seconds: i.seconds, errors: i.errors, timeFactor, errorFactor, similarity, similarityFactor, viewedFactor, xp };
}

/** Toglie dal codice la parte di progetto già scritta nelle missioni precedenti: la somiglianza conta solo la sezione nuova. */
export function stripBase(code: string, base: string): string {
  const b = base.trimEnd();
  return b && code.startsWith(b) ? code.slice(b.length) : code;
}
