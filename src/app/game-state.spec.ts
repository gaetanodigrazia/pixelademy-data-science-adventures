import { TestBed } from '@angular/core/testing';
import { GameStateService } from './core/services/game-state.service';
import { useMiniPack } from './testing/mini-pack';

const KEY = 'pixelademy.player.v1';

describe('GameStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('parte dal primo percorso con il suo personaggio predefinito', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    const path = reg.paths()[0];
    expect(g.state().selectedPathId).toBe(path.id);
    expect(g.state().selectedCharacterId).toBe(path.defaultCharacterId);
  });

  it('selezionando un percorso imposta il suo personaggio predefinito', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    const path = reg.paths()[0];
    g.selectPath(path.id);
    expect(g.state().selectedCharacterId).toBe(path.defaultCharacterId);
  });

  it('non salva nulla senza consenso', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    g.completeMission(reg.missions()[0]);
    expect(localStorage.getItem(KEY)).toBeNull();
    g.declineSaving();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('assegna XP e livello; salva e ripristina con consenso; cancella i dati', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    const path = reg.paths()[0];
    for (const m of path.missions) g.completeMission(m);
    expect(g.xp()).toBe(path.missions.reduce((s, m) => s + m.xp, 0));
    expect(g.level()).toBeGreaterThan(1);
    expect(g.completeMission(path.missions[0]).gainedXp).toBe(0);

    TestBed.resetTestingModule();
    useMiniPack();
    const g2 = TestBed.inject(GameStateService);
    expect(g2.state().completedMissionIds.length).toBe(10);
    expect(g2.consent()).toBe('granted');

    g2.clearStoredData();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem('pixelademy.consent.v1')).toBeNull();
    expect(g2.consent()).toBe('unknown');
    // subito, senza ricaricare: lo stato in memoria è tornato all'inizio
    expect(g2.xp()).toBe(0);
    expect(g2.level()).toBe(1);
    expect(g2.state().completedMissionIds).toEqual([]);
    expect(g2.state().solvedCode).toEqual({});
    // e senza consenso non riscrive nulla nello storage
    g2.completeMission(path.missions[0]);
    expect(localStorage.getItem(KEY)).toBeNull();
    g2.resetProgress();
    expect(g2.xp()).toBe(0);
  });

  it('assegna gli XP calcolati, conserva il codice come pezzo di progetto e segnala il nuovo livello', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    const [m1, m2] = reg.missions();
    const r = g.completeMission(m1, { xp: 7, code: 'print(1)' });
    expect(r).toEqual({ gainedXp: 7, newLevel: null });
    expect(g.xp()).toBe(7);
    expect(g.state().solvedCode[m1.id]).toBe('print(1)');
    expect(g.lastCompletedId()).toBe(m1.id);
    expect(g.completeMission(m2, { xp: 50 }).newLevel).toBe(2);
  });

  it('gli eroi si sbloccano per livello', () => {
    const reg = useMiniPack();
    const g = TestBed.inject(GameStateService);
    expect(g.isCharacterUnlocked('mini-elite')).toBe(false);
    g.selectCharacter('mini-elite');
    expect(g.state().selectedCharacterId).toBe('mini-hero');
    g.completeMission(reg.missions()[0], { xp: 200 });
    expect(g.level()).toBe(3);
    g.selectCharacter('mini-elite');
    expect(g.state().selectedCharacterId).toBe('mini-elite');
  });

  it('ripara uno stato salvato che riferisce contenuti inesistenti', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem(KEY, JSON.stringify({ xp: 60, completedMissionIds: ['mini-path-01', 'fantasma'], selectedPathId: 'boh', selectedCharacterId: 'boh', solvedCode: { fantasma: 'x', 'mini-path-01': 'print(2)' } }));
    useMiniPack();
    const g = TestBed.inject(GameStateService);
    expect(g.state().completedMissionIds).toEqual(['mini-path-01']);
    expect(g.state().solvedCode).toEqual({ 'mini-path-01': 'print(2)' });
    expect(g.state().selectedPathId).toBe('mini-path');
    expect(g.level()).toBe(2);
  });
});
