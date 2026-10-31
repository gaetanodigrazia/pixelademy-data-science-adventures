import { CHARACTERS, ENEMIES } from './content/adventure-core/characters';
import { Sprite } from './core/models/character.model';

const sprites = (): [string, Sprite][] => [...CHARACTERS, ...ENEMIES].map((c) => [c.name, c.sprite]);

describe('personaggi, nemici e sprite', () => {
  it('4 eroi sbloccati dal livello 1 e 4 nemici, con id unici e prefissati dal pack', () => {
    expect(CHARACTERS.map((c) => c.name)).toEqual(['Aura', 'Nilo', 'Cora', 'Teo']);
    expect(ENEMIES.length).toBe(4);
    expect(CHARACTERS.every((c) => c.unlockLevel === 1)).toBe(true);
    const ids = [...CHARACTERS, ...ENEMIES].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('adventure-core-'))).toBe(true);
  });

  it.each(sprites())('lo sprite di %s è rettangolare e usa solo colori della palette', (_n, s) => {
    const width = s.pixels[0].length;
    expect(s.pixels.every((r) => r.length === width)).toBe(true);
    const used = new Set(s.pixels.join('').replace(/\./g, ''));
    for (const ch of used) expect(s.palette[ch], `colore «${ch}»`).toBeDefined();
    expect(used.size).toBeGreaterThan(0);
  });

  it('ogni personaggio ha descrizione, autore e tag', () => {
    for (const c of CHARACTERS) {
      expect(c.description).not.toBe('');
      expect(c.author).toBe('Pixelademy');
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });
});
