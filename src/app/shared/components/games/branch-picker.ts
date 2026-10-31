import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt, mean, r2 } from './base-game';
import { GameShell } from './game-shell';

type Branch = 'ALLARME' | 'OK';

/**
 * Missione 6: if/else con una soglia. Per ogni valore di `media` si sceglie quale ramo scatta: ALLARME o OK.
 * Compresi il valore esattamente uguale alla soglia e uno appena sopra, dove `>` e `>=` fanno cose diverse.
 */
@Component({
  selector: 'app-branch-picker',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Quale ramo scatta?" goal="Per ogni valore di media, scegli cosa stampa il programma: ALLARME oppure OK."
      controls="clic su print(&quot;ALLARME&quot;) o print(&quot;OK&quot;)." [character]="character" [enemy]="enemy" [round]="step()" [rounds]="values.length"
      [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="step() < values.length ? 2 : 3 + (lastOver() ? 0 : 2)"
      [vars]="'media = ' + fmt(current()) + ' · soglia = ' + fmt(threshold)">
      @if (step() < values.length) {
        <p class="gm-query">media = {{ fmt(current()) }} · soglia = {{ fmt(threshold) }}</p>
        <p class="gm-read">media &gt; soglia → ?</p>
        <div class="gm-row" role="group" aria-label="Cosa stampa il programma">
          <button type="button" class="btn cmd" (click)="pick('ALLARME')">print("ALLARME")</button>
          <button type="button" class="btn cmd" (click)="pick('OK')">print("OK")</button>
        </div>
      } @else {
        <p class="gm-query">Tutti i rami provati ✔</p>
      }
      <ul class="gm-trace" aria-label="Valori provati">
        @for (t of trace(); track $index) { <li>{{ t }}</li> }
      </ul>
      @if (unit) { <p class="gm-note">Valori in {{ unit }}</p> }
    </app-game-shell>
  `,
  styles: `.gm-trace { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: center;
    font: .55rem var(--mono); color: var(--muted); } .gm-trace li { white-space: nowrap; }`,
})
export class BranchPicker extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected threshold = 0;
  /** I valori di `media` da provare, in ordine. */
  protected values: number[] = [];
  protected readonly step = signal(0);
  protected readonly trace = signal<string[]>([]);
  protected readonly current = computed(() => this.values[Math.min(this.step(), this.values.length - 1)]);
  /** Il ramo giusto per il valore corrente. */
  protected readonly expected = computed<Branch>(() => (this.current() > this.threshold ? 'ALLARME' : 'OK'));
  protected readonly lastOver = signal(false);
  protected readonly code = computed(() => [
    `soglia = ${fmt(this.threshold)}`,
    `media = ${fmt(this.current())}`,
    'if media > soglia:',
    '    print("ALLARME")',
    'else:',
    '    print("OK")',
  ]);

  ngOnInit(): void {
    this.threshold = this.num('th', 30);
    const real = r2(mean(this.nums('v', [29, 33, 35, 31, 30, 34])));
    const gap = Math.max(1, Math.round(this.threshold * 0.2));
    // sopra, sotto, la media vera dei dati, esattamente uguale alla soglia, appena sopra
    const wanted = [this.threshold + gap, this.threshold - gap, real, this.threshold, this.threshold + 0.01].map(r2);
    this.values = wanted.filter((v, i) => wanted.indexOf(v) === i);
  }

  protected pick(branch: Branch): void {
    if (this.cleared || this.step() >= this.values.length) return;
    const v = this.current();
    const over = v > this.threshold;
    const cmp = `${fmt(v)} > ${fmt(this.threshold)} → ${over ? 'True' : 'False'}`;
    const equal = v === this.threshold;
    if (branch !== this.expected()) {
      this.miss(
        over
          ? `${cmp}: la condizione è vera, quindi l'if esegue il primo ramo e stampa ALLARME.`
          : equal
            ? `${cmp}: con > l'uguale non basta. La condizione è falsa e si passa a else: stampa OK.`
            : `${cmp}: la condizione è falsa, quindi si passa a else e stampa OK.`,
      );
      return;
    }
    this.trace.update((t) => [...t, `${fmt(v)} → ${branch}`]);
    this.lastOver.set(over);
    this.step.update((s) => s + 1);
    this.hit(
      over
        ? `${cmp}: l'if esegue il primo ramo → ALLARME.`
        : equal
          ? `${cmp}: stampa OK. Con media == soglia l'allarme non scatta; per includerlo servirebbe >= .`
          : `${cmp}: si passa a else → OK.`,
    );
    if (this.step() >= this.values.length) this.win();
  }
}
