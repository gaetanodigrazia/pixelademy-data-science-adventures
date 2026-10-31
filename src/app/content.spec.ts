import { PACKS } from './core/data/packs.generated';
import { MAX_DIFFICULTY } from './core/utils/progress';

const pack = PACKS[0];
const missions = pack.paths.flatMap((p) => p.missions);

describe('adventure-core pack', () => {
  it('ha almeno un percorso, ognuno con difficoltà 1..N crescenti (N = missioni, da 1 a 10)', () => {
    expect(pack.paths.length).toBeGreaterThanOrEqual(1);
    for (const p of pack.paths) {
      expect(p.missions.length).toBeGreaterThanOrEqual(1);
      expect(p.missions.length).toBeLessThanOrEqual(MAX_DIFFICULTY);
      expect(p.missions.map((m) => m.difficulty)).toEqual(Array.from({ length: p.missions.length }, (_, i) => i + 1));
      expect(p.missions.every((m, i) => i === 0 || m.xp > p.missions[i - 1].xp)).toBe(true);
    }
  });

  it('collega ogni missione alla precedente tramite prerequisito', () => {
    for (const p of pack.paths) {
      p.missions.forEach((m, i) => expect(m.prerequisites).toEqual(i === 0 ? [] : [p.missions[i - 1].id]));
    }
  });

  it('ha ID globalmente univoci', () => {
    const ids = [
      ...missions.map((m) => m.id), ...pack.paths.map((p) => p.id), ...pack.characters.map((c) => c.id),
      ...pack.enemies.map((e) => e.id), ...pack.games.map((g) => g.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assegna a ogni percorso un personaggio predefinito valido, sbloccato al livello 1', () => {
    expect(pack.characters.length).toBe(4);
    for (const p of pack.paths) {
      const c = pack.characters.find((x) => x.id === p.defaultCharacterId);
      expect(c, p.id).toBeDefined();
      expect(c!.unlockLevel).toBe(1);
    }
  });

  it('ha sprite valide (righe uguali, colori in palette)', () => {
    for (const s of [...pack.characters.map((c) => c.sprite), ...pack.enemies.map((e) => e.sprite)]) {
      expect(new Set(s.pixels.map((r) => r.length)).size).toBe(1);
      for (const ch of s.pixels.join('')) if (ch !== '.') expect(s.palette[ch], ch).toBeDefined();
    }
  });

  it('registra 11 minigiochi (10 standard + il quiz degli esercizi propri) e li usa tutti', () => {
    expect(pack.games.length).toBe(11);
    expect(new Set(pack.games.map((g) => g.component)).size).toBe(11);
    const used = new Set(missions.map((m) => m.game.type));
    for (const m of missions) expect(pack.games.some((g) => g.id === m.game.type)).toBe(true);
    expect(used.size).toBe(11);
  });

  it('ha una soluzione per ogni missione che non compare in starter code né hint', () => {
    for (const m of missions) {
      const sol = pack.solutions[m.id];
      expect(sol, m.id).toBeTruthy();
      expect(m.starterCode).not.toContain(sol);
      expect(m.hint).not.toContain(sol);
      expect(m.starterCode).not.toBe(sol);
    }
  });

  it('usa nemici esistenti e una validazione non banale', () => {
    for (const m of missions) {
      expect(pack.enemies.some((e) => e.id === m.enemyId)).toBe(true);
      if (m.validation.kind === 'numbers') expect(m.validation.expected.length).toBeGreaterThan(0);
    }
  });

  // «ha percorsi brevi» (>= 2 percorsi da 3 missioni, senza Dashboard) si riattiva con US-11.3, quando esistono Mobilità ed Energia.
});
