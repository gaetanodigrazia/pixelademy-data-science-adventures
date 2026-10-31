import { levelFromXp, xpForLevel } from './progress';
import type { ChartLine, Tone } from '../../shared/components/bar-chart';

/** Un riquadro della Dashboard così com'è: titolo, indicatori e grafico a barre. */
export interface ShareCard {
  title: string;
  stats: { label: string; text: string | null; tone?: 'good' | 'bad' }[];
  values: number[] | null;
  labels: string[];
  marks: Record<number, Tone>;
  refs: ChartLine[];
}

export interface ShareImageInput {
  /** Titolo del progetto (es. «BOLLETTINO DELL'OSSERVATORIO»). */
  heading: string;
  pathTitle: string;
  done: number;
  total: number;
  cards: ShareCard[];
  /** Data mostrata nel piè di pagina; `null` per non mostrarla (l'immagine di anteprima del link è uguale per tutti). */
  date?: Date | null;
}

export const SHARE_W = 1200;
export const SHARE_H = 627; // formato consigliato da LinkedIn per le immagini nei post (1.91:1)

const COLORS = {
  bg: '#0b0b24', dots: '#1e1b4b', panel: '#111827', line: '#374151', text: '#e5e7eb', muted: '#94a3b8',
  accent: '#fbbf24', accent2: '#fde047', good: '#4ade80', bad: '#f87171', bar: '#334155', chip: '#020617',
};
const TONE: Record<string, string> = { accent: COLORS.accent, good: COLORS.good, bad: COLORS.bad, '': COLORS.bar };
const FONT_PIXEL = "'Press Start 2P', 'Courier New', monospace";
const FONT_MONO = "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace";

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Il testo del post, pronto da incollare (il percorso, il progetto e il link a Pixelademy). */
export function shareText(input: Pick<ShareImageInput, 'pathTitle' | 'heading' | 'total'>, link = ''): string {
  const title = input.heading.charAt(0) + input.heading.slice(1).toLowerCase();
  return [
    `Ho completato il percorso «${input.pathTitle}» su Pixelademy! 🏆`,
    `In ${input.total} ${input.total === 1 ? 'missione' : 'missioni'} ho usato Python per costruire il «${title}» e ho visualizzato i risultati dei dati in una dashboard. 📊🐍`,
    link ? `\nProva anche tu: ${link}` : '',
    '\n#DataScience #Python #Imparare #Pixelademy',
  ].filter(Boolean).join('\n');
}

/** Il testo per condividere il proprio livello e i propri XP: il link a Pixelademy va aggiunto dopo (i due punti finali lo introducono). */
export function levelShareText(level: number, xp: number): string {
  return `Sono al livello ${level} su Pixelademy, con ${xp} XP! 🎮🐍\nImpara la data science giocando anche tu:`;
}

/**
 * L'indirizzo da condividere: una pagina con l'immagine della Dashboard nei meta-tag Open Graph, che LinkedIn mostra come
 * grande foto nel post (generata durante la pubblicazione del sito, `scripts/generate-share-assets.mjs`).
 */
export function shareLink(origin: string, pathId: string): string {
  return `${origin}/condividi/${pathId.replace(/^adventure-core-/, '')}/`;
}

/** Apre il compositore di LinkedIn con il testo già scritto (l'immagine si allega o si incolla a mano). */
export function linkedInComposerUrl(text: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}

/** L'indirizzo da condividere per il profilo: una pagina con l'anteprima (livello ed XP in una foto) che LinkedIn mostra nel post. */
export function profileLink(origin: string, xp: number): string {
  return `${origin}/condividi/profilo/${Math.max(0, Math.floor(xp))}`;
}

type Ctx = CanvasRenderingContext2D;

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke?: string, lw = 3): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  }
}

function text(ctx: Ctx, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left'): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** Taglia il testo con «…» se supera la larghezza. */
function fit(ctx: Ctx, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/** Spezza il testo su al massimo `maxLines` righe; se avanza, l'ultima si chiude con «…». */
function wrap(ctx: Ctx, s: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const rest = lines.slice(maxLines - 1).join(' ');
    return [...lines.slice(0, maxLines - 1), fit(ctx, rest, maxW)];
  }
  return lines.map((l) => fit(ctx, l, maxW));
}

function drawChart(ctx: Ctx, card: ShareCard, x: number, y: number, w: number, h: number): void {
  const values = card.values;
  if (!values?.length) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    text(ctx, 'da sbloccare', x + w / 2, y + h / 2, `13px ${FONT_MONO}`, COLORS.muted, 'center');
    return;
  }
  const top = Math.max(...values, ...card.refs.map((r) => r.value), 1) * 1.12;
  const base = y + h - 16; // spazio per le etichette sotto
  const plotH = base - (y + 14);
  const yOf = (v: number) => base - (v / top) * plotH;
  const slot = w / values.length;
  const bw = Math.min(slot * 0.62, 44);
  values.forEach((v, i) => {
    const bx = x + i * slot + (slot - bw) / 2;
    const by = yOf(v);
    ctx.fillStyle = TONE[card.marks[i] ?? ''];
    ctx.fillRect(bx, by, bw, base - by);
    text(ctx, String(r2(v)), bx + bw / 2, by - 4, `10px ${FONT_MONO}`, '#cbd5e1', 'center');
    text(ctx, card.labels[i] ?? String(i + 1), bx + bw / 2, y + h - 3, `9px ${FONT_MONO}`, COLORS.muted, 'center');
  });
  for (const r of card.refs) {
    const ry = yOf(r.value);
    const color = TONE[r.tone ?? 'accent'];
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x + w, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, r.label, r.tone === 'bad' ? x + 2 : x + w - 2, ry - 4, `10px ${FONT_MONO}`, color, r.tone === 'bad' ? 'left' : 'right');
  }
}

function drawCard(ctx: Ctx, card: ShareCard, x: number, y: number, w: number, h: number): void {
  box(ctx, x, y, w, h, COLORS.panel, COLORS.line, 3);
  ctx.font = `12px ${FONT_PIXEL}`;
  text(ctx, fit(ctx, card.title, w - 28), x + 14, y + 26, `12px ${FONT_PIXEL}`, COLORS.accent2);
  // indicatori in riga
  const stats = card.stats.slice(0, 5);
  const cw = Math.min(112, (w - 28 - (stats.length - 1) * 6) / Math.max(1, stats.length));
  stats.forEach((s, i) => {
    const sx = x + 14 + i * (cw + 6);
    const tone = s.tone === 'good' ? COLORS.good : s.tone === 'bad' ? COLORS.bad : COLORS.accent2;
    box(ctx, sx, y + 38, cw, 54, COLORS.chip, s.tone ? tone : COLORS.line, 2);
    ctx.font = `15px ${FONT_MONO}`;
    text(ctx, fit(ctx, s.text ?? '—', cw - 10), sx + 6, y + 58, `15px ${FONT_MONO}`, s.text ? tone : COLORS.muted);
    ctx.font = `9px ${FONT_MONO}`;
    wrap(ctx, s.label, cw - 10, 2).forEach((line, li) => text(ctx, line, sx + 6, y + 73 + li * 11, `9px ${FONT_MONO}`, COLORS.muted));
  });
  drawChart(ctx, card, x + 14, y + 100, w - 28, h - 100 - 8);
}

/** Disegna la scheda da condividere: titolo, riquadri della Dashboard e piè di pagina. */
export function drawShareImage(ctx: Ctx, input: ShareImageInput): void {
  box(ctx, 0, 0, SHARE_W, SHARE_H, COLORS.bg);
  ctx.fillStyle = COLORS.dots;
  for (let gx = 12; gx < SHARE_W; gx += 24) for (let gy = 12; gy < SHARE_H; gy += 24) ctx.fillRect(gx, gy, 2, 2);
  box(ctx, 8, 8, SHARE_W - 16, SHARE_H - 16, 'rgba(0,0,0,0)', COLORS.accent, 6);

  text(ctx, 'PIXELADEMY', 40, 56, `20px ${FONT_PIXEL}`, COLORS.accent);
  text(ctx, 'PROGETTO COMPLETATO', SHARE_W - 40, 56, `16px ${FONT_PIXEL}`, COLORS.good, 'right');
  ctx.font = `30px ${FONT_PIXEL}`;
  text(ctx, fit(ctx, input.heading, SHARE_W - 80), 40, 106, `30px ${FONT_PIXEL}`, COLORS.accent2);
  text(ctx, `${input.pathTitle} · ${input.done}/${input.total} sezioni prodotte`, 40, 134, `14px ${FONT_MONO}`, COLORS.muted);

  // da 1 a 4 riquadri in due colonne; se sono dispari l'ultimo occupa tutta la riga
  const cards = input.cards.slice(0, 4);
  const gx = 40;
  const gy = 154;
  const gap = 16;
  const rows = Math.max(1, Math.ceil(cards.length / 2));
  const cw = (SHARE_W - 2 * gx - gap) / 2;
  const ch = (SHARE_H - gy - 48 - (rows - 1) * gap) / rows;
  cards.forEach((c, i) => {
    const wide = cards.length % 2 === 1 && i === cards.length - 1;
    drawCard(ctx, c, gx + (wide ? 0 : (i % 2) * (cw + gap)), gy + Math.floor(i / 2) * (ch + gap), wide ? 2 * cw + gap : cw, ch);
  });

  text(ctx, 'Impara la data science giocando · Pixelademy', 40, SHARE_H - 22, `13px ${FONT_MONO}`, COLORS.muted);
  if (input.date !== null) {
    const date = (input.date ?? new Date()).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    text(ctx, date, SHARE_W - 40, SHARE_H - 22, `13px ${FONT_MONO}`, COLORS.muted, 'right');
  }
}

/** Crea l'immagine PNG della scheda. `canvasFactory` serve ai test (dove non c'è un canvas vero). */
export async function renderShareImage(
  input: ShareImageInput,
  canvasFactory: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<Blob> {
  try {
    await document.fonts?.load(`16px "Press Start 2P"`);
  } catch {
    /* senza il carattere pixel si usa quello di ripiego */
  }
  const canvas = canvasFactory();
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  drawShareImage(ctx, input);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Immagine non creata'))), 'image/png'));
}

/** Disegna la scheda del profilo da condividere: livello, XP e avanzamento verso il livello successivo (1200×627, come la Dashboard). */
export function drawProfileImage(ctx: Ctx, xp: number): void {
  const level = levelFromXp(xp);
  const from = xpForLevel(level);
  const span = xpForLevel(level + 1) - from;
  const into = xp - from;
  box(ctx, 0, 0, SHARE_W, SHARE_H, COLORS.bg);
  ctx.fillStyle = COLORS.dots;
  for (let gx = 12; gx < SHARE_W; gx += 24) for (let gy = 12; gy < SHARE_H; gy += 24) ctx.fillRect(gx, gy, 2, 2);
  box(ctx, 8, 8, SHARE_W - 16, SHARE_H - 16, 'rgba(0,0,0,0)', COLORS.accent, 6);

  text(ctx, 'PIXELADEMY', 40, 56, `20px ${FONT_PIXEL}`, COLORS.accent);
  text(ctx, 'IL MIO PROFILO', SHARE_W - 40, 56, `16px ${FONT_PIXEL}`, COLORS.good, 'right');

  text(ctx, 'LIVELLO', SHARE_W / 2, 200, `34px ${FONT_PIXEL}`, COLORS.muted, 'center');
  text(ctx, String(level), SHARE_W / 2, 360, `${level >= 100 ? 120 : 150}px ${FONT_PIXEL}`, COLORS.accent2, 'center');
  text(ctx, `${xp} XP`, SHARE_W / 2, 430, `34px ${FONT_PIXEL}`, COLORS.text, 'center');

  const bw = 760;
  const bx = (SHARE_W - bw) / 2;
  box(ctx, bx, 470, bw, 26, COLORS.chip, COLORS.line, 3);
  ctx.fillStyle = COLORS.good;
  ctx.fillRect(bx + 3, 473, Math.max(0, Math.round(((bw - 6) * Math.min(into, span)) / span)), 20);
  text(ctx, `${into} / ${span} XP verso il livello ${level + 1}`, SHARE_W / 2, 528, `16px ${FONT_MONO}`, COLORS.muted, 'center');

  text(ctx, 'Impara la data science giocando · Pixelademy', 40, SHARE_H - 22, `13px ${FONT_MONO}`, COLORS.muted);
}
