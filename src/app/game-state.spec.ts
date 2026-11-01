import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { MissionService } from './core/services/mission.service';

describe('GameStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('parte dal primo percorso sbloccato (Le Variabili: gli altri richiedono i percorsi base) con il suo personaggio predefinito', () => {
    const g = TestBed.inject(GameStateService);
    const path = TestBed.inject(ContentRegistryService).paths().find((p) => p.id === 'adventure-core-variabili')!;
    expect(g.state().selectedPathId).toBe(path.id);
    expect(g.state().selectedCharacterId).toBe(path.defaultCharacterId);
  });

  it('selezionando un percorso sbloccato imposta il suo personaggio predefinito', () => {
    const g = TestBed.inject(GameStateService);
    const reg = TestBed.inject(ContentRegistryService);
    for (const m of reg.paths().find((p) => p.id === 'adventure-core-variabili')!.missions) g.completeMission(m, { xp: 0 });
    const path = reg.paths().find((p) => p.id === 'adventure-core-liste')!;
    g.selectPath(path.id);
    expect(g.state().selectedCharacterId).toBe(path.defaultCharacterId);
  });

  it('non salva nulla senza consenso', () => {
    const g = TestBed.inject(GameStateService);
    const m = TestBed.inject(ContentRegistryService).missions()[0];
    g.completeMission(m);
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();
    g.declineSaving();
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();
  });

  it('assegna XP e livello; salva e ripristina con consenso; cancella i dati', () => {
    const reg = TestBed.inject(ContentRegistryService);
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    const path = reg.paths().find((p) => p.id === 'adventure-core-nuvole')!;
    for (const m of path.missions) g.completeMission(m);
    expect(g.xp()).toBe(path.missions.reduce((s, m) => s + m.xp, 0));
    expect(g.level()).toBeGreaterThan(1);
    expect(g.completeMission(path.missions[0]).gainedXp).toBe(0);

    TestBed.resetTestingModule();
    const g2 = TestBed.inject(GameStateService);
    expect(g2.state().completedMissionIds.length).toBe(10);
    expect(g2.consent()).toBe('granted');

    g2.clearStoredData();
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();
    expect(localStorage.getItem('pixelademy.consent.v1')).toBeNull();
    expect(g2.consent()).toBe('unknown');
    // subito, senza ricaricare: lo stato in memoria è tornato all'inizio
    expect(g2.xp()).toBe(0);
    expect(g2.level()).toBe(1);
    expect(g2.state().completedMissionIds).toEqual([]);
    expect(g2.state().solvedCode).toEqual({});
    // e senza consenso non riscrive nulla nello storage
    g2.completeMission(path.missions[0]);
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();
    g2.resetProgress();
    expect(g2.xp()).toBe(0);
  });

  it('sblocca le missioni in sequenza', () => {
    const g = TestBed.inject(GameStateService);
    const ms = TestBed.inject(MissionService);
    const path = TestBed.inject(ContentRegistryService).paths().find((p) => p.id === 'adventure-core-variabili')!;
    expect(ms.status(path.missions[0])).toBe('available');
    expect(ms.status(path.missions[1])).toBe('locked');
    g.completeMission(path.missions[0]);
    expect(ms.status(path.missions[1])).toBe('available');
  });

  it('assegna gli XP calcolati e conserva il codice come pezzo di progetto', () => {
    const g = TestBed.inject(GameStateService);
    const m = TestBed.inject(ContentRegistryService).paths().find((p) => p.id === 'adventure-core-nuvole')!.missions[0];
    const r = g.completeMission(m, { xp: 7, code: 'print(1)' });
    expect(r.gainedXp).toBe(7);
    expect(g.xp()).toBe(7);
    expect(g.state().solvedCode[m.id]).toBe('print(1)');
    expect(g.lastCompletedId()).toBe(m.id);
  });
});
