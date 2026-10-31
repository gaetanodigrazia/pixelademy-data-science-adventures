import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { LearningPath } from '../../core/models/content-pack.model';
import { ContentRegistryService } from '../../core/services/content-registry.service';
import { GameStateService } from '../../core/services/game-state.service';
import { PythonRunnerService } from '../../core/services/python-runner.service';
import { projectCode } from '../../core/utils/project-code';
import { Modal } from './modal';

/**
 * Il progetto del percorso: ogni missione completata aggiunge una sezione allo stesso programma, che stampa il bollettino
 * costruito finora. Con tutte le missioni il programma è completo.
 */
@Component({
  selector: 'app-project-modal',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="'Progetto · ' + path().title" [wide]="true" (closed)="closed.emit()">
      <p class="status">{{ done() }}/{{ pieces().length }} sezioni del bollettino{{ done() === pieces().length ? ' · progetto completo! 🏆' : '' }}</p>
      <div class="bar" role="progressbar" aria-label="Avanzamento del progetto" aria-valuemin="0" [attr.aria-valuemax]="pieces().length" [attr.aria-valuenow]="done()">
        <span [style.width.%]="(done() / pieces().length) * 100"></span>
      </div>
      <ol class="pieces">
        @for (p of pieces(); track p.id) {
          <li [class.on]="p.done">{{ p.done ? '✔' : '🔒' }} {{ p.title }}</li>
        }
      </ol>
      @if (source()) {
        <pre class="code" aria-label="Codice del progetto">{{ source() }}</pre>
        <div class="row">
          <button type="button" class="btn primary" [disabled]="running()" (click)="run()">{{ running() ? 'In esecuzione…' : '▶ Esegui il bollettino' }}</button>
        </div>
        @if (output() || error()) {
          <pre class="code out" aria-live="polite" aria-label="Output del progetto">{{ output() }}{{ error() }}</pre>
        }
      } @else {
        <p class="status">Completa la prima missione per iniziare il bollettino.</p>
      }
    </app-modal>
  `,
  styles: `
    .pieces { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 2px 12px; margin: 6px 0; padding: 0; list-style: none; font-size: .5rem; color: var(--muted); }
    .pieces li.on { color: var(--text); }
    .code { max-height: 30vh; overflow: auto; background: #020617; border: 2px solid var(--line); padding: 6px; font-size: .5rem; line-height: 1.5; }
    .out { max-height: 14vh; color: var(--good); }
  `,
})
export class ProjectModal {
  private readonly game = inject(GameStateService);
  private readonly registry = inject(ContentRegistryService);
  private readonly python = inject(PythonRunnerService);

  readonly path = input.required<LearningPath>();
  readonly closed = output<void>();

  protected readonly running = signal(false);
  protected readonly output = signal('');
  protected readonly error = signal('');

  protected readonly pieces = computed(() =>
    this.path().missions.map((m, i) => ({ id: m.id, title: `${i + 1}. ${m.title}`, done: this.game.isCompleted(m.id) })),
  );
  protected readonly done = computed(() => this.pieces().filter((p) => p.done).length);
  /** Il programma è già l'insieme di tutte le sezioni: è il codice dell'ultima missione completata. */
  protected readonly source = computed(() => {
    const last = this.path().missions[this.done() - 1];
    return last ? projectCode(this.game.state().solvedCode[last.id], this.registry.solution(last.id) ?? '') : '';
  });

  protected async run(): Promise<void> {
    this.running.set(true);
    const res = await this.python.run(this.source());
    this.output.set(res.output);
    this.error.set(res.error ?? '');
    this.running.set(false);
  }
}
