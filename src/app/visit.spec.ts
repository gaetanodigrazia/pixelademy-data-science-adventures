import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { Info } from './features/info/info';
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
    expect(get).not.toHaveBeenCalled();
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
    expect(text).toContain('aperture di Pixelademy');
    expect(text).toContain('senza cookie');
    expect(text).toContain('Conta aperture, non persone');
    expect(text).toContain('Do Not Track');
  });

  it('zero visite e servizio non disponibile hanno un messaggio chiaro', async () => {
    expect((await open(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 0 }) }))).querySelector('.visits')!.textContent).toContain('Nessuna apertura registrata');
    expect((await open(vi.fn().mockRejectedValue(new Error('x')))).querySelector('.visits')!.textContent).toContain('non è disponibile');
  });
});
