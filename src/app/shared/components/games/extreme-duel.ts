import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { GameShell } from './game-shell';

/** Missione 8: massimo e minimo. Il campione `estremo` affronta ogni valore: si scopre l'algoritmo dietro max() e min(). */
@Component({
  selector: 'app-extreme-duel',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Duello degli estremi" [goal]="'Scegli chi resta in estremo: il valore ' + (isMax ? 'più alto' : 'più basso') + ' vince il duello.'"
      controls="clic sul valore che deve restare in estremo." [character]="character" [enemy]="enemy" [round]="step()" [rounds]="values.length - 1"
      [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="step() < values.length - 1 ? 3 : 5"
      [vars]="'estremo = ' + fmt(champion())">
      <div class="gm-row" role="list" aria-label="Serie dei valori">
        @for (v of values; track $index) {
          <span role="listitem" class="gm-cell" [class.ok]="$index <= step()" [class.dim]="$index > step() + 1">{{ fmt(v) }}</span>
        }
      </div>
      @if (step() < values.length - 1) {
        <p class="gm-query">{{ fmt(challenger()) }} {{ op }} {{ fmt(champion()) }} ?</p>
        <div class="gm-row" role="group" aria-label="Chi resta in estremo">
          <button type="button" class="btn cmd" (click)="choose(false)">estremo = {{ fmt(champion()) }}<br /><small>resta</small></button>
          <button type="button" class="btn cmd primary" (click)="choose(true)">estremo = m ({{ fmt(challenger()) }})<br /><small>sostituisci</small></button>
        </div>
      } @else {
        <p class="gm-query">print(estremo) → {{ fmt(champion()) }}{{ unit ? ' ' + unit : '' }}</p>
      }
    </app-game-shell>
  `,
})
export class ExtremeDuel extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected values: number[] = [];
  protected isMax = true;
  protected op = '>';
  protected readonly step = signal(0);
  protected readonly champion = signal(0);
  protected readonly challenger = computed(() => this.values[this.step() + 1]);
  protected readonly code = computed(() => [
    `misure = ${list(this.values)}`,
    'estremo = misure[0]',
    'for m in misure[1:]:',
    `    if m ${this.op} estremo:`,
    '        estremo = m',
    'print(estremo)',
  ]);

  ngOnInit(): void {
    this.values = this.nums('v', [12, 25, 18, 41, 33, 27]);
    this.isMax = this.config['mode'] !== 'min';
    this.op = this.isMax ? '>' : '<';
    this.champion.set(this.values[0]);
  }

  /** `replace`: il giocatore sostituisce l'estremo con il nuovo valore m. */
  protected choose(replace: boolean): void {
    if (this.cleared || this.step() >= this.values.length - 1) return;
    const m = this.challenger();
    const e = this.champion();
    const beats = this.isMax ? m > e : m < e;
    const cmp = `${fmt(m)} ${this.op} ${fmt(e)} → ${beats ? 'True' : 'False'}`;
    if (replace !== beats) {
      this.miss(`${cmp}: ${beats ? 'la condizione è vera, quindi estremo = m.' : 'la condizione è falsa, quindi estremo resta com\'è.'}`);
      return;
    }
    if (beats) this.champion.set(m);
    this.step.update((s) => s + 1);
    this.hit(`${cmp}: ${beats ? `estremo diventa ${fmt(m)}` : 'estremo non cambia'}.`);
    if (this.step() >= this.values.length - 1) {
      this.hit(`print(estremo) → ${fmt(this.champion())}. È ciò che fa ${this.isMax ? 'max' : 'min'}(misure) in un colpo solo.`);
      this.win();
    }
  }
}
