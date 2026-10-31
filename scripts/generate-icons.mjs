// Genera le icone dell'app (PWA) in public/icons: una «P» pixel-art gialla su fondo scuro, anche in versione maskable.
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
