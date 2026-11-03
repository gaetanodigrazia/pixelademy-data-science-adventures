import { fmt, list } from '../../shared/components/games/base-game';

/* ──────────────── Il motore del bonus platform: logica pura, senza disegno ──────────────── */

/** Dimensioni del mondo di gioco (coordinate logiche: il disegno le scala allo schermo). */
export const WORLD = { w: 360, h: 170, ground: 140, heroX: 64, heroW: 24, heroH: 26 } as const;
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
export type BonusKind = 'index' | 'pop' | 'len' | 'sum' | 'minmax' | 'dict' | 'cmp';

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
/*
 * Il bonus è un gioco di salti, non un esercizio: ogni condizione si deve cogliere a colpo d'occhio.
 * Quindi: solo `>` e `<`, numeri piccoli, soglie ben distanti dal valore (mai «quasi uguali») e nessun calcolo con numeri grandi:
 * se i dati sono grandi si confrontano direttamente i valori (`340 > 300`).
 */

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
  '>': (a, b) => a > b, '<': (a, b) => a < b,
};

/** Valori «piccoli»: somme e massimi di pochi numeri si fanno a mente senza fatica. */
export const isSmall = (v: number[]): boolean => Math.max(...v) <= 30;

/** `x` e `t` sono abbastanza distanti da distinguerli a colpo d'occhio (almeno 2, o il 15% di `t`). */
export const clearGap = (x: number, t: number): boolean => Math.abs(x - t) >= Math.max(2, Math.round(Math.abs(t) * 0.15));

/** Prende metà vere e metà false (al massimo quante ce ne sono), mescolate. */
function balanced(all: CoinSpec[], count: number, rnd: () => number): CoinSpec[] {
  const yes = shuffled(all.filter((c) => c.truth), rnd);
  const no = shuffled(all.filter((c) => !c.truth), rnd);
  const half = Math.floor(count / 2);
  const picked = [...yes.slice(0, half), ...no.slice(0, count - half)];
  for (const c of [...yes.slice(half), ...no.slice(count - half)]) if (picked.length < count) picked.push(c);
  return shuffled(picked, rnd);
}

/**
 * Quattro modi di confrontare `x` con una soglia **lontana** (e tonda): `x > basso` e `x < alto` sono veri, `x < basso` e `x > alto` falsi.
 * La distanza è almeno 2 (o il 20% di `x`): a colpo d'occhio, anche con numeri grandi (325 → «> 260» oppure «< 390»).
 */
function farCompares(x: number, what: string, label: (op: '>' | '<', t: number) => string): CoinSpec[] {
  const gap = Math.max(2, Math.ceil(Math.abs(x) * 0.2));
  const step = Math.abs(x) >= 100 ? 10 : Math.abs(x) >= 30 ? 5 : 1;
  const low = Math.max(0, Math.floor((x - gap) / step) * step);
  const high = Math.ceil((x + gap) / step) * step;
  const mk = (op: '>' | '<', t: number): CoinSpec => {
    const truth = CMP[op](x, t);
    return { cond: label(op, t), truth, why: `${what} vale ${fmt(x)}: ${fmt(x)} ${op} ${fmt(t)} è ${truth ? 'vero' : 'falso'}.` };
  };
  return [mk('>', low), mk('<', low), mk('<', high), mk('>', high)];
}

/** `prezzi[3] > 6`: leggere un elemento con l'indice (la lista è scritta sopra il gioco). */
function indexCoins(c: PlatformerConfig): CoinSpec[] {
  return c.v.flatMap((x, i) => farCompares(x, `${c.name}[${i}]`, (op, t) => `${c.name}[${i}] ${op} ${t}`));
}

/** `[4, 6, 9].pop() > 5`: pop() restituisce l'ultimo elemento. */
function popCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 24; k++) {
    const len = 2 + Math.floor(rnd() * Math.min(2, Math.max(1, c.v.length - 1)));
    const start = Math.floor(rnd() * Math.max(1, c.v.length - len + 1));
    const part = c.v.slice(start, start + len);
    out.push(...farCompares(part[part.length - 1], 'pop() toglie e restituisce l\'ultimo elemento, che', (op, t) => `${list(part)}.pop() ${op} ${t}`));
  }
  return out;
}

/** `len([4, 6, 9]) > 2`: contare gli elementi (liste di 2–4). */
function lenCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const len = 2 + Math.floor(rnd() * Math.min(3, Math.max(1, c.v.length - 1)));
    const part = c.v.slice(0, len);
    const wantTrue = k % 2 === 0;
    const t = wantTrue ? len - 1 : len + (rnd() < 0.5 ? 0 : 1);
    const truth = len > t;
    out.push({ cond: `len(${list(part)}) > ${t}`, truth, why: `La lista ha ${len} elementi: ${len} > ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `sum([4, 6]) > 15`: la somma di **due** numeri piccoli, con la soglia lontana. Con numeri grandi si confrontano i valori. */
function sumCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  if (!isSmall(c.v)) return cmpCoins(c);
  const out: CoinSpec[] = [];
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(rnd() * (c.v.length - 1));
    const part = c.v.slice(i, i + 2);
    const total = part[0] + part[1];
    const t = k % 2 === 0 ? total - 3 - Math.floor(rnd() * 3) : total + 2 + Math.floor(rnd() * 3);
    const truth = total > t;
    out.push({ cond: `sum(${list(part)}) > ${t}`, truth, why: `${fmt(part[0])} + ${fmt(part[1])} = ${fmt(total)}: ${fmt(total)} > ${t} è ${truth ? 'vero' : 'falso'}.` });
  }
  return out;
}

/** `max([4, 7, 9]) > 5` e `min([...]) < 8`: guardare tre numeri piccoli. Con numeri grandi si confrontano i valori. */
function minmaxCoins(c: PlatformerConfig, rnd: () => number): CoinSpec[] {
  if (!isSmall(c.v)) return cmpCoins(c);
  const out: CoinSpec[] = [];
  for (let k = 0; k < 24; k++) {
    const len = Math.min(3, c.v.length);
    const start = Math.floor(rnd() * Math.max(1, c.v.length - len + 1));
    const part = c.v.slice(start, start + len);
    const useMax = k % 2 === 0;
    const ext = useMax ? Math.max(...part) : Math.min(...part);
    out.push(...farCompares(ext, useMax ? 'Il massimo' : 'Il minimo', (op, t) => `${useMax ? 'max' : 'min'}(${list(part)}) ${op} ${t}`));
  }
  return out;
}

/** `venti['sud'] > 20`: leggere un dizionario con la chiave (il dizionario è scritto sopra il gioco). */
function dictCoins(c: PlatformerConfig): CoinSpec[] {
  return Object.entries(c.d ?? {}).flatMap(([key, x]) => farCompares(x, `${c.name}['${key}']`, (op, t) => `${c.name}['${key}'] ${op} ${t}`));
}

/** `28 > 22`: un confronto tra un valore e una soglia (condizionali). */
function cmpCoins(c: PlatformerConfig): CoinSpec[] {
  return c.v.flatMap((x) => farCompares(x, 'Il valore', (op, t) => `${fmt(x)} ${op} ${t}`));
}

/** Le monete di una corsa: stesse condizioni per gli stessi dati, metà vere e metà false. */
export function coinSpecs(c: PlatformerConfig, count = 16, seed = 0): CoinSpec[] {
  const rnd = rng(c.level * 7919 + c.v.length + seed * 31337);
  const pool = {
    pop: () => popCoins(c, rnd), len: () => lenCoins(c, rnd), sum: () => sumCoins(c, rnd),
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

  private gap(): number { return 280 * this.speedScale; }

  /** Velocità di scorrimento (px/s): cresce con il tempo. */
  get speed(): number { return (150 + (this.t / RUN_SECONDS) * 50) * this.speedScale; }
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
