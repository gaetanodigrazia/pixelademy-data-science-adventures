import { getStore } from '@netlify/blobs';
import { BoardStore, handleBoard, MAX_BODY_BYTES } from '../../src/app/core/utils/board-server';

/**
 * Classifica globale facoltativa. Si legge e si salva solo ciò che dice `board-server.ts`: numero del giocatore, XP, livello, data
 * dell'ultimo aggiornamento, hash del codice segreto e prova del consenso. Non si legge né si salva l'IP, né intestazioni, né altro.
 */
const blobs = getStore('classifica');
const store: BoardStore = {
  get: (key) => blobs.get(key, { type: 'json' }) as Promise<unknown | null>,
  async set(key, value, opts) {
    const r = await blobs.setJSON(key, value as Record<string, unknown>, opts?.onlyIfNew ? { onlyIfNew: true } : undefined);
    return opts?.onlyIfNew ? (r as { modified: boolean }).modified : true;
  },
  async delete(key) { await blobs.delete(key); },
  async list(prefix) { return (await blobs.list({ prefix })).blobs.map((b) => b.key); },
};

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export default async (req: Request): Promise<Response> => {
  const declared = Number(req.headers.get('content-length') ?? 0);
  const rawBody = req.method === 'POST' && declared <= MAX_BODY_BYTES * 2 ? await req.text() : undefined;
  const { status, body } = await handleBoard(
    { method: req.method, rawBody: req.method === 'POST' ? (rawBody ?? 'x'.repeat(MAX_BODY_BYTES + 1)) : undefined },
    {
      store,
      now: () => Date.now(),
      sha256: async (t) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))),
      token: () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer),
    },
  );
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/classifica' };
