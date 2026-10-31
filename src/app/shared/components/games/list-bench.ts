import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list } from './base-game';
import { GameShell } from './game-shell';

interface Goal {
  target: number;
  text: string;
}

/** Missione 2: contare con len(). Si costruisce e si svuota una lista guardando len() cambiare a ogni mossa. */
@Component({
  selector: 'app-list-bench',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Banco della lista" [goal]="goal().text" controls="append() aggiunge in coda, pop() toglie l'ultimo elemento."
      [character]="character" [enemy]="enemy" [round]="round()" [rounds]="goals.length" [mistakes]="mistakes()" [message]="feedback()"
      [code]="code()" [activeLine]="1" [vars]="'len(misure) → ' + items().length">
      <div class="gm-row" role="group" aria-label="Contenuto della lista misure">
        @for (v of items(); track $index) { <span class="gm-cell on">{{ fmt(v) }}</span> }
        @empty { <span class="gm-cell dim">lista vuota</span> }
      </div>
      <p class="gm-read" aria-live="polite">len(misure) = {{ items().length }} <span class="gm-label">(obiettivo: {{ goal().target }})</span></p>
      <div class="gm-row">
        <button type="button" class="btn cmd primary" (click)="append()">misure.append({{ fmt(nextValue()) }})</button>
        <button type="button" class="btn cmd" (click)="pop()">misure.pop()</button>
      </div>
      @if (unit) { <p class="gm-note">Rilevazioni in {{ unit }}</p> }
    </app-game-shell>
  `,
})
export class ListBench extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected source: number[] = [];
  protected goals: Goal[] = [];
  protected readonly items = signal<number[]>([]);
  protected readonly round = signal(0);
  private readonly fed = signal(0);
  protected readonly goal = computed(() => this.goals[Math.min(this.round(), this.goals.length - 1)] ?? { target: 0, text: '' });
  protected readonly nextValue = computed(() => this.source[this.fed() % this.source.length]);
  protected readonly code = computed(() => [`misure = ${list(this.items())}`, 'print(len(misure))']);

  ngOnInit(): void {
    this.source = this.nums('v', [23, 41, 18, 52, 37, 29]);
    const n = this.source.length;
    const mid = Math.max(1, Math.floor(n / 3));
    this.goals = [
      { target: n, text: `Riempi la lista fino a len(misure) == ${n}.` },
      { target: mid, text: `Togli elementi finché len(misure) == ${mid}.` },
      { target: 0, text: 'Svuota la lista: len(misure) deve tornare a 0.' },
    ];
  }

  protected append(): void {
    if (this.cleared) return;
    const v = this.nextValue();
    this.fed.update((n) => n + 1);
    this.items.update((a) => [...a, v]);
    this.hit(`append(${fmt(v)}) aggiunge in coda: len(misure) diventa ${this.items().length}.`);
    this.check();
  }

  protected pop(): void {
    if (this.cleared) return;
    if (!this.items().length) {
      this.miss('IndexError: pop from empty list. Con len(misure) == 0 non c\'è nulla da togliere.');
      return;
    }
    const last = this.items()[this.items().length - 1];
    this.items.update((a) => a.slice(0, -1));
    this.hit(`pop() toglie l'ultimo (${fmt(last)}): len(misure) diventa ${this.items().length}.`);
    this.check();
  }

  private check(): void {
    if (this.items().length !== this.goal().target) return;
    this.round.update((r) => r + 1);
    if (this.round() >= this.goals.length) {
      this.hit('len() restituisce sempre quanti elementi ci sono adesso: è il conteggio delle osservazioni.');
      this.win();
    } else {
      this.hit(`len(misure) == ${this.items().length}: obiettivo raggiunto. Prossimo passo.`);
    }
  }
}
