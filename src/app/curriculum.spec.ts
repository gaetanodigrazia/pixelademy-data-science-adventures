import { PACK_ID, PATH_SEEDS, PathSeed } from './content/adventure-core/curriculum';

describe('curriculum', () => {
  it('l\'id del pack è quello usato negli id delle missioni', () => {
    expect(PACK_ID).toBe('adventure-core');
  });

  it('ogni percorso ha slug unico, da 1 a 10 missioni e un progetto completo', () => {
    const slugs = new Set<string>();
    for (const p of PATH_SEEDS as PathSeed[]) {
      expect(slugs.has(p.slug), `slug duplicato ${p.slug}`).toBe(false);
      slugs.add(p.slug);
      expect(p.missions.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.missions.length, p.slug).toBeLessThanOrEqual(10);
      expect(Object.keys(p.project.labels).length, p.slug).toBe(10);
    }
  });
});
