import { TestBed } from '@angular/core/testing';
import { GameStateService } from './core/services/game-state.service';
import { TelemetryService } from './core/services/telemetry.service';
import { CounterStore, EVENTS_KEY, MISSION_ID, handleEvent, summarize } from './core/utils/event-counter';

const fakeStore = (initial?: string): CounterStore & { data: Map<string, string> } => {
  const data = new Map<string, string>(initial === undefined ? [] : [[EVENTS_KEY, initial]]);
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v) };
};

describe('statistiche anonime: il contatore', () => {
  it('POST aumenta il contatore della missione e del tipo; GET restituisce i totali', async () => {
    const store = fakeStore();
    expect((await handleEvent('POST', { type: 'attempt', mission: 'adventure-core-nuvole-01' }, store)).status).toBe(204);
    await handleEvent('POST', { type: 'attempt', mission: 'adventure-core-nuvole-01' }, store);
    await handleEvent('POST', { type: 'completed', mission: 'adventure-core-nuvole-01' }, store);
    expect((await handleEvent('GET', undefined, store)).body).toEqual({ 'adventure-core-nuvole-01': { attempt: 2, completed: 1, abandoned: 0 } });
  });

  it('salva solo contatori: il corpo, anche con campi in più (ip, id utente…), non finisce nell\'archivio', async () => {
    const store = fakeStore();
    await handleEvent('POST', { type: 'abandoned', mission: 'abc-01', ip: '1.2.3.4', userId: 'mario', extra: { a: 1 } }, store);
    expect([...store.data.keys()]).toEqual([EVENTS_KEY]);
    expect(store.data.get(EVENTS_KEY)).toBe('{"abc-01":{"attempt":0,"completed":0,"abandoned":1}}');
    expect(store.data.get(EVENTS_KEY)).not.toMatch(/1\.2\.3\.4|mario/);
  });

  it('rifiuta eventi sconosciuti, id di missione non validi, metodi diversi e corpi non oggetto', async () => {
    const store = fakeStore();
    for (const bad of [{ type: 'altro', mission: 'abc-01' }, { type: 'attempt', mission: 'Maiuscola' }, { type: 'attempt', mission: 'a b' }, { type: 'attempt' }, { mission: 'abc-01' }, null, 'testo', 5]) {
      expect((await handleEvent('POST', bad, store)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await handleEvent('DELETE', undefined, store)).status).toBe(405);
    expect(store.data.size).toBe(0);
    expect(MISSION_ID.test('adventure-core-nuvole-01')).toBe(true);
  });

  it('un archivio rovinato riparte da zero; se non risponde: 503', async () => {
    expect((await handleEvent('POST', { type: 'attempt', mission: 'abc-01' }, fakeStore('boh'))).status).toBe(204);
    const broken: CounterStore = { get: async () => { throw new Error('giù'); }, set: async () => undefined };
    expect((await handleEvent('POST', { type: 'attempt', mission: 'abc-01' }, broken)).status).toBe(503);
  });

  it('riepilogo: tentativi per completamento e quota di abbandono', () => {
    expect(summarize({ a: { attempt: 9, completed: 3, abandoned: 1 }, b: { attempt: 2, completed: 0, abandoned: 0 } })).toEqual([
      { mission: 'a', attemptsPerCompletion: 3, abandonRate: 0.25 },
      { mission: 'b', attemptsPerCompletion: null, abandonRate: null },
    ]);
  });
});

describe('TelemetryService: opt-in', () => {
  const calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    calls.length = 0;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return { ok: true }; });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('di default non invia nulla; nemmeno con il consenso al salvataggio, se non si attivano le statistiche', () => {
    const t = TestBed.inject(TelemetryService);
    t.record('attempt', 'abc-01');
    TestBed.inject(GameStateService).acceptSaving();
    t.record('attempt', 'abc-01');
    expect(calls).toEqual([]);
    expect(t.enabled).toBe(false);
  });

  it('senza consenso al salvataggio le statistiche non si possono attivare', () => {
    const g = TestBed.inject(GameStateService);
    g.setTelemetry(true);
    expect(g.state().telemetry).toBe(false);
    g.declineSaving();
    g.setTelemetry(true);
    expect(g.state().telemetry).toBe(false);
  });

  it('attivate, invia solo {type, mission}, senza cookie, referrer né altri dati', () => {
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    g.setTelemetry(true);
    TestBed.inject(TelemetryService).record('completed', 'adventure-core-nuvole-01');
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('/api/eventi');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ type: 'completed', mission: 'adventure-core-nuvole-01' });
    expect(calls[0].init.credentials).toBe('omit');
    expect(calls[0].init.referrerPolicy).toBe('no-referrer');
  });

  it('se si revoca il consenso o si cancellano i dati, smette di inviare; un errore di rete non disturba', async () => {
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    g.setTelemetry(true);
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    expect(() => TestBed.inject(TelemetryService).record('attempt', 'abc-01')).not.toThrow();
    g.clearStoredData();
    vi.stubGlobal('fetch', async (u: string, i: RequestInit) => { calls.push({ url: u, init: i }); return { ok: true }; });
    TestBed.inject(TelemetryService).record('attempt', 'abc-01');
    expect(calls).toEqual([]);
  });
});
