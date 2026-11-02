import { fmt, list } from '../../shared/components/games/base-game';

/* ──────────────── Il motore del bonus platform: logica pura, senza disegno ──────────────── */

/** Dimensioni del mondo di gioco (coordinate logiche: il disegno le scala allo schermo). */
export const WORLD = { w: 360, h: 170, ground: 140, heroX: 64, heroW: 18, heroH: 26 } as const;
export const RUN_SECONDS = 15;
export const COIN_R = 11;
/** Altezza (dal suolo, centro) di una moneta in aria. */
export const AIR_Y = 60;

const GRAVITY = 1500;
const JUMP_V = 480;

/** Una moneta: la condizione scritta sopra decide se va presa (vera) o evitata (falsa). */
export interface Coin {
  id: number;
  /** Posizione orizzontale del centro nel mondo (px dal bordo sinistro dello schermo al via). */
  x: number;
  /** In aria (si prende saltando) oppure a terra (si prende camminandoci). */
  air: boolean;
  cond: string;
  truth: boolean;
  why: string;
  /** `taken`: toccata; `passed`: superata senza toccarla; `live`: ancora in gioco. */
  state: 'live' | 'taken' | 'passed';
  /** Decisione giusta? (definita quando non è più `live`) */
  correct?: boolean;
}

export interface CoinSpec {
  cond: string;
  truth: boolean;
  why: string;
}

/** Il tipo di condizione sulle monete: dipende dal concetto della missione. */
export type BonusKind = 'index' | 'pop' | 'len' | 'sum' | 'mean' | 'minmax' | 'dict' | 'cmp';

export interface PlatformerConfig {
  kind: BonusKind;
  name: string;
  v: number[];
  th: number;
  level: number;
  /** Il dizionario (solo per `dict`). */
  d?: Record<string, number>;
}

/* ───────────────────────── generazione delle monete ───────────────────────── */

function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CMP: Record<string, (a: number, b: number) => boolean> = {
  '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b,
};

/** Prende metà vere e metà false (al massimo quante ce ne sono), mescolate. */
function balanced(all: CoinSpec[], count: number, rnd: () => number): CoinSpec[] {
  const yes = shuffled(all.filter((c) => c.truth), rnd);
  const no = shuffled(all.filter((c) => !c.truth), rnd);
  const half = Math.floor(count / 2);
  const picked = [...yes.slice(0, half), ...no.slice(0, count - half)];
  for (const c of [...yes.slice(half), ...no.slice(count - half)]) if (picked.length < count) picked.push(c);
  return shuffled(picked, rnd);
}

/** `prezzi[3] > 6`: leggere un elemento con l'indice (da livello 2 anche negativo, e >=, <=). */
function indexCoins(c: PlatformerConfig): CoinSpec[] {
  const n = c.v.length;
  const ops = c.level >= 2 ? ['>', '<', '>=', '<='] : ['>', '<'];
  const idxs = Array.from({ length: n }, (_, i) => i).concat(c.level >= 2 ? Array.from({ length: n }, (_, i) => -(i + 1)) : []);
  const out: CoinSpec[] = [];
  for (const idx of idxs) {
    for (const op of ops) {
      const x = c.v[idx < 0 ? n + idx : idx];
      const truth = CMP[op](x, c.th);
      out.push({ cond: `${c.name}[${idx}] ${op} ${fmt(c.th)}`, truth, why: `${c.name}[${idx}] vale ${fmt(x)}: ${fmt(x)} ${op} ${fmt(c.th)} è ${truth ? 'vero' : 'falso'}.` });
    }
  }
  return out;
}

/** `[4, 6, 9].pop() > 5`: pop() restituisce l'ultimo elemento. */
function popCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  const ops = ['>', '<'];
  for (let k = 0; k < 40; k++) {
    const len = 2 + Math.floor(rnd() * Math.min(3, Math.max(1, c.v.length - 1)));
    const start = Math.floor(rnd() * Math.max(1, c.v.length - len + 1));
    const part = c.v.slice(start, start + len);
    const last = part[part.length - 1];
    const op = ops[k % 2];
    const truth = CMP[op](last, c.th);
    out.push({ cond: `${list(part)}.pop() ${op} ${fmt(c.th)}`, truth, why: `pop() toglie e restituisce l'ultimo elemento, ${fmt(last)}: ${fmt(last)} ${op} ${fmt(c.th)} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `len([4, 6, 9]) > 2`: contare gli elementi. */
function lenCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const len = 2 + Math.floor(rnd() * Math.min(4, Math.max(1, c.v.length - 1)));
    const part = c.v.slice(0, len);
    const eq = rnd() < 0.5;
    const t = eq ? len + (rnd() < 0.5 ? 0 : (rnd() < 0.5 ? 1 : -1)) : len - 1 + (rnd() < 0.5 ? 0 : 1);
    const truth = eq ? len === t : len > t;
    const cond = `len(${list(part)}) ${eq ? '==' : '>'} ${t}`;
    out.push({ cond, truth, why: `La lista ha ${len} elementi: ${len} ${eq ? '==' : '>'} ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** Con numeri grandi (≥100) bastano due valori: la somma a mente resta fattibile in pochi secondi. */
const isBig = (v: number[]): boolean => Math.max(...v) >= 100;

/** Il passo «tondo» (1, 2 o 5 per una potenza di 10) più vicino per difetto a `r`. */
function niceStep(r: number): number {
  const p = 10 ** Math.floor(Math.log10(r));
  const m = r / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

/**
 * Una soglia «tonda» e lontana da `x`, così basta una stima: sotto di `x` (la condizione `x > t` è vera) o sopra (falsa).
 * Per i numeri piccoli resta vicina (±1…3); da 30 in su è un multiplo tondo di circa un decimo di `x`
 * (x = 705 → 650 oppure 750; x = 1065 → 1000 oppure 1200).
 */
export function roundThreshold(x: number, below: boolean, rnd: () => number): number {
  if (x < 30) return below ? Math.floor(x) - 1 - Math.floor(rnd() * 2) : Math.ceil(x) + Math.floor(rnd() * 2);
  const step = niceStep(x / 10);
  return below ? Math.floor((x - step / 2) / step) * step : Math.ceil((x + step / 2) / step) * step;
}

/** Un pezzo di lista di 3 elementi (2 con numeri grandi), a partire da un punto a caso. */
function slice3(v: number[], rnd: () => number): number[] {
  const len = Math.min(isBig(v) ? 2 : 3, v.length);
  const start = Math.floor(rnd() * Math.max(1, v.length - len + 1));
  return v.slice(start, start + len);
}

/** `sum([4, 6, 9]) > 18`: sommare. La soglia è scelta per avere metà vere e metà false. */
function sumCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const part = slice3(c.v, rnd);
    const total = part.reduce((a, b) => a + b, 0);
    const t = roundThreshold(total, k % 2 === 0, rnd);
    const truth = total > t;
    out.push({ cond: `sum(${list(part)}) > ${t}`, truth, why: `${part.map(fmt).join(' + ')} = ${fmt(total)}: ${fmt(total)} > ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `sum([4, 6, 8]) / 3 > 5`: la media di tre valori. */
function meanCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const part = slice3(c.v, rnd);
    const mean = part.reduce((a, b) => a + b, 0) / part.length;
    const t = roundThreshold(mean, k % 2 === 0, rnd);
    const truth = mean > t;
    out.push({ cond: `sum(${list(part)}) / ${part.length} > ${t}`, truth, why: `La media è ${fmt(mean)}: ${fmt(mean)} > ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `max([4, 6, 9]) > 8` e `min([...]) < 5`: gli estremi. */
function minmaxCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const part = slice3(c.v, rnd);
    const useMax = k % 4 < 2;
    const ext = useMax ? Math.max(...part) : Math.min(...part);
    const wantTrue = k % 2 === 0;
    const op = useMax ? '>' : '<';
    // max > t: vera con t sotto il massimo; min < t: vera con t sopra il minimo
    const t = useMax ? roundThreshold(ext, wantTrue, rnd) : roundThreshold(ext, !wantTrue, rnd);
    const truth = CMP[op](ext, t);
    out.push({ cond: `${useMax ? 'max' : 'min'}(${list(part)}) ${op} ${t}`, truth, why: `${useMax ? 'Il massimo' : 'Il minimo'} è ${fmt(ext)}: ${fmt(ext)} ${op} ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `venti['sud'] > 20`: leggere un dizionario con la chiave. */
function dictCoins(c: PlatformerConfig): CoinSpec[] {
  const d = c.d ?? {};
  const entries = Object.entries(d);
  if (!entries.length) return [];
  const values = entries.map(([, x]) => x);
  const mid = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const out: CoinSpec[] = [];
  for (const [key, x] of entries) {
    for (const op of ['>', '<']) {
      for (const t of [mid, Math.round((mid + x) / 2)]) {
        if (t === x) continue;
        const truth = CMP[op](x, t);
        out.push({ cond: `${c.name}['${key}'] ${op} ${t}`, truth, why: `${c.name}['${key}'] vale ${fmt(x)}: ${fmt(x)} ${op} ${t} è ${truth ? 'vero' : 'falso'}.` });
      }
    }
  }
  return out;
}

/** `28 > 22`: un confronto (condizionali). */
function cmpCoins(c: PlatformerConfig): CoinSpec[] {
  const out: CoinSpec[] = [];
  const ops = c.level >= 4 ? ['>', '<', '>=', '<='] : ['>', '<'];
  for (const x of c.v) {
    for (const op of ops) {
      const truth = CMP[op](x, c.th);
      out.push({ cond: `${fmt(x)} ${op} ${fmt(c.th)}`, truth, why: `${fmt(x)} ${op} ${fmt(c.th)} è ${truth ? 'vero' : 'falso'}.` });
    }
  }
  return out;
}

/** Le monete di una corsa: stesse condizioni per gli stessi dati, metà vere e metà false. */
export function coinSpecs(c: PlatformerConfig, count = 16, seed = 0): CoinSpec[] {
  const rnd = rng(c.level * 7919 + c.v.length + seed * 31337);
  const pool = {
    pop: () => popCoins(c, rnd), len: () => lenCoins(c, rnd), sum: () => sumCoins(c, rnd), mean: () => meanCoins(c, rnd),
    minmax: () => minmaxCoins(c, rnd), dict: () => dictCoins(c), cmp: () => cmpCoins(c), index: () => indexCoins(c),
  }[c.kind]();
  if (!pool.length) return [];
  const out: CoinSpec[] = [];
  for (let s = 0; out.length < count && s < 10; s++) out.push(...balanced(pool, Math.min(count, pool.length), rng(c.level * 104729 + s + seed * 31337)));
  return out.slice(0, count);
}

/* ───────────────────────────────── il motore ───────────────────────────────── */

export class PlatformerEngine {
  /** Secondi trascorsi dall'inizio della corsa. */
  t = 0;
  /** Altezza dei piedi dal suolo (px) e velocità verticale (px/s, positiva = verso l'alto). */
  y = 0;
  vy = 0;
  /** Distanza percorsa (per lo sfondo). */
  distance = 0;
  score = 0;
  streak = 0;
  best = 0;
  mistakes = 0;
  correct = 0;
  readonly coins: Coin[];
  /** Ultimo evento (per il disegno e i messaggi): moneta risolta. */
  lastEvent: Coin | null = null;

  constructor(specs: CoinSpec[], private readonly speedScale = 1) {
    // la prima moneta arriva dopo un secondo; poi una ogni ~1,35 s di corsa, a quota alterna
    const rnd = rng(specs.length * 977 + 13);
    // a coppie casuali (una in aria e una a terra): niente lunghe serie della stessa quota
    const airs = specs.flatMap((_, i) => (i % 2 === 0 ? (rnd() < 0.5 ? [true, false] : [false, true]) : [])).slice(0, specs.length);
    let x = WORLD.w + 40;
    this.coins = specs.map((s, i) => {
      const coin: Coin = { id: i, x, air: airs[i], ...s, state: 'live' };
      x += this.gap();
      return coin;
    });
  }

  private gap(): number { return 250 * this.speedScale; }

  /** Velocità di scorrimento (px/s): cresce con il tempo. */
  get speed(): number { return (170 + (this.t / RUN_SECONDS) * 90) * this.speedScale; }
  get onGround(): boolean { return this.y <= 0 && this.vy <= 0; }
  get finished(): boolean { return this.t >= RUN_SECONDS; }

  jump(): void {
    if (this.finished || !this.onGround) return;
    this.vy = JUMP_V;
  }

  step(dt: number): void {
    if (this.finished) return;
    this.t = Math.min(RUN_SECONDS, this.t + dt);
    const move = this.speed * dt;
    this.distance += move;
    // fisica del salto
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }
    for (const c of this.coins) {
      c.x -= move;
      if (c.state !== 'live') continue;
      if (this.touches(c)) this.resolve(c, 'taken');
      else if (c.x + COIN_R < WORLD.heroX - WORLD.heroW / 2) this.resolve(c, 'passed');
    }
  }

  private touches(c: Coin): boolean {
    const hx0 = WORLD.heroX - WORLD.heroW / 2, hx1 = WORLD.heroX + WORLD.heroW / 2;
    if (c.x + COIN_R < hx0 || c.x - COIN_R > hx1) return false;
    const cy = c.air ? AIR_Y : COIN_R; // centro, dal suolo
    return this.y + WORLD.heroH >= cy - COIN_R && this.y <= cy + COIN_R;
  }

  private resolve(c: Coin, how: 'taken' | 'passed'): void {
    c.state = how;
    c.correct = how === 'taken' ? c.truth : !c.truth;
    this.lastEvent = c;
    if (c.correct) {
      this.correct++;
      this.streak++;
      this.best = Math.max(this.best, this.streak);
      this.score += 10 + Math.min(this.streak - 1, 5) * 2;
    } else {
      this.mistakes++;
      this.streak = 0;
    }
  }
}
