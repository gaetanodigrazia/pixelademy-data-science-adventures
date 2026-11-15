import { describe, expect, it } from 'vitest';
import { BOARD, BoardDeps, BoardStore, handleBoard, MAX_BODY_BYTES } from './board-server';
import { levelFromXp } from './progress';

function memStore(): BoardStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (k) => (data.has(k) ? structuredClone(data.get(k)) : null),
    set: async (k, v, o) => {
      if (o?.onlyIfNew && data.has(k)) return false;
      data.set(k, structuredClone(v));
      return true;
    },
    delete: async (k) => void data.delete(k),
    list: async (p) => [...data.keys()].filter((k) => k.startsWith(p)),
  };
}

function setup() {
  const store = memStore();
  let t = 1_700_000_000_000;
  let c = 0;
  const deps: BoardDeps = {
    store,
    now: () => t,
    sha256: async (s) => `H${[...s].reverse().join("")}`.replace(/a/g, "z"),
    token: () => (++c).toString(16).padStart(64, 'a'),
  };
  const post = (body: unknown) => handleBoard({ method: 'POST', rawBody: JSON.stringify(body) }, deps);
  const join = (xp = 100) => post({ action: 'join', consent: true, adult: true, xp, level: levelFromXp(xp) });
  return { store, deps, post, join, advance: (ms: number) => (t += ms) };
}

describe('classifica globale (server)', () => {
  it('iscrive solo con consenso e dichiarazione di 14 anni', async () => {
    const { post, store } = setup();
    expect((await post({ action: 'join', consent: true, xp: 0, level: 1 })).status).toBe(400);
    expect((await post({ action: 'join', adult: true, xp: 0, level: 1 })).status).toBe(400);
    expect((await post({ action: 'join', consent: 'true', adult: true, xp: 0, level: 1 })).status).toBe(400);
    expect(store.data.size).toBe(0);
  });

  it('assegna «Giocatore N» progressivi e restituisce il codice una sola volta', async () => {
    const { join } = setup();
    const a = (await join()).body as { n: number; token: string };
    const b = (await join()).body as { n: number; token: string };
    expect([a.n, b.n]).toEqual([1, 2]);
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token).not.toBe(b.token);
  });

  it('non riusa un numero già occupato', async () => {
    const { join, store } = setup();
    store.data.set('p/1', { h: 'x', xp: 1, level: 1, at: 1, consent: { at: '', v: 1 } });
    const r = (await join()).body as { n: number };
    expect(r.n).toBe(2);
  });

  it('conserva solo l’hash del codice e la prova del consenso: mai il codice', async () => {
    const { join, store } = setup();
    const { token } = (await join(250)).body as { token: string };
    const saved = store.data.get('p/1') as Record<string, unknown>;
    expect(Object.keys(saved).sort()).toEqual(['at', 'consent', 'h', 'level', 'xp']);
    expect(saved["h"]).toBe(`H${[...token].reverse().join("")}`.replace(/a/g, "z"));
    expect(JSON.stringify([...store.data.values()])).not.toContain(token);
    expect((saved['consent'] as { v: number }).v).toBe(BOARD.consentVersion);
  });

  it('la classifica mostra solo numero, XP e livello, in ordine, al massimo 20', async () => {
    const { join, deps } = setup();
    for (let i = 0; i < 25; i++) await join(i * 10);
    const r = await handleBoard({ method: 'GET' }, deps);
    const top = (r.body as { top: Record<string, unknown>[] }).top;
    expect(top.length).toBe(BOARD.show);
    expect(top[0]).toEqual({ n: 25, xp: 240, level: levelFromXp(240) });
    expect(Object.keys(top[0]).sort()).toEqual(['level', 'n', 'xp']);
    for (let i = 1; i < top.length; i++) expect(top[i - 1]['xp'] as number).toBeGreaterThanOrEqual(top[i]['xp'] as number);
  });

  it('rifiuta XP incoerenti, non interi o oltre il massimo', async () => {
    const { post } = setup();
    const j = (xp: unknown, level: unknown) => post({ action: 'join', consent: true, adult: true, xp, level });
    expect((await j(-1, 1)).status).toBe(400);
    expect((await j(1.5, 1)).status).toBe(400);
    expect((await j('9', 1)).status).toBe(400);
    expect((await j(BOARD.maxXp + 1, levelFromXp(BOARD.maxXp + 1))).status).toBe(400);
    expect((await j(100, levelFromXp(100) + 1)).status).toBe(400);
    expect((await j(BOARD.maxXp, levelFromXp(BOARD.maxXp))).status).toBe(200);
  });

  it('aggiorna con il codice giusto, rifiuta quello sbagliato o assente', async () => {
    const { join, post, advance } = setup();
    const { n, token } = (await join(100)).body as { n: number; token: string };
    advance(BOARD.minUpdateMs + 1);
    expect((await post({ action: 'update', n, token: 'b'.repeat(64), xp: 200, level: levelFromXp(200) })).status).toBe(403);
    expect((await post({ action: 'update', n, xp: 200, level: levelFromXp(200) })).status).toBe(400);
    expect((await post({ action: 'update', n: 99, token, xp: 200, level: levelFromXp(200) })).status).toBe(404);
    const ok = await post({ action: 'update', n, token, xp: 200, level: levelFromXp(200) });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ n, xp: 200, level: levelFromXp(200) });
  });

  it('limita la frequenza degli aggiornamenti', async () => {
    const { join, post, advance } = setup();
    const { n, token } = (await join(100)).body as { n: number; token: string };
    const upd = (xp: number) => post({ action: 'update', n, token, xp, level: levelFromXp(xp) });
    expect((await upd(150)).status).toBe(429);
    advance(BOARD.minUpdateMs + 1);
    expect((await upd(150)).status).toBe(200);
    expect((await upd(160)).status).toBe(429);
  });

  it('chi esce viene cancellato dall’archivio e dalla classifica', async () => {
    const { join, post, store, deps } = setup();
    const { n, token } = (await join(100)).body as { n: number; token: string };
    expect((await post({ action: 'leave', n, token: 'c'.repeat(64) })).status).toBe(403);
    expect((await post({ action: 'leave', n, token })).status).toBe(200);
    expect(store.data.has(`p/${n}`)).toBe(false);
    expect(((await handleBoard({ method: 'GET' }, deps)).body as { top: unknown[] }).top).toEqual([]);
  });

  it('cancella chi è inattivo da più di 30 giorni, al massimo una volta al giorno', async () => {
    const { join, store, deps, advance } = setup();
    await join(100);
    advance((BOARD.staleDays - 1) * 86_400_000);
    await handleBoard({ method: 'GET' }, deps);
    expect(store.data.has('p/1')).toBe(true);
    advance(2 * 86_400_000);
    await handleBoard({ method: 'GET' }, deps);
    expect(store.data.has('p/1')).toBe(false);
    expect(((await handleBoard({ method: 'GET' }, deps)).body as { top: unknown[] }).top).toEqual([]);
  });

  it('rifiuta corpi troppo grandi, JSON non valido, azioni sconosciute e metodi non previsti', async () => {
    const { deps, post } = setup();
    expect((await handleBoard({ method: 'POST', rawBody: 'x'.repeat(MAX_BODY_BYTES + 1) }, deps)).status).toBe(413);
    expect((await handleBoard({ method: 'POST', rawBody: '{no' }, deps)).status).toBe(400);
    expect((await handleBoard({ method: 'POST', rawBody: '[]' }, deps)).status).toBe(400);
    expect((await post({ action: 'boh', n: 1, token: 'a'.repeat(64) })).status).toBe(404);
    expect((await handleBoard({ method: 'DELETE' }, deps)).status).toBe(405);
  });

  it('un archivio che fallisce dà 503 senza dettagli', async () => {
    const { deps } = setup();
    const broken = { ...deps, store: { ...deps.store, get: async () => { throw new Error('segreto'); } } };
    const r = await handleBoard({ method: 'GET' }, broken);
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).not.toContain('segreto');
  });
});
