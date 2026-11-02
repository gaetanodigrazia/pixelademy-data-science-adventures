import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { SpriteView } from '../sprite-view';

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
  /** Quanti ostacoli (default 8: circa 30–60 secondi). */
  count?: number;
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
  const count = c.count ?? 8;
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
  const rnd = rng(c.level * 7919 + n);
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
  const count = c.count ?? 8;
  const rnd = rng(c.level * 104729 + c.v.length);
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
 * Corsa dei condizionali: minigioco bonus (30–60 s) tra la battaglia e il task. A ogni ostacolo compare una condizione Python:
 * se è vera si salta, se è falsa si corre. La difficoltà viene dal concetto (indici, len, append/pop), non dai riflessi:
 * con «riduci movimento» attivo non c'è limite di tempo. Sbagliare o lasciar scadere il tempo costa solo un errore e si passa oltre.
 */
@Component({
  selector: 'app-runner',
  imports: [SpriteView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="run" aria-label="Corsa dei condizionali">
      <header class="top">
        <h2>Corsa dei condizionali</h2>
        <span class="stats" aria-live="off">Ostacoli {{ done() }}/{{ obstacles.length }} · Errori {{ mistakes() }}</span>
      </header>
      <p class="goal"><strong>🎯 Obiettivo</strong> · Condizione vera: <b>salta</b>. Condizione falsa: <b>corri</b>.
        @if (timed) { Hai pochi secondi per ostacolo. } @else { Nessun limite di tempo. }</p>

      @if (current(); as o) {
        <div class="code" aria-label="Codice Python dell'ostacolo">
          @for (l of o.lines; track $index) { <code>{{ l }}</code> }
        </div>
        <!-- un elemento nuovo per ogni ostacolo: l'animazione e la barra del tempo ripartono da capo -->
        @for (n of key(); track n) {
          <div class="track" [class.jump]="jumping()" [class.stumble]="stumbling()">
            @if (character) { <app-sprite-view class="hero" [sprite]="character.sprite" [scale]="3" [label]="character.name" /> }
            <div class="ground" aria-hidden="true"></div>
            <div class="obstacle" [class.run]="timed && !locked()" [style.animation-duration.ms]="windowMs" role="status" aria-live="polite">
              <span class="sr">Ostacolo {{ done() + 1 }} di {{ obstacles.length }}: </span><code>{{ o.cond }}</code>
            </div>
          </div>
          @if (timed) {
            <div class="timer" aria-hidden="true"><i [class.run]="!locked()" [style.animation-duration.ms]="windowMs"></i></div>
          }
        }
        <div class="row" role="group" aria-label="Decidi">
          <button type="button" class="btn cmd primary" [disabled]="locked()" (click)="answer(true)">⬆ Salta (vero)</button>
          <button type="button" class="btn cmd" [disabled]="locked()" (click)="answer(false)">➡ Corri (falso)</button>
        </div>
        <p class="hint" aria-hidden="true">Tastiera: ↑ salta · → corri</p>
      } @else {
        <p class="end">🏁 Traguardo! {{ done() - mistakes() }} ostacoli su {{ obstacles.length }} superati al primo colpo.</p>
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
    .stats { font-size: .5rem; color: var(--muted); }
    .goal { margin: 0; padding: 6px 10px; font-size: .62rem; line-height: 1.6; background: #0b0b24; border-left: 4px solid var(--accent); }
    .goal strong { color: var(--accent-2); font-weight: normal; }
    .code { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; background: #020617; border: 2px solid var(--line); }
    .code code { font: .62rem/1.7 var(--mono); color: #e2e8f0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .track { position: relative; height: 110px; overflow: hidden; background: #0b1120; border: 2px solid var(--line); }
    .ground { position: absolute; left: 0; right: 0; bottom: 14px; height: 4px; background: var(--line); }
    .hero { position: absolute; left: 14px; bottom: 18px; transition: transform .25s ease-out; }
    .track.jump .hero { transform: translateY(-44px); }
    .track.stumble .hero { transform: rotate(-12deg); }
    .obstacle { position: absolute; bottom: 18px; left: 52%; max-width: 46%; padding: 6px 8px; background: #7c2d12; border: 2px solid #fb923c; }
    .obstacle code { font: .62rem/1.4 var(--mono); color: #fff7ed; overflow-wrap: anywhere; }
    .obstacle.run { animation: approach linear forwards; }
    @keyframes approach { from { left: 92%; } to { left: 20%; } }
    .timer { height: 6px; background: #020617; border: 1px solid #64748b; }
    .timer i { display: block; height: 100%; width: 100%; background: var(--accent); }
    .timer i.run { animation: drain linear forwards; }
    @keyframes drain { from { width: 100%; } to { width: 0; } }
    .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .hint { margin: 0; text-align: center; font-size: .5rem; color: var(--muted); }
    .msg { margin: 0; min-height: 2.6em; padding: 5px 8px; font-size: .58rem; line-height: 1.5; color: var(--muted); background: #020617; border-left: 4px solid var(--line); }
    .msg.ok { color: var(--good); border-left-color: var(--good); }
    .msg.err { color: #fca5a5; border-left-color: var(--bad); }
    .end { margin: 0; text-align: center; font-size: .75rem; color: var(--good); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    @media (prefers-reduced-motion: reduce) { .hero { transition: none; } .obstacle.run, .timer i.run { animation: none; } }
  `,
})
export class Runner extends BaseGame implements OnInit {
  protected obstacles: Obstacle[] = [];
  protected readonly done = signal(0);
  protected readonly locked = signal(false);
  protected readonly jumping = signal(false);
  protected readonly stumbling = signal(false);
  protected readonly current = computed(() => this.obstacles[this.done()] ?? null);
  protected readonly key = computed(() => [this.done()]);
  /** Senza `prefers-reduced-motion` c'è un limite di tempo per ostacolo; con il movimento ridotto no. */
  protected timed = true;
  protected windowMs = 7000;

  ngOnInit(): void {
    const level = this.level;
    const cfg: RunnerConfig = {
      kind: this.str('kind', 'index') === 'len' ? 'len' : 'index',
      name: this.str('name', 'valori'),
      v: this.nums('v', [1, 2, 3, 4, 5]),
      th: this.num('th', 3),
      level,
      count: Math.max(3, Math.floor(this.num('count', 8))),
    };
    this.obstacles = obstaclesFor(cfg);
    this.timed = !(typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.windowMs = Math.max(4000, 8000 - level * 300);
    this.arm();
  }

  /** Avvia il conto alla rovescia dell'ostacolo corrente (solo con il movimento normale). */
  private arm(): void {
    if (!this.timed || !this.current()) return;
    const at = this.done();
    this.after(() => { if (!this.cleared && this.done() === at && !this.locked()) this.resolve(null); }, this.windowMs);
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
      this.hit(`Giusto! ${o.why}`);
    } else {
      this.stumbling.set(true);
      this.miss(`${choice === null ? 'Tempo scaduto. ' : ''}${o.why} ${o.truth ? 'Andava saltata.' : 'Andava corsa.'}`);
    }
    this.after(() => {
      this.jumping.set(false);
      this.stumbling.set(false);
      this.done.update((n) => n + 1);
      this.locked.set(false);
      if (this.done() >= this.obstacles.length) this.win();
      else this.arm();
    }, 900);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') { e.preventDefault(); this.answer(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.answer(false); }
  }
}
