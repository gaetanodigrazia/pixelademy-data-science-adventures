import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

/** Modale «Privacy e dati»: consenso al salvataggio locale, cancellazione e ripristino. */
@Component({
  selector: 'app-privacy-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="backdrop" (click)="onBackdrop($event)">
        <div #dialog class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="privacy-title" tabindex="-1"
          (keydown.escape)="closed.emit()" (keydown)="trapTab($event)">
          <header class="head">
            <h2 id="privacy-title">Privacy e dati</h2>
            <button type="button" class="btn" aria-label="Chiudi" (click)="closed.emit()">✕</button>
          </header>
          <p>
            Pixelademy non ha server né account. Se lo consenti, XP, livello, missioni e scelte vengono
            salvati solo in questo browser (localStorage). Non raccogliamo dati personali.
          </p>
          <p>
            Il pulsante «Mi piace» è anonimo: invia una richiesta vuota che aumenta di 1 un contatore e non salva nulla di te
            (nessun nome, cookie o identificativo). Come per ogni sito, il servizio di hosting vede l'indirizzo IP della richiesta ma noi non lo leggiamo né lo salviamo.
          </p>
          <p>
            <label class="opt"><input type="checkbox" [checked]="game.state().telemetry" [disabled]="game.consent() !== 'granted'"
              (change)="setTelemetry($any($event.target).checked)" />
              Contribuisci con statistiche anonime (facoltativo)</label>
          </p>
          <p class="status">Se attivo (serve il salvataggio), per ogni missione contiamo soltanto quanti tentativi sono serviti e se è stata superata o lasciata: un contatore per missione, <strong>senza</strong> identificativi, cookie o dati personali. Ci aiuta a capire dove i contenuti sono troppo difficili.</p>
          <p class="status">Stato: <strong>{{ consentLabel() }}</strong></p>
          <div class="actions">
            <button type="button" class="btn primary" [disabled]="game.consent() === 'granted'" (click)="run(() => game.acceptSaving(), 'Salvataggio attivato.')">Accetta il salvataggio</button>
            <button type="button" class="btn" [disabled]="game.consent() === 'denied'" (click)="run(() => game.declineSaving(), 'Dati salvati rimossi: uso senza salvataggio.')">Usa senza salvare</button>
            <button type="button" class="btn danger" (click)="run(() => game.clearStoredData(), 'Dati salvati cancellati dal browser.')">Cancella dati salvati</button>
            <button type="button" class="btn" (click)="run(() => game.resetProgress(), 'Progressi azzerati.')">Ripristina stato iniziale</button>
            <button type="button" class="btn" (click)="exportProgress()">Esporta i progressi (file)</button>
            <button type="button" class="btn" (click)="fileInput.click()">Importa i progressi (file)</button>
            <input #fileInput type="file" accept="application/json,.json" hidden aria-label="File dei progressi da importare" (change)="importProgress($event)" />
          </div>
          <p class="status" role="status">{{ message() }}</p>
          <button type="button" class="btn" (click)="closed.emit()">Chiudi</button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(5, 8, 20, .8); display: grid; place-items: center; padding: 12px; overflow-y: auto; }
    .dialog { width: 100%; max-width: 520px; margin: 0; max-height: 100%; overflow-y: auto; }
    .dialog:focus { outline: none; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .opt { display: flex; gap: 8px; align-items: center; cursor: pointer; }
    .actions { display: grid; gap: 8px; margin: 12px 0; }
    @media (min-width: 520px) { .actions { grid-template-columns: 1fr 1fr; } }
  `,
})
export class PrivacyModal {
  protected readonly game = inject(GameStateService);
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly message = signal('');
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    effect((onCleanup) => {
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      const previous = document.activeElement as HTMLElement | null;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      el.focus();
      onCleanup(() => {
        document.body.style.overflow = overflow;
        previous?.focus?.();
        this.message.set('');
      });
    });
  }

  protected setTelemetry(on: boolean): void {
    this.game.setTelemetry(on);
    this.message.set(on ? 'Statistiche anonime attivate: grazie!' : 'Statistiche anonime disattivate.');
  }

  protected consentLabel(): string {
    const c = this.game.consent();
    return c === 'granted' ? 'salvataggio attivo' : c === 'denied' ? 'uso senza salvataggio' : 'scelta da fare';
  }

  protected run(action: () => void, msg: string): void {
    action();
    this.message.set(msg);
  }

  protected exportProgress(): void {
    const url = URL.createObjectURL(new Blob([this.game.exportProgress()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixelademy-progressi.json';
    a.click();
    URL.revokeObjectURL(url);
    this.message.set('File dei progressi scaricato.');
  }

  protected async importProgress(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.message.set(this.game.importProgress(await file.text()) ? 'Progressi importati.' : 'Il file non è valido: nessun dato è stato cambiato.');
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  /** Mantiene il focus dentro la modale con Tab / Maiusc+Tab. */
  protected trapTab(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const root = this.dialog()?.nativeElement;
    const f = root ? Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled)')) : [];
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
