/**
 * Pixel-art sprite: each string in `pixels` is a row, each char a pixel.
 * '.' is transparent, any other char is looked up in `palette`.
 */
export interface SpriteDef {
  pixels: string[];
  palette: Record<string, string>;
}

const bakedCache = new WeakMap<SpriteDef, HTMLCanvasElement>();

function bake(def: SpriteDef): HTMLCanvasElement {
  let canvas = bakedCache.get(def);
  if (canvas) {
    return canvas;
  }
  canvas = document.createElement('canvas');
  canvas.width = Math.max(...def.pixels.map((row) => row.length));
  canvas.height = def.pixels.length;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    def.pixels.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch !== '.') {
          ctx.fillStyle = def.palette[ch] ?? '#ff00ff';
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });
  }
  bakedCache.set(def, canvas);
  return canvas;
}

export function spriteSize(def: SpriteDef, scale: number): { w: number; h: number } {
  return {
    w: Math.max(...def.pixels.map((row) => row.length)) * scale,
    h: def.pixels.length * scale
  };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  x: number,
  y: number,
  scale = 1,
  flip = false
): void {
  const src = bake(def);
  const w = src.width * scale;
  const h = src.height * scale;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x) + w, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(src, Math.round(x), Math.round(y), w, h);
  }
}
