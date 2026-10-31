import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

/** Modale generica: focus intrappolato, Esc e click sullo sfondo per chiudere, scroll della pagina bloccato. */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="onBackdrop($event)">
      <div #dialog class="dialog panel" [class.wide]="wide()" role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1"
        (keydown.escape)="closed.emit()" (keydown)="trapTab($event)">
        <header class="mhead">
          <h2>{{ title() }}</h2>
          <button type="button" class="btn" aria-label="Chiudi" (click)="closed.emit()">✕</button>
        </header>
        <div class="mbody"><ng-content /></div>
      </div>
    </div>
  `,
  styles: `
    .dialog.wide { max-width: 760px; }
    .mhead { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .mhead h2 { margin: 0; }
    .mbody { min-height: 0; overflow: auto; }
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly wide = input(false);
  readonly closed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  constructor() {
    effect((onCleanup) => {
      const el = this.dialog().nativeElement;
      const previous = document.activeElement as HTMLElement | null;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      el.focus();
      onCleanup(() => {
        document.body.style.overflow = overflow;
        previous?.focus?.();
      });
    });
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  protected trapTab(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const root = this.dialog().nativeElement;
    const f = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
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
