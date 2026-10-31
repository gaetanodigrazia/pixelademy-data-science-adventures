import { getStore } from '@netlify/blobs';
import { handleLike } from '../../src/app/core/utils/like-counter';

/** «Mi piace» anonimo: un contatore. Non si legge né si salva nulla della richiesta (nessun IP, nessun cookie, nessun corpo). */
export default async (req: Request): Promise<Response> => {
  const { status, body } = await handleLike(req.method, getStore('mi-piace'));
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/mi-piace' };
