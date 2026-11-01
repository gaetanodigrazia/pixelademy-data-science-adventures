import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Le stelle della difficoltà (su 10) con un tooltip «Difficoltà N su 10» al passaggio del mouse o al focus da tastiera. */
@Component({
  selector: 'app-difficulty-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="wrap" tabindex="0" role="img" [attr.aria-label]="text()">
      <span class="stars" aria-hidden="true">{{ stars() }}</span>
      <span class="tip" role="tooltip" aria-hidden="true">{{ text() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; }
    .wrap { position: relative; display: inline-block; cursor: help; border-radius: 4px; }
    .wrap:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .tip {
      position: absolute; left: 0; top: calc(100% + 6px); z-index: 20; white-space: nowrap;
      padding: .35rem .55rem; border-radius: 6px; background: #0b1020; color: #f1f5f9; border: 1px solid #475569;
      font-size: .7rem; line-height: 1.2; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .12s;
    }
    .wrap:hover .tip, .wrap:focus .tip, .wrap:focus-within .tip { opacity: 1; visibility: visible; }
  `],
})
export class DifficultyStars {
  readonly value = input.required<number>();
  protected readonly stars = computed(() => '★'.repeat(this.value()) + '☆'.repeat(Math.max(0, 10 - this.value())));
  protected readonly text = computed(() => `Difficoltà ${this.value()} su 10`);
}
