/** Dove si conserva il numero totale di «Mi piace». Un solo numero: nessun identificativo, nessun IP, nessuna data. */
export interface CounterStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

export const LIKE_KEY = 'totale';

export interface LikeResponse {
  status: number;
  body: { count: number } | { error: string };
}

/** GET legge il totale, POST lo aumenta di 1: tutto qui. La funzione di Netlify (`netlify/functions/mi-piace.ts`) la usa così com'è. */
export async function handleLike(method: string, store: CounterStore): Promise<LikeResponse> {
  if (method !== 'GET' && method !== 'POST') return { status: 405, body: { error: 'Metodo non consentito' } };
  try {
    const current = Math.max(0, Math.floor(Number(await store.get(LIKE_KEY)) || 0));
    if (method === 'GET') return { status: 200, body: { count: current } };
    const count = current + 1;
    await store.set(LIKE_KEY, String(count));
    return { status: 200, body: { count } };
  } catch {
    return { status: 503, body: { error: 'Contatore non disponibile' } };
  }
}
