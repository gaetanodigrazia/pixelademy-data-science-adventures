import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Character } from '../../core/models/character.model';
import { MissionViz } from '../../core/models/mission.model';
import { evaluateViz } from '../../core/utils/viz';
import { SpriteView } from './sprite-view';

interface Cell { idx: string; text: string; cls: string; hero: boolean; }
interface Bar { v: number; h: number; cls: string; }
interface Line { pct: number; cls: string; label: string; }

/** Mondo di gioco guidato dal codice: il risultato del programma decide cosa succede in scena. */
@Component({
  selector: 'app-code-world',
  imports: [SpriteView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="world" [class.compact]="compact()" [attr.aria-label]="'Scena di gioco: ' + viz().name">
      @if (!compact()) {
      @switch (layout()) {
        @case ('cells') {
          <ol class="strip" [style.--n]="cells().length">
            @for (c of cells(); track $index) {
              <li [class]="'cell ' + c.cls">
                <span class="hero">
                  @if (c.hero && character(); as ch) { <app-sprite-view [sprite]="ch.sprite" [scale]="2" [label]="ch.name" /> }
                </span>
                <span class="idx">{{ c.idx }}</span>
                <span class="val">{{ c.text }}</span>
              </li>
            }
          </ol>
        }
        @case ('bars') {
          <div class="area">
            <div class="bars">
              @for (b of bars(); track $index) { <div [class]="'col ' + b.cls"><i [style.height.%]="b.h"></i></div> }
            </div>
            @for (l of lines(); track $index) { <div [class]="'line ' + l.cls" [style.bottom.%]="l.pct"><em>{{ l.label }}</em></div> }
          </div>
          <div class="vals">@for (b of bars(); track $index) { <span>{{ b.v }}</span> }</div>
        }
        @case ('stack') {
          <div class="area">
            <div class="stack">
              @for (b of bars(); track $index) { <i class="seg" [style.height.%]="b.h"></i> }
            </div>
            @for (l of lines(); track $index) { <div [class]="'line ' + l.cls" [style.bottom.%]="l.pct"><em>{{ l.label }}</em></div> }
          </div>
          <p class="terms">{{ terms() }}</p>
        }
      }
      }
      <div class="coach">
        @if (!compact() && layout() !== 'cells' && character(); as ch) { <app-sprite-view [sprite]="ch.sprite" [scale]="2" [label]="ch.name" /> }
        @if (viz().kind === 'alarm') {
          <span [class]="'lamp ' + lamp()" aria-hidden="true"></span>
        }
        <p [class]="'msg ' + outcome().status" role="status">{{ outcome().message }}</p>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .world { border: 2px solid var(--line); background: #020617; padding: 6px 8px; }
    .strip { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
    .hero { display: flex; align-items: flex-end; justify-content: center; height: 36px; }
    .idx { font-size: .5rem; color: var(--muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
    .val { width: 100%; text-align: center; padding: 4px 2px; border: 3px solid var(--line); background: var(--panel-2); font-size: .6rem; overflow: hidden; }
    .target .val { border-color: var(--accent); border-style: dashed; }
    .target .idx { color: var(--accent); }
    .lit .val { border-color: var(--accent); background: #78350f; }
    .hit .val { border-color: var(--good); background: #14532d; }
    .miss .val { border-color: var(--bad); background: #7f1d1d; }

    .area { position: relative; height: 72px; }
    .bars { display: flex; gap: 4px; height: 100%; }
    .col { flex: 1; min-width: 0; height: 100%; display: flex; align-items: flex-end; }
    .col i { display: block; width: 100%; background: var(--line); }
    .col.hit i { background: var(--good); }
    .col.mark i { background: var(--accent); }
    .col.miss i { background: var(--bad); }
    .col.missing i { background: transparent; border: 2px dashed var(--accent); }
    .vals { display: flex; gap: 4px; margin-top: 2px; }
    .vals span { flex: 1; min-width: 0; text-align: center; font-size: .5rem; color: var(--muted); overflow: hidden; }
    .stack { position: absolute; left: 0; bottom: 0; width: 38%; height: 100%; display: flex; flex-direction: column-reverse; }
    .seg { display: block; background: var(--accent); border-top: 1px solid #0b0b24; }
    .terms { margin: 2px 0 0; font-size: .5rem; color: var(--muted); overflow-wrap: anywhere; }
    .seg:nth-child(even) { background: var(--accent-2); }
    .line { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed var(--muted); pointer-events: none; }
    .line em { position: absolute; right: 0; bottom: 1px; font-style: normal; font-size: .45rem; background: #020617; padding: 0 3px; color: var(--muted); }
    .line.th { border-color: var(--accent); }
    .line.th em { color: var(--accent); }
    .line.ok { border: 0; border-top: 3px solid var(--good); }
    .line.ok em { color: var(--good); }
    .line.bad { border: 0; border-top: 3px solid var(--bad); }
    .line.bad em { color: var(--bad); }

    .coach { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .compact { padding: 4px 8px; }
    .compact .coach { margin-top: 0; }
    .lamp { flex: none; width: 18px; height: 18px; border: 3px solid var(--line); background: #1f2937; }
    .lamp.alarm { background: var(--bad); border-color: #fecaca; }
    .lamp.ok { background: var(--good); border-color: #bbf7d0; }
    .msg { margin: 0; font-size: .55rem; color: var(--muted); }
    .msg.ok { color: var(--good); }
    .msg.wrong, .msg.error { color: var(--bad); }
  `,
})
export class CodeWorld {
  readonly viz = input.required<MissionViz>();
  readonly character = input<Character>();
  /** `true` dopo la prima esecuzione del codice. */
  readonly ran = input(false);
  /** Solo la riga con l'esito: libera spazio (editor) sui telefoni. */
  readonly compact = input(false);
  readonly output = input('');
  readonly error = input('');

  protected readonly outcome = computed(() => evaluateViz(this.viz(), this.ran(), this.output(), this.error()));

  protected readonly layout = computed(() => {
    const k = this.viz().kind;
    return k === 'list-read' || k === 'count' || k === 'dict' ? 'cells' : k === 'sum' ? 'stack' : 'bars';
  });

  protected readonly terms = computed(() => this.viz().values.join(' + '));

  protected readonly lamp = computed(() => {
    const t = this.outcome().text;
    return t === 'allarme' ? 'alarm' : t === 'ok' ? 'ok' : 'off';
  });

  /** Altezza della linea del valore stampato (per `range` parte dal minimo). */
  private readonly lineValue = computed(() => {
    const { kind, values } = this.viz();
    const v = this.outcome().value;
    if (v === undefined) return undefined;
    return kind === 'range' ? Math.min(...values) + v : v;
  });

  private readonly scale = computed(() => {
    const { kind, values, th } = this.viz();
    const base = kind === 'sum' ? values.reduce((a, b) => a + b, 0) : Math.max(...values, th ?? 0);
    const extra = ['sum', 'mean', 'pipeline', 'range'].includes(kind) ? (this.lineValue() ?? 0) : 0;
    return Math.max(base, extra, 1) * 1.1;
  });

  protected readonly cells = computed<Cell[]>(() => {
    const v = this.viz();
    const o = this.outcome();
    const hitCls = o.status === 'ok' ? 'hit' : 'miss';
    if (v.kind === 'count') {
      const n = o.value ?? 0;
      return v.values.map((x, i) => ({ idx: `#${i + 1}`, text: String(x), cls: o.value !== undefined && i < n ? (o.status === 'ok' ? 'hit' : 'lit') : '', hero: false }));
    }
    return v.values.map((x, i) => ({
      idx: v.kind === 'dict' ? (v.labels?.[i] ?? '') : `[${i}]`,
      text: String(x),
      cls: o.status === 'idle' && i === v.index ? 'target' : i === o.index ? hitCls : '',
      hero: i === (o.index ?? 0),
    }));
  });

  protected readonly bars = computed<Bar[]>(() => {
    const v = this.viz();
    const o = this.outcome();
    const scale = this.scale();
    const pending = [...(o.printed ?? [])];
    return v.values.map((x, i) => {
      let cls = '';
      if (v.kind === 'filter' && o.status !== 'idle') {
        const at = pending.findIndex((p) => Math.abs(p - x) <= 0.01);
        if (at >= 0) {
          pending.splice(at, 1);
          cls = x > (v.th ?? 0) ? 'hit' : 'miss';
        } else if (x > (v.th ?? 0) && o.status === 'wrong') cls = 'missing';
      } else if (v.kind === 'pick' && o.status !== 'idle') {
        // i valori stampati: verdi se richiesti, rossi se di troppo; quelli richiesti ma non stampati restano tratteggiati
        const at = pending.findIndex((p) => Math.abs(p - x) <= 0.01);
        const wanted = (v.expected as number[]).some((e) => Math.abs(e - x) <= 0.01);
        if (at >= 0) {
          pending.splice(at, 1);
          cls = wanted ? 'hit' : 'miss';
        } else if (wanted && o.status === 'wrong') cls = 'missing';
      } else if (v.kind === 'value') {
        // aiuti in giallo (le barre da leggere); a esecuzione fatta, se il numero è una posizione, si illumina quella barra
        if (v.asIndex && i === o.index) cls = o.status === 'ok' ? 'hit' : 'miss';
        else if (v.marks?.includes(i)) cls = 'mark';
      } else if (v.kind === 'extreme' && i === o.index) cls = o.status === 'ok' ? 'hit' : 'miss';
      else if (v.kind === 'pipeline' && o.status === 'ok' && x > (v.th ?? 0)) cls = 'hit';
      return { v: x, h: Math.min(100, (x / scale) * 100), cls };
    });
  });

  protected readonly lines = computed<Line[]>(() => {
    const v = this.viz();
    const o = this.outcome();
    const scale = this.scale();
    const pct = (n: number) => Math.min(100, Math.max(0, (n / scale) * 100));
    const out: Line[] = [];
    if (v.th !== undefined && ['filter', 'alarm', 'pipeline', 'value'].includes(v.kind)) out.push({ pct: pct(v.th), cls: 'th', label: `soglia ${v.th}` });
    if (v.kind === 'range') {
      out.push({ pct: pct(Math.min(...v.values)), cls: 'ref', label: 'min' }, { pct: pct(Math.max(...v.values)), cls: 'ref', label: 'max' });
    }
    const lv = this.lineValue();
    if (lv !== undefined && ['sum', 'mean', 'pipeline', 'range'].includes(v.kind)) {
      out.push({ pct: pct(lv), cls: o.status === 'ok' ? 'ok' : 'bad', label: String(o.value) });
    }
    return out;
  });
}
