import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BoardService } from '../../core/services/board.service';
import { GameStateService } from '../../core/services/game-state.service';
import { Modal } from './modal';

/** Classifica globale facoltativa: tabella dei primi 20, iscrizione (consenso + 14 anni) e uscita con cancellazione dei dati. */
@Component({
  selector: 'app-board-modal',
  imports: [Modal, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="'board.title' | t" [wide]="true" (closed)="closed.emit()">
      <p class="status">{{ 'board.intro' | t }}</p>

      @if (board.top().length) {
        <table class="board" [attr.aria-label]="'board.title' | t">
          <thead><tr><th>{{ 'board.colRank' | t }}</th><th>{{ 'board.colPlayer' | t }}</th><th>{{ 'board.colLevel' | t }}</th><th>{{ 'board.colXp' | t }}</th></tr></thead>
          <tbody>
            @for (r of board.top(); track r.n; let i = $index) {
              <tr [class.me]="r.n === game.board()?.n">
                <td>{{ i + 1 }}</td>
                <td>{{ 'board.name' | t: { n: r.n } }}@if (r.n === game.board()?.n) { <strong> ({{ 'board.you' | t }})</strong> }</td>
                <td>{{ r.level }}</td>
                <td>{{ r.xp }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (!board.busy()) {
        <p class="status">{{ 'board.empty' | t }}</p>
      }

      @if (game.board(); as me) {
        <p>{{ 'board.joined' | t: { n: me.n, xp: game.xp() } }}</p>
        <button type="button" class="btn danger" [disabled]="board.busy()" (click)="leave()">{{ 'board.leave' | t }}</button>
      } @else if (game.consent() !== 'granted') {
        <p class="status">{{ 'board.needSaving' | t }}</p>
        <button type="button" class="btn primary" (click)="game.acceptSaving()">{{ 'board.allowSaving' | t }}</button>
      } @else {
        <fieldset class="join">
          <label><input type="checkbox" [checked]="age()" (change)="age.set(asInput($event).checked)" /> {{ 'board.age' | t }}</label>
          <label><input type="checkbox" [checked]="agree()" (change)="agree.set(asInput($event).checked)" /> {{ 'board.consent' | t }}</label>
          <button type="button" class="btn primary" [disabled]="!age() || !agree() || board.busy()" (click)="join()">{{ 'board.join' | t }}</button>
        </fieldset>
      }

      @if (board.error()) { <p class="status err" role="alert">{{ errorText() }}</p> }
      <p class="status" role="status">{{ message() }}</p>
    </app-modal>
  `,
  styles: `
    .board { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: .6rem; }
    .board th, .board td { padding: 4px 6px; text-align: left; border-bottom: 1px solid var(--panel-2); }
    .board tr.me { background: var(--panel-2); color: var(--accent); }
    .join { border: 0; padding: 0; margin: 8px 0; display: grid; gap: 8px; }
    .join label { display: flex; gap: 8px; align-items: flex-start; font-size: .6rem; line-height: 1.5; }
    .err { color: #fca5a5; }
  `,
})
export class BoardModal {
  protected readonly board = inject(BoardService);
  protected readonly game = inject(GameStateService);
  private readonly i18n = inject(I18nService);
  readonly closed = output<void>();
  protected readonly age = signal(false);
  protected readonly agree = signal(false);
  protected readonly message = signal('');

  constructor() {
    void this.board.refresh();
  }

  protected asInput(e: Event): HTMLInputElement {
    return e.target as HTMLInputElement;
  }

  protected errorText(): string {
    return this.i18n.t(this.board.error() === 'offline' ? 'board.errorOffline' : 'board.error');
  }

  protected async join(): Promise<void> {
    this.message.set('');
    if (await this.board.join()) this.message.set(this.i18n.t('board.msgJoined'));
  }

  protected async leave(): Promise<void> {
    this.message.set('');
    if (await this.board.leave()) {
      this.age.set(false);
      this.agree.set(false);
      this.message.set(this.i18n.t('board.msgLeft'));
    }
  }
}
