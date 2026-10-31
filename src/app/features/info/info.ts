import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { LikeService } from '../../core/services/like.service';

export const REPO_URL = 'https://github.com/gaetanodigrazia/pixelademy-2';

@Component({
  selector: 'app-info',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>ℹ️ Il progetto</h1>
      <div class="scroll">
        <section class="panel" aria-labelledby="cos-e">
          <h2 id="cos-e">Cos'è Pixelademy</h2>
          <p>Pixelademy è una piattaforma per imparare la <strong>data science</strong> giocando: i concetti matematici e statistici che stanno dietro ai dati e il loro uso pratico. <strong>Python</strong> è lo strumento con cui li metti in pratica, e imparare a conoscerlo bene fa parte del viaggio. Ogni percorso è una piccola avventura a missioni, con minigiochi, scene che reagiscono al tuo codice e un programma vero che costruisci pezzo per pezzo.</p>
          <p>Il codice gira direttamente nel tuo browser. Non servono account né registrazione, e i progressi restano solo sul tuo dispositivo, se lo consenti.</p>
        </section>

        <section class="panel likes" aria-labelledby="apprezzamenti">
          <h2 id="apprezzamenti">Apprezzamenti</h2>
          @if (likes.count(); as n) {
            <p class="count"><strong>👍 {{ n }}</strong></p>
            <p>{{ n === 1 ? 'persona ha' : 'persone hanno' }} messo «Mi piace» a Pixelademy.</p>
          } @else if (likes.count() === 0) {
            <p class="count"><strong>👍 0</strong></p>
            <p>Nessuno ha ancora messo «Mi piace»: puoi essere il primo!</p>
          } @else {
            <p>Il conteggio non è disponibile al momento.</p>
          }
          <p class="like-row">
            <button type="button" class="btn primary" [attr.aria-pressed]="game.liked()" [disabled]="game.liked() || likes.sending()"
              aria-label="Mi piace al progetto, in modo anonimo" (click)="likes.likeOnce()">{{ game.liked() ? '👍 Grazie!' : '👍 Mi piace' }}</button>
          </p>
          <p class="status">Il «Mi piace» è anonimo: aumenta solo un contatore e non salva nulla di te.</p>
        </section>

        <section class="panel" aria-labelledby="contribuire">
          <h2 id="contribuire">Come contribuire</h2>
          <p>Pixelademy cresce grazie a chi lo usa. Ti invitiamo a dare una mano, anche in piccolo:</p>
          <ul>
            <li><strong>Metti «Mi piace»</strong> qui sopra: ci dice che il lavoro è utile.</li>
            <li><strong>Racconta Pixelademy</strong> a chi vuole imparare la data science. Quando completi un percorso con la Dashboard puoi anche condividerla su LinkedIn.</li>
            <li><strong>Segnala un errore o un'idea</strong>: una spiegazione poco chiara, un bug, un nuovo tema da proporre. Apri una segnalazione sulla <a [href]="repo + '/issues'" target="_blank" rel="noopener noreferrer">pagina del progetto su GitHub</a>.</li>
            <li><strong>Crea un nuovo percorso</strong>: un percorso è una voce di dati (tema, numeri, titoli delle missioni) e il resto si costruisce da solo. Le istruzioni sono nel <a [href]="repo" target="_blank" rel="noopener noreferrer">repository</a> (README e guida «crea-percorso»): proponilo con una pull request.</li>
          </ul>
          <p class="invite">Ci farebbe piacere avere anche il tuo contributo: <a [href]="repo" target="_blank" rel="noopener noreferrer">vieni a dare un'occhiata</a>!</p>
        </section>

        <a routerLink="/" class="btn primary back">← Torna alle missioni</a>
      </div>
    </main>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; }
    main { gap: 6px; }
    h1 { flex: none; text-align: center; margin: 0; }
    .scroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 8px; }
    .panel p, .panel li { font-size: .6rem; line-height: 1.8; }
    .panel ul { margin: .3rem 0; padding-left: 1.2rem; }
    .panel li { margin: 4px 0; }
    strong { color: var(--accent-2); font-weight: normal; }
    .count { font-size: 1rem; margin: 2px 0; }
    .invite { color: var(--accent-2); }
    .back { align-self: center; }
    .like-row { margin: 6px 0; }
  `,
})
export class Info {
  protected readonly likes = inject(LikeService);
  protected readonly game = inject(GameStateService);
  protected readonly repo = REPO_URL;

  constructor() {
    void this.likes.load();
  }
}
