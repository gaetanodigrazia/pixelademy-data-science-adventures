import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nKey } from '../../core/i18n/it';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { GameStateService } from '../../core/services/game-state.service';

/** Modale «Privacy e dati»: consenso al salvataggio locale, cancellazione e ripristino. */
@Component({
  selector: 'app-privacy-modal',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="backdrop" (click)="onBackdrop($event)">
        <div #dialog class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="privacy-title" tabindex="-1"
          (keydown.escape)="closed.emit()" (keydown)="trapTab($event)">
          <header class="head">
            <h2 id="privacy-title">{{ 'privacy.title' | t }}</h2>
            <button type="button" class="btn" [attr.aria-label]="'privacy.close' | t" (click)="closed.emit()">✕</button>
          </header>
          <p>{{ 'privacy.p1' | t }}</p>
          <p>{{ 'privacy.p2' | t }}</p>
          <p class="status">{{ 'privacy.state' | t }} <strong>{{ consentLabel() }}</strong></p>
          <div class="actions">
            <button type="button" class="btn primary" [disabled]="game.consent() === 'granted'" (click)="run(() => game.acceptSaving(), 'privacy.msgAccepted')">{{ 'privacy.accept' | t }}</button>
            <button type="button" class="btn" [disabled]="game.consent() === 'denied'" (click)="run(() => game.declineSaving(), 'privacy.msgDeclined')">{{ 'privacy.decline' | t }}</button>
            <button type="button" class="btn danger" (click)="run(() => game.clearStoredData(), 'privacy.msgCleared')">{{ 'privacy.clear' | t }}</button>
            <button type="button" class="btn" (click)="run(() => game.resetProgress(), 'privacy.msgReset')">{{ 'privacy.reset' | t }}</button>
            <button type="button" class="btn" (click)="exportProgress()">{{ 'privacy.export' | t }}</button>
            <button type="button" class="btn" (click)="fileInput.click()">{{ 'privacy.import' | t }}</button>
            <input #fileInput type="file" accept="application/json,.json" hidden [attr.aria-label]="'privacy.importFile' | t" (change)="importProgress($event)" />
          </div>
          <p class="status" role="status">{{ message() }}</p>
          <button type="button" class="btn" (click)="closed.emit()">{{ 'privacy.close' | t }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(5, 8, 20, .8); display: grid; place-items: center; padding: 12px; overflow-y: auto; }
    .dialog { width: 100%; max-width: 520px; margin: 0; max-height: 100%; overflow-y: auto; }
    .dialog:focus { outline: none; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .actions { display: grid; gap: 8px; margin: 12px 0; }
    @media (min-width: 520px) { .actions { grid-template-columns: 1fr 1fr; } }
  `,
})
export class PrivacyModal {
  protected readonly game = inject(GameStateService);
  private readonly i18n = inject(I18nService);
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

  protected consentLabel(): string {
    const c = this.game.consent();
    return this.i18n.t(c === 'granted' ? 'privacy.granted' : c === 'denied' ? 'privacy.denied' : 'privacy.unknown');
  }

  protected run(action: () => void, msg: I18nKey): void {
    action();
    this.message.set(this.i18n.t(msg));
  }

  protected exportProgress(): void {
    const url = URL.createObjectURL(new Blob([this.game.exportProgress()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixelademy-progressi.json';
    a.click();
    URL.revokeObjectURL(url);
    this.message.set(this.i18n.t('privacy.msgExported'));
  }

  protected async importProgress(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.message.set(this.i18n.t(this.game.importProgress(await file.text()) ? 'privacy.msgImported' : 'privacy.msgInvalid'));
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
