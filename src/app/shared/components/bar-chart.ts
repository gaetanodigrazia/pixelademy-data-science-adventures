import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Tone = 'accent' | 'good' | 'bad';

export interface ChartLine {
  value: number;
  label: string;
  tone?: Tone;
}

const W = 320;
const H = 140;
const TOP = 14;
const BOTTOM = 18;

/** Grafico a barre in SVG: barre evidenziabili e linee orizzontali di riferimento (media, soglia). */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="ariaLabel()">
      @for (b of bars(); track b.i) {
        <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.class]="'col ' + b.tone" />
        <text [attr.x]="b.x + b.w / 2" [attr.y]="b.y - 3" class="val">{{ b.value }}</text>
        <text [attr.x]="b.x + b.w / 2" [attr.y]="H - 5" class="cat">{{ b.label }}</text>
      }
      @for (l of lines(); track l.label) {
        <line x1="0" [attr.x2]="W" [attr.y1]="l.y" [attr.y2]="l.y" [attr.class]="'ref ' + l.tone" />
        <text [attr.x]="l.tone === 'bad' ? 2 : W - 2" [attr.y]="l.y - 3" [attr.class]="'ref-label ' + l.tone">{{ l.label }}</text>
      }
    </svg>
  `,
  styles: `
    :host { display: block; min-height: 0; min-width: 0; }
    svg { display: block; width: 100%; height: 100%; }
    .col { fill: #334155; }
    .col.accent { fill: var(--accent); }
    .col.good { fill: var(--good); }
    .col.bad { fill: var(--bad); }
    .val { fill: #cbd5e1; font: 8px var(--mono); text-anchor: middle; }
    .cat { fill: var(--muted); font: 7.5px var(--mono); text-anchor: middle; }
    .ref { stroke-width: 1.5; stroke-dasharray: 4 3; stroke: var(--accent); }
    .ref.good { stroke: var(--good); }
    .ref.bad { stroke: var(--bad); }
    .ref-label { fill: var(--accent); font: 7.5px var(--mono); text-anchor: end; }
    .ref-label.good { fill: var(--good); }
    .ref-label.bad { fill: var(--bad); text-anchor: start; }
  `,
})
export class BarChart {
  readonly values = input.required<number[]>();
  /** Etichette sotto le barre; se mancano si numerano da 1. */
  readonly labels = input<string[]>([]);
  /** Barre evidenziate: indice → tono. */
  readonly marks = input<Record<number, Tone>>({});
  readonly refs = input<ChartLine[]>([]);
  readonly ariaLabel = input('Grafico a barre');

  protected readonly W = W;
  protected readonly H = H;

  private readonly top = computed(() => Math.max(...this.values(), ...this.refs().map((r) => r.value), 1) * 1.1);
  private readonly y = (v: number) => H - BOTTOM - (v / this.top()) * (H - BOTTOM - TOP);

  protected readonly bars = computed(() => {
    const v = this.values();
    const slot = W / v.length;
    const w = Math.min(slot * 0.62, 36);
    return v.map((value, i) => {
      const y = this.y(value);
      return {
        i,
        value: Math.round(value * 100) / 100,
        label: this.labels()[i] ?? String(i + 1),
        x: i * slot + (slot - w) / 2,
        w,
        y,
        h: H - BOTTOM - y,
        tone: this.marks()[i] ?? '',
      };
    });
  });

  protected readonly lines = computed(() => this.refs().map((r) => ({ label: r.label, tone: r.tone ?? 'accent', y: this.y(r.value) })));
}
