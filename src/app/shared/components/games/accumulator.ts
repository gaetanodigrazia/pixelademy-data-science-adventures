import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list, r2 } from './base-game';
import { GameShell } from './game-shell';

interface Option {
  value: number;
  why: string;
}

/** Missione 4: sommare con un accumulatore. A ogni giro del ciclo si sceglie il nuovo valore di `totale`. */
@Component({
  selector: 'app-accumulator',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Registro dell'accumulatore" goal="Esegui il ciclo a mano: scegli quanto vale totale dopo ogni totale += m."
      controls="clic sul valore corretto di totale." [character]="character" [enemy]="enemy" [round]="index()" [rounds]="values.length"
      [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="index() < values.length ? 3 : 4"
      [vars]="'totale = ' + fmt(total())">
      @if (index() < values.length) {
        <p class="gm-query">m = {{ fmt(values[index()]) }} · totale era {{ fmt(total()) }}</p>
        <div class="gm-row" role="group" aria-label="Possibili valori di totale">
          @for (o of options(); track o.value) {
            <button type="button" class="btn cmd" (click)="pick(o)">totale = {{ fmt(o.value) }}</button>
          }
        </div>
      } @else {
        <p class="gm-query">print(totale) → {{ fmt(total()) }}{{ unit ? ' ' + unit : '' }}</p>
      }
      <ul class="gm-trace" aria-label="Traccia dell'esecuzione">
        @for (t of trace(); track $index) { <li>{{ t }}</li> }
      </ul>
    </app-game-shell>
  `,
  styles: `.gm-trace { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: center;
    font: .55rem var(--mono); color: var(--muted); } .gm-trace li { white-space: nowrap; }`,
})
export class Accumulator extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected values: number[] = [];
  protected readonly index = signal(0);
  protected readonly total = signal(0);
  protected readonly trace = signal<string[]>([]);
  protected readonly options = computed<Option[]>(() => this.build(this.index(), this.total()));
  protected readonly code = computed(() => [`misure = ${list(this.values)}`, 'totale = 0', 'for m in misure:', '    totale += m', 'print(totale)']);

  ngOnInit(): void {
    this.values = this.nums('v', [12, 18, 22, 17, 9]);
  }

  private build(i: number, t: number): Option[] {
    const m = this.values[i];
    if (m === undefined) return [];
    const out: Option[] = [{ value: r2(t + m), why: '' }];
    const add = (value: number, why: string) => {
      if (!out.some((o) => o.value === value)) out.push({ value, why });
    };
    add(r2(t), `Così ${fmt(m)} non viene mai aggiunto: totale += m somma m al totale corrente.`);
    add(r2(m), 'Hai sostituito il totale con m: con = si sovrascrive, con += si accumula.');
    add(r2(t + 2 * m), `Hai sommato ${fmt(m)} due volte: a ogni giro si aggiunge m una sola volta.`);
    add(r2(t - m), 'Hai sottratto: l\'operatore è +=, non -=.');
    // con m = 0 le trappole coincidono con la risposta giusta: si aggiungono valori vicini
    for (const d of [1, -1, 10]) add(r2(t + m + d), `Ricalcola: ${fmt(t)} + ${fmt(m)}.`);
    return this.shuffle(out.slice(0, 4), i + 1);
  }

  protected pick(o: Option): void {
    if (this.cleared || this.index() >= this.values.length) return;
    const m = this.values[this.index()];
    const next = r2(this.total() + m);
    if (o.value !== next) {
      this.miss(o.why || `Ricalcola: ${fmt(this.total())} + ${fmt(m)}.`);
      return;
    }
    this.trace.update((t) => [...t, `${fmt(this.total())} + ${fmt(m)} = ${fmt(next)}`]);
    this.total.set(next);
    this.index.update((i) => i + 1);
    this.hit(`totale += m → ${fmt(next)}.`);
    if (this.index() >= this.values.length) {
      this.hit(`Ciclo finito: print(totale) → ${fmt(next)}. L'accumulatore ha sommato tutti i valori uno alla volta.`);
      this.win();
    }
  }
}
