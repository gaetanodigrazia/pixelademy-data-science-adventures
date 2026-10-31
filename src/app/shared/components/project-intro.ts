import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningPath } from '../../core/models/content-pack.model';
import { buildDashboardCards } from '../../core/utils/dashboard-cards';
import { Modal } from './modal';

/**
 * Presentazione del progetto, prima della prima missione: cosa si costruisce, cosa mostra la Dashboard
 * e cosa succede quando tutte le sezioni sono complete.
 */
@Component({
  selector: 'app-project-intro',
  imports: [Modal, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="'Il tuo progetto · ' + heading()" [wide]="true" (closed)="closed.emit()">
      <section class="blk">
        <h3>🧩 Cosa costruirai</h3>
        <p>Le {{ total() }} missioni di «{{ path().title }}» sono {{ total() }} sezioni dello <strong>stesso programma Python</strong>. A ogni missione aggiungi un pezzo di codice e il bollettino stampa una riga in più.</p>
      </section>

      @if (dashboard()) {
        <section class="blk">
          <h3>📊 La Dashboard</h3>
          <p>I numeri che il <strong>tuo</strong> programma produce finiscono nella Dashboard, in indicatori e grafici. Ogni missione completata ne accende una parte:</p>
          <ul class="tiles" aria-label="Riquadri della Dashboard">
            @for (t of tiles(); track t) { <li><span aria-hidden="true">🔒</span> {{ t }}</li> }
          </ul>
        </section>
      }

      <section class="blk end">
        <h3>🏁 Alla fine</h3>
        @if (dashboard()) {
          <p>Alla missione {{ total() }} il programma stampa il <strong>bollettino completo</strong>, la Dashboard è tutta accesa 🏆. Dalla Dashboard puoi anche rivedere ed eseguire tutto il codice che hai scritto (pulsante <code>&lt;/&gt; Codice</code>).</p>
        } @else {
          <p>Alla missione {{ total() }} il tuo programma stampa il <strong>bollettino completo</strong> 🏆.</p>
        }
      </section>

      <div class="row">
        <button type="button" class="btn primary" (click)="closed.emit()">Comincia →</button>
        @if (dashboard()) { <a class="btn" [routerLink]="['/progetto', path().id]" (click)="closed.emit()">📊 Anteprima Dashboard</a> }
      </div>
    </app-modal>
  `,
  styles: `
    .blk { margin: 0 0 8px; }
    .blk h3 { margin: 0 0 3px; font-size: .65rem; }
    .blk p { margin: 0; font-size: .55rem; line-height: 1.7; color: var(--text); }
    .blk strong { color: var(--accent-2); font-weight: normal; }
    .blk code { font: .5rem var(--mono); color: var(--good); }
    .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px; margin: 6px 0 0; padding: 0; list-style: none; }
    .tiles li { padding: 4px 8px; font-size: .5rem; line-height: 1.5; color: var(--muted); background: #020617; border: 2px dashed var(--line); }
    .end { padding: 6px 8px; border-left: 4px solid var(--good); background: #020617; }
  `,
})
export class ProjectIntro {
  readonly path = input.required<LearningPath>();
  readonly closed = output<void>();

  protected readonly total = computed(() => this.path().missions.length);
  protected readonly dashboard = computed(() => this.path().dashboard !== false);
  protected readonly heading = computed(() => this.path().project?.heading ?? this.path().title);
  /** I riquadri della Dashboard che questo percorso può accendere (un percorso breve ne ha meno). */
  protected readonly tiles = computed(() => {
    const p = this.path().project;
    return p ? buildDashboardCards(p, 0, [], this.total()).map((c) => c.title) : [];
  });
}
