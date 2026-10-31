import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LearningPath } from '../../core/models/content-pack.model';
import { GameStateService } from '../../core/services/game-state.service';
import { Modal } from './modal';

/**
 * Classifica locale delle sfide di un percorso: il miglior risultato di ogni sfida, in ordine di XP (a parità, meno secondi).
 * Resta nel browser (stato del giocatore): non c'è nessun confronto con altre persone.
 */
@Component({
  selector: 'app-leaderboard',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="'🏆 Classifica locale · ' + path().title" [wide]="true" (closed)="closed.emit()">
      @if (rows().length) {
        <table class="board" aria-label="Classifica locale delle sfide">
          <thead><tr><th>#</th><th>Sfida</th><th>XP</th><th>Tempo</th><th>Errori</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.id; let i = $index) {
              <tr><td>{{ i + 1 }}</td><td>{{ r.title }}</td><td>{{ r.xp }}</td><td>{{ r.seconds }} s</td><td>{{ r.errors }}</td></tr>
            }
          </tbody>
        </table>
        <p class="status">Totale dei migliori risultati: <strong>{{ total() }} XP</strong> su {{ path().missions.length }} sfide.</p>
      } @else {
        <p class="status">Nessun risultato ancora: supera una sfida per comparire in classifica. Puoi rigiocarla per migliorare il tuo record.</p>
      }
      <p class="note">La classifica è solo sul tuo dispositivo: i risultati non vengono inviati a nessuno.</p>
    </app-modal>
  `,
  styles: `
    .board { width: 100%; border-collapse: collapse; font-size: .55rem; }
    .board th, .board td { text-align: left; padding: 4px 6px; border-bottom: 2px solid var(--line); }
    .board th { color: var(--accent-2); }
    .note { margin: 6px 0 0; font-size: .45rem; color: var(--muted); }
  `,
})
export class Leaderboard {
  private readonly game = inject(GameStateService);
  readonly path = input.required<LearningPath>();
  readonly closed = output<void>();

  protected readonly rows = computed(() =>
    this.path().missions
      .filter((m) => this.game.state().records[m.id])
      .map((m) => ({ id: m.id, title: m.title, ...this.game.state().records[m.id] }))
      .sort((a, b) => b.xp - a.xp || a.seconds - b.seconds),
  );
  protected readonly total = computed(() => this.rows().reduce((n, r) => n + r.xp, 0));
}
