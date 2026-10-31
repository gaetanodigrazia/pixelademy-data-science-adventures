// Genera le icone del sito: una «P» pixel-art gialla su fondo scuro.
//   public/icons/*.png         icone PWA (192, 512, maskable) e apple-touch-icon (180)
//   public/favicon.ico         16/32/48 px (PNG dentro l'ICO)
//   public/favicon.svg         vettoriale, per i browser moderni
//   node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const P = ['11110', '10001', '10001', '11110', '10000', '10000', '10000'];
mkdirSync('public/icons', { recursive: true });
for (const [name, size, safe] of [['icon-192', 192, 0.7], ['icon-512', 512, 0.7], ['icon-maskable-512', 512, 0.55]]) {
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b24';
  g.fillRect(0, 0, size, size);
  const cell = Math.floor((size * safe) / 7);
  const w = 5 * cell, h = 7 * cell;
  const x0 = Math.floor((size - w) / 2), y0 = Math.floor((size - h) / 2);
  g.fillStyle = '#b91c1c'; // ombra rossa, come il titolo
  P.forEach((row, y) => [...row].forEach((v, x) => v === '1' && g.fillRect(x0 + x * cell + cell / 6, y0 + y * cell + cell / 6, cell, cell)));
  g.fillStyle = '#fbbf24';
  P.forEach((row, y) => [...row].forEach((v, x) => v === '1' && g.fillRect(x0 + x * cell, y0 + y * cell, cell, cell)));
  writeFileSync(`public/icons/${name}.png`, c.toBuffer('image/png'));
}
console.log('icone generate in public/icons');

// ── favicon ──────────────────────────────────────────────────────────────────────────────────────────────
// A dimensioni piccole la «P» è allineata ai pixel (nessuna sfumatura): lato della cella intero, lettera centrata.
const BG = '#0b0b24';
const FG = '#fbbf24';
const favicon = (size) => {
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = BG;
  g.fillRect(0, 0, size, size);
  const cell = Math.max(1, Math.floor(size / 7.5)); // lettera 5×7 celle: 16→2, 32→4, 48→6 px, con almeno un pixel di margine in alto e in basso
  const w = 5 * cell, h = 7 * cell;
  const x0 = Math.floor((size - w) / 2), y0 = Math.floor((size - h) / 2);
  g.fillStyle = FG;
  P.forEach((row, y) => [...row].forEach((v, x) => v === '1' && g.fillRect(x0 + x * cell, y0 + y * cell, cell, cell)));
  return c.toBuffer('image/png');
};

// ICO con immagini PNG (supportate da tutti i browser moderni): intestazione, directory di 16 byte per immagine, dati.
const sizes = [16, 32, 48];
const pngs = sizes.map(favicon);
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); // riservato
head.writeUInt16LE(1, 2); // tipo: icona
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(n, e); // larghezza
  head.writeUInt8(n, e + 1); // altezza
  head.writeUInt8(0, e + 2); // colori in tavolozza (0 = nessuna)
  head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); // piani
  head.writeUInt16LE(32, e + 6); // bit per pixel
  head.writeUInt32LE(pngs[i].length, e + 8);
  head.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([head, ...pngs]));

// SVG: la stessa «P» su una griglia di 16×16 con celle da 2 (lettera 10×14, margine di 3 e 1)
const rects = P.flatMap((row, y) => [...row].map((v, x) => (v === '1' ? `<rect x="${3 + x * 2}" y="${1 + y * 2}" width="2" height="2"/>` : ''))).join('');
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>Pixelademy</title><rect width="16" height="16" fill="${BG}"/><g fill="${FG}">${rects}</g></svg>\n`,
);

// icona per la schermata Home di iOS: 180×180, a tutta area (iOS arrotonda gli angoli da solo)
{
  const size = 180;
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = BG;
  g.fillRect(0, 0, size, size);
  const cell = Math.floor((size * 0.6) / 7);
  const x0 = Math.floor((size - 5 * cell) / 2), y0 = Math.floor((size - 7 * cell) / 2);
  g.fillStyle = '#b91c1c';
  P.forEach((row, y) => [...row].forEach((v, x) => v === '1' && g.fillRect(x0 + x * cell + cell / 6, y0 + y * cell + cell / 6, cell, cell)));
  g.fillStyle = FG;
  P.forEach((row, y) => [...row].forEach((v, x) => v === '1' && g.fillRect(x0 + x * cell, y0 + y * cell, cell, cell)));
  writeFileSync('public/icons/apple-touch-icon.png', c.toBuffer('image/png'));
}
console.log('favicon (ico, svg) e apple-touch-icon generati');
