import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'node:path';
import { parseProfileXp, profileHtml } from '../../src/app/core/utils/profile-page';
import { drawProfileImage, SHARE_H, SHARE_W } from '../../src/app/core/utils/share-image';

const FONT = 'node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff';
let fontReady = false;

/** Il carattere pixel viaggia con la funzione (`included_files` in netlify.toml); se manca si usa quello di ripiego e l'immagine esce lo stesso. */
function loadFont(): void {
  if (fontReady) return;
  fontReady = true;
  for (const base of [process.env['LAMBDA_TASK_ROOT'], process.cwd()]) {
    if (!base) continue;
    try {
      if (GlobalFonts.registerFromPath(join(base, FONT), 'Press Start 2P')) return;
    } catch {
      /* si prova il percorso successivo */
    }
  }
}

/**
 * Profilo condivisibile, senza nulla di personale (solo gli XP, scelti dall'utente nell'indirizzo):
 *   /condividi/profilo/250      → pagina con i meta-tag Open Graph (anteprima del link)
 *   /condividi/profilo/250.png  → la foto del profilo (livello, XP, avanzamento)
 */
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const last = url.pathname.replace(/\/$/, '').split('/').pop() ?? '';
  const wantsImage = last.endsWith('.png');
  const xp = parseProfileXp(wantsImage ? last.slice(0, -4) : last);
  if (xp === null || req.method !== 'GET') return new Response('Non trovato', { status: 404 });

  if (!wantsImage) {
    return new Response(profileHtml(url.origin, xp), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
    });
  }
  loadFont();
  const canvas = createCanvas(SHARE_W, SHARE_H);
  drawProfileImage(canvas.getContext('2d') as unknown as CanvasRenderingContext2D, xp);
  return new Response(new Uint8Array(canvas.toBuffer('image/png')), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400, immutable' },
  });
};

export const config = { path: ['/condividi/profilo/*'] };
