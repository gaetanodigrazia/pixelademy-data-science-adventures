import { TestBed } from '@angular/core/testing';
import { BoardService } from './core/services/board.service';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { BOARD } from './core/utils/board-server';
import { SCORING } from './core/utils/scoring-config';

const TOKEN = 'ab'.repeat(32);

describe('classifica globale: il tetto di XP del server', () => {
  it('il totale di tutte le missioni (bonus compreso) sta ben sotto il massimo accettato dal server', () => {
    TestBed.resetTestingModule();
    const total = TestBed.inject(ContentRegistryService).missions().reduce((s, m) => s + m.xp, 0);
    expect(Math.ceil(total * (1 + SCORING.bonusMax))).toBeLessThanOrEqual(BOARD.maxXp * 0.75);
  });
});

describe('classifica globale: il servizio e lo stato', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
  const make = () => {
    TestBed.resetTestingModule();
    return { game: TestBed.inject(GameStateService), board: TestBed.inject(BoardService) };
  };
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('senza consenso al salvataggio non si iscrive e non contatta il server', async () => {
    const { board, game } = make();
    expect(await board.join()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    game.setBoard({ n: 1, token: TOKEN });
    expect(game.board()).toBeNull();
  });

  it('l\'iscrizione invia solo azione, consenso, 14 anni, XP e livello (senza cookie né referrer) e conserva numero e codice', async () => {
    const { board, game } = make();
    game.acceptSaving();
    fetchMock.mockResolvedValueOnce(reply(200, { n: 7, token: TOKEN, xp: 0, level: 1 })).mockResolvedValue(reply(200, { top: [{ n: 7, xp: 0, level: 1 }] }));
    expect(await board.join()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/classifica');
    expect(init.credentials).toBe('omit');
    expect(init.referrerPolicy).toBe('no-referrer');
    expect(JSON.parse(init.body)).toEqual({ action: 'join', consent: true, adult: true, xp: 0, level: 1 });
    expect(game.board()).toEqual({ n: 7, token: TOKEN });
    expect(JSON.parse(localStorage.getItem('pixelademy.player.v1')!).board).toEqual({ n: 7, token: TOKEN });
    expect(board.top()).toEqual([{ n: 7, xp: 0, level: 1 }]);
  });

  it('l\'iscrizione non finisce nei file esportati, né si importa da un file; il reset dei progressi la conserva', () => {
    const { game } = make();
    game.acceptSaving();
    game.setBoard({ n: 3, token: TOKEN });
    const exported = game.exportProgress();
    expect(exported).not.toContain(TOKEN);
    expect(JSON.parse(exported).state.board).toBeUndefined();
    const hostile = JSON.stringify({ app: 'pixelademy', schemaVersion: 6, state: { ...JSON.parse(exported).state, board: { n: 99, token: 'cd'.repeat(32) } } });
    expect(game.importProgress(hostile)).toBe(true);
    expect(game.board()).toEqual({ n: 3, token: TOKEN });
    game.resetProgress();
    expect(game.board()).toEqual({ n: 3, token: TOKEN });
  });

  it('un\'iscrizione rovinata nel salvataggio viene scartata', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    for (const bad of [{ n: 0, token: TOKEN }, { n: 1, token: 'corto' }, { n: 'x', token: TOKEN }, 'boh']) {
      localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 6, xp: 0, board: bad }));
      expect(make().game.board()).toBeNull();
    }
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 6, xp: 0, board: { n: 2, token: TOKEN } }));
    expect(make().game.board()).toEqual({ n: 2, token: TOKEN });
  });

  it('esce: il server cancella, poi si dimentica il codice; se il server non risponde l\'iscrizione resta', async () => {
    const { board, game } = make();
    game.acceptSaving();
    game.setBoard({ n: 5, token: TOKEN });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await board.leave()).toBe(false);
    expect(game.board()).not.toBeNull();
    fetchMock.mockResolvedValueOnce(reply(200, { ok: true })).mockResolvedValue(reply(200, { top: [] }));
    expect(await board.leave()).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ action: 'leave', n: 5, token: TOKEN });
    expect(game.board()).toBeNull();
    expect(JSON.parse(localStorage.getItem('pixelademy.player.v1')!).board).toBeUndefined();
  });

  it('chi non è iscritto esce senza chiamare il server; se il server non lo conosce più (404) vale come cancellato', async () => {
    const { board, game } = make();
    game.acceptSaving();
    expect(await board.leave()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    game.setBoard({ n: 5, token: TOKEN });
    fetchMock.mockResolvedValueOnce(reply(404, { error: 'x' })).mockResolvedValue(reply(200, { top: [] }));
    expect(await board.leave()).toBe(true);
    expect(game.board()).toBeNull();
  });

  it('guadagnare XP aggiorna la classifica dopo una breve attesa, una sola volta', async () => {
    vi.useFakeTimers();
    try {
      const { game } = make();
      game.acceptSaving();
      game.setBoard({ n: 5, token: TOKEN });
      fetchMock.mockResolvedValue(reply(200, { n: 5, xp: 0, level: 1 }));
      TestBed.flushEffects();
      await vi.advanceTimersByTimeAsync(4500);
      const updates = () => fetchMock.mock.calls.filter((c) => c[1]?.body && JSON.parse(c[1].body).action === 'update');
      expect(updates().length).toBe(1);
      await vi.advanceTimersByTimeAsync(20000);
      expect(updates().length).toBe(1); // stessi XP: niente di nuovo
    } finally {
      vi.useRealTimers();
    }
  });
});
