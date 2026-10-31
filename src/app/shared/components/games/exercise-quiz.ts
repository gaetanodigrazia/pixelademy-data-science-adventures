import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame } from './base-game';
import { GameShell } from './game-shell';
import { Quiz, quizFor, QuizOption, QuizStep } from './quiz-steps';

/**
 * Minigioco a scelta multipla dei percorsi con esercizi propri: si esegue il codice a mano, un passo alla volta, scegliendo il
 * risultato giusto tra quello vero e le sviste più comuni (ognuna spiegata). Il quiz dipende da `config.exercise`.
 */
@Component({
  selector: 'app-exercise-quiz',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell [title]="quiz.title" [goal]="quiz.goal" controls="clic sul risultato corretto." [character]="character" [enemy]="enemy"
      [round]="step()" [rounds]="quiz.steps.length" [mistakes]="mistakes()" [message]="feedback()" [code]="quiz.code"
      [activeLine]="current().line" [vars]="current().vars ?? ''">
      @if (step() < quiz.steps.length) {
        <p class="gm-query">{{ current().prompt }}</p>
        <div class="gm-row" role="group" aria-label="Possibili risultati">
          @for (o of options(); track o.label) {
            <button type="button" class="btn cmd" (click)="pick(o)">{{ o.label }}</button>
          }
        </div>
      } @else {
        <p class="gm-query">Tutti i passi svolti ✔</p>
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
export class ExerciseQuiz extends BaseGame implements OnInit {
  protected quiz!: Quiz;
  protected readonly step = signal(0);
  protected readonly trace = signal<string[]>([]);
  protected readonly current = computed<QuizStep>(() => this.quiz.steps[Math.min(this.step(), this.quiz.steps.length - 1)]);
  /** Le risposte del passo: quella giusta e le sviste, in un ordine non ovvio. */
  protected readonly options = computed<QuizOption[]>(() => {
    const s = this.current();
    return this.shuffle([{ label: s.correct, why: '' }, ...s.traps], this.step() + 1);
  });
  /** Il risultato giusto del passo corrente (serve anche ai test). */
  protected readonly expected = computed(() => this.current().correct);

  ngOnInit(): void {
    this.quiz = quizFor({
      exercise: this.str('exercise', ''),
      name: this.str('name', 'valori'),
      v: this.nums('v', [1, 2, 3]),
      th: this.num('th', 0),
      thName: this.str('thName', 'soglia'),
      k: this.num('k', 0),
    });
  }

  protected pick(o: QuizOption): void {
    if (this.cleared || this.step() >= this.quiz.steps.length) return;
    const s = this.current();
    if (o.label !== s.correct) {
      this.miss(o.why || 'Ricalcola con calma: il passo precedente ti dà i numeri che servono.');
      return;
    }
    this.trace.update((t) => [...t, `${s.prompt.replace(/ → \?$/, '')} → ${s.correct}`]);
    this.step.update((i) => i + 1);
    this.hit(s.hit);
    if (this.step() >= this.quiz.steps.length) this.win();
  }
}
