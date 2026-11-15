import { levelFromXp } from './progress';

/**
 * Classifica globale facoltativa: la logica del server, pura e testabile (la funzione di Netlify, `netlify/functions/classifica.ts`,
 * la usa così com'è). Principi di privacy:
 * - si salvano solo: numero del giocatore (il nickname è «Giocatore N», assegnato qui), XP, livello, data dell'ultimo aggiornamento,
 *   l'hash del codice segreto e la prova del consenso (data e versione). **Mai** IP, nome, email o altro;
 * - il codice segreto lo genera il server, si restituisce una sola volta e si conserva solo il suo hash;
 * - l'iscrizione richiede il consenso esplicito e la dichiarazione di avere almeno 14 anni;
 * - chi esce viene cancellato; i giocatori inattivi da più di 12 mesi vengono cancellati.
 */

export const BOARD = {
  /** Quanti giocatori mostra la classifica. */
  show: 20,
  /** Quanti ne conserva l'elenco dei migliori (per non perdere chi risale). */
  keep: 50,
  /** Intervallo minimo tra due aggiornamenti dello stesso giocatore (ms). */
  minUpdateMs: 5000,
  /** Dopo quanto tempo senza aggiornamenti un giocatore viene cancellato (giorni). */
  staleDays: 365,
  /** XP massimi plausibili (il totale delle missioni, bonus compreso, sta sotto: lo verifica un test). */
  maxXp: 6000,
  /** Versione del testo del consenso: si registra con il consenso. */
  consentVersion: 1,
} as const;

export const MAX_BODY_BYTES = 1024;
const DAY = 24 * 60 * 60 * 1000;

/** Un giocatore in classifica, come lo vede chiunque: niente altro. */
export interface BoardRow {
  n: number;
  xp: number;
  level: number;
}

/** Ciò che si salva di ogni giocatore. */
export interface BoardEntry {
  /** Hash (SHA-256) del codice segreto: il codice vero non si conserva. */
  h: string;
  xp: number;
  level: number;
  /** Ultimo aggiornamento (ms dal 1970): serve al limite di frequenza e alla cancellazione dopo 12 mesi. */
  at: number;
  /** Prova del consenso: quando e con quale versione del testo. */
  consent: { at: string; v: number };
}

/** L'archivio: valori JSON per chiave. `set` con `onlyIfNew` fallisce (false) se la chiave esiste già. */
export interface BoardStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, opts?: { onlyIfNew?: boolean }): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export interface BoardDeps {
  store: BoardStore;
  now: () => number;
  /** SHA-256 in esadecimale. */
  sha256: (text: string) => Promise<string>;
  /** Un codice segreto nuovo: 64 caratteri esadecimali casuali. */
  token: () => string;
}

export interface BoardRequest {
  method: string;
  /** Il corpo già letto (testo): serve a controllarne la dimensione prima di interpretarlo. */
  rawBody?: string;
}

export interface BoardResponse {
  status: number;
  body: unknown;
}

const err = (status: number, error: string): BoardResponse => ({ status, body: { error } });
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const entryKey = (n: number): string => `p/${n}`;

/** Confronto a tempo costante di due stringhe della stessa lunghezza. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function readTop(store: BoardStore): Promise<BoardRow[]> {
  const v = await store.get('top');
  if (!Array.isArray(v)) return [];
  return v.filter((r): r is BoardRow => !!r && isInt(r.n) && isInt(r.xp) && isInt(r.level));
}

/** Rimette il giocatore (o lo toglie, se `row` è nullo) nell'elenco dei migliori, in ordine di XP (a parità, chi è arrivato prima). */
async function updateTop(store: BoardStore, n: number, row: BoardRow | null): Promise<void> {
  const top = (await readTop(store)).filter((r) => r.n !== n);
  if (row) top.push(row);
  top.sort((a, b) => b.xp - a.xp || a.n - b.n);
  await store.set('top', top.slice(0, BOARD.keep));
}

async function readEntry(store: BoardStore, n: number): Promise<BoardEntry | null> {
  const e = (await store.get(entryKey(n))) as Partial<BoardEntry> | null;
  if (!e || typeof e.h !== 'string' || !isInt(e.xp) || !isInt(e.level) || !isInt(e.at)) return null;
  return e as BoardEntry;
}

/** Cancella i giocatori che non si aggiornano da più di `staleDays` giorni. Al massimo una volta al giorno. */
async function purgeStale(deps: BoardDeps): Promise<void> {
  const { store, now } = deps;
  const meta = (await store.get('meta')) as { purgedAt?: number } | null;
  if (meta && isInt(meta.purgedAt) && now() - meta.purgedAt < DAY) return;
  await store.set('meta', { purgedAt: now() });
  for (const key of await store.list('p/')) {
    const n = Number(key.slice(2));
    const e = await readEntry(store, n);
    if (!e || now() - e.at > BOARD.staleDays * DAY) {
      await store.delete(key);
      if (Number.isInteger(n)) await updateTop(store, n, null);
    }
  }
}

/** Controlla XP e livello inviati: interi, entro il massimo e coerenti tra loro. */
function validScore(xp: unknown, level: unknown): xp is number {
  return isInt(xp) && isInt(level) && xp >= 0 && xp <= BOARD.maxXp && level === levelFromXp(xp);
}

async function authenticate(deps: BoardDeps, body: Record<string, unknown>): Promise<{ n: number; entry: BoardEntry } | BoardResponse> {
  const { n, token } = body;
  if (!isInt(n) || n < 1 || !isToken(token)) return err(400, 'Richiesta non valida');
  const entry = await readEntry(deps.store, n);
  if (!entry) return err(404, 'Giocatore non trovato');
  if (!same(entry.h, await deps.sha256(token))) return err(403, 'Codice non valido');
  return { n, entry };
}

export async function handleBoard(req: BoardRequest, deps: BoardDeps): Promise<BoardResponse> {
  const { store, now } = deps;
  try {
    if (req.method === 'GET') {
      await purgeStale(deps);
      return { status: 200, body: { top: (await readTop(store)).slice(0, BOARD.show) } };
    }
    if (req.method !== 'POST') return err(405, 'Metodo non consentito');
    const raw = req.rawBody ?? '';
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return err(413, 'Richiesta troppo grande');
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return err(400, 'Richiesta non valida');
      body = parsed as Record<string, unknown>;
    } catch {
      return err(400, 'Richiesta non valida');
    }

    if (body['action'] === 'join') {
      // consenso esplicito e dichiarazione di avere almeno 14 anni: senza, non si registra nulla
      if (body['consent'] !== true || body['adult'] !== true) return err(400, 'Servono il consenso e la dichiarazione di avere almeno 14 anni');
      if (!validScore(body['xp'], body['level'])) return err(400, 'Punteggio non valido');
      const token = deps.token();
      const entry: BoardEntry = {
        h: await deps.sha256(token),
        xp: body['xp'] as number,
        level: body['level'] as number,
        at: now(),
        consent: { at: new Date(now()).toISOString(), v: BOARD.consentVersion },
      };
      // il numero è il primo libero a partire dal contatore: `onlyIfNew` evita due giocatori con lo stesso numero
      const next = Math.max(1, Math.floor(Number(await store.get('next')) || 1));
      for (let n = next; n < next + 20; n++) {
        if (await store.set(entryKey(n), entry, { onlyIfNew: true })) {
          await store.set('next', n + 1);
          await updateTop(store, n, { n, xp: entry.xp, level: entry.level });
          return { status: 200, body: { n, token, xp: entry.xp, level: entry.level } };
        }
      }
      return err(503, 'Servizio occupato: riprova');
    }

    const auth = await authenticate(deps, body);
    if ('status' in auth) return auth;
    const { n, entry } = auth;

    if (body['action'] === 'update') {
      if (!validScore(body['xp'], body['level'])) return err(400, 'Punteggio non valido');
      if (now() - entry.at < BOARD.minUpdateMs) return err(429, 'Troppo presto: riprova tra poco');
      const next: BoardEntry = { ...entry, xp: body['xp'] as number, level: body['level'] as number, at: now() };
      await store.set(entryKey(n), next);
      await updateTop(store, n, { n, xp: next.xp, level: next.level });
      return { status: 200, body: { n, xp: next.xp, level: next.level } };
    }
    if (body['action'] === 'leave') {
      await store.delete(entryKey(n));
      await updateTop(store, n, null);
      return { status: 200, body: { ok: true } };
    }
    return err(400, 'Azione non valida');
  } catch {
    return err(503, 'Classifica non disponibile');
  }
}
