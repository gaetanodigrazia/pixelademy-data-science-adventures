import { existsSync, readFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const html = readFileSync('src/index.html', 'utf8');
const ngsw = JSON.parse(readFileSync('ngsw-config.json', 'utf8'));
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
const BG = [0x0b, 0x0b, 0x24];
const FG = [0xfb, 0xbf, 0x24];
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];

interface IcoEntry { w: number; h: number; png: Buffer }
function readIco(file: string): IcoEntry[] {
  const b = readFileSync(file);
  expect([b.readUInt16LE(0), b.readUInt16LE(2)]).toEqual([0, 1]); // intestazione ICO: tipo «icona»
  return Array.from({ length: b.readUInt16LE(4) }, (_, i) => {
    const e = 6 + 16 * i;
    const size = b.readUInt32LE(e + 8);
    const offset = b.readUInt32LE(e + 12);
    return { w: b[e] || 256, h: b[e + 1] || 256, png: b.subarray(offset, offset + size) };
  });
}

/** I colori (RGB) dei pixel di un PNG. */
async function pixels(png: Buffer): Promise<{ w: number; h: number; at: (x: number, y: number) => number[] }> {
  const img = await loadImage(png);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  return { w: img.width, h: img.height, at: (x, y) => [d[(y * img.width + x) * 4], d[(y * img.width + x) * 4 + 1], d[(y * img.width + x) * 4 + 2]] };
}

describe('favicon di Pixelademy', () => {
  it('favicon.ico contiene le immagini 16, 32 e 48 px, tutte PNG valide con le dimensioni dichiarate', async () => {
    const entries = readIco('public/favicon.ico');
    expect(entries.map((e) => e.w)).toEqual([16, 32, 48]);
    for (const e of entries) {
      expect([...e.png.subarray(0, 8)], `${e.w}px`).toEqual(PNG);
      expect([e.png.readUInt32BE(16), e.png.readUInt32BE(20)]).toEqual([e.w, e.h]);
    }
  });

  it('non è più il logo di Angular: fondo scuro del marchio e lettera gialla, a tutte le dimensioni', async () => {
    for (const e of readIco('public/favicon.ico')) {
      const px = await pixels(e.png);
      expect(px.at(0, 0), `${e.w}px angolo`).toEqual(BG);
      let yellow = 0;
      for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (px.at(x, y).join() === FG.join()) yellow++;
      expect(yellow, `${e.w}px pixel gialli`).toBeGreaterThan(px.w * px.h * 0.15); // la «P» occupa una parte visibile
      expect(yellow).toBeLessThan(px.w * px.h * 0.5);
    }
  });

  it('favicon.svg è un SVG quadrato con il titolo, il fondo e la lettera', () => {
    const svg = readFileSync('public/favicon.svg', 'utf8');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 16 16"');
    expect(svg).toContain('<title>Pixelademy</title>');
    expect(svg).toContain('fill="#0b0b24"');
    expect(svg).toContain('fill="#fbbf24"');
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThan(10);
  });

  it('apple-touch-icon è un PNG 180×180 a tutta area', async () => {
    const b = readFileSync('public/icons/apple-touch-icon.png');
    expect([...b.subarray(0, 8)]).toEqual(PNG);
    const px = await pixels(b);
    expect([px.w, px.h]).toEqual([180, 180]);
    expect(px.at(0, 0)).toEqual(BG);
    expect(px.at(179, 179)).toEqual(BG);
  });

  it('index.html dichiara SVG, ICO e apple-touch-icon, e tutti i file esistono', () => {
    expect(html).toContain('rel="icon" type="image/svg+xml" href="favicon.svg"');
    expect(html).toContain('rel="icon" type="image/x-icon"');
    expect(html).toContain('href="favicon.ico"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png"');
    for (const f of ['public/favicon.svg', 'public/favicon.ico', 'public/icons/apple-touch-icon.png']) expect(existsSync(f), f).toBe(true);
  });

  it('il Service Worker mette in cache le favicon con il guscio dell\'app', () => {
    const app = ngsw.assetGroups.find((g: { name: string }) => g.name === 'app');
    expect(app.resources.files).toContain('/favicon.ico');
    expect(app.resources.files).toContain('/favicon.svg');
    expect(ngsw.assetGroups.find((g: { name: string }) => g.name === 'assets').resources.files).toContain('/icons/**');
  });

  it('le icone PWA del manifest ci sono ancora (192, 512, maskable)', () => {
    for (const i of manifest.icons as { src: string }[]) expect(existsSync(`public/${i.src}`), i.src).toBe(true);
  });
});
