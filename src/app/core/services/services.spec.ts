import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './content-registry.service';
import { GameStateService } from './game-state.service';
import { MissionService } from './mission.service';
import { MINI_PATH_ID, useMiniPack } from '../../testing/mini-pack';

describe('ContentRegistryService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('aggrega percorsi, missioni e personaggi dei pack e li cerca per id', () => {
    const reg = useMiniPack();
    expect(reg.isEmpty()).toBe(false);
    expect(reg.paths().map((p) => p.id)).toEqual([MINI_PATH_ID]);
    expect(reg.missions().length).toBe(10);
    expect(reg.path(MINI_PATH_ID)?.title).toBe('Percorso di prova');
    expect(reg.character('mini-hero')?.name).toBe('Eroe');
    expect(reg.pathAuthor(MINI_PATH_ID)).toBe('test');
  });

  it('un id inesistente dà undefined, non un\'eccezione', () => {
    const reg = useMiniPack();
    expect(reg.mission('nope')).toBeUndefined();
    expect(reg.path('nope')).toBeUndefined();
    expect(reg.enemy(undefined)).toBeUndefined();
    expect(reg.solution('nope')).toBeUndefined();
  });
});

describe('MissionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('sblocca le missioni in sequenza', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    const ms = TestBed.inject(MissionService);
    const path = reg.paths()[0];
    expect(ms.status(path.missions[0])).toBe('available');
    expect(ms.status(path.missions[1])).toBe('locked');
    g.completeMission(path.missions[0]);
    expect(ms.status(path.missions[0])).toBe('completed');
    expect(ms.status(path.missions[1])).toBe('available');
    expect(ms.completedCount(path)).toBe(1);
  });

  it('trova la missione, la successiva e valida l\'output', () => {
    const reg = useMiniPack();
    const ms = TestBed.inject(MissionService);
    const [m1, m2] = reg.paths()[0].missions;
    expect(ms.find(m1.id)).toBe(m1);
    expect(ms.next(m1)).toBe(m2);
    expect(ms.next(reg.paths()[0].missions[9])).toBeUndefined();
    expect(ms.validate(m1, 'ok').ok).toBe(true);
    expect(ms.validate(m1, 'ko').ok).toBe(false);
  });
});
