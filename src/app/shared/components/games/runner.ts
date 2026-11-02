import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { SpriteView } from '../sprite-view';

/** Durata della corsa (con il movimento normale). */
export const RUN_SECONDS = 15;
/** Ostacoli disponibili per la corsa a tempo (la corsa finisce comunque allo scadere dei secondi). */
export const DEFAULT_COUNT = 12;
/** Con il tempo si preparano almeno tanti ostacoli (chi risponde in fretta ne supera circa 20 in 15 secondi). */
export const MIN_TIMED_POOL = 40;
/** Ostacoli della corsa senza limite di tempo (movimento ridotto). */
export const UNTIMED_COUNT = 6;

/** Un ostacolo: il codice che lo precede, la condizione scritta sull'ostacolo e se è vera. */
export interface Obstacle {
  lines: string[];
  cond: string;
  truth: boolean;
  why: string;
}

export interface RunnerConfig {
  kind: 'index' | 'len';
  name: string;
  v: number[];
  th: number;
  level: number;
  /** Quanti ostacoli (default 12; la corsa a tempo finisce comunque dopo 15 secondi). */
  count?: number;
  /** Per ottenere un'altra serie di ostacoli a parità di dati (la corsa a tempo ne concatena più d'una). */
  seed?: number;
}

/** PRNG deterministico: stessi dati, stessa corsa (e test ripetibili). */
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

const OPS: Record<string, (a: number, b: number) => boolean> = {
  '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '==': (a, b) => a === b,
};

/** Ostacoli «leggi un elemento e confrontalo»: `prezzi[2] > 6`. Da livello 2 anche indici negativi e >=, <=. */
export function indexObstacles(c: RunnerConfig): Obstacle[] {
  const n = c.v.length;
  const ops = c.level >= 2 ? ['>', '<', '>=', '<='] : ['>', '<'];
  const idxs = Array.from({ length: n }, (_, i) => i).concat(c.level >= 2 ? Array.from({ length: n }, (_, i) => -(i + 1)) : []);
  const all: Obstacle[] = [];
  for (const idx of idxs) {
    for (const op of ops) {
      const value = c.v[idx < 0 ? n + idx : idx];
      const truth = OPS[op](value, c.th);
      all.push({
        lines: [`${c.name} = ${list(c.v)}`],
        cond: `${c.name}[${idx}] ${op} ${fmt(c.th)}`,
        truth,
        why: `${c.name}[${idx}] vale ${fmt(value)}: ${fmt(value)} ${op} ${fmt(c.th)} è ${truth ? 'vero' : 'falso'}.`,
      });
    }
  }
  const count = Math.min(c.count ?? DEFAULT_COUNT, all.length);
  const rnd = rng(c.level * 7919 + n + (c.seed ?? 0) * 31337);
  const yes = shuffled(all.filter((o) => o.truth), rnd);
  const no = shuffled(all.filter((o) => !o.truth), rnd);
  const half = Math.floor(count / 2);
  const picked = [...yes.slice(0, half), ...no.slice(0, count - half)];
  // se un gruppo è troppo piccolo si completa con l'altro
  for (const o of [...yes.slice(half), ...no.slice(count - half)]) if (picked.length < count) picked.push(o);
  return shuffled(picked, rnd);
}

/** Ostacoli «dopo append/pop quanto è lunga la lista»: la lista cambia da un ostacolo all'altro. */
export function lenObstacles(c: RunnerConfig): Obstacle[] {
  const count = c.count ?? DEFAULT_COUNT;
  const rnd = rng(c.level * 104729 + c.v.length + (c.seed ?? 0) * 31337);
  const state = [...c.v];
  let fed = 0;
  const out: Obstacle[] = [];
  const truths = shuffled(Array.from({ length: count }, (_, i) => i % 2 === 0), rnd);
  for (let j = 0; j < count; j++) {
    const before = [...state];
    let op: string;
    if (state.length <= 2) op = 'append';
    else if (state.length >= c.v.length + 2) op = 'pop';
    else op = rnd() < 0.5 ? 'append' : 'pop';
    let opLine: string;
    if (op === 'append') {
      const x = c.v[fed++ % c.v.length];
      state.push(x);
      opLine = `${c.name}.append(${fmt(x)})`;
    } else {
      const x = state.pop() as number;
      opLine = `${c.name}.pop()   # toglie ${fmt(x)}`;
    }
    const len = state.length;
    const useEq = rnd() < 0.5;
    const truth = truths[j];
    let cond: string, ok: boolean;
    if (useEq) {
      const t = truth ? len : len + (rnd() < 0.5 ? 1 : -1);
      cond = `len(${c.name}) == ${t}`;
      ok = len === t;
    } else {
      const t = truth ? len - 1 : len;
      cond = `len(${c.name}) > ${t}`;
      ok = len > t;
    }
    out.push({
      lines: [`${c.name} = ${list(before)}`, opLine],
      cond,
      truth: ok,
      why: `Dopo ${op === 'append' ? 'append' : 'pop'} la lista ha ${len} elementi: ${cond.replace(`len(${c.name})`, String(len))} è ${ok ? 'vero' : 'falso'}.`,
    });
  }
  return out;
}

export function obstaclesFor(c: RunnerConfig): Obstacle[] {
  return c.kind === 'len' ? lenObstacles(c) : indexObstacles(c);
}

/**
 * Corsa dei condizionali: minigioco **bonus** di 15 secondi, che compare a sorpresa dopo una buona battaglia. A ogni ostacolo compare
 * una condizione Python: se è vera si salta, se è falsa si corre. La difficoltà viene dal concetto (indici, len, append/pop): gli
 * ostacoli si susseguono, la velocità cresce e una serie di risposte giuste dà punti extra. Allo scadere dei 15 secondi la corsa
 * finisce con il punteggio. Con «riduci movimento» non c'è limite di tempo: la corsa è di pochi ostacoli.
 * Sbagliare o lasciar scadere il tempo di un ostacolo costa solo un errore e si passa oltre.
 */
@Component({
  selector: 'app-runner',
  imports: [SpriteView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="run" aria-label="Corsa dei condizionali" [style.--speed.ms]="scrollMs()">
      <header class="top">
        <h2>🎁 Corsa dei condizionali</h2>
        <span class="stats">Punti <b>{{ score() }}</b> · Errori {{ mistakes() }}@if (timed) { · ⏱ <b>{{ secondsLeft() }}</b> s }</span>
      </header>
      <p class="goal"><strong>🎯 Obiettivo</strong> · Condizione vera: <b>salta</b>. Condizione falsa: <b>corri</b>.
        @if (timed) { Hai {{ runSeconds }} secondi: più ostacoli superi, più punti! } @else { Nessun limite di tempo. }</p>
      <div class="meter" role="progressbar" aria-valuemin="0" [attr.aria-valuemax]="timed ? runSeconds : obstacles.length"
        [attr.aria-valuenow]="timed ? secondsLeft() : done()"
        [attr.aria-label]="timed ? ('Tempo rimasto: ' + secondsLeft() + ' secondi') : ('Ostacolo ' + (done() + 1 > obstacles.length ? obstacles.length : done() + 1) + ' di ' + obstacles.length)">
        <i [style.width.%]="timed ? (remainingMs() / (runSeconds * 1000)) * 100 : (done() / obstacles.length) * 100"></i>
        <span class="streak" [class.hot]="streak() >= 3" aria-live="polite">🔥 Serie {{ streak() }}</span>
      </div>

      @if (current(); as o) {
        <div class="code" aria-label="Codice Python dell'ostacolo">
          @for (l of o.lines; track $index) { <code>{{ l }}</code> }
        </div>
        <!-- un elemento nuovo per ogni ostacolo: l'animazione e la barra del tempo ripartono da capo -->
        @for (n of key(); track n) {
          <div class="track" [class.jump]="jumping()" [class.stumble]="stumbling()" [class.paused]="!timed || locked()">
            <div class="sky" aria-hidden="true"></div>
            <div class="hills" aria-hidden="true"></div>
            <div class="ground" aria-hidden="true"></div>
            @if (character) { <app-sprite-view class="hero" [sprite]="character.sprite" [scale]="3" [label]="character.name" /> }
            <div class="obstacle" [class.run]="timed && !locked()" [class.hit]="cleared1()" [style.animation-duration.ms]="windowMs()" role="status" aria-live="polite">
              <span class="sr">Ostacolo {{ done() + 1 }} di {{ obstacles.length }}: </span><code>{{ o.cond }}</code>
            </div>
          </div>
          @if (timed) {
            <div class="timer" aria-hidden="true"><i [class.run]="!locked()" [style.animation-duration.ms]="windowMs()"></i></div>
          }
        }
        <div class="row" role="group" aria-label="Decidi">
          <button type="button" class="btn cmd primary" [disabled]="locked()" (click)="answer(true)">⬆ Salta (vero)</button>
          <button type="button" class="btn cmd" [disabled]="locked()" (click)="answer(false)">➡ Corri (falso)</button>
        </div>
        <p class="hint" aria-hidden="true">Tastiera: ↑ salta · → corri</p>
      } @else {
        <p class="end">{{ timeUp() ? '⏱ Tempo!' : '🏁 Traguardo!' }} {{ score() }} punti · {{ done() - mistakes() }} ostacoli superati su {{ done() }} · serie migliore {{ best() }}.</p>
      }
      <p class="msg" [class.ok]="feedback()?.kind === 'ok'" [class.err]="feedback()?.kind === 'err'" role="status" aria-live="polite">{{ feedback()?.text }}</p>
    </section>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .run { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px 10px; overflow-y: auto;
      background: var(--panel); border: 4px solid var(--line); }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    h2 { margin: 0; font-size: .7rem; }
    .stats { font-size: .55rem; color: var(--muted); }
    .stats b { color: var(--accent-2); }
    .goal { margin: 0; padding: 6px 10px; font-size: .62rem; line-height: 1.6; background: #0b0b24; border-left: 4px solid var(--accent); }
    .goal strong { color: var(--accent-2); font-weight: normal; }
    .meter { position: relative; height: 14px; background: #020617; border: 1px solid #64748b; }
    .meter i { display: block; height: 100%; background: var(--good); transition: width .3s; }
    .streak { position: absolute; right: 6px; top: -1px; font-size: .55rem; line-height: 14px; color: var(--muted); }
    .streak.hot { color: var(--accent-2); }
    .code { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; background: #020617; border: 2px solid var(--line); }
    .code code { font: .62rem/1.7 var(--mono); color: #e2e8f0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .track { position: relative; height: 150px; overflow: hidden; background: linear-gradient(#0b1120, #1e1b4b); border: 2px solid var(--line); }
    /* sfondo che scorre: più lontano = più lento; la velocità cresce con l'avanzare della corsa (--speed) */
    .hills { position: absolute; left: 0; right: 0; bottom: 30px; height: 40px; opacity: .6;
      background: repeating-linear-gradient(90deg, #312e81 0 60px, transparent 60px 110px); animation: scroll-hills calc(var(--speed, 3000ms) * .92) linear infinite; }
    .sky { position: absolute; inset: 0 0 70px; opacity: .8;
      background: radial-gradient(circle, #fff 1px, transparent 1.5px) 0 0 / 70px 40px; animation: scroll-sky calc(var(--speed, 3000ms) * 1.55) linear infinite; }
    .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 30px; background: #0f172a; border-top: 4px solid var(--line); }
    .ground::after { content: ''; position: absolute; inset: 8px 0 0; animation: scroll-ground calc(var(--speed, 3000ms) * .19) linear infinite;
      background: repeating-linear-gradient(90deg, #475569 0 24px, transparent 24px 56px); height: 4px; }
    .track.paused .hills, .track.paused .sky, .track.paused .ground::after { animation-play-state: paused; }
    /* ogni strato scorre di un suo periodo intero: il ciclo è senza stacchi */
    @keyframes scroll-hills { to { background-position-x: -110px; } }
    @keyframes scroll-sky { to { background-position-x: -70px; } }
    @keyframes scroll-ground { to { background-position-x: -56px; } }
    .hero { position: absolute; left: 18px; bottom: 30px; animation: bob .5s ease-in-out infinite; transition: transform .3s cubic-bezier(.3, 1.4, .5, 1); }
    .track.paused .hero { animation-play-state: paused; }
    @keyframes bob { 0%, 100% { margin-bottom: 0; } 50% { margin-bottom: 4px; } }
    .track.jump .hero { transform: translateY(-62px); }
    .track.stumble .hero { transform: rotate(-14deg); }
    .obstacle { position: absolute; bottom: 30px; left: 55%; width: max-content; max-width: 70%; padding: 6px 8px; background: #7c2d12; border: 2px solid #fb923c;
      box-shadow: 0 4px 0 #431407; transition: opacity .3s, transform .3s; }
    .obstacle code { font: .62rem/1.4 var(--mono); color: #fff7ed; overflow-wrap: anywhere; }
    .obstacle.run { animation: approach linear forwards; }
    .obstacle.hit { opacity: 0; transform: scale(.6); }
    @keyframes approach { from { left: 92%; } to { left: 22%; } }
    .timer { height: 6px; background: #020617; border: 1px solid #64748b; }
    .timer i { display: block; height: 100%; width: 100%; background: var(--accent); }
    .timer i.run { animation: drain linear forwards; }
    @keyframes drain { from { width: 100%; } to { width: 0; } }
    .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .hint { margin: 0; text-align: center; font-size: .5rem; color: var(--muted); }
    .msg { margin: 0; min-height: 2.6em; padding: 5px 8px; font-size: .58rem; line-height: 1.5; color: var(--muted); background: #020617; border-left: 4px solid var(--line); }
    .msg.ok { color: var(--good); border-left-color: var(--good); }
    .msg.err { color: #fca5a5; border-left-color: var(--bad); }
    .end { margin: 0; text-align: center; font-size: .75rem; line-height: 1.6; color: var(--good); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    @media (prefers-reduced-motion: reduce) {
      .hero, .hills, .sky, .ground::after, .obstacle.run, .timer i.run { animation: none; }
      .hero { transition: none; }
    }
  `,
})
export class Runner extends BaseGame implements OnInit {
  protected obstacles: Obstacle[] = [];
  protected readonly done = signal(0);
  protected readonly locked = signal(false);
  protected readonly jumping = signal(false);
  protected readonly stumbling = signal(false);
  protected readonly cleared1 = signal(false);
  protected readonly streak = signal(0);
  protected readonly best = signal(0);
  protected readonly score = signal(0);
  protected readonly timeUp = signal(false);
  protected readonly remainingMs = signal(RUN_SECONDS * 1000);
  protected readonly secondsLeft = computed(() => Math.ceil(this.remainingMs() / 1000));
  protected readonly runSeconds = RUN_SECONDS;
  protected readonly current = computed(() => (this.timeUp() ? null : this.obstacles[this.done()] ?? null));
  protected readonly key = computed(() => [this.done()]);
  /** Senza `prefers-reduced-motion` c'è un limite di tempo per ostacolo; con il movimento ridotto no. */
  protected timed = true;
  private start = 4500;

  /** Il tempo per ostacolo scende da ~4,5 a ~2,5 secondi: la corsa accelera. */
  protected readonly windowMs = computed(() => Math.max(2500, this.start - this.done() * 250));
  /** Durata di un giro dello sfondo: più breve = più veloce. */
  protected readonly scrollMs = computed(() => Math.max(1200, 3200 - this.done() * 200));

  ngOnInit(): void {
    const level = this.level;
    const cfg: RunnerConfig = {
      kind: this.str('kind', 'index') === 'len' ? 'len' : 'index',
      name: this.str('name', 'valori'),
      v: this.nums('v', [1, 2, 3, 4, 5]),
      th: this.num('th', 3),
      level,
      count: 0,
    };
    this.timed = !(typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    cfg.count = Math.max(3, Math.floor(this.num('count', this.timed ? DEFAULT_COUNT : UNTIMED_COUNT)));
    this.obstacles = obstaclesFor(cfg);
    if (this.timed) {
      // serbatoio abbondante: chi risponde in fretta non finisce gli ostacoli prima dei 15 secondi
      for (let seed = 1; this.obstacles.length < MIN_TIMED_POOL && seed < 20; seed++) this.obstacles = [...this.obstacles, ...obstaclesFor({ ...cfg, seed })];
    }
    this.start = 4800 - level * 100;
    if (this.timed) {
      // il conto alla rovescia generale parte subito: allo scadere la corsa finisce con il punteggio
      const t0 = Date.now();
      this.every(() => {
        if (this.cleared) return;
        const left = Math.max(0, RUN_SECONDS * 1000 - (Date.now() - t0));
        this.remainingMs.set(left);
        if (left <= 0) this.finish(true);
      }, 100);
    }
    this.arm();
  }

  /** Fine della corsa: per tempo scaduto o perché gli ostacoli sono finiti. */
  private finish(timeUp: boolean): void {
    if (this.cleared) return;
    this.timeUp.set(timeUp);
    this.win();
  }

  /** Avvia il conto alla rovescia dell'ostacolo corrente (solo con il movimento normale). */
  private arm(): void {
    if (!this.timed || !this.current()) return;
    const at = this.done();
    this.after(() => { if (!this.cleared && this.done() === at && !this.locked()) this.resolve(null); }, this.windowMs());
  }

  protected answer(jump: boolean): void {
    if (this.locked() || !this.current()) return;
    this.jumping.set(jump);
    this.resolve(jump);
  }

  /** `choice` = null: tempo scaduto. */
  private resolve(choice: boolean | null): void {
    const o = this.current();
    if (!o || this.locked()) return;
    this.locked.set(true);
    if (choice === o.truth) {
      this.streak.update((n) => n + 1);
      this.best.update((b) => Math.max(b, this.streak()));
      this.score.update((n) => n + 10 + Math.min(this.streak() - 1, 5) * 2); // la serie dà punti extra
      this.cleared1.set(true);
      this.hit(`Giusto! ${o.why}${this.streak() >= 3 ? ` 🔥 Serie di ${this.streak()}!` : ''}`);
    } else {
      this.streak.set(0);
      this.stumbling.set(true);
      this.miss(`${choice === null ? 'Tempo scaduto. ' : ''}${o.why} ${o.truth ? 'Andava saltata.' : 'Andava corsa.'}`);
    }
    this.after(() => {
      this.jumping.set(false);
      this.stumbling.set(false);
      this.cleared1.set(false);
      this.done.update((n) => n + 1);
      this.locked.set(false);
      if (this.done() >= this.obstacles.length) this.finish(false);
      else this.arm();
    }, 500);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') { e.preventDefault(); this.answer(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.answer(false); }
  }
}
