import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { BaseGame, fmt, list, r2 } from './base-game';
import { GameShell } from './game-shell';

const DEF = 'def escursione(valori):';
const NOCOLON = 'def escursione(valori)';
const MAX = '    massimo = max(valori)';
const MIN = '    minimo = min(valori)';
const RET = '    return massimo - minimo';
const NEG = '    return minimo - massimo';
const ADD = '    return massimo + minimo';
const PRINT = '    print(massimo - minimo)';
const POOL = [DEF, MAX, MIN, RET, NEG, ADD, PRINT, NOCOLON];
const SLOTS = 4;

/** Missione 9: le funzioni. Si assembla `escursione(valori)` riga per riga e la si mette alla prova con un test. */
@Component({
  selector: 'app-function-forge',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Fucina delle funzioni" goal="Monta la funzione escursione(valori) con le 4 righe giuste, poi eseguila sul test."
      controls="clic su una riga per inserirla, clic su una riga montata per toglierla." [character]="character" [enemy]="enemy"
      [round]="solved() ? 1 : 0" [rounds]="1" [mistakes]="mistakes()" [message]="feedback()">
      <ol class="slots" aria-label="Corpo della funzione">
        @for (s of slots(); track $index) {
          <li>
            <button type="button" class="line" [class.empty]="s === null" [disabled]="s === null || solved()" (click)="remove($index)"
              [attr.aria-label]="s === null ? 'Riga ' + ($index + 1) + ' vuota' : 'Riga ' + ($index + 1) + ': ' + s.trim()">{{ s ?? '' }}</button>
          </li>
        }
      </ol>
      <div class="gm-row" role="group" aria-label="Righe disponibili">
        @for (l of pool; track l) {
          <button type="button" class="line chip" [disabled]="slots().includes(l) || solved()" (click)="add(l)">{{ l.trim() }}</button>
        }
      </div>
      <p class="gm-note">Test: escursione({{ fmtList(values) }}) deve restituire {{ fmt(expected) }}{{ unit ? ' ' + unit : '' }}</p>
      <div class="gm-row">
        <button type="button" class="btn cmd primary" [disabled]="solved()" (click)="run()">▶ Esegui il test</button>
        <button type="button" class="btn cmd" [disabled]="solved()" (click)="clear()">Svuota</button>
      </div>
    </app-game-shell>
  `,
  styles: `
    .slots { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; counter-reset: l; }
    .slots li { counter-increment: l; display: flex; gap: 6px; align-items: center; }
    .slots li::before { content: counter(l); color: #475569; font: .55rem var(--mono); width: 1em; text-align: right; }
    .line { flex: 1; text-align: left; padding: 5px 8px; font: .62rem var(--mono); color: #e2e8f0; background: #020617; border: 2px solid var(--line); cursor: pointer; white-space: pre; }
    .line.empty { color: #475569; border-style: dashed; cursor: default; min-height: 1.9em; }
    .line.chip { flex: none; }
    .line:disabled { opacity: .35; cursor: default; }
    .line:hover:not(:disabled):not(.empty) { border-color: var(--accent-2); }
  `,
})
export class FunctionForge extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected readonly fmtList = list;
  protected values: number[] = [];
  protected expected = 0;
  protected pool: string[] = [];
  protected readonly slots = signal<(string | null)[]>(Array(SLOTS).fill(null));
  protected readonly solved = signal(false);

  ngOnInit(): void {
    this.values = this.nums('v', [11, 18, 24, 27, 22, 15]);
    this.expected = r2(Math.max(...this.values) - Math.min(...this.values));
    this.pool = this.shuffle(POOL, this.values.length);
  }

  protected add(line: string): void {
    if (this.cleared) return;
    const i = this.slots().indexOf(null);
    if (i < 0 || this.slots().includes(line)) return;
    this.slots.update((s) => s.map((x, j) => (j === i ? line : x)));
  }

  protected remove(i: number): void {
    if (this.cleared) return;
    this.slots.update((s) => s.map((x, j) => (j === i ? null : x)));
  }

  protected clear(): void {
    if (!this.cleared) this.slots.set(Array(SLOTS).fill(null));
  }

  protected run(): void {
    if (this.cleared) return;
    const s = this.slots();
    if (s.includes(null)) {
      this.say('Completa tutte e 4 le righe prima di eseguire il test.');
      return;
    }
    const r = this.evaluate(s as string[]);
    if (!r.ok) {
      this.miss(r.msg);
      return;
    }
    this.hit(r.msg);
    this.solved.set(true);
    this.win();
  }

  private evaluate(L: string[]): { ok: boolean; msg: string } {
    const fail = (msg: string) => ({ ok: false, msg });
    const hi = Math.max(...this.values);
    const lo = Math.min(...this.values);
    if (L[0] === NOCOLON) return fail('SyntaxError: dopo def nome(parametri) servono i due punti.');
    if (L[0] !== DEF) return fail('Una funzione inizia con la riga def escursione(valori): — poi il corpo, rientrato.');
    const defined = new Set<string>();
    const needs = (): string | null => (!defined.has('massimo') ? 'massimo' : !defined.has('minimo') ? 'minimo' : null);
    for (const l of L.slice(1)) {
      if (l === DEF || l === NOCOLON) return fail('Una seconda def dentro il corpo non serve: qui vanno i calcoli e il return.');
      if (l === MAX) defined.add('massimo');
      else if (l === MIN) defined.add('minimo');
      else {
        const missing = needs();
        if (missing) return fail(`NameError: '${missing}' non è ancora definito. Le variabili vanno create prima di usarle.`);
        if (l === PRINT) return fail('La funzione stampa ma non restituisce nulla: escursione(misure) vale None. Per consegnare un valore serve return.');
        const v = l === RET ? hi - lo : l === NEG ? lo - hi : hi + lo;
        if (r2(v) !== this.expected) {
          return fail(`escursione(misure) → ${fmt(v)}, ma il test si aspetta ${fmt(this.expected)}: l'escursione è massimo − minimo, in quest'ordine.`);
        }
        return { ok: true, msg: `escursione(${list(this.values)}) → ${fmt(v)} ✔. return consegna il valore a chi chiama la funzione.` };
      }
    }
    return fail('Manca il return: senza restituire un valore la funzione dà None.');
  }
}
