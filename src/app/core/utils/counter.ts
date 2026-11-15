/** Dove si conserva un contatore. Un solo numero per chiave: nessun identificativo, nessun IP, nessuna data. */
export interface CounterStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

export interface CounterResponse {
  status: number;
  body: { count: number } | { error: string };
}

/**
 * GET legge il totale, POST lo aumenta di 1: tutto qui. Le funzioni di Netlify («Mi piace» e visite) la usano così com'è:
 * non leggono né salvano nulla della richiesta.
 */
export async function handleCounter(method: string, store: CounterStore, key: string): Promise<CounterResponse> {
  if (method !== 'GET' && method !== 'POST') return { status: 405, body: { error: 'Metodo non consentito' } };
  try {
    const current = Math.max(0, Math.floor(Number(await store.get(key)) || 0));
    if (method === 'GET') return { status: 200, body: { count: current } };
    const count = current + 1;
    await store.set(key, String(count));
    return { status: 200, body: { count } };
  } catch {
    return { status: 503, body: { error: 'Contatore non disponibile' } };
  }
}
