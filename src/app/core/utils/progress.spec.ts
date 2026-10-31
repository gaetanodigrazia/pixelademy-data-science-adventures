import { MAX_DIFFICULTY, levelFromXp, xpForDifficulty, xpForLevel } from './progress';

describe('progress', () => {
  it('XP base: 20 + 10·(difficoltà−1), difficoltà massima 10', () => {
    expect(xpForDifficulty(1)).toBe(20);
    expect(xpForDifficulty(5)).toBe(60);
    expect(xpForDifficulty(MAX_DIFFICULTY)).toBe(110);
  });

  it('livello = 1 + floor(sqrt(xp/50))', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(-10)).toBe(1);
  });

  it('xpForLevel è l\'inverso di levelFromXp', () => {
    for (let l = 1; l <= 12; l++) {
      expect(xpForLevel(l)).toBe(50 * (l - 1) ** 2);
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      if (l > 1) expect(levelFromXp(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });
});
