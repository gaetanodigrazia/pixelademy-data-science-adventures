// Genera il logo di Pixelademy (pixel-art, nessun font: le lettere sono bitmap 5×7).
//   public/brand/logo-mark.svg      marchio quadrato (trasparente)
//   public/brand/logo.svg           marchio + logotipo, trasparente (per fondi scuri)
//   public/brand/logo-badge.svg     come logo.svg ma su fondo blu scuro con margine (per fondi chiari, README, social)
//   public/brand/logo-mark-512.png  marchio su fondo blu scuro, 512×512
//   public/brand/logo-badge.png     logo-badge in PNG (1200 px di larghezza)
//   node scripts/generate-logo.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const NAVY = '#0b0b24', YELLOW = '#fbbf24', LIGHT = '#fde68a', AMBER = '#d97706', EDGE = '#92400e', RED = '#b91c1c', BRIGHT_RED = '#dc2626';

/* ── il marchio: un blocco «?» giallo (come i blocchi missione della mappa) con un grafico a barre: gioco + dati ── */
// 12×12 celle: tre barre che salgono (3, 5 e 7 celle). Legenda: E bordo scuro, Y giallo, L luce (alto e sinistra), A ombra (basso), N barre, R cima rossa
const MARK = [
  'EEEEEEEEEEEE',
  'ELLLLLLLLLYE',
  'ELYYYYYYYYYE',
  'ELYYYYYYRRYE',
  'ELYYYYYYNNYE',
  'ELYYYNNYNNYE',
  'ELYYYNNYNNYE',
  'ELNNYNNYNNYE',
  'ELNNYNNYNNYE',
  'ELNNYNNYNNYE',
  'EAAAAAAAAAAE',
  'EEEEEEEEEEEE',
];
const MARK_COLORS = { E: EDGE, Y: YELLOW, L: LIGHT, A: AMBER, N: NAVY, R: BRIGHT_RED };

/* ── il logotipo: lettere pixel 5×7 ── */
const FONT = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
};
const WORD = 'PIXELADEMY';

/** Celle (x, y, colore) della parola, senza ombra, a partire da (ox, oy). */
function wordCells(ox, oy, color) {
  const out = [];
  let x = ox;
  for (const ch of WORD) {
    FONT[ch].forEach((row, y) => [...row].forEach((v, i) => v === '1' && out.push([x + i, oy + y, color])));
    x += 6; // 5 colonne + 1 di spazio
  }
  return out;
}
const WORD_W = WORD.length * 6 - 1; // 59 colonne

function markCells(ox, oy) {
  const out = [];
  MARK.forEach((row, y) => [...row].forEach((ch, x) => out.push([ox + x, oy + y, MARK_COLORS[ch]])));
  return out;
}
/** La sagoma piena del marchio (per l'ombra rossa, come il titolo dell'app). */
const markSilhouette = (ox, oy) => Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) => [ox + x, oy + y, RED])).flat();

/** Unisce le celle adiacenti dello stesso colore in rettangoli (file più piccoli e senza fessure). */
function runs(cells) {
  const byRow = new Map();
  for (const [x, y, c] of cells) {
    const k = `${y}|${c}`;
    (byRow.get(k) ?? byRow.set(k, []).get(k)).push(x);
  }
  const out = [];
  for (const [k, xs] of byRow) {
    const [y, c] = k.split('|');
    xs.sort((a, b) => a - b);
    let s = xs[0], p = xs[0];
    for (const x of xs.slice(1)) { if (x !== p + 1) { out.push([s, +y, p - s + 1, c]); s = x; } p = x; }
    out.push([s, +y, p - s + 1, c]);
  }
  return out;
}

/** Composizione: ombra rossa (spostata di una cella in basso a destra) sotto, poi la figura. */
function compose(parts) {
  const shadow = parts.shadow.map(([x, y]) => [x + 1, y + 1, RED]);
  return [...shadow, ...parts.front];
}

// Orizzontale: marchio 12×12, due celle di spazio, parola 7 righe centrata in verticale rispetto al marchio
const GAP = 3;
const H_W = 12 + GAP + WORD_W; // 74
const H_H = 12;
const wordY = Math.floor((12 - 7) / 2); // 2
const horizontal = compose({
  shadow: markSilhouette(0, 0), // l'ombra rossa è solo sul marchio: sulle lettere (celle piene) confonderebbe
  front: [...markCells(0, 0), ...wordCells(12 + GAP, wordY, YELLOW)],
});
const markOnly = compose({ shadow: markSilhouette(0, 0), front: markCells(0, 0) });
// la sagoma con l'ombra occupa una cella in più a destra e in basso
const svg = (rects, w, h, bg = null, pad = 0) => {
  const W = w + 2 * pad, H = h + 2 * pad;
  const body = rects.map(([x, y, rw, c]) => `<rect x="${x + pad}" y="${y + pad}" width="${rw}" height="1" fill="${c}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Pixelademy">${bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : ''}${body}</svg>\n`;
};

mkdirSync('public/brand', { recursive: true });
const MARK_W = 13, MARK_H = 13; // 12 + ombra
const horizontalRuns = runs(horizontal);
const markRuns = runs(markOnly);
writeFileSync('public/brand/logo-mark.svg', svg(markRuns, MARK_W, MARK_H));
writeFileSync('public/brand/logo.svg', svg(horizontalRuns, H_W + 1, H_H + 1));
writeFileSync('public/brand/logo-badge.svg', svg(horizontalRuns, H_W + 1, H_H + 1, NAVY, 6));

// PNG: stesse celle, disegnate con interi (niente sfumature)
function png(rects, w, h, scale, bg, pad) {
  const W = (w + 2 * pad) * scale, H = (h + 2 * pad) * scale;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  for (const [x, y, rw, col] of rects) { g.fillStyle = col; g.fillRect((x + pad) * scale, (y + pad) * scale, rw * scale, scale); }
  return c.toBuffer('image/png');
}
// marchio 512×512: centrato su fondo blu scuro (cella intera: 512 / 21 ≈ 24 px)
{
  const pad = 4, scale = Math.floor(512 / (MARK_W + 2 * pad)); // 24
  const inner = png(markRuns, MARK_W, MARK_H, scale, NAVY, pad);
  writeFileSync('public/brand/logo-mark-512.png', inner);
}
// logo con fondo: 1200 px di larghezza circa
{
  const pad = 6, scale = Math.floor(1200 / (H_W + 1 + 2 * pad)); // 13
  writeFileSync('public/brand/logo-badge.png', png(horizontalRuns, H_W + 1, H_H + 1, scale, NAVY, pad));
}
console.log('logo generato in public/brand');
