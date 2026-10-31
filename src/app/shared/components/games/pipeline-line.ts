import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, list, mean, r2 } from './base-game';
import { GameShell } from './game-shell';

type Kind = 'list' | 'num';
type Value = number[] | number;
type StageId = 'filter' | 'sort' | 'mean' | 'sum' | 'count' | 'round';

interface Stage {
  id: StageId;
  input: Kind;
  output: Kind;
}

interface Step {
  id: StageId;
  text: string;
  error?: string;
}

interface Task {
  text: string;
  needs: StageId[];
  target: number;
}

const STAGES: Stage[] = [
  { id: 'filter', input: 'list', output: 'list' },
  { id: 'sort', input: 'list', output: 'list' },
  { id: 'mean', input: 'list', output: 'num' },
  { id: 'sum', input: 'list', output: 'num' },
  { id: 'count', input: 'list', output: 'num' },
  { id: 'round', input: 'num', output: 'num' },
];

/** Missione 10: una pipeline. Si compone la catena di passi e si vede come i dati cambiano forma a ogni stazione. */
@Component({
  selector: 'app-pipeline-line',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Linea di analisi" [goal]="task().text" controls="clic su un passo per aggiungerlo alla catena, clic su un passo montato per toglierlo."
      [character]="character" [enemy]="enemy" [round]="round()" [rounds]="tasks.length" [mistakes]="mistakes()" [message]="feedback()">
      <div class="flow" aria-label="Catena di analisi">
        <span class="gm-cell on">misure<small>{{ fmtList(values) }}</small></span>
        @for (s of steps(); track $index) {
          <span class="arrow" aria-hidden="true">→</span>
          <button type="button" class="gm-cell" [class.bad]="!!s.error" (click)="remove($index)" [attr.aria-label]="'Rimuovi ' + label(s.id)">
            {{ label(s.id) }}<small>{{ s.error ?? s.text }}</small>
          </button>
        }
      </div>
      <div class="gm-row" role="group" aria-label="Passi disponibili">
        @for (s of pool; track s.id) {
          <button type="button" class="btn cmd" [disabled]="chain().includes(s.id)" (click)="add(s.id)">{{ label(s.id) }}</button>
        }
      </div>
      <div class="gm-row">
        <button type="button" class="btn cmd primary" (click)="run()">▶ Esegui la pipeline</button>
        <button type="button" class="btn cmd" (click)="chain.set([])">Svuota</button>
      </div>
    </app-game-shell>
  `,
  styles: `.flow { display: flex; flex-wrap: wrap; align-items: stretch; justify-content: center; gap: 4px; }
    .flow .gm-cell { max-width: 100%; overflow-wrap: anywhere; } .arrow { align-self: center; color: var(--accent); font: .8rem var(--mono); }`,
})
export class PipelineLine extends BaseGame implements OnInit {
  protected readonly fmtList = list;
  protected values: number[] = [];
  protected threshold = 0;
  protected tasks: Task[] = [];
  protected readonly pool = STAGES;
  protected readonly round = signal(0);
  protected readonly chain = signal<StageId[]>([]);
  protected readonly task = computed(() => this.tasks[Math.min(this.round(), this.tasks.length - 1)] ?? { text: '', needs: [], target: 0 });
  protected readonly steps = computed<Step[]>(() => this.trace(this.chain()).steps);

  ngOnInit(): void {
    this.values = this.nums('v', [20, 48, 35, 62, 15, 55, 41]);
    this.threshold = this.num('th', 40);
    const kept = this.values.filter((v) => v > this.threshold);
    this.tasks = [
      { text: `Stampa la media, arrotondata a 2 decimali, dei valori > ${fmt(this.threshold)}.`, needs: ['filter', 'mean'], target: r2(mean(kept)) },
      { text: `Ora stampa quanti valori superano la soglia ${fmt(this.threshold)}.`, needs: ['filter', 'count'], target: kept.length },
    ];
  }

  protected label(id: StageId): string {
    switch (id) {
      case 'filter': return `filtra m > ${fmt(this.threshold)}`;
      case 'sort': return 'ordina';
      case 'mean': return 'media';
      case 'sum': return 'somma';
      case 'count': return 'conta';
      case 'round': return 'arrotonda(2)';
    }
  }

  protected add(id: StageId): void {
    if (!this.cleared && !this.chain().includes(id)) this.chain.update((c) => [...c, id]);
  }

  protected remove(i: number): void {
    if (!this.cleared) this.chain.update((c) => c.filter((_, j) => j !== i));
  }

  /** Applica i passi in sequenza; si ferma al primo errore di tipo (es. media su un numero). */
  private trace(chain: StageId[]): { steps: Step[]; value: Value; error: boolean } {
    let value: Value = this.values;
    const steps: Step[] = [];
    for (const id of chain) {
      const stage = STAGES.find((s) => s.id === id)!;
      const kind: Kind = Array.isArray(value) ? 'list' : 'num';
      if (kind !== stage.input) {
        steps.push({ id, text: '', error: `TypeError: ${this.label(id)} vuole ${stage.input === 'list' ? 'una lista' : 'un numero'}, ma riceve ${kind === 'list' ? 'una lista' : 'un numero'}` });
        return { steps, value, error: true };
      }
      if (id === 'mean' && (value as number[]).length === 0) {
        steps.push({ id, text: '', error: 'ZeroDivisionError: lista vuota' });
        return { steps, value, error: true };
      }
      value = this.apply(id, value);
      steps.push({ id, text: Array.isArray(value) ? list(value) : fmt(value) });
    }
    return { steps, value, error: false };
  }

  private apply(id: StageId, v: Value): Value {
    const a = v as number[];
    switch (id) {
      case 'filter': return a.filter((x) => x > this.threshold);
      case 'sort': return [...a].sort((x, y) => x - y);
      case 'mean': return mean(a);
      case 'sum': return a.reduce((x, y) => x + y, 0);
      case 'count': return a.length;
      case 'round': return r2(v as number);
    }
  }

  protected run(): void {
    if (this.cleared) return;
    const t = this.task();
    const c = this.chain();
    const { steps, value, error } = this.trace(c);
    if (error) {
      this.miss(`${steps[steps.length - 1].error}. I dati passano da un passo all'altro: ogni passo deve ricevere il tipo che produce il precedente.`);
      return;
    }
    if (!c.length || Array.isArray(value)) {
      this.miss('La pipeline restituisce ancora una lista: serve un numero. Aggiungi un passo che la riduca (media, somma, conta).');
      return;
    }
    const missing = t.needs.find((n) => !c.includes(n));
    if (missing === 'filter') {
      this.miss(`Senza filtrare conti anche i valori ≤ ${fmt(this.threshold)}: ottieni ${fmt(value)}, serve ${fmt(t.target)}.`);
      return;
    }
    if (missing) {
      this.miss(`Con questi passi ottieni ${fmt(value)}, ma serve ${fmt(t.target)}: ${missing === 'mean' ? 'somma e media sono cose diverse, qui serve la media' : 'serve contare i valori rimasti'}.`);
      return;
    }
    if (value !== t.target) {
      this.miss(`Il risultato è ${fmt(value)}${c.includes('round') ? '' : ' (non arrotondato)'}, ma il target è ${fmt(t.target)}. Controlla i passi.`);
      return;
    }
    this.round.update((r) => r + 1);
    this.hit(`Pipeline corretta → ${fmt(value)}. ${t.needs.includes('mean') ? 'Filtra → media → arrotonda: ogni passo lavora sull\'output del precedente.' : 'Filtra → conta: la stessa lista filtrata può rispondere a domande diverse.'}`);
    if (this.round() >= this.tasks.length) this.win();
    else this.chain.set([]);
  }
}
