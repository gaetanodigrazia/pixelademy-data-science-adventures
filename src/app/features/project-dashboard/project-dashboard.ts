import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentRegistryService } from '../../core/services/content-registry.service';
import { GameStateService } from '../../core/services/game-state.service';
import { buildDashboardCards } from '../../core/utils/dashboard-cards';
import { BarChart } from '../../shared/components/bar-chart';
import { ProjectModal } from '../../shared/components/project-modal';
import { ShareModal } from '../../shared/components/share-modal';
import { ShareImageInput } from '../../core/utils/share-image';

/**
 * Dashboard dei risultati: i numeri che il bollettino dell'utente ha prodotto, in grafici e indicatori.
 * Ogni missione completata accende una parte della dashboard.
 */
@Component({
  selector: 'app-project-dashboard',
  imports: [RouterLink, BarChart, ProjectModal, ShareModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      @if (path(); as p) {
        <header class="top">
          <a routerLink="/" class="btn">← Mappa</a>
          <div class="title">
            <h1>📊 {{ project()?.heading }}</h1>
            <p class="status">{{ p.title }} · {{ done() }}/{{ p.missions.length }} sezioni prodotte{{ done() === p.missions.length ? ' · progetto completo 🏆' : '' }}</p>
          </div>
          @if (complete()) { <button type="button" class="btn share" (click)="shareOpen.set(true)">🔗 Condividi</button> }
          @if (done() > 0) { <button type="button" class="btn code" (click)="codeOpen.set(true)">&lt;/&gt; Codice</button> }
        </header>
        <div class="bar" role="progressbar" aria-label="Sezioni del bollettino prodotte" aria-valuemin="0" [attr.aria-valuemax]="p.missions.length" [attr.aria-valuenow]="done()">
          <span [style.width.%]="(done() / p.missions.length) * 100"></span>
        </div>

        @if (done() === 0) {
          <section class="panel empty">
            <h2>Nessun risultato ancora</h2>
            <p>Completa la prima missione: il tuo programma produrrà i primi numeri e la dashboard inizierà a riempirsi.</p>
            <a [routerLink]="['/missione', p.missions[0].id]" class="btn primary">Inizia la missione 1</a>
          </section>
        } @else {
          <div class="grid" [style.--rows]="rows()" [style.--n]="cards().length">
            @for (c of cards(); track c.title) {
              <section class="panel card" [attr.aria-label]="c.title">
                <h2>{{ c.title }}</h2>
                <div class="stats">
                  @for (s of c.stats; track s.label) {
                    <div class="stat" [class.locked]="s.text === null" [class.good]="s.tone === 'good'" [class.bad]="s.tone === 'bad'">
                      <strong>{{ s.text ?? '🔒' }}</strong>
                      <span>{{ s.text === null ? 'missione ' + s.section : s.label }}</span>
                    </div>
                  }
                </div>
                @if (c.values) {
                  <app-bar-chart class="chart" [values]="c.values" [labels]="c.labels" [marks]="c.marks" [refs]="c.refs" [ariaLabel]="c.title" />
                } @else {
                  <p class="locked-chart">🔒 Completa la missione {{ c.chartSection }} per vedere il grafico</p>
                }
              </section>
            }
          </div>
        }

        @if (codeOpen()) { <app-project-modal [path]="p" (closed)="codeOpen.set(false)" /> }
        @if (shareOpen() && shareData(); as sd) { <app-share-modal [data]="sd" [slug]="p.id" [pathId]="p.id" (closed)="shareOpen.set(false)" /> }
      } @else {
        <section class="panel"><h2>Percorso non trovato</h2><a routerLink="/" class="btn">Torna alla mappa</a></section>
      }
    </main>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .top { flex: none; display: flex; align-items: center; gap: 10px; }
    .title { flex: 1; min-width: 0; }
    .title h1 { margin: 0; font-size: .8rem; overflow-wrap: anywhere; }
    .title .status { margin: 0; font-size: .5rem; }
    .code, .share { padding: 5px 9px; font-size: .55rem; }
    .share { border-color: var(--good); color: var(--good); }
    .grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(var(--rows, 2), minmax(0, 1fr)); gap: 8px; }
    .grid .card:last-child:nth-child(odd) { grid-column: 1 / -1; }
    .card { display: flex; flex-direction: column; gap: 4px; min-height: 0; overflow: hidden; padding: 6px 10px; }
    .card h2 { margin: 0; font-size: .6rem; }
    .stats { flex: none; display: flex; flex-wrap: wrap; gap: 4px 6px; }
    .stat { display: flex; flex-direction: column; min-width: 72px; padding: 3px 7px; background: #020617; border: 2px solid var(--line); }
    .stat strong { font: .7rem var(--mono); color: var(--accent-2); font-weight: normal; }
    .stat span { font-size: .42rem; line-height: 1.4; color: var(--muted); }
    .stat.good { border-color: var(--good); } .stat.good strong { color: var(--good); }
    .stat.bad { border-color: var(--bad); } .stat.bad strong { color: var(--bad); }
    .stat.locked { opacity: .5; border-style: dashed; } .stat.locked strong { color: var(--muted); }
    .chart { flex: 1; min-height: 0; }
    .locked-chart { flex: 1; display: grid; place-items: center; margin: 0; text-align: center; font-size: .5rem; color: var(--muted); border: 2px dashed var(--line); }
    .empty { text-align: center; }
    @media (max-width: 800px) {
      /* Telefono: una colonna che scorre dentro la pagina (la regola «niente scroll» schiaccerebbe grafici e indicatori a pochi pixel). */
      .grid { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-auto-rows: auto; overflow-y: auto; gap: 8px; }
      .card { min-height: auto; overflow: visible; padding: 6px 8px; gap: 4px; }
      .chart { flex: none; height: 120px; min-height: 120px; }
      .locked-chart { flex: none; min-height: 60px; }
      /* I pulsanti (Mappa, Condividi, Codice) stanno su una riga e il titolo sotto, a tutta larghezza. */
      .top { gap: 6px; flex-wrap: wrap; }
      .title { flex: 1 1 100%; order: 3; }
      .title h1 { font-size: .55rem; }
      .title .status { font-size: .42rem; }
      .stat { flex: 1 1 30%; min-width: 0; padding: 2px 5px; }
      .stat strong { font-size: .6rem; }
      .stat span { font-size: .38rem; }
    }
  `,
})
export class ProjectDashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly registry = inject(ContentRegistryService);
  private readonly game = inject(GameStateService);

  constructor() {
    effect(() => {
      if (this.condividi() && this.complete()) untracked(() => this.shareOpen.set(true));
    });
  }

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  /** Un percorso con `dashboard: false` non ha questa pagina: si comporta come un percorso inesistente. */
  protected readonly path = computed(() => {
    const p = this.registry.path(this.id());
    return p?.dashboard === false ? undefined : p;
  });
  protected readonly project = computed(() => this.path()?.project);
  protected readonly codeOpen = signal(false);
  protected readonly shareOpen = signal(false);
  private readonly condividi = toSignal(this.route.queryParamMap.pipe(map((q) => q.has('condividi'))), { initialValue: false });

  /** Missioni completate = sezioni del bollettino prodotte (si completano in ordine). */
  protected readonly done = computed(() => this.path()?.missions.filter((m) => this.game.isCompleted(m.id)).length ?? 0);

  /** Il programma dell'utente ha superato la validazione: il suo output coincide con il bollettino atteso fino all'ultima missione completata. */
  private readonly lines = computed(() => {
    const last = this.path()?.missions[this.done() - 1];
    return last?.validation.kind === 'lines' ? last.validation.expected : [];
  });

  /** Tutte le sezioni sono prodotte: il progetto è completo e si può condividere. */
  protected readonly complete = computed(() => !!this.path() && this.done() === this.path()!.missions.length);

  /** I dati dell'immagine da condividere: gli stessi riquadri che si vedono nella Dashboard. */
  protected readonly shareData = computed<ShareImageInput | undefined>(() => {
    const p = this.path();
    const project = this.project();
    if (!p || !project || !this.complete()) return undefined;
    return { heading: project.heading, pathTitle: p.title, done: this.done(), total: p.missions.length, cards: this.cards() };
  });

  protected readonly cards = computed(() => {
    const p = this.project();
    return p ? buildDashboardCards(p, this.done(), this.lines(), this.path()?.missions.length) : [];
  });
  /** Righe della griglia a due colonne (l'ultimo riquadro, se dispari, occupa tutta la riga). */
  protected readonly rows = computed(() => Math.max(1, Math.ceil(this.cards().length / 2)));
}
