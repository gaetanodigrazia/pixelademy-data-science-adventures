import { TestBed } from '@angular/core/testing';
import { PACKS } from './core/data/packs.generated';
import { GameStateService } from './core/services/game-state.service';
import { MissionService } from './core/services/mission.service';
import { completionPercent } from './core/utils/progress';

describe('percentuale di completamento', () => {
  it('per difetto, 0 senza progressi, 100 solo con tutte le missioni', () => {
    expect(completionPercent(0, 10)).toBe(0);
    expect(completionPercent(1, 3)).toBe(33);
    expect(completionPercent(2, 3)).toBe(66);
    expect(completionPercent(3, 3)).toBe(100);
    expect(completionPercent(0, 0)).toBe(0);
  });

  it('con una missione ancora da fare non arriva mai a 100, nemmeno per arrotondamento', () => {
    expect(completionPercent(199, 200)).toBe(99);
    expect(completionPercent(999, 1000)).toBe(99);
    expect(completionPercent(9, 10)).toBe(90);
  });

  it('il servizio la calcola sul percorso: una missione completata su una bloccata non fa 100', () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    const g = TestBed.inject(GameStateService);
    const ms = TestBed.inject(MissionService);
    const p = PACKS[0].paths.find((x) => x.id === 'adventure-core-variabili')!; // 2 missioni
    expect(ms.percent(p)).toBe(0);
    g.completeMission(p.missions[0], { xp: 0 });
    expect(ms.percent(p)).toBe(50);
    expect(ms.status(p.missions[1])).toBe('available');
    g.completeMission(p.missions[1], { xp: 0 });
    expect(ms.percent(p)).toBe(100);
  });
});
