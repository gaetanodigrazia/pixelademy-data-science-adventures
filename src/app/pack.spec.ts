import { PACKS } from './core/data/packs.generated';
import { GAMES, GAME_IDS } from './content/adventure-core/games';
import { PACK_ID } from './content/adventure-core/curriculum';
import pack from './content/adventure-core/pack';

describe('pack «adventure-core»', () => {
  it('è scoperto dallo script dei pack e registrato', () => {
    expect(PACKS.map((p) => p.id)).toContain(PACK_ID);
    expect(PACKS.find((p) => p.id === PACK_ID)).toBe(pack);
  });

  it('espone eroi, nemici e giochi; un minigioco per concetto, con id unici', () => {
    expect(pack.author).toBe('Pixelademy');
    expect(pack.characters.length).toBe(4);
    expect(pack.enemies.length).toBe(4);
    expect(GAME_IDS.slice(0, 10)).toEqual([
      'adventure-index-rack', 'adventure-list-bench', 'adventure-filter-belt', 'adventure-accumulator', 'adventure-mean-calc',
      'adventure-branch-picker', 'adventure-dict-vault', 'adventure-extreme-duel', 'adventure-function-forge', 'adventure-pipeline-line',
    ]);
    expect(new Set(GAME_IDS).size).toBe(GAME_IDS.length);
    for (const g of GAMES) {
      expect(g.title).not.toBe('');
      expect(g.component).toBeDefined();
    }
  });

  it('ogni missione ha una soluzione e un gioco registrato; la soluzione è indicizzata per id missione', () => {
    for (const p of pack.paths) {
      for (const m of p.missions) {
        expect(pack.solutions[m.id], m.id).toBeDefined();
        expect(GAME_IDS).toContain(m.game.type);
        expect(m.id.startsWith(`${p.id}-`)).toBe(true);
        expect(m.prerequisites.length).toBe(m.difficulty === 1 ? 0 : 1);
      }
    }
  });
});
