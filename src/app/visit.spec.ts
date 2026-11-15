import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { Info } from './features/info/info';
import { GameStateService } from './core/services/game-state.service';
import { VisitService } from './core/services/visit.service';
import { CounterStore } from './core/utils/counter';
import { handleLike } from './core/utils/like-counter';
import { handleVisit, VISIT_KEY } from './core/utils/visit-counter';

const fakeStore = (initial?: string): CounterStore & { data: Map<string, string> } => {
  const data = new Map<string, string>(initial === undefined ? [] : [[VISIT_KEY, initial]]);
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v) };
};

describe('contatore di visite anonimo: la funzione', () => {
  it('GET legge il totale (0 se non c\'è ancora), POST lo aumenta di 1', async () => {
    const s = fakeStore();
    expect(await handleVisit('GET', s)).toEqual({ status: 200, body: { count: 0 } });
    expect(await handleVisit('POST', s)).toEqual({ status: 200, body: { count: 1 } });
    expect(await handleVisit('POST', s)).toEqual({ status: 200, body: { count: 2 } });
    expect(await handleVisit('GET', s)).toEqual({ status: 200, body: { count: 2 } });
  });

  it('salva solo un numero: nessun altro dato, nessuna data, nessun identificativo', async () => {
    const s = fakeStore('41');
    await handleVisit('POST', s);
    expect([...s.data.entries()]).toEqual([[VISIT_KEY, '42']]);
  });

  it('valore non valido: riparte da 0; altri metodi: 405; archivio guasto: 503 senza eccezioni', async () => {
    expect((await handleVisit('POST', fakeStore('boh'))).body).toEqual({ count: 1 });
    expect((await handleVisit('DELETE', fakeStore('5'))).status).toBe(405);
    const broken: CounterStore = { get: async () => { throw new Error('giù'); }, set: async () => undefined };
    expect((await handleVisit('GET', broken)).status).toBe(503);
  });

  it('i «Mi piace» continuano a funzionare con lo stesso meccanismo (e contatori separati)', async () => {
    const likes = fakeStore();
    const visits = fakeStore();
    await handleLike('POST', likes);
    await handleVisit('POST', visits);
    await handleVisit('POST', visits);
    expect((await handleLike('GET', likes)).body).toEqual({ count: 1 });
    expect((await handleVisit('GET', visits)).body).toEqual({ count: 2 });
  });
});

describe('contatore di visite anonimo: il servizio', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const online = (over: Record<string, unknown> = {}) => {
    vi.stubGlobal('location', { hostname: 'pixelademy.test' });
    vi.stubGlobal('navigator', { doNotTrack: null, webdriver: false, ...over });
  };
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 12430 }) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('invia una sola richiesta vuota e anonima, una volta per apertura', async () => {
    online();
    const v = TestBed.inject(VisitService);
    await v.register();
    await v.register(); // la seconda volta non fa nulla
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/visite');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(init.body).toBeUndefined(); // nessun corpo
    expect(init.headers).toBeUndefined(); // nessuna intestazione aggiunta
    expect(v.count()).toBe(12430);
  });

  it('non salva nulla nel browser: né localStorage né sessionStorage né cookie', async () => {
    online();
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const get = vi.spyOn(Storage.prototype, 'getItem');
    const cookie = vi.spyOn(document, 'cookie', 'set');
    await TestBed.inject(VisitService).register();
    expect(set).not.toHaveBeenCalled();
    // l'unica lettura è quella, già esistente, del consenso al salvataggio: il contatore non legge né scrive nulla di suo
    expect(get.mock.calls.every((c) => c[0] === 'pixelademy.consent.v1')).toBe(true);
    expect(cookie).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
  });

  it('Do Not Track, Global Privacy Control, browser automatici e esecuzione in locale: non conta, legge soltanto', async () => {
    for (const nav of [{ doNotTrack: '1' }, { doNotTrack: 'yes' }, { globalPrivacyControl: true }, { webdriver: true }]) {
      online(nav);
      fetchMock.mockClear();
      TestBed.resetTestingModule();
      await TestBed.inject(VisitService).register();
      expect(fetchMock.mock.calls[0][1].method, JSON.stringify(nav)).toBe('GET');
    }
    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.stubGlobal('navigator', { doNotTrack: null, webdriver: false });
    fetchMock.mockClear();
    TestBed.resetTestingModule();
    await TestBed.inject(VisitService).register();
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('se il servizio non risponde (offline, errore, risposta strana) il sito funziona lo stesso e il totale resta ignoto', async () => {
    online();
    for (const f of [vi.fn().mockRejectedValue(new Error('offline')), vi.fn().mockResolvedValue({ ok: false }), vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 'boh' }) })]) {
      vi.stubGlobal('fetch', f);
      TestBed.resetTestingModule();
      const v = TestBed.inject(VisitService);
      await expect(v.register()).resolves.toBeUndefined();
      expect(v.count()).toBeNull();
    }
  });

  it('load() legge senza contare e non ripete la richiesta se il totale c\'è già', async () => {
    online();
    const v = TestBed.inject(VisitService);
    await v.load();
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    await v.load();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('l\'app registra una visita all\'apertura, non a ogni cambio di pagina', async () => {
    online();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const register = vi.spyOn(VisitService.prototype, 'register').mockResolvedValue();
    const f = TestBed.createComponent(App);
    f.detectChanges();
    expect(register).toHaveBeenCalledTimes(1);
    const router = (await import('@angular/router')).Router;
    await TestBed.inject(router).navigateByUrl('/info');
    await TestBed.inject(router).navigateByUrl('/');
    expect(register).toHaveBeenCalledTimes(1);
    register.mockRestore();
  });
});

describe('pagina «Il progetto»: il totale delle visite', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function open(fetchImpl: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('fetch', fetchImpl);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const f = TestBed.createComponent(Info);
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r)); // la risposta (finta) arriva dopo qualche passaggio asincrono
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('mostra il totale con i separatori italiani e spiega che è anonimo e conta aperture, non persone', async () => {
    const el = await open(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 12430 }) }));
    const text = el.querySelector('.visits')!.textContent!;
    expect(text).toContain('12.430');
    expect(el.querySelector('#visite')!.textContent).toBe('Aperture del sito'); // non «Visite»: non sono persone
    expect(text).not.toMatch(/\bvisit/i);
    expect(text).toContain('aperture di Pixelademy');
    expect(text).toContain('senza cookie');
    expect(text).toContain('Conta aperture, non persone');
    expect(text).toContain('al massimo una volta al giorno');
    expect(text).not.toContain('se ricarichi');
    expect(text).toContain('Do Not Track');
  });

  it('zero visite e servizio non disponibile hanno un messaggio chiaro', async () => {
    expect((await open(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 0 }) }))).querySelector('.visits')!.textContent).toContain('Nessuna apertura registrata');
    expect((await open(vi.fn().mockRejectedValue(new Error('x')))).querySelector('.visits')!.textContent).toContain('non è disponibile');
  });
});

describe('aperture del sito: con il salvataggio dei dati, una volta al giorno', () => {
  const STATE_KEY = 'pixelademy.player.v1';
  const CONSENT_KEY = 'pixelademy.consent.v1';
  let fetchMock: ReturnType<typeof vi.fn>;
  const methods = () => fetchMock.mock.calls.map((c) => c[1].method as string);
  const stored = () => JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as { countedDay?: string } | null;
  /** Una nuova apertura del sito: un servizio nuovo (come dopo un ricaricamento) sullo stesso localStorage. */
  async function open(): Promise<VisitService> {
    TestBed.resetTestingModule();
    const v = TestBed.inject(VisitService);
    await v.register();
    return v;
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
    vi.stubGlobal('location', { hostname: 'pixelademy.test' });
    vi.stubGlobal('navigator', { doNotTrack: null, webdriver: false });
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 100 }) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('con il consenso: la prima apertura conta e salva solo la data; le altre dello stesso giorno leggono soltanto', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    await open();
    expect(methods()).toEqual(['POST']);
    expect(stored()!.countedDay).toBe('2026-11-15'); // solo AAAA-MM-GG: nessun orario, nessun identificativo
    await open();
    await open();
    expect(methods()).toEqual(['POST', 'GET', 'GET']); // ricaricando non si conta più
  });

  it('il giorno dopo conta di nuovo (una volta al giorno)', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    await open();
    vi.setSystemTime(new Date('2026-11-16T08:00:00Z'));
    await open();
    await open();
    expect(methods()).toEqual(['POST', 'POST', 'GET']);
    expect(stored()!.countedDay).toBe('2026-11-16');
  });

  it('senza consenso non si salva nulla e si conta a ogni apertura (come prima)', async () => {
    await open(); await open();
    expect(methods()).toEqual(['POST', 'POST']);
    expect(localStorage.length).toBe(0);
    localStorage.setItem(CONSENT_KEY, 'denied');
    await open(); await open();
    expect(methods()).toEqual(['POST', 'POST', 'POST', 'POST']);
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
  });

  it('se il consenso arriva dopo il conteggio, la data si salva subito (e la riapertura non conta)', async () => {
    const v = await open(); // consenso ancora da dare: conta
    expect(methods()).toEqual(['POST']);
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    TestBed.inject(GameStateService).acceptSaving();
    TestBed.tick(); // gli effetti girano
    expect(v.count()).toBe(100);
    expect(stored()!.countedDay).toBe('2026-11-15');
    await open();
    expect(methods()).toEqual(['POST', 'GET']);
  });

  it('se il conteggio non va a buon fine non si segna nulla: si riprova alla prossima apertura', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await open();
    expect(stored()!.countedDay).toBeUndefined();
    await open();
    expect(methods()).toEqual(['POST', 'POST']);
    expect(stored()!.countedDay).toBe('2026-11-15');
  });

  it('Do Not Track: non conta e non salva nulla, anche con il consenso', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    vi.stubGlobal('navigator', { doNotTrack: '1', webdriver: false });
    await open();
    expect(methods()).toEqual(['GET']);
    expect(stored()!.countedDay).toBeUndefined();
  });

  it('«Cancella i dati» la elimina (e si viene contati di nuovo); «Ricomincia da zero» la conserva', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    await open();
    const g = TestBed.inject(GameStateService);
    g.resetProgress();
    expect(stored()!.countedDay).toBe('2026-11-15'); // ricominciare i progressi non fa ricontare
    g.clearStoredData();
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    await open();
    expect(methods()).toEqual(['POST', 'POST']);
  });

  it('una data salvata non valida o nel futuro viene scartata', async () => {
    for (const bad of ['ieri', '2026-13-45x', '2026-11-16', '2999-01-01', 5, null]) {
      localStorage.setItem(CONSENT_KEY, 'granted');
      localStorage.setItem(STATE_KEY, JSON.stringify({ schemaVersion: 6, xp: 0, level: 1, completedMissionIds: [], solvedCode: {}, liked: false, records: {}, countedDay: bad }));
      TestBed.resetTestingModule();
      expect(TestBed.inject(GameStateService).countedToday(), String(bad)).toBe(false);
    }
    localStorage.setItem(STATE_KEY, JSON.stringify({ schemaVersion: 6, xp: 0, level: 1, completedMissionIds: [], solvedCode: {}, liked: false, records: {}, countedDay: '2026-11-15' }));
    TestBed.resetTestingModule();
    expect(TestBed.inject(GameStateService).countedToday()).toBe(true);
  });

  it('i progressi esportati e reimportati mantengono la data', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    TestBed.resetTestingModule();
    const g = TestBed.inject(GameStateService);
    g.markCounted();
    const file = g.exportProgress();
    g.clearStoredData();
    g.acceptSaving();
    expect(g.importProgress(file)).toBe(true);
    expect(g.countedToday()).toBe(true);
  });
});
