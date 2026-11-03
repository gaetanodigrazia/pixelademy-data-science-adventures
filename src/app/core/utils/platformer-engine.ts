import { fmt } from '../../shared/components/games/base-game';

/* ──────────────── Il motore del bonus platform: logica pura, senza disegno ──────────────── */

/** Dimensioni del mondo di gioco (coordinate logiche: il disegno le scala allo schermo). */
export const WORLD = { w: 360, h: 188, ground: 160, heroX: 64, heroW: 24, heroH: 26 } as const;
export const RUN_SECONDS = 15;
export const COIN_R = 10;
/** Altezza (dal suolo, centro) delle monete: per prenderle bisogna saltare in alto. */
export const COIN_Y = 80;

const GRAVITY = 1500;
/** Salto alto: ~120 px di picco, ~0,8 s in aria (prima ~77 px). */
const JUMP_V = 600;

/** Una moneta: porta un numero; se rispetta la regola («maggiori di 6») va presa, altrimenti evitata. */
export interface Coin {
  id: number;
  /** Posizione orizzontale del centro nel mondo (px). */
  x: number;
  /** Il numero scritto sulla moneta. */
  value: number;
  /** Rispetta la regola? */
  truth: boolean;
  why: string;
  /** `taken`: toccata; `passed`: superata senza toccarla; `live`: ancora in gioco. */
  state: 'live' | 'taken' | 'passed';
  /** Decisione giusta? (definita quando non è più `live`) */
  correct?: boolean;
}

export interface CoinSpec {
  value: number;
  truth: boolean;
  why: string;
}

export interface PlatformerConfig {
  /** Il nome della serie di dati (compare nella regola). */
  name: string;
  v: number[];
  /** Difficoltà della missione: i livelli dispari prendono i valori «maggiori di», quelli pari «minori di». */
  level: number;
}

/** La regola della corsa, letta una sola volta sopra il gioco: «prendi i numeri maggiori di 6». */
export interface Rule {
  op: '>' | '<';
  th: number;
  /** «maggiori» o «minori». */
  word: string;
}

/* ───────────────────────── generazione delle monete ───────────────────────── */
/*
 * Nessuna operazione: la condizione è una sola, scritta sopra il gioco, e ogni moneta mostra solo un numero.
 * La soglia sta nel punto in cui i dati si separano di più (la «forbice» più larga vicino al centro): i valori sono sempre ben distanti.
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

/**
 * La soglia: nel mezzo della forbice più larga tra due valori consecutivi (in ordine), cercandola tra il terzo e i due terzi dei dati
 * così le monete «giuste» e «sbagliate» sono più o meno in egual numero. Con interi distanti almeno 2 è un intero.
 */
export function chooseThreshold(values: number[]): number {
  const u = [...new Set(values)].sort((a, b) => a - b);
  if (u.length < 2) return u[0] ?? 0;
  const lo = Math.max(1, Math.floor(u.length / 3));
  const hi = Math.min(u.length - 1, Math.ceil((u.length * 2) / 3));
  let best = lo;
  for (let k = lo; k <= hi; k++) {
    const gap = u[k] - u[k - 1];
    const bestGap = u[best] - u[best - 1];
    if (gap > bestGap || (gap === bestGap && Math.abs(k - u.length / 2) < Math.abs(best - u.length / 2))) best = k;
  }
  const mid = (u[best - 1] + u[best]) / 2;
  return Number.isInteger(mid) ? mid : u[best] - u[best - 1] >= 2 ? Math.round(mid) : mid;
}

export function ruleFor(c: PlatformerConfig): Rule {
  const op = c.level % 2 === 1 ? '>' : '<';
  return { op, th: chooseThreshold(c.v), word: op === '>' ? 'maggiori' : 'minori' };
}

const holds = (x: number, r: Rule): boolean => (r.op === '>' ? x > r.th : x < r.th);

/** Le monete di una corsa: stessi dati, stessa corsa; vere e false alternate (mai più di due uguali di fila) e mai lo stesso numero due volte di fila. */
export function coinSpecs(c: PlatformerConfig, count = 16, seed = 0): CoinSpec[] {
  const rule = ruleFor(c);
  const yes = [...new Set(c.v)].filter((x) => holds(x, rule));
  const no = [...new Set(c.v)].filter((x) => !holds(x, rule));
  if (!yes.length || !no.length) return [];
  const rnd = rng(c.level * 7919 + c.v.length + seed * 31337);
  const out: CoinSpec[] = [];
  let run = 0, last = true, prev = NaN;
  for (let i = 0; i < count; i++) {
    let truth: boolean = i === 0 ? true : rnd() < 0.5 ? last : !last;
    if (run >= 2 && truth === last) truth = !last;
    const pool = truth ? yes : no;
    let x = pool[Math.floor(rnd() * pool.length)];
    if (x === prev && pool.length > 1) x = pool[(pool.indexOf(x) + 1) % pool.length];
    run = truth === last && i > 0 ? run + 1 : 1;
    last = truth; prev = x;
    out.push({ value: x, truth, why: `${fmt(x)} ${truth ? 'è' : 'non è'} ${rule.word === 'maggiori' ? 'maggiore' : 'minore'} di ${fmt(rule.th)}: ${truth ? 'va presa' : 'va evitata'}.` });
  }
  return out;
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
    let x = WORLD.w + 40;
    this.coins = specs.map((s, i) => {
      const coin: Coin = { id: i, x, ...s, state: 'live' };
      x += this.gap();
      return coin;
    });
  }

  private gap(): number { return 280 * this.speedScale; }

  /** Velocità di scorrimento (px/s): cresce poco con il tempo. */
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
    // l'eroe occupa [y, y + altezza] dal suolo; la moneta [COIN_Y - R, COIN_Y + R]
    return this.y + WORLD.heroH >= COIN_Y - COIN_R && this.y <= COIN_Y + COIN_R;
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
