import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { Character, Enemy } from '../../../core/models/character.model';
import { Modal } from '../modal';
import { SpriteView } from '../sprite-view';
import { Feedback } from './base-game';

/**
 * Cornice comune dei minigiochi: intestazione con obiettivo e avanzamento, pannello «codice che stai eseguendo»
 * (con la riga attiva evidenziata), area di gioco e barra di feedback che spiega ogni mossa.
 */
@Component({
  selector: 'app-game-shell',
  imports: [SpriteView, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="arena" [attr.aria-label]="title()">
      <header class="top">
        @if (character(); as c) { <app-sprite-view class="av" [sprite]="c.sprite" [scale]="3" [label]="c.name" /> }
        <div class="meta">
          <h2>{{ title() }}</h2>
        </div>
        <div class="stats">
          <span class="pips" role="img" [attr.aria-label]="'Passo ' + (round() + 1 > rounds() ? rounds() : round() + 1) + ' di ' + rounds()">
            @for (p of pips(); track $index) { <i [class.on]="$index < round()"></i> }
          </span>
          <span class="step" aria-hidden="true">Passo {{ stepNo() }}/{{ rounds() }}</span>
          <span class="miss" [class.some]="mistakes() > 0">Errori {{ mistakes() }}</span>
        </div>
        @if (enemy(); as e) {
          <div class="foe" [title]="e.name">
            <app-sprite-view class="av" [sprite]="e.sprite" [scale]="3" [label]="e.name" />
            <span class="hp" aria-hidden="true"><b [style.width.%]="hp()"></b></span>
          </div>
        }
      </header>
      <p class="goal"><strong>🎯 Obiettivo</strong> · {{ goal() }}</p>

      <div class="body" [class.nocode]="!code().length">
        @if (code().length) {
          <aside class="code" aria-label="Codice Python in esecuzione">
            <ol>
              @for (l of code(); track $index) {
                <li [class.on]="$index === activeLine()"><code>{{ l }}</code></li>
              }
            </ol>
            @if (vars()) { <p class="vars">{{ vars() }}</p> }
          </aside>
        }
        <div class="board"><ng-content /></div>
      </div>

      <footer class="msg" [class.ok]="message()?.kind === 'ok'" [class.err]="message()?.kind === 'err'">
        <span role="status" aria-live="polite">{{ message()?.text || 'Controlli: ' + controls() }}</span>
      </footer>
    </section>

    @if (doneStep(); as n) {
      <app-modal title="Passo completato!" (closed)="doneStep.set(0)">
        @if (message()?.text) { <p class="why">{{ message()?.text }}</p> }
        <p class="next">{{ nextText(n) }}</p>
        <div class="row"><button type="button" class="btn primary" (click)="doneStep.set(0)">Continua →</button></div>
      </app-modal>
    }
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .arena { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px 10px;
      background: var(--panel); border: 4px solid var(--line); }
    .top { flex: none; display: flex; align-items: center; gap: 10px; min-width: 0; }
    .meta { flex: 1; min-width: 0; }
    .meta h2 { margin: 0; font-size: .7rem; }
    /* Obiettivo: riquadro a tutta larghezza, ben leggibile (è la cosa più importante da capire in ogni gioco). */
    .goal { flex: none; margin: 0; padding: 6px 10px; font-size: .65rem; line-height: 1.6; color: var(--text); background: #0b0b24; border-left: 4px solid var(--accent); }
    .goal strong { color: var(--accent-2); font-weight: normal; }
    .stats { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-size: .5rem; color: var(--muted); }
    .pips { display: flex; gap: 3px; }
    .pips i { width: 12px; height: 6px; background: #020617; border: 1px solid #64748b; }
    .pips i.on { background: var(--good); border-color: var(--good); }
    .step { color: var(--accent-2); }
    .miss.some { color: var(--bad); }
    .foe { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .hp { display: block; width: 36px; height: 4px; background: #020617; border: 1px solid #64748b; }
    .hp b { display: block; height: 100%; background: var(--bad); transition: width .3s; }
    /* La riga ha altezza fissa (1fr): così .board scorre invece di far crescere la griglia e finire tagliata. */
    .body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); grid-template-rows: minmax(0, 1fr); gap: 8px; }
    .body.nocode { grid-template-columns: minmax(0, 1fr); }
    .code { min-height: 0; overflow: hidden; background: #020617; border: 2px solid var(--line); padding: 6px 0; }
    .code ol { margin: 0; padding: 0; list-style: none; counter-reset: ln; }
    .code li { counter-increment: ln; display: flex; gap: 8px; padding: 1px 8px; border-left: 3px solid transparent; }
    .code li::before { content: counter(ln); width: 1.2em; text-align: right; color: #475569; font: .55rem var(--mono); line-height: 1.7; }
    .code li.on { background: rgba(251, 191, 36, .12); border-left-color: var(--accent); }
    .code code { font: .6rem/1.7 var(--mono); color: #e2e8f0; white-space: pre; }
    .vars { margin: 4px 0 0; padding: 4px 8px 0; border-top: 1px dashed var(--line); font: .55rem/1.6 var(--mono); color: var(--good); overflow-wrap: anywhere; }
    /* «safe center»: se il gioco non ci sta in altezza parte dall'alto e scorre, invece di essere tagliato. */
    .board { min-height: 0; min-width: 0; display: flex; flex-direction: column; justify-content: safe center; gap: 8px; overflow-y: auto; overflow-x: hidden; }
    .msg { flex: none; min-height: 2.6em; padding: 5px 8px; font-size: .55rem; line-height: 1.5; color: var(--muted); background: #020617; border-left: 4px solid var(--line); }
    .msg.ok { color: var(--good); border-left-color: var(--good); }
    .why { margin: 0 0 8px; font-size: .6rem; line-height: 1.6; color: var(--good); }
    .next { margin: 0 0 8px; font-size: .65rem; line-height: 1.7; color: var(--accent-2); }
    .msg.err { color: #fca5a5; border-left-color: var(--bad); }
    @media (max-width: 760px) {
      .body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
      .body.nocode { grid-template-rows: minmax(0, 1fr); }
      /* Il codice che si sta eseguendo deve leggersi per intero: cresce fino a un terzo dello schermo e poi scorre. */
      .code { max-height: 34vh; overflow: auto; }
      .av, .foe { display: none; }
      .goal { font-size: .6rem; padding: 5px 8px; }
    }
    @media (max-width: 760px) and (max-height: 800px) {
      .code { max-height: 22vh; }
    }
    /* Schermi molto bassi: il codice resta compatto per lasciare spazio ai comandi del gioco. */
    @media (max-width: 760px) and (max-height: 700px) {
      .code { max-height: 5em; }
    }
  `,
})
export class GameShell {
  readonly title = input.required<string>();
  readonly goal = input.required<string>();
  readonly controls = input('');
  readonly character = input<Character>();
  readonly enemy = input<Enemy>();
  /** Passi completati e totali: la barra di integrità del nemico scende a ogni passo. */
  readonly round = input(0);
  readonly rounds = input(1);
  readonly mistakes = input(0);
  readonly message = input<Feedback | null>(null);
  readonly code = input<string[]>([]);
  readonly activeLine = input(-1);
  readonly vars = input('');

  /** Passo appena completato (non l'ultimo) per cui mostrare la modale; 0 = nessuna. */
  protected readonly doneStep = signal(0);
  private lastRound = 0;

  constructor() {
    // Un passo riuscito ma non ultimo: la modale spiega che ne serve un'altra risposta (il messaggio verde da solo sembra una vittoria).
    effect(() => {
      const done = this.round();
      const total = this.rounds();
      untracked(() => {
        if (total > 1 && done > this.lastRound && done < total) this.doneStep.set(done);
        this.lastRound = done;
      });
    });
  }

  protected nextText(done: number): string {
    const total = this.rounds();
    return `➜ Passo ${done} completato! Ora dai un'altra risposta (passo ${done + 1} di ${total})${this.code().length ? ': cosa fa adesso questo codice?' : '.'}`;
  }

  protected readonly stepNo = computed(() => Math.min(this.round() + 1, this.rounds()));
  protected readonly pips = computed(() => Array.from({ length: this.rounds() }));
  protected readonly hp = computed(() => Math.max(0, 100 - (this.round() / Math.max(1, this.rounds())) * 100));
}
