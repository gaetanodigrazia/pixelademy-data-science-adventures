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
