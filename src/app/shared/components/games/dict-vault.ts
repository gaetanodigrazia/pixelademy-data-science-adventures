import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { BaseGame, fmt } from './base-game';
import { GameShell } from './game-shell';

const SPARE_KEYS = ['centro', 'porto', 'ovest', 'nord', 'collina', 'omega', 'zeta'];

/** Missione 7: i dizionari. I cassetti cambiano posto a ogni richiesta: conta la chiave, non la posizione. */
@Component({
  selector: 'app-dict-vault',
  imports: [GameShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell title="Archivio chiavi" goal="Recupera il valore della chiave richiesta. Attento alle chiavi che non esistono."
      controls="clic sul cassetto con il nome giusto; «KeyError» se la chiave manca." [character]="character" [enemy]="enemy"
      [round]="round()" [rounds]="requests.length" [mistakes]="mistakes()" [message]="feedback()" [code]="code()" [activeLine]="1">
      <p class="gm-query" aria-label="Richiesta">{{ expr() }}</p>
      <div class="gm-row" role="group" aria-label="Cassetti dell'archivio">
        @for (k of order(); track k) {
          <button type="button" class="gm-cell" [class.ok]="revealed().includes(k)" (click)="open(k)">
            {{ k }}<small>{{ revealed().includes(k) ? fmt(entries[k]) + (unit ? ' ' + unit : '') : '🔒' }}</small>
          </button>
        }
      </div>
      <div class="gm-row"><button type="button" class="btn cmd" (click)="keyError()">KeyError</button></div>
    </app-game-shell>
  `,
})
export class DictVault extends BaseGame implements OnInit {
  protected readonly fmt = fmt;
  protected entries: Record<string, number> = {};
  protected requests: string[] = [];
  protected readonly round = signal(0);
  protected readonly revealed = signal<string[]>([]);
  private keys: string[] = [];
  protected readonly want = computed(() => this.requests[Math.min(this.round(), this.requests.length - 1)]);
  protected readonly expr = computed(() => `registro['${this.want()}']`);
  protected readonly order = computed(() => this.shuffle(this.keys, this.round() + 1));
  protected readonly code = computed(() => [
    `registro = {${this.keys.map((k) => `'${k}': ${fmt(this.entries[k])}`).join(', ')}}`,
    `risultato = ${this.expr()}`,
    'print(risultato)',
  ]);

  ngOnInit(): void {
    this.entries = this.dict({ nord: 18, est: 27, sud: 34, ovest: 21 });
    this.keys = Object.keys(this.entries);
    const first = this.str('key', this.keys[0]);
    const others = this.shuffle(this.keys.filter((k) => k !== first), 3).slice(0, 2);
    const missing = SPARE_KEYS.find((k) => !(k in this.entries)) ?? 'ignota';
    this.requests = [first, ...others, missing];
  }

  private get missingRound(): boolean {
    return this.round() === this.requests.length - 1;
  }

  protected open(k: string): void {
    if (this.cleared) return;
    const want = this.want();
    if (this.missingRound) {
      this.miss(`'${want}' non è nel dizionario: nessun cassetto ha quel nome. Usa «KeyError».`);
      return;
    }
    if (k !== want) {
      this.miss(`Quello è il cassetto '${k}'. Nel dizionario conta il nome della chiave, non la posizione: cerca '${want}'.`);
      return;
    }
    this.revealed.update((r) => [...r, k]);
    this.round.update((r) => r + 1);
    this.hit(`${this.expr().replace(want, k)} → ${fmt(this.entries[k])}: la chiave porta dritta al valore.`);
  }

  protected keyError(): void {
    if (this.cleared) return;
    const want = this.want();
    if (!this.missingRound) {
      this.miss(`La chiave '${want}' esiste: registro['${want}'] restituisce ${fmt(this.entries[want])}.`);
      return;
    }
    this.round.update((r) => r + 1);
    this.hit(`KeyError: '${want}'. Per evitare l'errore: registro.get('${want}', 0) restituisce 0 se la chiave manca.`);
    this.win();
  }
}
