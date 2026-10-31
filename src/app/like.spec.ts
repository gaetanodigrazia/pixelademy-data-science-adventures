import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { GameStateService } from './core/services/game-state.service';
import { LikeService } from './core/services/like.service';
import { CounterStore, handleLike, LIKE_KEY } from './core/utils/like-counter';

const fakeStore = (initial?: string): CounterStore & { data: Map<string, string> } => {
  const data = new Map<string, string>(initial === undefined ? [] : [[LIKE_KEY, initial]]);
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v) };
};

describe('«Mi piace» anonimo: il contatore', () => {
  it('GET legge il totale (0 se non c\'è ancora), POST lo aumenta di 1', async () => {
    const store = fakeStore();
    expect(await handleLike('GET', store)).toEqual({ status: 200, body: { count: 0 } });
    expect(await handleLike('POST', store)).toEqual({ status: 200, body: { count: 1 } });
    expect(await handleLike('POST', store)).toEqual({ status: 200, body: { count: 2 } });
    expect(await handleLike('GET', store)).toEqual({ status: 200, body: { count: 2 } });
  });

  it('salva solo un numero: nessun altro dato', async () => {
    const store = fakeStore('41');
    await handleLike('POST', store);
    expect([...store.data.entries()]).toEqual([[LIKE_KEY, '42']]);
  });

  it('un valore salvato non valido riparte da 0; gli altri metodi sono rifiutati', async () => {
    expect((await handleLike('POST', fakeStore('boh'))).body).toEqual({ count: 1 });
    expect((await handleLike('DELETE', fakeStore('5'))).status).toBe(405);
  });

  it('se l\'archivio non risponde: 503, senza eccezioni', async () => {
    const broken: CounterStore = { get: async () => { throw new Error('giù'); }, set: async () => undefined };
    expect((await handleLike('GET', broken)).status).toBe(503);
  });
});

describe('«Mi piace»: servizio e stato del giocatore', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('legge il totale e lo aggiorna con il like, senza inviare dati', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    let total = 7;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (init.method === 'POST') total++;
      return { ok: true, json: async () => ({ count: total }) };
    });
    const s = TestBed.inject(LikeService);
    await s.load();
    expect(s.count()).toBe(7);
    expect(await s.like()).toBe(true);
    expect(s.count()).toBe(8);
    for (const c of calls) {
      expect(c.url).toBe('/api/mi-piace');
      expect(c.init.body).toBeUndefined();
      expect(c.init.credentials).toBe('omit');
    }
  });

  it('se il servizio non risponde non succede nulla: nessun errore, nessun like registrato', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const s = TestBed.inject(LikeService);
    await s.load();
    expect(s.count()).toBeNull();
    expect(await s.like()).toBe(false);
    vi.stubGlobal('fetch', async () => ({ ok: false, json: async () => ({}) }));
    expect(await s.like()).toBe(false);
  });

  it('il «già votato» sta nello stato del giocatore: si salva col consenso e si cancella con i dati', () => {
    localStorage.clear();
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    expect(g.liked()).toBe(false);
    g.markLiked();
    expect(g.liked()).toBe(true);
    expect(JSON.parse(localStorage.getItem('pixelademy.player.v1')!).liked).toBe(true);
    g.clearStoredData();
    expect(g.liked()).toBe(false);
  });
});

describe('«Mi piace» dalla home', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('il pulsante registra il like una volta sola e diventa «Grazie!»', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    const post = vi.fn();
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      if (init.method === 'POST') post();
      return { ok: true, json: async () => ({ count: 1 }) };
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const btn = el.querySelector('button.like') as HTMLButtonElement;
    expect(btn.textContent).toContain('Mi piace');
    expect(btn.getAttribute('aria-label')).toContain('anonimo');
    btn.click();
    await new Promise((r) => setTimeout(r));
    f.detectChanges();
    expect(post).toHaveBeenCalledTimes(1);
    expect((el.querySelector('button.like') as HTMLButtonElement).textContent).toContain('Grazie');
    expect((el.querySelector('button.like') as HTMLButtonElement).disabled).toBe(true);
    expect(TestBed.inject(GameStateService).liked()).toBe(true);
  });
});
