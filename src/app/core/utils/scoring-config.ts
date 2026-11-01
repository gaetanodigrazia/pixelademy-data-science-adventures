/** Tutti i parametri del punteggio in un solo posto (vedi `scoring.ts` per la formula). */
export const SCORING = {
  /** Tempo di riferimento (s) = base + perDifficulty × difficoltà. */
  parBase: 60,
  parPerDifficulty: 30,
  /** Il fattore tempo scende fino a questo valore a tre volte il riferimento. */
  timeFloor: 0.7,
  /** −10% per ogni esecuzione fallita, fino a un minimo di 0,5. */
  errorStep: 0.1,
  errorFloor: 0.5,
  /** Somiglianza con la soluzione: da 0,7 (molto diverso) a 1 (identico). */
  similarityBase: 0.7,
  /** Soluzione aperta prima di superare il task: gli XP della missione si azzerano (0). */
  viewedFactor: 0,
  /** Anti-incolla: troppo codice incollato, quasi identico alla soluzione, in pochi secondi. */
  paste: { minChars: 40, minSimilarity: 0.9, maxSeconds: 5, factor: 0.6 },
} as const;
