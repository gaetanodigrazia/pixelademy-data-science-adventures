import { getStore } from '@netlify/blobs';
import { handleEvent } from '../../src/app/core/utils/event-counter';

/**
 * Statistiche anonime e aggregate (solo con il consenso dell'utente): un contatore per missione e tipo di evento.
 * Non si legge né si salva nulla della richiesta oltre a `type` e `mission` (nessun IP, cookie, identificativo).
 */
export default async (req: Request): Promise<Response> => {
  let body: unknown;
  if (req.method === 'POST') body = await req.json().catch(() => undefined);
  const { status, body: out } = await handleEvent(req.method, body, getStore('eventi'));
  return new Response(out === undefined ? null : JSON.stringify(out), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/eventi' };
