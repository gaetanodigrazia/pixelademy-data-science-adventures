import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, effect, inject, input, output, viewChild } from '@angular/core';
import { GameLoop } from '../../core/graphics/game-loop';
import { drawSprite, spriteSize } from '../../core/graphics/sprite';
import { Character } from '../../core/models/character.model';
import { Mission } from '../../core/models/mission.model';
import { MissionStatus } from '../../core/services/mission.service';
import { COMPACT_MAX_WIDTH, MapLayout, hitRadius, mapLayout, nodeAt } from '../../core/utils/map-layout';

const SCALE = 3;
const FONT = '"Press Start 2P", "Courier New", monospace';

/** Mappa del mondo: l'eroe cammina tra i blocchi missione (frecce/click per muoversi, Invio/Spazio per giocare). */
@Component({
  selector: 'app-world-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<canvas #canvas [width]="w" [height]="height" ' +
    'aria-label="Mappa del mondo: frecce per muoverti, Invio per giocare" (click)="onClick($event)"></canvas>',
  styles: `
    :host { display: flex; align-items: center; justify-content: center; min-height: 0; min-width: 0; }
    canvas { width: auto; height: auto; max-width: 100%; max-height: 100%; display: block; image-rendering: pixelated;
      border: 4px solid #fbbf24; box-shadow: 0 0 0 4px #000, 0 0 24px rgba(251, 191, 36, .35); cursor: pointer; }
    /* Telefono: la mappa è larga quanto lo schermo e alta quanto serve (la pagina scorre), invece di rimpicciolirsi nello spazio che avanza. */
    @media (max-width: 760px) {
      :host { display: block; }
      canvas { width: 100%; max-height: none; touch-action: manipulation; }
    }
  `,
})
export class WorldMap implements AfterViewInit, OnDestroy {
  readonly missions = input.required<Mission[]>();
  readonly character = input.required<Character>();
  readonly statuses = input.required<MissionStatus[]>();
  /** Missione su cui parte l'eroe. */
  readonly startId = input<string | null>(null);
  /** Missione appena completata: al primo caricamento l'eroe parte da lì e cammina fino a `startId`. */
  readonly walkFrom = input<string | null>(null);
  readonly missionSelected = output<string>();
  readonly missionEntered = output<string>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  protected w = 800;
  protected height = 360;
  /** Lato di un blocco missione, in unità della tela (più grande su telefono). */
  private node = 40;
  private compact = false;
  private mq?: MediaQueryList;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly onMedia = () => this.applyMedia();
  private ctx: CanvasRenderingContext2D | null = null;
  private loop?: GameLoop;
  private time = 0;
  private nodes: { x: number; y: number }[] = [];
  private index = 0;
  private heroX = 0;
  private heroY = 0;
  private queue: number[] = [];
  private facingLeft = false;
  private shake = 0;
  private walked = false;
  private readonly dataMotes = Array.from({ length: 64 }, (_, i) => ({
    x: (i * 137 + 29) % 400,
    y: (i * 71 + 13) % 300,
    size: i % 5 === 0 ? 3 : 1 + (i % 2),
    phase: i * 0.31,
  }));
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKey(e);

  constructor() {
    this.mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH}px)`) : undefined;
    this.compact = this.mq?.matches ?? false;
    // Percorso cambiato: ricalcola layout e posizione dell'eroe.
    effect(() => {
      this.missions();
      this.startId();
      this.walkFrom();
      this.layout();
    });
  }

  ngAfterViewInit(): void {
    this.mq?.addEventListener?.('change', this.onMedia);
    this.ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!this.ctx) return;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('keydown', this.onKeyDown);
      this.loop = new GameLoop((dt, t) => this.update(dt, t), () => this.draw());
      this.loop.start();
    });
  }

  ngOnDestroy(): void {
    this.loop?.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    this.mq?.removeEventListener?.('change', this.onMedia);
  }

  /** Schermo ridimensionato o ruotato: si passa al layout da telefono (o si torna a quello largo) senza ricaricare. */
  private applyMedia(): void {
    const compact = this.mq?.matches ?? false;
    if (compact === this.compact) return;
    this.compact = compact;
    this.layout();
    this.cdr.markForCheck();
  }

  private layout(): void {
    const missions = this.missions();
    const l: MapLayout = mapLayout(missions.length, this.compact);
    this.nodes = l.nodes;
    this.w = l.w;
    this.node = l.node;
    this.height = l.height;
    this.index = Math.max(0, missions.findIndex((m) => m.id === this.startId()));
    this.queue = [];
    const from = this.walked ? -1 : missions.findIndex((m) => m.id === this.walkFrom());
    const origin = from >= 0 && from < this.index ? from : this.index;
    for (let i = origin + 1; i <= this.index; i++) this.queue.push(i);
    const n = this.nodes[origin];
    if (n) {
      this.heroX = n.x;
      this.heroY = n.y;
    }
    this.walked ||= missions.length > 0;
  }

  private isUnlocked(i: number): boolean {
    return this.statuses()[i] !== 'locked';
  }

  private isCompleted(i: number): boolean {
    return this.statuses()[i] === 'completed';
  }

  private moveTo(target: number): void {
    const step = Math.sign(target - this.index);
    for (let i = this.index + step; i !== target + step; i += step) this.queue.push(i);
    this.index = target;
    this.zone.run(() => this.missionSelected.emit(this.missions()[target].id));
  }

  private enter(): void {
    if (this.isUnlocked(this.index)) {
      this.zone.run(() => this.missionEntered.emit(this.missions()[this.index].id));
    } else {
      this.shake = 0.25;
    }
  }

  private handleKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || target?.closest('input, textarea, select, [contenteditable], button, a, [role=dialog]')) return;
    const key = e.key.toLowerCase();
    const next = ['arrowright', 'arrowdown', 'd', 's'].includes(key);
    const prev = ['arrowleft', 'arrowup', 'a', 'w'].includes(key);
    const confirm = key === 'enter' || key === ' ';
    if (!next && !prev && !confirm) return;
    e.preventDefault();
    if (confirm) return this.enter();
    const to = this.index + (next ? 1 : -1);
    if (to < 0 || to >= this.missions().length) return;
    if (this.isUnlocked(to)) this.moveTo(to);
    else this.shake = 0.25;
  }

  protected onClick(event: MouseEvent): void {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const scale = rect.width / this.w;
    const x = ((event.clientX - rect.left) / rect.width) * this.w;
    const y = ((event.clientY - rect.top) / rect.height) * this.height;
    const hit = nodeAt(this.nodes, x, y, hitRadius(this.node, scale));
    if (hit < 0) return;
    if (hit === this.index) this.enter();
    else if (this.isUnlocked(hit)) this.moveTo(hit);
    else this.shake = 0.25;
  }

  private update(dt: number, t: number): void {
    this.time = t;
    this.shake -= dt;
    for (const mote of this.dataMotes) mote.x = (mote.x + (8 + mote.size * 3) * dt) % this.w;
    const next = this.queue[0];
    if (next === undefined) return;
    const n = this.nodes[next];
    const dx = n.x - this.heroX;
    const dy = n.y - this.heroY;
    const dist = Math.hypot(dx, dy);
    const step = 260 * dt;
    if (dx !== 0) this.facingLeft = dx < 0;
    if (dist <= step) {
      this.heroX = n.x;
      this.heroY = n.y;
      this.queue.shift();
    } else {
      this.heroX += (dx / dist) * step;
      this.heroY += (dy / dist) * step;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const H = this.height;
    const backdrop = ctx.createLinearGradient(0, 0, this.w, H);
    backdrop.addColorStop(0, '#080b1e');
    backdrop.addColorStop(0.55, '#111b38');
    backdrop.addColorStop(1, '#24143d');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, this.w, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H - 30);
      ctx.stroke();
    }
    for (let y = 0; y <= H - 30; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
    ctx.restore();

    for (const mote of this.dataMotes) {
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(this.time * 1.4 + mote.phase)) * 0.55;
      ctx.fillStyle = mote.size === 3 ? '#f0abfc' : '#a5f3fc';
      ctx.fillRect(mote.x, mote.y, mote.size, mote.size);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(196, 181, 253, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(650, 110 + i * 8, 90 + i * 20, 24 + i * 8, -0.25, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    ctx.lineWidth = 6;
    for (let i = 1; i < this.nodes.length; i++) {
      const a = this.nodes[i - 1];
      const b = this.nodes[i];
      ctx.strokeStyle = this.isCompleted(i - 1) ? '#fde047' : 'rgba(255,255,255,0.7)';
      ctx.setLineDash(this.isCompleted(i - 1) ? [] : [10, 10]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    this.nodes.forEach((n, i) => this.drawNode(ctx, n.x, n.y, i));

    const sprite = this.character().sprite;
    const hs = spriteSize(sprite, SCALE);
    const walking = this.queue.length > 0;
    const hop = walking ? Math.abs(Math.sin(this.time * 14)) * 6 : Math.sin(this.time * 4) * 1.5;
    const shakeX = this.shake > 0 ? Math.sin(this.time * 60) * 4 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.heroX, this.heroY - this.node / 2 - 2, hs.w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(ctx, sprite, this.heroX - hs.w / 2 + shakeX, this.heroY - this.node / 2 - hs.h - hop, SCALE, this.facingLeft);

    const current = this.missions()[this.index];
    if (current) {
      // il titolo si rimpicciolisce finché sta nella tela (su telefono è larga la metà)
      let size = 12;
      ctx.font = `${size}px ${FONT}`;
      while (size > 7 && ctx.measureText(current.title).width + 24 > this.w - 16) ctx.font = `${--size}px ${FONT}`;
      const w = ctx.measureText(current.title).width + 24;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(this.w / 2 - w / 2, 10, w, 28);
      ctx.fillStyle = '#fde047';
      ctx.fillText(current.title, this.w / 2, 29);
    }

    ctx.font = `${this.compact ? 8 : 9}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.compact ? 'TOCCA UN BLOCCO · TOCCA ANCORA PER ENTRARE' : 'FRECCE: MUOVI    INVIO / SPAZIO: GIOCA', this.w / 2, H - 12);
  }

  private drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, i: number): void {
    const completed = this.isCompleted(i);
    const unlocked = this.isUnlocked(i);
    const bob = unlocked && !completed ? Math.sin(this.time * 3 + i) * 3 : 0;
    const top = y - this.node / 2 + bob;
    const left = x - this.node / 2;

    if (i === this.index && Math.floor(this.time * 4) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(left - 6, top - 6, this.node + 12, this.node + 12);
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(left - 3, top - 3, this.node + 6, this.node + 6);
    ctx.fillStyle = completed ? '#16a34a' : unlocked ? '#f59e0b' : '#6b7280';
    ctx.fillRect(left, top, this.node, this.node);
    ctx.fillStyle = completed ? '#4ade80' : unlocked ? '#fde047' : '#9ca3af';
    ctx.fillRect(left, top, this.node, 5);
    ctx.fillRect(left, top, 5, this.node);

    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(completed ? '★' : unlocked ? '?' : '🔒', x, top + 28);

    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(String(i + 1), x + 1, y + this.node / 2 + 17);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(i + 1), x, y + this.node / 2 + 16);
  }
}
