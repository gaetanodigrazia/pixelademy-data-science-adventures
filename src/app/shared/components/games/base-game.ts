import { Directive, Input, OnDestroy, signal } from '@angular/core';
import { Character, Enemy } from '../../../core/models/character.model';
import { GameComponentInputs, GameConfig, GameResult } from '../../../core/models/game.model';

export type FeedbackKind = 'info' | 'ok' | 'err';
export interface Feedback {
  text: string;
  kind: FeedbackKind;
}

export const r2 = (n: number): number => Math.round(n * 100) / 100;
export const mean = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
/** Numero in stile Python: niente zeri superflui, al massimo 2 decimali. */
export const fmt = (n: number): string => String(r2(n));
export const list = (a: number[]): string => `[${a.map(fmt).join(', ')}]`;

/**
 * Base dei minigiochi. Ogni gioco insegna il concetto della missione giocandolo sui dati della missione
 * (`config`): gestisce input, timer, errori, messaggi di feedback e la chiamata unica a `onCleared`.
 */
@Directive({ host: { class: 'game-host' } })
export abstract class BaseGame implements GameComponentInputs, OnDestroy {
  @Input() character!: Character;
  @Input() enemy?: Enemy;
  @Input() config: GameConfig = {};
  @Input() onCleared: (result?: GameResult) => void = () => undefined;

  protected cleared = false;
  protected readonly mistakes = signal(0);
  protected readonly feedback = signal<Feedback | null>(null);
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private readonly intervals = new Set<ReturnType<typeof setInterval>>();

  /** Difficoltà 1..10 della missione. */
  protected get level(): number {
    const l = Number(this.config['level']);
    return Number.isFinite(l) && l > 0 ? l : 1;
  }

  protected nums(key: string, fallback: number[]): number[] {
    const v = this.config[key];
    return Array.isArray(v) && v.length && v.every((x) => typeof x === 'number') ? (v as number[]) : fallback;
  }

  protected num(key: string, fallback: number): number {
    const v = this.config[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  protected str(key: string, fallback: string): string {
    const v = this.config[key];
    return typeof v === 'string' && v ? v : fallback;
  }

  protected dict(fallback: Record<string, number>): Record<string, number> {
    const v = this.config['d'];
    return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length ? (v as Record<string, number>) : fallback;
  }

  protected get unit(): string {
    return this.str('unit', '');
  }

  protected say(text: string, kind: FeedbackKind = 'info'): void {
    this.feedback.set({ text, kind });
  }

  protected hit(text: string): void {
    this.say(text, 'ok');
  }

  /** Registra un errore e spiega perché la mossa non è corretta. */
  protected miss(text: string): void {
    this.mistakes.update((n) => n + 1);
    this.say(text, 'err');
  }

  /** Mescola con un PRNG deterministico (seed): stesso ordine a parità di dati, ma non ovvio. */
  protected shuffle<T>(items: T[], seed: number): T[] {
    let s = (seed * 2654435761 + this.level * 40503) >>> 0 || 1;
    const rnd = () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  protected after(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, ms);
    this.timeouts.add(id);
  }

  protected every(fn: () => void, ms: number): void {
    this.intervals.add(setInterval(fn, ms));
  }

  protected stopTimers(): void {
    this.timeouts.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timeouts.clear();
    this.intervals.clear();
  }

  /** Segnala la vittoria: `onCleared` viene invocato una sola volta, con gli errori commessi nel gioco. */
  protected win(): void {
    if (this.cleared) return;
    this.cleared = true;
    this.stopTimers();
    this.onCleared({ mistakes: this.mistakes() });
  }

  ngOnDestroy(): void {
    this.stopTimers();
  }
}
