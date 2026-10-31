import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, mean, r2 } from './base-game';
import { GameShell } from './game-shell';

interface Option {
  value: number;
  why: string;
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000;
/** Numero in stile Python con al massimo 3 decimali. */
const show = (n: number): string => String(r3(n));

/**
 * Missione 5: la media. Si scompone `media = sum(misure) / len(misure)` in quattro passi e a ognuno si sceglie il risultato:
 * la somma, quanti sono i valori, la divisione e il valore stampato con round(..., 2). Si tocca, senza regolare nulla.
 */
@Component({
  selector: 'app-mean-calc',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Calcolo della media" goal="Scomponi media = sum / len: scegli il risultato di ogni passo, fino al valore stampato."
      controls="clic sul risultato corretto." [character]="character" [enemy]="enemy" [round]="step()" [rounds]="steps"
      [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="step() < 3 ? 1 : 2" [vars]="vars()">
      @if (step() < steps) {
        <p class="gm-query">{{ prompt() }}</p>
        <div class="gm-row" role="group" aria-label="Possibili risultati">
          @for (o of options(); track o.value) {
            <button type="button" class="btn cmd" (click)="pick(o)">{{ show(o.value) }}</button>
          }
        </div>
      } @else {
        <p class="gm-query">print → {{ show(printed) }}{{ unit ? ' ' + unit : '' }}</p>
      }
      <ul class="gm-trace" aria-label="Passi svolti">
        @for (t of trace(); track $index) { <li>{{ t }}</li> }
      </ul>
      @if (unit) { <p class="gm-note">Valori in {{ unit }}</p> }
    </app-game-shell>
  `,
  styles: `.gm-trace { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: center;
    font: .55rem var(--mono); color: var(--muted); } .gm-trace li { white-space: nowrap; }`,
})
export class MeanCalc extends BaseGame implements OnInit {
  protected readonly show = show;
  protected readonly steps = 4;
  protected values: number[] = [];
  protected sum = 0;
  protected count = 0;
  protected avg = 0;
  protected printed = 0;
  protected readonly step = signal(0);
  protected readonly trace = signal<string[]>([]);
  /** Il risultato giusto del passo corrente. */
  protected readonly expected = computed(() => [this.sum, this.count, r3(this.avg), this.printed][Math.min(this.step(), this.steps - 1)]);
  protected readonly options = computed<Option[]>(() => (this.step() < this.steps ? this.build(this.step()) : []));
  protected readonly code = computed(() => [
    `misure = [${this.values.map(fmt).join(', ')}]`,
    'media = sum(misure) / len(misure)',
    'print(round(media, 2))',
  ]);
  protected readonly vars = computed(() => {
    const s = this.step();
    return [s > 0 ? `sum = ${fmt(this.sum)}` : '', s > 1 ? `len = ${this.count}` : '', s > 2 ? `media = ${show(this.avg)}` : ''].filter(Boolean).join(' · ');
  });
  protected readonly prompt = computed(() => {
    switch (this.step()) {
      case 0: return 'sum(misure) → ?';
      case 1: return 'len(misure) → ?';
      case 2: return `media = ${fmt(this.sum)} / ${this.count} → ?`;
      default: return 'print(round(media, 2)) mostra → ?';
    }
  });

  ngOnInit(): void {
    this.values = this.nums('v', [14, 16, 19, 21, 18, 15]);
    this.sum = r2(this.values.reduce((a, b) => a + b, 0));
    this.count = this.values.length;
    this.avg = mean(this.values);
    this.printed = r2(this.avg);
  }

  /** Quattro risposte per passo: la giusta e le sviste più comuni, ognuna con la sua spiegazione. */
  private build(step: number): Option[] {
    const { sum, count, avg } = this;
    const top = Math.max(...this.values);
    const good = this.expected();
    const out: Option[] = [{ value: good, why: '' }];
    const add = (value: number, why: string) => {
      const v = step === 2 ? r3(value) : r2(value);
      if (Number.isFinite(v) && !out.some((o) => o.value === v)) out.push({ value: v, why });
    };
    if (step === 0) {
      add(avg, 'Quella è già la media: sum() restituisce soltanto la somma, la divisione viene dopo.');
      add(sum - top, `Manca il valore più alto (${fmt(top)}): sum() somma tutti i valori della lista.`);
      add(sum + top, `Hai contato due volte il valore più alto (${fmt(top)}): ogni valore si somma una sola volta.`);
      add(count, 'Quello è il numero dei valori (len), non la loro somma.');
    } else if (step === 1) {
      add(count - 1, `len() conta gli elementi, non l'ultimo indice: ${this.count} valori hanno indici da 0 a ${count - 1}.`);
      add(count + 1, 'len() non aggiunge nulla: restituisce quanti elementi ci sono.');
      add(sum, 'Quella è la somma (sum), non quanti sono i valori (len).');
      add(count * 2, 'len() conta ogni elemento una volta sola.');
    } else if (step === 2) {
      add(sum / (count - 1), `Hai diviso per ${count - 1}: la media divide per quanti sono i valori (${count}), non per l'ultimo indice.`);
      add(sum, 'Così non hai diviso: media = somma / quantità.');
      add(sum - count, 'Hai sottratto: la media si ottiene con la divisione.');
      add(count / sum, 'Divisione al contrario: va somma / quantità, non quantità / somma.');
    } else {
      add(Math.floor(avg), 'round(media, 2) tiene 2 decimali: non toglie tutti i decimali.');
      add(avg, 'Senza round() il valore ha più decimali: round(media, 2) li limita a 2.');
      add(Math.round(avg * 10) / 10, 'Con round(media, 2) i decimali sono 2, non 1.');
      add(good + 0.1, 'Il valore stampato è la media arrotondata, non un altro numero.');
      add(good - 0.1, 'Il valore stampato è la media arrotondata, non un altro numero.');
      add(good + 1, 'Il valore stampato è la media arrotondata, non un altro numero.');
    }
    // se le sviste coincidono con la risposta giusta si aggiungono numeri vicini
    for (const d of [1, -1, 10, -10]) add(good + d, 'Ricalcola con calma: il passo precedente ti dà tutti i numeri che servono.');
    return this.shuffle(out.slice(0, 4), step + 1);
  }

  protected pick(o: Option): void {
    if (this.cleared || this.step() >= this.steps) return;
    const s = this.step();
    if (o.value !== this.expected()) {
      this.miss(o.why || 'Ricalcola con calma: il passo precedente ti dà tutti i numeri che servono.');
      return;
    }
    const line = [
      `sum(misure) = ${fmt(this.sum)}`,
      `len(misure) = ${this.count}`,
      `media = ${fmt(this.sum)} / ${this.count} = ${show(this.avg)}`,
      `round(media, 2) = ${fmt(this.printed)}`,
    ][s];
    this.trace.update((t) => [...t, line]);
    this.step.set(s + 1);
    this.hit(
      [
        `sum(misure) → ${fmt(this.sum)}: la somma di tutti i valori.`,
        `len(misure) → ${this.count}: quanti sono i valori.`,
        `media = ${fmt(this.sum)} / ${this.count} → ${show(this.avg)}: la somma divisa per quanti sono i valori.`,
        `print(round(media, 2)) → ${fmt(this.printed)}: media = sum / len, arrotondata a 2 decimali.`,
      ][s],
    );
    if (this.step() >= this.steps) this.win();
  }
}
