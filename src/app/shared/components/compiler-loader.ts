import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';

/**
 * Barra di caricamento del compilatore Python. Resta visibile almeno `minMs` (2 s): sale fino al 90%, poi arriva
 * al 100% solo quando il compilatore è davvero pronto (se lo è già, il riempimento dura comunque `minMs`).
 */
@Component({
  selector: 'app-compiler-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!done()) {
      <section class="loader panel" [class.fail]="failed()" role="status" aria-live="polite">
        <p class="title">{{ failed() ? '✘ Compilatore non caricato' : shown() >= 100 ? '✔ Compilatore pronto' : '⚙ Carico il compilatore Python…' }}</p>
        @if (failed()) {
          <p class="sub">Serve internet per scaricare l'interprete. Controlla la connessione e riprova.</p>
          <button type="button" class="btn primary" (click)="retry.emit()">↻ Riprova</button>
        } @else {
          <div class="bar" role="progressbar" aria-label="Caricamento del compilatore" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="shown()">
            <span [style.width.%]="peak()"></span>
          </div>
          <p class="sub">{{ shown() }}%</p>
        }
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .loader { padding: 6px 10px; border-color: var(--accent); background: #0b0b24; }
    .loader.fail { border-color: var(--bad); }
    .title { margin: 0; font-size: .6rem; color: var(--accent-2); }
    .fail .title { color: var(--bad); }
    .sub { margin: 4px 0 0; font-size: .5rem; color: var(--muted); }
    .bar { margin-top: 5px; }
    .bar > span { transition: width .15s linear; }
    .fail .btn { margin-top: 6px; padding: 5px 9px; font-size: .55rem; }
  `,
})
export class CompilerLoader {
  readonly status = input.required<'idle' | 'loading' | 'ready' | 'error'>();
  /** Durata minima in cui la barra resta visibile. */
  readonly minMs = input(2000);
  readonly retry = output<void>();

  protected readonly done = signal(false);
  protected readonly peak = signal(0);
  protected readonly shown = computed(() => Math.round(this.peak()));
  protected readonly failed = computed(() => this.status() === 'error');
  private readonly elapsed = signal(0);

  constructor() {
    let start = Date.now();
    let previous: string | undefined;
    const timer = setInterval(() => this.elapsed.set(Date.now() - start), 80);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Un nuovo tentativo dopo un errore riparte da zero.
    effect(() => {
      const s = this.status();
      untracked(() => {
        if (s === 'loading' && previous === 'error') {
          start = Date.now();
          this.elapsed.set(0);
          this.peak.set(0);
          this.done.set(false);
        }
        previous = s;
      });
    });

    // Avanzamento: lineare fino a minMs se il compilatore è pronto; altrimenti esponenziale con tetto al 90%. Mai all'indietro.
    effect(() => {
      const t = this.elapsed();
      const raw = this.status() === 'ready' ? Math.min(100, (t / this.minMs()) * 100) : Math.min(90, 90 * (1 - Math.exp(-t / 800)));
      untracked(() => this.peak.update((p) => Math.max(p, raw)));
    });

    // A 100% resta un attimo e poi scompare.
    effect((onCleanup) => {
      if (this.peak() < 100) return;
      const id = setTimeout(() => this.done.set(true), 600);
      onCleanup(() => clearTimeout(id));
    });
  }
}
