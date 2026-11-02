import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, NgZone, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { GameLoop } from '../../../core/graphics/game-loop';
import { drawSprite } from '../../../core/graphics/sprite';
import { AIR_Y, COIN_R, Coin, PlatformerConfig, PlatformerEngine, RUN_SECONDS, WORLD, coinSpecs } from '../../../core/utils/platformer-engine';
import { BaseGame, list } from './base-game';

interface Pop { x: number; y: number; text: string; good: boolean; age: number }

/**
 * Bonus platform (15 secondi), stile Super Mario: il personaggio corre da solo, si salta con un tocco, con Spazio o con ↑.
 * Le monete portano una condizione Python: se è **vera** va presa, se è **falsa** evitata. Quelle a terra si prendono
 * camminandoci e si evitano saltando; quelle in aria il contrario. La logica sta in `PlatformerEngine` (testata); qui ci sono
 * disegno, ingressi e messaggi. Il bonus è facoltativo e non cambia gli XP.
 */
@Component({
  selector: 'app-platformer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="plat" aria-label="Bonus platform">
      <header class="top">
        <h2>🎁 Bonus: salta e raccogli</h2>
        <span class="stats">⏱ <b>{{ secondsLeft() }}</b> s · Punti <b>{{ score() }}</b> · Errori {{ mistakes() }}@if (streak() >= 2) { · <span class="hot">🔥 {{ streak() }}</span> }</span>
        @if (phase() === 'running') {
          <button type="button" class="btn pause" (click)="togglePause()" [attr.aria-pressed]="paused()" aria-label="Pausa (P o Esc)">{{ paused() ? '▶ Riprendi' : '⏸ Pausa' }}</button>
        }
      </header>
      <p class="goal"><strong>🎯 Regola</strong> · Condizione <b>vera</b>: prendi la moneta. <b>Falsa</b>: evitala.
        A terra: cammina per prenderla, salta per evitarla. In aria: il contrario.</p>
      @if (listLine) { <p class="code"><code>{{ listLine }}</code></p> }

      <div class="stage" role="group" aria-label="Area di gioco: tocca per saltare" (pointerdown)="onPointer($event)">
        <canvas #cv class="cv" aria-hidden="true"></canvas>
        @if (phase() === 'ready') {
          <div class="veil"><button type="button" class="btn primary" (click)="startRun()">Via! (tocca o Spazio)</button></div>
        } @else if (paused()) {
          <div class="veil"><p>⏸ In pausa</p><button type="button" class="btn primary" (click)="togglePause()">▶ Riprendi (P)</button></div>
        } @else if (phase() === 'done') {
          <div class="veil end"><p>⏱ Tempo! <b>{{ score() }}</b> punti</p><p class="sm">{{ correct() }} decisioni giuste · {{ mistakes() }} sbagliate · serie migliore {{ best() }}</p></div>
        }
      </div>
      <p class="hint" aria-hidden="true">Salta: tocco · Spazio · ↑</p>
      <p class="sr" aria-live="polite">{{ sr() }}</p>
      <p class="msg" [class.ok]="feedback()?.kind === 'ok'" [class.err]="feedback()?.kind === 'err'" role="status" aria-live="polite">{{ feedback()?.text }}</p>
    </section>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .plat { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px 10px; overflow-y: auto;
      background: var(--panel); border: 4px solid var(--line); }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    h2 { margin: 0; font-size: .7rem; }
    .stats { font-size: .55rem; color: var(--muted); } .stats b { color: var(--accent-2); } .hot { color: var(--accent-2); }
    .goal { margin: 0; padding: 6px 10px; font-size: .6rem; line-height: 1.6; background: #0b0b24; border-left: 4px solid var(--accent); }
    .goal strong { color: var(--accent-2); font-weight: normal; }
    .code { margin: 0; padding: 6px 10px; background: #020617; border: 2px solid var(--line); }
    .code code { font: .62rem/1.7 var(--mono); color: #e2e8f0; overflow-wrap: anywhere; }
    .stage { position: relative; width: 100%; max-width: 760px; align-self: center; aspect-ratio: 360 / 170; border: 2px solid var(--line); background: #5c94fc; cursor: pointer; touch-action: manipulation; user-select: none; }
    .cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }
    .veil { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(2, 6, 23, .55); }
    .veil p { margin: 0; font-size: .8rem; color: #fff; text-shadow: 0 2px 0 #000; } .veil .sm { font-size: .55rem; }
    .veil b { color: var(--accent-2); }
    .pause { padding: 4px 10px; font-size: .55rem; }
    .hint { margin: 0; text-align: center; font-size: .5rem; color: var(--muted); }
    .msg { margin: 0; min-height: 2.6em; padding: 5px 8px; font-size: .58rem; line-height: 1.5; color: var(--muted); background: #020617; border-left: 4px solid var(--line); }
    .msg.ok { color: var(--good); border-left-color: var(--good); } .msg.err { color: #fca5a5; border-left-color: var(--bad); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); margin: 0; }
  `,
})
export class Platformer extends BaseGame implements OnInit, AfterViewInit {
  private readonly zone = inject(NgZone);
  private readonly cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  protected engine!: PlatformerEngine;
  protected listLine = '';
  protected readonly phase = signal<'ready' | 'running' | 'done'>('ready');
  protected readonly score = signal(0);
  protected readonly streak = signal(0);
  protected readonly correct = signal(0);
  protected readonly best = signal(0);
  protected readonly secondsLeft = signal(RUN_SECONDS);
  protected readonly sr = signal('');
  /** In pausa: il tempo e il gioco sono fermi; si riprende solo dal pulsante (un tocco sull'area non basta). */
  protected readonly paused = signal(false);
  protected readonly reduced = computed(() => this.reducedMotion);
  private reducedMotion = false;
  private loop?: GameLoop;
  private ctx: CanvasRenderingContext2D | null = null;
  private pops: Pop[] = [];
  private announced = new Set<number>();

  ngOnInit(): void {
    const cfg: PlatformerConfig = {
      kind: (['pop', 'len', 'sum', 'mean', 'minmax', 'dict', 'cmp'] as const).find((k) => k === this.str('kind', 'index')) ?? 'index',
      name: this.str('name', 'valori'),
      v: this.nums('v', [1, 2, 3, 4, 5]),
      th: this.num('th', 3),
      level: this.level,
      d: this.dict({}),
    };
    this.reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.engine = new PlatformerEngine(coinSpecs(cfg, 16), this.reducedMotion ? 0.8 : 1);
    this.listLine = cfg.kind === 'index' ? `${cfg.name} = ${list(cfg.v)}` : cfg.kind === 'dict' ? `${cfg.name} = {${Object.entries(cfg.d ?? {}).map(([k, x]) => `'${k}': ${x}`).join(', ')}}` : '';
  }

  ngAfterViewInit(): void {
    this.ctx = this.cv().nativeElement.getContext('2d');
    this.zone.runOutsideAngular(() => {
      this.loop = new GameLoop((dt) => this.update(dt), () => this.draw());
      this.loop.start();
    });
  }

  override ngOnDestroy(): void {
    this.loop?.stop();
    super.ngOnDestroy();
  }

  protected startRun(): void {
    if (this.phase() === 'ready') this.phase.set('running');
  }

  protected onPointer(e: Event): void {
    if ((e.target as HTMLElement).closest('button')) return; // i pulsanti («Via!», «Riprendi») fanno da sé
    if (this.paused()) return; // in pausa un tocco sull'area non riprende per sbaglio
    this.press();
  }

  /** Pausa e ripresa (pulsante, P o Esc). */
  protected togglePause(): void {
    if (this.phase() !== 'running') return;
    this.paused.update((p) => !p);
    this.say(this.paused() ? 'Gioco in pausa: il tempo è fermo.' : 'Si riparte!', 'info');
    this.zone.run(() => this.sr.set(this.paused() ? 'Pausa' : 'Si riparte'));
  }

  /** Se la scheda del browser va in background il gioco non deve continuare a correre: si mette in pausa. */
  @HostListener('document:visibilitychange')
  protected onVisibility(): void {
    if (typeof document !== 'undefined' && document.hidden && this.phase() === 'running' && !this.paused()) this.togglePause();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && this.phase() === 'running') {
      const tgt = e.target as HTMLElement | null;
      if (typeof tgt?.closest === 'function' && tgt.closest('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      this.togglePause();
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== ' ') return;
    if (this.paused()) return;
    const t = e.target as HTMLElement | null;
    if (e.key === ' ' && typeof t?.closest === 'function' && t.closest('button, a, input, textarea, [contenteditable]')) return; // Spazio su un pulsante lo attiva
    if (this.phase() === 'done') return;
    e.preventDefault();
    this.press();
  }

  private press(): void {
    if (this.phase() === 'ready') { this.phase.set('running'); return; }
    if (this.phase() === 'running' && !this.paused()) this.engine.jump();
  }

  /** Un passo di simulazione (richiamabile anche dai test, senza canvas). */
  protected update(dt: number): void {
    if (this.phase() !== 'running' || this.paused()) return;
    const e = this.engine;
    const before = e.lastEvent;
    e.step(dt);
    for (const p of this.pops) p.age += dt;
    this.pops = this.pops.filter((p) => p.age < 0.8);
    if (e.lastEvent && e.lastEvent !== before) this.onResolved(e.lastEvent);
    const next = e.coins.find((c) => c.state === 'live' && c.x < WORLD.w && !this.announced.has(c.id));
    if (next) { this.announced.add(next.id); this.zone.run(() => this.sr.set(`Moneta ${next.air ? 'in aria' : 'a terra'}: ${next.cond}`)); }
    const left = Math.max(0, Math.ceil(RUN_SECONDS - e.t));
    if (left !== this.secondsLeft() || e.score !== this.score()) this.zone.run(() => { this.secondsLeft.set(left); this.score.set(e.score); this.streak.set(e.streak); });
    if (e.finished) this.zone.run(() => this.finish());
  }

  private onResolved(c: Coin): void {
    const y = c.air ? WORLD.ground - AIR_Y : WORLD.ground - COIN_R;
    this.pops.push({ x: WORLD.heroX, y: y - 28, text: c.correct ? '+10' : '✗', good: !!c.correct, age: 0 });
    this.zone.run(() => {
      this.correct.set(this.engine.correct);
      this.best.set(this.engine.best);
      this.mistakes.set(this.engine.mistakes);
      if (c.correct) this.hit(`${c.why}${this.engine.streak >= 3 ? ` 🔥 Serie di ${this.engine.streak}!` : ''}`);
      else this.say(`${c.why} ${c.truth ? 'Andava presa.' : 'Andava evitata.'}`, 'err');
    });
  }

  private finish(): void {
    if (this.phase() === 'done') return;
    this.correct.set(this.engine.correct);
    this.best.set(this.engine.best);
    this.mistakes.set(this.engine.mistakes);
    this.score.set(this.engine.score);
    this.secondsLeft.set(0);
    this.phase.set('done');
    this.loop?.stop();
    this.win();
  }

  /* ─────────────────────────────── disegno ─────────────────────────────── */

  private draw(): void {
    const ctx = this.ctx;
    const canvas = this.cv().nativeElement;
    if (!ctx) return;
    const cssW = canvas.clientWidth || WORLD.w;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const w = Math.round(cssW * dpr), h = Math.round(((cssW * WORLD.h) / WORLD.w) * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const s = w / WORLD.w;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const d = this.engine.distance;
    const still = this.reducedMotion;

    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.ground);
    sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#a9ccff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    // nuvole (lontane) e colline (più vicine): scorrono più piano del terreno
    ctx.fillStyle = '#ffffff';
    for (let i = -1; i < 4; i++) {
      const x = ((i * 150 - (still ? 0 : d * 0.15)) % 600 + 600) % 600 - 60;
      ctx.fillRect(x, 26, 44, 9); ctx.fillRect(x + 8, 20, 28, 9); ctx.fillRect(x + 14, 35, 24, 6);
    }
    ctx.fillStyle = '#3aa55d';
    for (let i = -1; i < 4; i++) {
      const x = ((i * 170 - (still ? 0 : d * 0.4)) % 680 + 680) % 680 - 80;
      ctx.beginPath(); ctx.ellipse(x + 50, WORLD.ground, 56, 34, 0, Math.PI, 0); ctx.fill();
    }
    // terreno a mattoni
    ctx.fillStyle = '#b5651d'; ctx.fillRect(0, WORLD.ground, WORLD.w, WORLD.h - WORLD.ground);
    ctx.fillStyle = '#3cb44b'; ctx.fillRect(0, WORLD.ground, WORLD.w, 6);
    ctx.fillStyle = '#7a3e0b';
    const off = still ? 0 : d % 32;
    for (let x = -off; x < WORLD.w; x += 32) ctx.fillRect(x, WORLD.ground + 14, 2, WORLD.h - WORLD.ground);
    ctx.fillRect(0, WORLD.ground + 14, WORLD.w, 2);

    // monete
    for (const c of this.engine.coins) {
      if (c.state !== 'live' || c.x < -90 || c.x > WORLD.w + 90) continue;
      const cy = WORLD.ground - (c.air ? AIR_Y : COIN_R);
      ctx.fillStyle = '#7a5b00'; ctx.beginPath(); ctx.arc(c.x, cy, COIN_R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(c.x, cy, COIN_R - 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(c.x - 3, cy - 6, 2.5, 10);
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(c.cond).width + 8;
      const ly = cy - COIN_R - 10;
      ctx.fillStyle = 'rgba(2, 6, 23, .82)'; ctx.fillRect(c.x - tw / 2, ly - 9, tw, 18);
      ctx.fillStyle = '#ffffff'; ctx.fillText(c.cond, c.x, ly);
    }

    // eroe
    const ch = this.character;
    if (ch) {
      const hy = WORLD.ground - this.engine.y - WORLD.heroH;
      const bob = this.engine.onGround && this.phase() === 'running' && !still ? Math.sin(d / 10) * 1.2 : 0;
      drawSprite(ctx, ch.sprite, WORLD.heroX - 12, hy + bob, 2);
    }
    // +10 / ✗ che salgono
    ctx.font = 'bold 12px monospace';
    for (const p of this.pops) {
      ctx.fillStyle = p.good ? '#16a34a' : '#dc2626';
      ctx.fillText(p.text, p.x, p.y - p.age * 30);
    }
    // barra del tempo
    ctx.fillStyle = 'rgba(2, 6, 23, .6)'; ctx.fillRect(0, 0, WORLD.w, 5);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 0, WORLD.w * (1 - this.engine.t / RUN_SECONDS), 5);
  }
}
