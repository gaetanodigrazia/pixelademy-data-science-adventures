/** Statistiche anonime e aggregate: contatori per missione, nessun dato dell'utente. */
export const EVENTS_KEY = 'eventi';
export const EVENT_TYPES = ['attempt', 'completed', 'abandoned'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** I contatori di una missione. */
export type MissionCounters = Record<EventType, number>;
export type EventTotals = Record<string, MissionCounters>;

export interface CounterStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Un id di missione valido (come `adventure-core-nuvole-01`): solo minuscole, cifre e trattini. */
export const MISSION_ID = /^[a-z0-9][a-z0-9-]{2,63}$/;

const empty = (): MissionCounters => ({ attempt: 0, completed: 0, abandoned: 0 });

/**
 * Registra un evento (POST) o legge i totali (GET). Dell'evento si usano solo `type` (tra tre valori noti) e `mission`
 * (un id valido): tutto il resto del corpo, delle intestazioni e dell'indirizzo è ignorato e non viene salvato.
 */
export async function handleEvent(method: string, body: unknown, store: CounterStore): Promise<{ status: number; body?: unknown }> {
  try {
    const totals = await read(store);
    if (method === 'GET') return { status: 200, body: totals };
    if (method !== 'POST') return { status: 405 };
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const type = EVENT_TYPES.find((t) => t === b['type']);
    const mission = typeof b['mission'] === 'string' && MISSION_ID.test(b['mission']) ? b['mission'] : null;
    if (!type || !mission) return { status: 400 };
    const c = (totals[mission] ??= empty());
    c[type] += 1;
    await store.set(EVENTS_KEY, JSON.stringify(totals));
    return { status: 204 };
  } catch {
    return { status: 503 };
  }
}

async function read(store: CounterStore): Promise<EventTotals> {
  const text = await store.get(EVENTS_KEY); // se l'archivio non risponde l'errore sale (503); un contenuto rovinato invece riparte da zero
  try {
    const raw = JSON.parse(text ?? '{}') as unknown;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as EventTotals) : {};
  } catch {
    return {};
  }
}

/** Dai contatori: tentativi medi per completamento e quota di abbandono, per missione. */
export function summarize(totals: EventTotals): { mission: string; attemptsPerCompletion: number | null; abandonRate: number | null }[] {
  return Object.entries(totals).map(([mission, c]) => ({
    mission,
    attemptsPerCompletion: c.completed ? Math.round((c.attempt / c.completed) * 100) / 100 : null,
    abandonRate: c.completed + c.abandoned ? Math.round((c.abandoned / (c.completed + c.abandoned)) * 100) / 100 : null,
  }));
}
