export const MAX_DIFFICULTY = 10;

export function xpForDifficulty(difficulty: number): number {
  return 20 + 10 * (difficulty - 1);
}

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 50));
}

/** XP necessari per raggiungere un dato livello. */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

/**
 * Percentuale di completamento (0–100), per difetto: arriva a 100 solo se **tutte** le missioni sono completate.
 * Con una missione ancora da fare (anche bloccata) il massimo è 99, così 199/200 non si arrotonda a «100%».
 */
export function completionPercent(done: number, total: number): number {
  if (total <= 0 || done <= 0) return 0;
  if (done >= total) return 100;
  return Math.min(99, Math.floor((done / total) * 100));
}
