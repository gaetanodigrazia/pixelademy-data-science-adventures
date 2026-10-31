import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { GameShell } from './game-shell';

/** Missione 3: filtrare con for + if. Ogni elemento passa dal cancello `if m > soglia`: si decide cosa fa il codice. */
@Component({
  selector: 'app-filter-belt',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Nastro di filtraggio" [goal]="'Decidi per ogni valore se supera la soglia (' + fmt(threshold) + '): il ciclo lo aggiunge o lo salta.'"
      controls="append(m) se la condizione è vera, salta se è falsa." [character]="character" [enemy]="enemy" [round]="index()"
      [rounds]="values.length" [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="index() < values.length ? 4 : 6"
      [vars]="index() < values.length ? 'm = ' + fmt(values[index()]) : ''">
      <div class="gm-row" role="list" aria-label="Valori sul nastro">
        @for (v of values; track $index) {
          <span role="listitem" class="gm-cell" [class.on]="$index === index()" [class.ok]="verdicts()[$index] === true"
            [class.dim]="verdicts()[$index] === false">{{ fmt(v) }}</span>
        }
      </div>
      @if (index() < values.length) {
        <p class="gm-query">{{ fmt(values[index()]) }} &gt; {{ fmt(threshold) }} ?</p>
        <div class="gm-row">
          <button type="button" class="btn cmd primary" (click)="decide(true)">filtrati.append(m)</button>
          <button type="button" class="btn cmd" (click)="decide(false)">salta</button>
        </div>
      }
      <p class="gm-read" aria-live="polite">filtrati = {{ fmtList(kept()) }}</p>
    </app-game-shell>
  `,
})
export class FilterBelt extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected readonly fmtList = list;
  protected values: number[] = [];
  protected threshold = 0;
  protected readonly index = signal(0);
  protected readonly verdicts = signal<boolean[]>([]);
  protected readonly kept = computed(() => this.values.filter((_, i) => this.verdicts()[i] === true));
  protected readonly code = computed(() => [
    `misure = ${list(this.values)}`,
    `soglia = ${fmt(this.threshold)}`,
    'filtrati = []',
    'for m in misure:',
    '    if m > soglia:',
    '        filtrati.append(m)',
    'print(filtrati)',
  ]);

  ngOnInit(): void {
    this.values = this.nums('v', [14, 38, 52, 27, 61, 44]);
    this.threshold = this.num('th', 40);
  }

  protected decide(keep: boolean): void {
    if (this.cleared || this.index() >= this.values.length) return;
    const m = this.values[this.index()];
    const truth = m > this.threshold;
    const cmp = `${fmt(m)} > ${fmt(this.threshold)} → ${truth ? 'True' : 'False'}`;
    if (keep !== truth) {
      this.miss(`${cmp}: ${truth ? 'la condizione è vera, quindi il ciclo esegue append.' : 'la condizione è falsa, quindi il ciclo salta il valore.'}`);
      return;
    }
    this.verdicts.update((v) => [...v, truth]);
    this.index.update((i) => i + 1);
    this.hit(`${cmp}: ${truth ? 'append(m)' : 'saltato'}.`);
    if (this.index() >= this.values.length) {
      this.hit(`Fine del ciclo: print(filtrati) → ${list(this.kept())}. Solo i valori con m > soglia (strettamente) sono passati.`);
      this.win();
    }
  }
}
