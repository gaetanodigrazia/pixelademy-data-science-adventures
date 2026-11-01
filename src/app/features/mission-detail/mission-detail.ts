import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ValidationResult } from '../../core/models/mission.model';
import { RewardSummary } from '../../core/models/player-state.model';
import { ContentRegistryService } from '../../core/services/content-registry.service';
import { GameStateService } from '../../core/services/game-state.service';
import { MissionService } from '../../core/services/mission.service';
import { newlyUnlocked } from '../../core/utils/path-lock';
import { PythonRunnerService } from '../../core/services/python-runner.service';
import { baseLineCount, composeProject, editorSection, neededContext, shiftErrorLines } from '../../core/utils/project-context';
import { projectCode } from '../../core/utils/project-code';
import { vizLine } from '../../core/utils/viz';
import { ScoreBreakdown, parSeconds, scoreAttempt, stripBase } from '../../core/utils/scoring';
import { DifficultyStars } from '../../shared/components/difficulty-stars';
import { CodeEditor } from '../../shared/components/code-editor';
import { CodeWorld } from '../../shared/components/code-world';
import { CompilerLoader } from '../../shared/components/compiler-loader';
import { ProjectIntro } from '../../shared/components/project-intro';
import { Modal } from '../../shared/components/modal';

const INTRO_KEY = 'pixelademy.intro.v1';
/** La fase di ogni missione (battaglia/task) per la sessione del browser: ricaricando la pagina non si rifanno teoria e battaglia. */
const PHASE_KEY = 'pixelademy.phase.v1';
/** Gli errori della battaglia di ogni missione (per la sessione): ricaricando al task contano ancora. */
const BATTLE_KEY = 'pixelademy.battle.v1';

type Phase = 'teoria' | 'battaglia' | 'task';

@Component({
  selector: 'app-mission-detail',
  imports: [NgComponentOutlet, RouterLink, CodeEditor, CodeWorld, CompilerLoader, Modal, ProjectIntro, DifficultyStars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      @if (mission(); as m) {
        <header class="top">
          <a routerLink="/" class="btn">← Mappa</a>
          @if (projectPath()) {
            <button type="button" class="btn info" [title]="dashboardOn() ? 'Il progetto e la Dashboard' : 'Il progetto'" [attr.aria-label]="dashboardOn() ? 'Il progetto e la Dashboard' : 'Il progetto'" (click)="introOpen.set(true)">{{ dashboardOn() ? '📊' : '🧩' }} Progetto</button>
          }
          @if (phase() !== 'teoria' && !m.challenge) {
            <button type="button" class="btn restart" title="Riparti dalla teoria" aria-label="Riparti dalla teoria" (click)="restart()">↺ Teoria</button>
          }
          <div class="title">
            <h1>{{ m.title }}</h1>
            <p class="status"><app-difficulty-stars class="stars" [value]="m.difficulty" /> {{ m.topic }} · {{ m.xp }} XP</p>
          </div>
        </header>

        @if (!m.challenge) {
        <ol class="steps" [class.in-task]="phase() === 'task'" aria-label="Fasi della missione">
          <li class="step" [class.current]="phase() === 'teoria'" [attr.aria-current]="phase() === 'teoria' ? 'step' : null">1 · Teoria</li>
          <li class="step" [class.current]="phase() === 'battaglia'" [attr.aria-current]="phase() === 'battaglia' ? 'step' : null">2 · Battaglia</li>
          <li class="step" [class.current]="phase() === 'task'" [attr.aria-current]="phase() === 'task' ? 'step' : null">3 · Task</li>
        </ol>
        }

        @switch (phase()) {
          @case ('teoria') {
            <section class="panel slide" aria-label="Teoria">
              <h2>{{ m.theory[slide()].title }}</h2>
              <p class="body">{{ m.theory[slide()].body }}</p>
              <p class="status">Slide {{ slide() + 1 }} / {{ m.theory.length }}</p>
              <div class="row">
                <button type="button" class="btn" [disabled]="slide() === 0" (click)="slide.set(slide() - 1)">← Indietro</button>
                @if (slide() < m.theory.length - 1) {
                  <button type="button" class="btn primary" (click)="slide.set(slide() + 1)">Avanti →</button>
                } @else {
                  <button type="button" class="btn primary" (click)="go('battaglia')">Alla battaglia →</button>
                }
                <button type="button" class="btn" (click)="go('battaglia')">Salta la teoria</button>
              </div>
            </section>
          }
          @case ('battaglia') {
            <section class="stage battle" aria-label="Battaglia">
              @if (gameComponent(); as g) {
                <ng-container *ngComponentOutlet="g; inputs: gameInputs()" />
              } @else {
                <p class="panel err">Minigioco non disponibile: {{ m.game.type }}</p>
              }
              @if (taskUnlocked()) {
                <div class="row"><button type="button" class="btn primary" (click)="go('task')">Vai al task →</button></div>
              }
            </section>
          }
          @case ('task') {
            <section class="panel stage task" [class.scrolls]="showAll() || !!error()" aria-label="Task Python">
              <details class="brief" open>
                <summary>📝 Cosa fare</summary>
                <p>{{ m.briefing }}</p>
              </details>
              @if (m.viz; as v) {
                <app-code-world class="reader" [compact]="!sceneOpen()" [viz]="v" [character]="game.selectedCharacter()" [ran]="attempts() > 0" [output]="vizOutput()" [error]="error()" />
              }
              <div class="hintrow">
                <!-- due gruppi, divisi da un filetto: gli aiuti (suggerimento, scena) e le azioni sul codice -->
                <div class="group" role="group" aria-label="Aiuti">
                  <button type="button" class="btn" (click)="showHint.set(!showHint())">{{ showHint() ? 'Nascondi suggerimento' : '💡 Suggerimento' }}</button>
                  @if (m.viz) {
                    <button type="button" class="btn scene" [attr.aria-expanded]="sceneOpen()" (click)="sceneOpen.set(!sceneOpen())">🎮 Scena {{ sceneOpen() ? '▴' : '▾' }}</button>
                  }
                </div>
                <span class="sep" aria-hidden="true"></span>
                <div class="group actions" role="group" aria-label="Azioni sul codice">
                  <button type="button" class="btn primary" [disabled]="running()" (click)="ed.run()" aria-label="Esegui codice">{{ running() ? 'In esecuzione…' : '▶ Esegui codice' }}</button>
                  @if (running()) {
                    <button type="button" class="btn danger" (click)="python.stop()" aria-label="Interrompi l'esecuzione">■ Interrompi</button>
                  }
                  <button type="button" class="btn" [disabled]="running()" (click)="ed.reset()" aria-label="Ripristina codice iniziale" title="Ripristina codice iniziale">↺ Ripristina</button>
                  <!-- Solo su touch: apre/chiude la tastiera. Non ruba il fuoco all'editor, altrimenti chiuderla la riaprirebbe. -->
                  <button type="button" class="btn kb" [attr.aria-pressed]="ed.typing()" aria-label="Mostra o nascondi la tastiera"
                    (pointerdown)="$event.preventDefault()" (mousedown)="$event.preventDefault()" (click)="ed.toggleKeyboard()">⌨ {{ ed.typing() ? 'Chiudi' : 'Scrivi' }}</button>
                </div>
                @if (showHint()) { <span class="status">{{ m.hint }}</span> }
                @if (solutionViewed() && !reward()) { <span class="zeroed" role="status">⚠ XP di questa missione azzerati</span> }
                <span class="meter" aria-label="Cronometro ed errori">
                  <span [class.late]="seconds() > par()" [title]="'Tempo di riferimento: ' + par() + ' s'">⏱ {{ clock() }}</span>
                  <span [class.late]="errors() > 0">✘ {{ errors() }}</span>
                </span>
              </div>
              <app-compiler-loader [status]="python.status()" (retry)="loadCompiler()" />
              @if (context(); as c) {
                @if (base().trim()) {
                  <details class="ctx" open>
                    <summary>📎 Dal codice precedente{{ c.names.length && !showAll() ? ' · ti serve: ' + c.names.join(', ') : '' }}</summary>
                    @if (showAll()) {
                      <pre class="whole" aria-label="Tutto il programma scritto finora (sola lettura)">{{ base() }}</pre>
                    } @else if (c.code) {
                      <pre aria-label="Codice precedente usato da questa sezione (sola lettura)">{{ c.code }}</pre>
                    } @else {
                      <p class="none">Questa sezione non usa codice delle missioni precedenti.</p>
                    }
                    <button type="button" class="btn all" (click)="showAll.set(!showAll())">{{ showAll() ? 'Mostra solo ciò che serve' : 'Mostra tutto il programma' }}</button>
                  </details>
                }
              }
              <app-code-editor #ed class="editor" [toolbar]="false" [starterCode]="section()" [running]="running()" (runCode)="run($event)" (stopCode)="python.stop()" (pasted)="pastedChars.update((n) => n + $event)" />
              <pre class="console" aria-live="polite" aria-label="Console">{{ output() || '(nessun output)' }}</pre>
              @if (error()) { <pre class="console err" role="alert">{{ error() }}</pre> }
              <div class="foot">
                @if (result(); as r) {
                  <span [class]="r.ok ? 'ok' : 'err'" role="status">{{ r.ok ? '✔ ' : '✘ ' }}{{ r.message }}</span>
                }
                @if (attempts() > 0) {
                  <button type="button" class="btn" (click)="openSolution()">Confronta con la soluzione</button>
                }
              </div>
            </section>
          }
        }

        @if (introOpen() && projectPath(); as pp) { <app-project-intro [path]="pp" (closed)="closeIntro()" /> }
        @if (victoryOpen()) {
          <app-modal title="Battaglia vinta!" (closed)="victoryOpen.set(false)">
            <p class="ok">Missione completata! Il task Python è sbloccato.</p>
            <div class="row">
              <button type="button" class="btn primary" (click)="goToTask()">Vai al task →</button>
              <button type="button" class="btn" (click)="victoryOpen.set(false)">Resta qui</button>
            </div>
          </app-modal>
        }
        @if (reward(); as w) {
          @if (rewardOpen()) {
            <app-modal title="Missione completata!" (closed)="rewardOpen.set(false)">
              @if (w.gainedXp > 0) { <p class="ok">+{{ w.gainedXp }} XP!</p> }
              @if (w.firstTime && w.gainedXp === 0) { <p class="err">0 XP: hai aperto la soluzione prima di superare il task.</p> }
              @if (score(); as sc) {
                @if (w.firstTime) {
                  <table class="breakdown" aria-label="Calcolo degli XP">
                    <tr><td>XP della missione</td><td>{{ sc.baseXp }}</td></tr>
                    <tr><td>Tempo ({{ sc.seconds }} s, rif. {{ par() }} s)</td><td>×{{ sc.timeFactor.toFixed(2) }}</td></tr>
                    <tr><td>Errori (battaglia {{ sc.battleErrors }} + task {{ sc.errors }})</td><td>×{{ sc.errorFactor.toFixed(2) }}</td></tr>
                    <tr><td>Vicinanza alla soluzione ({{ (sc.similarity * 100).toFixed(0) }}%)</td><td>×{{ sc.similarityFactor.toFixed(2) }}</td></tr>
                    @if (sc.pasteFactor < 1) { <tr><td>Codice incollato quasi identico alla soluzione</td><td>×{{ sc.pasteFactor.toFixed(2) }}</td></tr> }
                    @if (sc.viewedFactor < 1) { <tr><td>Soluzione aperta prima</td><td>×{{ sc.viewedFactor.toFixed(2) }}</td></tr> }
                    <tr class="total"><td>Totale</td><td>{{ sc.xp }} XP</td></tr>
                  </table>
                }
              }
              @if (w.firstTime) { <p>🧩 Sezione del bollettino aggiunta: {{ projectProgress() }}</p>
                @if (!nextMission()) { <p class="ok">🏆 Progetto completato!{{ dashboardOn() ? ' Apri la dashboard per vedere i risultati che hai prodotto.' : ' Il tuo programma stampa il bollettino completo.' }}</p> } }
              @if (unlockedPaths().length) { <p class="ok">🔓 Percorso sbloccato: {{ unlockedPaths().join(', ') }}</p> }
              @if (newRecord(); as r) { <p class="ok">🏆 {{ r.xp }} XP in {{ r.seconds }} s: nuovo record!</p> }
              @if (w.newLevel) { <p>⬆ Sei salito al livello {{ w.newLevel }}!</p> }
              <div class="row">
                @if (!nextMission() && dashboardOn() && mission()?.pathId; as pid) {
                  <a class="btn primary" [routerLink]="['/progetto', pid]" [queryParams]="{ condividi: 1 }">🔗 Condividi su LinkedIn</a>
                }
                @if (dashboardOn() && mission()?.pathId; as pid) { <a class="btn" [routerLink]="['/progetto', pid]">📊 Dashboard</a> }
                @if (nextMission(); as n) { <a class="btn primary" [routerLink]="['/missione', n.id]">Prossima missione →</a> }
                @else { <a class="btn primary" routerLink="/">Torna alla mappa</a> }
                <button type="button" class="btn" (click)="rewardOpen.set(false)">Chiudi</button>
              </div>
            </app-modal>
          }
        }
        @if (confirmSolutionOpen()) {
          <app-modal title="Aprire la soluzione?" (closed)="confirmSolutionOpen.set(false)">
            <p class="err">Se apri la soluzione gli XP di questa missione saranno azzerati.</p>
            <p>Potrai comunque completarla e sbloccare la successiva, ma con 0 XP. Se vuoi guadagnarli, riprova prima da solo.</p>
            <div class="row">
              <button type="button" class="btn" (click)="confirmSolutionOpen.set(false)">Annulla</button>
              <button type="button" class="btn danger" (click)="confirmSolution()">OK, mostra la soluzione</button>
            </div>
          </app-modal>
        }
        @if (showSolution()) {
          <app-modal title="Soluzione di questa sezione" [wide]="true" (closed)="showSolution.set(false)">
            <pre class="console" aria-label="Soluzione di riferimento">{{ sectionSolution() }}</pre>
          </app-modal>
        }
      } @else {
        <section class="panel"><h2>Missione non trovata</h2><a routerLink="/" class="btn">Torna alla dashboard</a></section>
      }
    </main>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .top { flex: none; display: flex; align-items: center; gap: 10px; }
    .title { min-width: 0; }
    .title h1 { margin: 0; font-size: .85rem; overflow-wrap: anywhere; }
    .title .status { margin: 0; font-size: .5rem; }
    .restart { margin-left: auto; padding: 5px 9px; font-size: .55rem; }
    .info { padding: 5px 9px; font-size: .55rem; }
    /* Indicatore di avanzamento, non cliccabile: il percorso è teoria → battaglia → task. */
    .steps { flex: none; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 0; padding: 0; list-style: none; }
    .step { padding: 6px 12px; border: 3px solid #000; background: var(--panel-2); color: var(--muted); font-size: .6rem; pointer-events: none; user-select: none; }
    .step.current { background: var(--accent); color: #111827; }
    .stage { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
    .stage h2 { margin: 0; }
    .stage p { margin: 0; }
    /* Slide compatta: grande quanto il testo, centrata sotto le schede. */
    .slide { align-self: center; width: 100%; max-width: 620px; padding: 8px 12px; overflow: hidden; }
    .slide h2 { margin: 0 0 4px; font-size: .7rem; }
    .slide .body { margin: 0; font-size: .6rem; line-height: 1.7; }
    .slide .status { margin: 4px 0 0; font-size: .5rem; }
    .slide .row { margin: 6px 0 0; }
    .slide .btn { padding: 5px 9px; font-size: .55rem; }
    .meter { display: flex; gap: 10px; margin-left: auto; color: var(--accent-2); white-space: nowrap; }
    .meter .late { color: var(--bad); }
    .zeroed { color: var(--bad); }
    .breakdown { width: 100%; border-collapse: collapse; font-size: .55rem; }
    .breakdown td { padding: 2px 4px; border-bottom: 1px solid var(--line); }
    .breakdown td:last-child { text-align: right; }
    .breakdown tr.total td { color: var(--good); border-bottom: 0; font-size: .65rem; }
    .battle { overflow: hidden; }
    .brief { flex: none; border-left: 4px solid var(--accent); background: #0b0b24; }
    .brief summary { padding: 3px 8px; font-size: .55rem; color: var(--accent-2); cursor: pointer; }
    .brief p { margin: 0; padding: 0 8px 5px; font-size: .6rem; line-height: 1.6; }
    .reader { flex: none; }
    .ctx { flex: none; border: 2px solid var(--line); background: #020617; }
    .ctx summary { padding: 3px 8px; font-size: .5rem; color: var(--accent-2); cursor: pointer; }
    .ctx pre.whole { max-height: 14em; }
    .ctx .none { margin: 0; padding: 2px 8px; font-size: .5rem; color: var(--muted); }
    .ctx .all { margin: 2px 8px 6px; padding: 3px 8px; font-size: .5rem; }
    .ctx pre { max-height: 6.5em; overflow: auto; margin: 0; padding: 2px 8px 4px; font: .55rem/1.5 var(--mono); color: var(--muted); }
    .hintrow { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: .55rem; }
    .group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    /* filetto tra aiuti e azioni */
    .sep { align-self: stretch; width: 3px; margin: 0 6px; background: var(--line); }
    .kb { display: none; }
    @media (hover: none) and (pointer: coarse) { .kb { display: inline-flex; } }
    /* L'editor non scende sotto i 150 px (a 680 px di altezza era schiacciato a 74): se manca spazio, scorre il riquadro del task. */
    .editor { flex: 1; min-height: 200px; }
    .task { overflow-y: auto; }
    /* Programma esteso o errore in console: il contenuto non deve schiacciare l'editor fino a farlo sparire, il riquadro scorre. */
    .task.scrolls { overflow-y: auto; }
    .task.scrolls .editor { flex: 1 0 auto; min-height: 260px; }
    .console { flex: none; max-height: 20%; min-height: 2.6em; overflow: auto; background: #020617; border: 2px solid var(--line); padding: 6px; font-size: .55rem; }
    .console.err { border-color: var(--bad); }
    .foot { flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: .6rem; }
    /* Telefoni stretti: titolo su una riga a parte e fasi più compatte, per lasciare spazio al gioco. */
    @media (max-width: 600px) {
      .top { flex-wrap: wrap; gap: 4px 8px; }
      .top .btn { padding: 5px 9px; font-size: .55rem; }
      .title { flex: 1 1 100%; order: 3; }
      .title h1 { font-size: .7rem; }
      .steps { gap: 4px; }
      .step { padding: 3px 6px; font-size: .4rem; }
      /* Nel task l'editor ha la precedenza: le fasi si nascondono e, se serve, il task scorre. */
      .steps.in-task { display: none; }
      .task { overflow-y: auto; }
      .editor { flex: 1 0 auto; min-height: 260px; }
      .hintrow .btn { padding: 5px 8px; font-size: .5rem; }
      .sep { display: none; } /* su telefono i due gruppi vanno a capo: il filetto non serve */
      .group { width: 100%; }
      .meter { font-size: .5rem; }
      .restart { margin-left: 0; }
      .title .status { font-size: .42rem; }
    }
  `,
})
export class MissionDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly python = inject(PythonRunnerService);
  /** Missione su cui si sta lavorando: serve a ricordare la fase (battaglia/task) per questa sessione. */
  private current: string | null = null;
  private readonly missions = inject(MissionService);
  protected readonly registry = inject(ContentRegistryService);
  protected readonly game = inject(GameStateService);

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly mission = computed(() => this.missions.find(this.id()));

  protected readonly phase = signal<Phase>('teoria');
  /** Scena di gioco del task: su telefono parte ridotta alla sola riga dell'esito, per dare spazio all'editor. */
  protected readonly sceneOpen = signal(typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 600px)').matches);
  protected readonly slide = signal(0);
  protected readonly battleWon = signal(false);
  /** Errori commessi nel minigioco della battaglia (contano negli XP insieme a quelli del task). */
  protected readonly battleErrors = signal(0);
  protected readonly victoryOpen = signal(false);
  protected readonly rewardOpen = signal(false);
  protected readonly introOpen = signal(false);
  /** Nel riquadro del codice precedente: tutto il programma invece delle sole righe che servono (resta scelto tra una missione e l'altra). */
  protected readonly showAll = signal(false);
  protected readonly showHint = signal(false);
  protected readonly showSolution = signal(false);
  /** L'avviso «aprendo la soluzione gli XP si azzerano», prima di aprirla. */
  protected readonly confirmSolutionOpen = signal(false);
  protected readonly running = signal(false);
  protected readonly output = signal('');
  /** La parte di bollettino che la missione corrente aggiunge: la scena di gioco legge solo quella, senza le sezioni precedenti. */
  protected readonly vizOutput = computed(() => {
    const v = this.mission()?.viz;
    return v ? vizLine(this.output(), v) : '';
  });
  protected readonly error = signal('');
  protected readonly result = signal<ValidationResult | null>(null);
  protected readonly reward = signal<RewardSummary | null>(null);
  protected readonly attempts = signal(0);
  protected readonly seconds = signal(0);
  protected readonly errors = signal(0);
  protected readonly solutionViewed = signal(false);
  /** Caratteri incollati nell'editor in questa missione (anti-incolla). */
  protected readonly pastedChars = signal(0);
  /** Sfida: il risultato di questa esecuzione se batte il record (altrimenti `null`). */
  /** Percorsi che si sbloccano con questa missione (se è l'ultima di un percorso richiesto). */
  protected readonly unlockedPaths = signal<string[]>([]);
  protected readonly newRecord = signal<{ xp: number; seconds: number } | null>(null);
  protected readonly score = signal<ScoreBreakdown | null>(null);
  protected readonly clock = computed(() => `${String(Math.floor(this.seconds() / 60)).padStart(2, '0')}:${String(this.seconds() % 60).padStart(2, '0')}`);
  protected readonly par = computed(() => parSeconds(this.mission()?.difficulty ?? 1));
  /** La Dashboard dei risultati è attiva per il percorso di questa missione (default sì). */
  protected readonly dashboardOn = computed(() => this.registry.path(this.mission()?.pathId ?? '')?.dashboard !== false);
  protected readonly projectProgress = computed(() => {
    const m = this.mission();
    const path = m && this.registry.path(m.pathId);
    return path ? `${this.missions.completedCount(path)}/${path.missions.length}` : '';
  });

  protected readonly taskUnlocked = computed(() => {
    const m = this.mission();
    return this.battleWon() || (!!m && this.game.isCompleted(m.id));
  });
  /** Percorso della missione, solo se ha un progetto da presentare. */
  protected readonly projectPath = computed(() => {
    const path = this.registry.path(this.mission()?.pathId ?? '');
    return path?.project ? path : undefined;
  });
  protected readonly nextMission = computed(() => {
    const m = this.mission();
    return m ? this.missions.next(m) : undefined;
  });
  /** Il progetto riparte dal tuo codice della missione precedente (se è coerente con il progetto), con la nuova sezione da completare. */
  protected readonly starterBase = computed(() => {
    const m = this.mission();
    const prev = m?.prerequisites[0];
    const ref = m?.projectBase ?? '';
    return prev ? projectCode(this.game.state().solvedCode[prev], ref) : ref;
  });
  /** Le sezioni già scritte: restano nascoste, si ricompongono all'esecuzione. */
  protected readonly base = computed(() => (this.mission()?.projectSection ? this.starterBase() : ''));
  /** Il codice da scrivere in questa missione: solo la sezione nuova. */
  protected readonly section = computed(() => {
    const m = this.mission();
    return m ? editorSection(m.projectSection ?? m.starterCode) : '';
  });
  /** Solo le righe precedenti che la sezione usa davvero, in sola lettura. */
  protected readonly context = computed(() => neededContext(this.base(), this.section(), this.sectionSolution()));
  protected readonly solution = computed(() => this.registry.solution(this.id()) ?? '');
  /** Soluzione mostrata: solo la sezione di questa missione (non tutto il progetto). */
  protected readonly sectionSolution = computed(() => stripBase(this.solution(), this.mission()?.projectBase ?? '').trim());
  protected readonly gameComponent = computed(() => {
    const m = this.mission();
    return m ? this.registry.game(m.game.type)?.component : undefined;
  });
  protected readonly gameInputs = computed(() => {
    const m = this.mission();
    return {
      character: this.game.selectedCharacter(),
      enemy: this.registry.enemy(m?.enemyId),
      config: m?.game.config ?? {},
      onCleared: (result?: { mistakes: number }) => {
        this.battleWon.set(true);
        this.setBattleErrors(Math.max(0, Math.floor(result?.mistakes ?? 0)));
        this.victoryOpen.set(true);
      },
    };
  });

  constructor() {
    // Nuova missione (anche con riuso del componente): azzera lo stato di sessione.
    // Reagisce solo al cambio di missione: il resto è untracked, altrimenti completare il task
    // (che cambia lo stato di gioco) rilancerebbe l'effect e riporterebbe tutto alla teoria.
    effect(() => {
      const m = this.mission();
      untracked(() => {
        this.current = m?.id ?? null;
        // dopo un ricaricamento si riparte dalla fase raggiunta (se la battaglia era vinta, il task resta sbloccato)
        const saved = m && !m.challenge ? this.savedPhase(m.id) : null;
        this.phase.set(m?.challenge ? 'task' : saved ?? 'teoria');
        this.slide.set(0);
        this.battleWon.set(saved === 'task');
        this.battleErrors.set(saved === 'task' && m ? this.savedBattleErrors(m.id) : 0);
        this.victoryOpen.set(false);
        this.rewardOpen.set(false);
        // Prima missione di un progetto, non ancora completata: si presenta il progetto (una volta per sessione).
        this.introOpen.set(!!m && m.prerequisites.length === 0 && !this.game.isCompleted(m.id) && !!this.registry.path(m.pathId)?.project && !this.introSeen());
        this.showHint.set(false);
        this.showSolution.set(false);
        this.confirmSolutionOpen.set(false);
        this.output.set('');
        this.error.set('');
        this.result.set(null);
        this.reward.set(null);
        this.score.set(null);
        this.attempts.set(0);
        this.seconds.set(0);
        this.errors.set(0);
        this.solutionViewed.set(false);
        this.pastedChars.set(0);
        this.newRecord.set(null);
        this.unlockedPaths.set([]);
        if (m && this.missions.status(m) === 'locked') this.router.navigateByUrl('/');
      });
    });

    // Il compilatore Python è pesante: si comincia a scaricarlo appena finita la teoria.
    effect(() => {
      if (this.phase() !== 'teoria') untracked(() => this.loadCompiler());
    });

    // Cronometro del task: scorre solo mentre si lavora (non durante il caricamento di Python né dopo il successo).
    effect((onCleanup) => {
      if (this.phase() !== 'task' || this.running() || this.reward() || this.python.status() === 'loading') return;
      const timer = setInterval(() => this.seconds.update((s) => s + 1), 1000);
      onCleanup(() => clearInterval(timer));
    });
  }

  /**
   * «Confronta con la soluzione». Prima di aver superato il task costa gli XP di questa missione: serve un avviso e una conferma
   * (una volta sola: poi la soluzione si riapre liberamente). Dopo aver superato il task non costa nulla.
   */
  protected openSolution(): void {
    const m = this.mission();
    if (this.reward() || this.solutionViewed() || (m && this.game.isCompleted(m.id))) {
      this.showSolution.set(true); // già superata (ora o in passato) o già confermata: non c'è più nulla da perdere / da riavvisare
      return;
    }
    this.confirmSolutionOpen.set(true);
  }

  protected confirmSolution(): void {
    this.confirmSolutionOpen.set(false);
    this.solutionViewed.set(true);
    this.showSolution.set(true);
  }

  /** Scarica il compilatore in anticipo (dalla battaglia): al task è già pronto, o la barra mostra l'attesa residua. */
  protected loadCompiler(): void {
    this.python.loadRuntime().catch(() => undefined);
  }

  private introSeen(): boolean {
    try {
      return sessionStorage.getItem(INTRO_KEY) === '1';
    } catch {
      return false;
    }
  }

  protected closeIntro(): void {
    this.introOpen.set(false);
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* senza storage la presentazione può ripetersi: non è un problema */
    }
  }

  /** Cambia fase e la ricorda per la sessione (la teoria è la partenza: non si salva). */
  protected go(p: Phase): void {
    this.phase.set(p);
    const id = this.current;
    if (!id) return;
    try {
      const all = JSON.parse(sessionStorage.getItem(PHASE_KEY) ?? '{}') as Record<string, Phase>;
      if (p === 'teoria') delete all[id];
      else all[id] = p;
      sessionStorage.setItem(PHASE_KEY, JSON.stringify(all));
    } catch {
      /* senza storage (o con dati rovinati) la ripresa non c'è: non è un problema */
    }
  }

  /** Registra gli errori della battaglia e li ricorda per la sessione. */
  private setBattleErrors(n: number): void {
    this.battleErrors.set(n);
    const id = this.current;
    if (!id) return;
    try {
      const all = JSON.parse(sessionStorage.getItem(BATTLE_KEY) ?? '{}') as Record<string, number>;
      all[id] = n;
      sessionStorage.setItem(BATTLE_KEY, JSON.stringify(all));
    } catch {
      /* senza storage gli errori della battaglia si perdono ricaricando: non è un problema */
    }
  }

  private savedBattleErrors(id: string): number {
    try {
      const n = (JSON.parse(sessionStorage.getItem(BATTLE_KEY) ?? '{}') as Record<string, unknown>)[id];
      return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  private savedPhase(id: string): Phase | null {
    try {
      const p = (JSON.parse(sessionStorage.getItem(PHASE_KEY) ?? '{}') as Record<string, unknown>)[id];
      return p === 'battaglia' || p === 'task' ? p : null;
    } catch {
      return null;
    }
  }

  protected restart(): void {
    this.victoryOpen.set(false);
    this.slide.set(0);
    this.go('teoria');
  }

  protected goToTask(): void {
    this.victoryOpen.set(false);
    this.go('task');
  }

  protected async run(code: string): Promise<void> {
    const m = this.mission();
    if (!m || this.running()) return;
    this.running.set(true);
    this.result.set(null);
    // Si esegue il programma completo (sezioni precedenti + quella dell'editor); gli errori citano le righe dell'editor.
    const full = composeProject(this.base(), code);
    const res = await this.python.run(full);
    this.output.set(res.output);
    this.error.set(res.error ? shiftErrorLines(res.error, baseLineCount(this.base())) : '');
    this.attempts.update((a) => a + 1);
    if (res.error) {
      this.errors.update((e) => e + 1);
      this.result.set({ ok: false, message: 'Il codice ha generato un errore: leggi il messaggio qui sopra.' });
    } else {
      const v = this.missions.validate(m, res.output);
      this.result.set(v);
      if (v.ok) {
        const score = scoreAttempt({
          baseXp: m.xp,
          difficulty: m.difficulty,
          seconds: this.seconds(),
          errors: this.errors(),
          battleErrors: this.battleErrors(),
          code: stripBase(full, this.starterBase()),
          reference: stripBase(this.solution(), m.projectBase ?? ''),
          solutionViewed: this.solutionViewed(),
          pastedChars: this.pastedChars(),
        });
        this.score.set(score);
        if (m.challenge) {
          const rec = { xp: score.xp, seconds: this.seconds(), errors: this.errors(), at: Date.now() };
          this.newRecord.set(this.game.recordResult(m.id, rec) ? rec : null);
        }
        this.reward.set(this.game.completeMission(m, { xp: score.xp, code: full }));
        if (this.reward()!.firstTime) this.unlockedPaths.set(newlyUnlocked(this.registry.paths(), new Set(this.game.state().completedMissionIds), m.id).map((p) => p.title));
        this.rewardOpen.set(true);
      } else {
        this.errors.update((e) => e + 1);
      }
    }
    this.running.set(false);
  }
}
