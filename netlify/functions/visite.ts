import { getStore } from '@netlify/blobs';
import { handleVisit } from '../../src/app/core/utils/visit-counter';

/** Contatore di visite anonimo: un solo numero. Non si legge né si salva nulla della richiesta (nessun IP, nessun cookie, nessun corpo, nessuna intestazione). */
export default async (req: Request): Promise<Response> => {
  const { status, body } = await handleVisit(req.method, getStore('visite'));
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/visite' };
