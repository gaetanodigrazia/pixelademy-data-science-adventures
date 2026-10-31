import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { GameShell } from './game-shell';

interface Query {
  idx: number;
  expr: string;
}

/** Missione 1: leggere un valore con l'indice. Si impara a contare da 0 (e da -1) cercando la cella giusta. */
@Component({
  selector: 'app-index-rack',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Scaffale degli indici" goal="Clicca la cella che l'espressione restituisce: gli indici partono da 0."
      controls="clic (o Invio) sulla cella. «Mostra indici» svela le posizioni." [character]="character" [enemy]="enemy"
      [round]="round()" [rounds]="queries.length" [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="1">
      <p class="gm-query" aria-label="Espressione da valutare">print({{ query().expr }})</p>
      <div class="gm-row" role="group" aria-label="Elementi della lista misure">
        @for (v of values; track $index) {
          <button type="button" class="gm-cell" [class.ok]="solved().includes($index)" [disabled]="solved().includes($index)"
            [attr.aria-label]="'Cella ' + ($index + 1) + ': ' + fmt(v)" (click)="pick($index)">
            {{ fmt(v) }}
            @if (showIdx()) { <small>[{{ $index }}]</small> }
          </button>
        }
      </div>
      <div class="gm-row">
        <button type="button" class="btn cmd" (click)="showIdx.set(!showIdx())">{{ showIdx() ? 'Nascondi indici' : 'Mostra indici' }}</button>
      </div>
      @if (unit) { <p class="gm-note">Valori in {{ unit }}</p> }
    </app-game-shell>
  `,
})
export class IndexRack extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected values: number[] = [];
  protected queries: Query[] = [];
  protected readonly round = signal(0);
  protected readonly solved = signal<number[]>([]);
  protected readonly showIdx = signal(false);
  protected readonly query = computed(() => this.queries[Math.min(this.round(), this.queries.length - 1)]);
  protected readonly code = computed(() => [`misure = ${list(this.values)}`, `print(${this.query().expr})`]);

  ngOnInit(): void {
    this.values = this.nums('v', [17, 19, 22, 24, 21]);
    const n = this.values.length;
    const k = Math.min(Math.max(0, this.num('k', 2)), n - 1);
    const second = k === 0 ? 1 : 0;
    // terza richiesta con indice negativo, su una cella non ancora usata
    const neg = n - 1 !== k && n - 1 !== second ? -1 : -2;
    this.queries = [
      { idx: k, expr: `misure[${k}]` },
      { idx: second, expr: `misure[${second}]` },
      { idx: n + neg, expr: `misure[${neg}]` },
    ];
  }

  protected pick(i: number): void {
    if (this.cleared || this.solved().includes(i)) return;
    const q = this.query();
    if (i !== q.idx) {
      this.showIdx.set(true);
      this.miss(
        q.expr.includes('[-')
          ? `Quella cella ha indice ${i}. Gli indici negativi contano dalla fine: -1 è l'ultimo elemento, -2 il penultimo.`
          : `Quella cella è la ${i + 1}ª, cioè indice ${i}. ${q.expr} è la ${q.idx + 1}ª: si parte da 0, quindi indice = posizione − 1.`,
      );
      return;
    }
    const v = fmt(this.values[i]);
    this.solved.update((s) => [...s, i]);
    this.round.update((r) => r + 1);
    this.hit(
      q.expr.includes('[-')
        ? `${q.expr} → ${v}: l'indice negativo parte dalla fine (-1 è l'ultimo elemento, -2 il penultimo).`
        : `${q.expr} → ${v}: è l'elemento in posizione ${q.idx + 1}, perché il primo ha indice 0.`,
    );
    if (this.round() >= this.queries.length) this.win();
  }
}
