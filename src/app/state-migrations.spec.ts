import { TestBed } from '@angular/core/testing';
import { GameStateService } from './core/services/game-state.service';
import { STATE_VERSION, exportState, migrateState, parseExport } from './core/utils/state-migrations';
import { PACKS } from './core/data/packs.generated';

const path = PACKS[0].paths[0];
const KEY = 'pixelademy.player.v1';

describe('migrazioni dello stato salvato', () => {
  it('uno stato v1 (senza schemaVersion) è portato alla versione corrente senza perdere dati', () => {
    const v1 = { xp: 120, level: 2, completedMissionIds: ['a'], solvedCode: { a: 'x = 1' }, selectedCharacterId: 'c', selectedPathId: 'p' };
    expect(migrateState(v1)).toEqual({ ...v1, liked: false, records: {}, schemaVersion: STATE_VERSION });
  });

  it('uno stato già corrente resta uguale; quello di una versione futura o non valido non si interpreta', () => {
    const cur = { schemaVersion: STATE_VERSION, xp: 5, liked: true, records: {}, solvedCode: {} };
    expect(migrateState(cur)).toEqual(cur);
    expect(migrateState({ schemaVersion: STATE_VERSION + 1, xp: 5 })).toBeNull();
    for (const bad of [null, 'boh', 7, [], undefined]) expect(migrateState(bad)).toBeNull();
  });

  it('esportazione: intestazione riconoscibile; l\'importazione accetta anche file di versioni precedenti', () => {
    const state = { schemaVersion: STATE_VERSION, xp: 9, level: 1, completedMissionIds: [], solvedCode: {}, selectedCharacterId: '', selectedPathId: '', liked: false, records: {} };
    const text = exportState(state);
    expect(JSON.parse(text)).toMatchObject({ app: 'pixelademy', schemaVersion: STATE_VERSION });
    expect(parseExport(text)).toMatchObject({ xp: 9 });
    const old = JSON.stringify({ app: 'pixelademy', schemaVersion: 1, state: { xp: 40, completedMissionIds: [] } });
    expect(parseExport(old)).toMatchObject({ xp: 40, schemaVersion: STATE_VERSION, liked: false, records: {} });
    for (const bad of ['', 'non json', '{"app":"altro","state":{}}', '{"app":"pixelademy"}']) expect(parseExport(bad)).toBeNull();
  });
});

describe('GameStateService: persistenza versionata', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('un salvataggio della versione precedente si carica migrato, poi si risalva con la versione corrente', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem(KEY, JSON.stringify({ xp: 75, completedMissionIds: [path.missions[0].id], selectedPathId: path.id }));
    const g = TestBed.inject(GameStateService);
    expect(g.xp()).toBe(75);
    expect(g.isCompleted(path.missions[0].id)).toBe(true);
    expect(g.state().schemaVersion).toBe(STATE_VERSION);
    g.markLiked();
    expect(JSON.parse(localStorage.getItem(KEY)!).schemaVersion).toBe(STATE_VERSION);
  });

  it('dati corrotti o di una versione futura: si riparte dallo stato iniziale, senza eccezioni', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    for (const bad of ['{non json', '"stringa"', JSON.stringify({ schemaVersion: 99, xp: 5000 })]) {
      TestBed.resetTestingModule();
      localStorage.setItem(KEY, bad);
      const g = TestBed.inject(GameStateService);
      expect(g.xp()).toBe(0);
      expect(g.state().completedMissionIds).toEqual([]);
    }
  });

  it('esporta e reimporta i progressi; un file non valido non cambia nulla', () => {
    const g = TestBed.inject(GameStateService);
    g.completeMission(path.missions[0], { code: 'x = 1' });
    const file = g.exportProgress();
    g.resetProgress();
    expect(g.xp()).toBe(0);
    expect(g.importProgress(file)).toBe(true);
    expect(g.isCompleted(path.missions[0].id)).toBe(true);
    expect(g.state().solvedCode[path.missions[0].id]).toBe('x = 1');
    const xp = g.xp();
    expect(g.importProgress('{"app":"altro"}')).toBe(false);
    expect(g.xp()).toBe(xp);
  });

  it('l\'importazione ripara i riferimenti a contenuti inesistenti', () => {
    const g = TestBed.inject(GameStateService);
    const file = JSON.stringify({ app: 'pixelademy', schemaVersion: STATE_VERSION, state: { xp: 10, completedMissionIds: ['fantasma', path.missions[0].id], solvedCode: {} } });
    expect(g.importProgress(file)).toBe(true);
    expect(g.state().completedMissionIds).toEqual([path.missions[0].id]);
  });
});

describe('migrazione v2 → v3 (statistiche anonime)', () => {
  it('uno stato v2 si porta a v3 con le statistiche spente, senza toccare il resto', () => {
    expect(migrateState({ schemaVersion: 2, xp: 30, liked: true, solvedCode: {} })).toEqual({ schemaVersion: STATE_VERSION, xp: 30, liked: true, solvedCode: {}, records: {} });
  });
});

describe('migrazione v3 → v4 (lingua)', () => {
  it('uno stato v3 si porta a v4 senza lingua scelta; la lingua salvata si conserva', () => {
    expect(migrateState({ schemaVersion: 3, xp: 1, telemetry: true })).toEqual({ schemaVersion: STATE_VERSION, xp: 1, records: {} });
    expect(migrateState({ schemaVersion: 4, locale: 'en' })).toEqual({ schemaVersion: STATE_VERSION, locale: 'en', records: {} });
  });
});

describe('migrazione v5 → v6 (statistiche rimosse)', () => {
  it('il campo telemetry dei salvataggi vecchi (v3, v4, v5) si scarta, il resto resta', () => {
    for (const v of [3, 4, 5]) {
      const migrated = migrateState({ schemaVersion: v, xp: 7, liked: true, telemetry: true, solvedCode: { a: 'x' } })!;
      expect(migrated, `v${v}`).not.toHaveProperty('telemetry');
      expect(migrated).toMatchObject({ schemaVersion: STATE_VERSION, xp: 7, liked: true, solvedCode: { a: 'x' } });
    }
  });
});

describe('GameStateService: salvataggio vecchio', () => {
  it('caricando uno stato v5 con telemetry lo riscrive subito in v6, senza il campo e con i progressi', () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 40, liked: true, telemetry: true, records: {}, completedMissionIds: [] }));
    const g = TestBed.inject(GameStateService);
    expect(g.xp()).toBe(40);
    const stored = JSON.parse(localStorage.getItem('pixelademy.player.v1')!);
    expect(stored).not.toHaveProperty('telemetry');
    expect(stored).toMatchObject({ schemaVersion: STATE_VERSION, xp: 40, liked: true });
  });

  it('senza consenso non si scrive nulla al caricamento', () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.inject(GameStateService);
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();
  });
});
