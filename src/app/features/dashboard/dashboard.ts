import { byDependency } from '../../core/utils/path-lock';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Character } from '../../core/models/character.model';
import { LearningPath } from '../../core/models/content-pack.model';
import { ContentRegistryService } from '../../core/services/content-registry.service';
import { LikeService } from '../../core/services/like.service';
import { GameStateService } from '../../core/services/game-state.service';
import { MissionService } from '../../core/services/mission.service';
import { MissionCard } from '../../shared/components/mission-card';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ContributorLine } from '../../shared/components/contributor';
import { Leaderboard } from '../../shared/components/leaderboard';
import { SpriteView } from '../../shared/components/sprite-view';
import { WorldMap } from '../../shared/components/world-map';

type CatalogKind = 'paths' | 'heroes';

@Component({
  selector: 'app-dashboard',
  imports: [ContributorLine, Leaderboard, MissionCard, RouterLink, SpriteView, WorldMap, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeCatalog()' },
  template: `
    <main>
      @if (registry.isEmpty() || !path() || !hero()) {
        <section class="panel"><h2>{{ 'home.emptyTitle' | t }}</h2>
          <p>{{ 'home.emptyText' | t }}</p></section>
      } @else {
        <header class="head">
          <div class="titlerow">
            <h1>{{ path()!.icon }} {{ path()!.title }}</h1>
            <button type="button" class="btn like" [attr.aria-pressed]="game.liked()" [disabled]="game.liked() || likes.sending()"
              aria-label="Mi piace al progetto, in modo anonimo" (click)="likes.likeOnce()">{{ (game.liked() ? 'home.liked' : 'home.like') | t }}</button>
          </div>
          <p class="hint">{{ 'home.hint' | t }}</p>
          <section class="level" [attr.aria-label]="'home.progress' | t">
            <div class="level-copy">
              <strong>{{ 'home.levelOf' | t: { level: game.level() } }} <span>/ ∞</span></strong>
              <span>{{ 'nav.xpToward' | t: { into: game.xpInto(), span: game.xpSpan(), next: game.level() + 1 } }}</span>
            </div>
            <div class="bar" role="progressbar" [attr.aria-valuenow]="game.xpInto()" aria-valuemin="0" [attr.aria-valuemax]="game.xpSpan()"
              [attr.aria-label]="'nav.xpBar' | t: { into: game.xpInto(), span: game.xpSpan() }"><span [style.width.%]="game.levelProgress()"></span></div>
            <span class="note">{{ 'home.xpNote' | t: { xp: game.xp() } }}</span>
          </section>
        </header>

        <app-world-map class="map" [missions]="path()!.missions" [character]="hero()!" [statuses]="statuses()" [startId]="startId()" [walkFrom]="walkFrom"
          (missionSelected)="picked.set($event)" (missionEntered)="enter($event)" />

        <div class="bottom">
          @if (selected(); as m) { <app-mission-card [mission]="m" [status]="missions.status(m)" /> }

          <section class="panel box" aria-label="Percorso">
            <h2>{{ 'home.path' | t }}</h2>
            <div class="box-body">
              <span class="icon" aria-hidden="true">{{ path()!.icon }}</span>
              <div class="txt">
                <strong>{{ path()!.title }}</strong>
                <span>{{ 'home.missionsDone' | t: { done: missions.completedCount(path()!), total: path()!.missions.length } }}</span>
                @if (pathAuthor(); as a) { <span class="muted">{{ 'home.by' | t: { author: a } }}</span> }
                @if (path()!.contributor; as c) { <span class="muted contributor"><app-contributor [contributor]="c" /></span> }
              </div>
            </div>
            @if (path()!.dashboard !== false) {
              <a class="btn" [routerLink]="['/progetto', path()!.id]">{{ 'home.dashboard' | t: { done: missions.completedCount(path()!), total: path()!.missions.length } }}</a>
            }
            @if (hasChallenges()) {
              <button type="button" class="btn" (click)="leaderboardOpen.set(true)">{{ 'home.leaderboard' | t }}</button>
            }
            <button type="button" class="btn primary" (click)="openCatalog('paths')">{{ 'home.changePath' | t: { n: registry.paths().length } }}</button>
          </section>

          <section class="panel box" aria-label="Eroe">
            <h2>{{ 'home.hero' | t }}</h2>
            <div class="box-body">
              <app-sprite-view [sprite]="hero()!.sprite" [scale]="4" [label]="hero()!.name" />
              <div class="txt">
                <strong>{{ hero()!.name }}</strong>
                <span class="muted">{{ 'home.by' | t: { author: hero()!.author } }}</span>
              </div>
            </div>
            <div class="choices" aria-label="Scegli l'eroe">
              @for (c of registry.characters(); track c.id) {
                <button type="button" class="choice" [class.active]="c.id === hero()!.id" [disabled]="!game.isCharacterUnlocked(c.id)"
                  [attr.aria-label]="'Scegli ' + c.name" [title]="c.name + (game.isCharacterUnlocked(c.id) ? '' : ' · 🔒 Liv. ' + c.unlockLevel)"
                  (click)="chooseHero(c)">
                  <app-sprite-view [sprite]="c.sprite" [scale]="2" [label]="c.name" />
                  @if (!game.isCharacterUnlocked(c.id)) { <small>🔒</small> }
                </button>
              }
            </div>
            <button type="button" class="btn primary" (click)="openCatalog('heroes')">{{ 'home.searchHeroes' | t: { n: registry.characters().length } }}</button>
          </section>
        </div>
      }
    </main>

    @if (leaderboardOpen() && path(); as p) { <app-leaderboard [path]="p" (closed)="leaderboardOpen.set(false)" /> }

    @if (catalog(); as kind) {
      <div class="backdrop" (click)="onBackdrop($event)">
        <div class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="catalog-title">
          <header class="dhead">
            <h2 id="catalog-title">{{ (kind === 'paths' ? 'home.catalogPaths' : 'home.catalogHeroes') | t }}</h2>
            <button type="button" class="btn danger" aria-label="Chiudi" (click)="closeCatalog()">✕</button>
          </header>
          <input #search class="search" type="search" [value]="query()" (input)="query.set($any($event.target).value)"
            [placeholder]="kind === 'paths' ? 'Cerca per titolo, argomento, tag…' : 'Cerca per nome, autore, tag…'"
            [attr.aria-label]="(kind === 'paths' ? 'home.searchPaths' : 'home.searchHeroesLabel') | t" />
          <div class="results">
            @if (kind === 'paths') {
              @for (p of foundPaths(); track p.id) {
                <button type="button" class="result" [class.active]="p.id === path()!.id" [class.locked]="!missions.pathUnlocked(p)" [disabled]="!missions.pathUnlocked(p)" (click)="choosePath(p)">
                  <span class="r-icon" aria-hidden="true">{{ p.icon }}</span>
                  <span class="r-txt">
                    <strong>{{ p.title }}</strong>
                    <span>{{ p.description }}</span>
                    @if (lockNote(p); as note) { <span class="lock-note">🔒 {{ note }}</span> }
                    <span class="muted">{{ missions.completedCount(p) }}/{{ p.missions.length }} missioni · {{ p.tags.join(', ') }}</span>
                    @if (p.contributor; as c) { <span class="muted contributor"><app-contributor [contributor]="c" [link]="false" /></span> }
                  </span>
                </button>
              } @empty { <p class="status">{{ 'home.noPath' | t }}</p> }
            } @else {
              @for (c of foundHeroes(); track c.id) {
                <button type="button" class="result" [class.active]="c.id === hero()!.id" [disabled]="!game.isCharacterUnlocked(c.id)" (click)="chooseHero(c)">
                  <app-sprite-view [sprite]="c.sprite" [scale]="3" [label]="c.name" />
                  <span class="r-txt">
                    <strong>{{ c.name }}</strong>
                    <span>{{ c.description }}</span>
                    <span class="muted">{{ game.isCharacterUnlocked(c.id) ? 'di ' + c.author : '🔒 Si sblocca al livello ' + c.unlockLevel }} · {{ c.tags.join(', ') }}</span>
                  </span>
                </button>
              } @empty { <p class="status">{{ 'home.noHero' | t }}</p> }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    main { gap: clamp(4px, 1.2vh, 10px); }
    .head { flex: none; text-align: center; }
    .titlerow { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 10px; }
    .titlerow .like { padding: 3px 8px; font-size: .5rem; }
    .head h1 { margin: 0; font-size: clamp(.7rem, 2.4vh, 1rem); line-height: 1.4; }
    .hint { margin: 0; color: #cbd5e1; font-size: .55rem; }
    .level { display: grid; grid-template-columns: minmax(0, auto) minmax(0, min(240px, 35vw)); align-items: center; justify-content: center;
      gap: 3px 12px; width: fit-content; max-width: 100%; margin: clamp(4px, 1vh, 10px) auto 0; padding: 6px 12px;
      border: 2px solid var(--accent); background: var(--panel); text-align: left; }
    .level-copy { display: flex; flex-direction: column; gap: 2px; font-size: .52rem; color: #cbd5e1; }
    .level-copy strong { color: var(--accent-2); font-size: .65rem; }
    .level-copy strong span { color: #cbd5e1; }
    .note { grid-column: 1 / -1; color: var(--muted); font-size: .48rem; }
    .map { flex: 1; min-height: 0; }
    .bottom { flex: none; display: grid; grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
    .box { display: flex; flex-direction: column; gap: 6px; font-size: .55rem; padding: 8px 10px; }
    .box h2 { margin: 0; }
    .box-body { display: flex; flex: 1; align-items: center; gap: 10px; min-width: 0; }
    .icon { font-size: 1.8rem; }
    .txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; line-height: 1.5; overflow-wrap: anywhere; }
    .muted { color: var(--muted); }
    /* Gli eroi stanno su una riga che scorre di lato, qualunque sia il loro numero. */
    .choices { display: flex; flex-wrap: nowrap; gap: 4px; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 2px; }
    .choice { flex: none; position: relative; display: flex; align-items: center; justify-content: center; min-width: 36px; padding: 4px;
      border: 3px solid var(--line); background: #020617; color: var(--text); cursor: pointer; }
    .choice.active { border-color: var(--good); box-shadow: 0 0 0 2px rgba(74, 222, 128, .25); }
    .choice:hover:not(:disabled) { border-color: var(--accent-2); }
    .choice:disabled { opacity: .45; cursor: not-allowed; }
    .choice small { position: absolute; right: 0; bottom: 0; font-size: .5rem; line-height: 1; }
    .box .btn { font-size: .55rem; padding: 7px; }

    .dialog { max-width: 760px; padding: 12px; }
    .dhead { display: flex; align-items: center; justify-content: space-between; }
    .dhead h2 { margin: 0; }
    .search { padding: 10px; background: #000; color: var(--accent-2); border: 4px solid var(--line); font-size: .65rem; }
    .search:focus { outline: none; border-color: var(--accent-2); }
    /* L'elenco scorre dentro la finestra; le voci tengono la loro altezza (senza «flex: none» si comprimevano e i testi si sovrapponevano). */
    .results { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
    .result { flex: none; display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--panel); color: var(--text); border: 4px solid var(--line);
      font: inherit; text-align: left; cursor: pointer; }
    .result:hover:not(:disabled) { border-color: var(--accent-2); }
    .result.active { border-color: var(--good); }
    .lock-note { color: var(--accent-2); }
    .result:disabled { opacity: .45; cursor: not-allowed; }
    .r-icon { font-size: 1.8rem; }
    .r-txt { display: flex; flex-direction: column; gap: 4px; font-size: .55rem; line-height: 1.6; min-width: 0; overflow-wrap: anywhere; }

    @media (max-width: 900px) {
      .bottom { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .bottom app-mission-card { grid-column: 1 / -1; }
    }
    /* Layout compatti: tutto resta in schermo senza scorrere. */
    @media (max-height: 760px) { .hint, .note, .box .muted { display: none; } }
    @media (max-height: 600px) { .icon { font-size: 1.2rem; } }
    /* Schermi molto bassi: resta l'anteprima dell'eroe, la fila delle miniature cede lo spazio alla mappa. */
    @media (max-height: 700px) { .choices { display: none; } }
    @media (max-width: 760px) {
      /* La mappa tiene la sua altezza (larga come lo schermo): è la pagina che scorre, non la mappa che si schiaccia. */
      main { overflow-y: auto; overflow-x: hidden; }
      .map { flex: none; }
      .hint, .note { display: none; }
      .level { grid-template-columns: minmax(0, 1fr); width: 100%; padding: 4px 8px; }
      .box { padding: 6px 8px; gap: 4px; }
      /* L'anteprima dell'eroe e la scelta restano visibili anche su telefono (si nasconde solo l'icona del percorso). */
      .icon { display: none; }
    }
  `,
})
export class Dashboard {
  protected readonly registry = inject(ContentRegistryService);
  protected readonly game = inject(GameStateService);
  protected readonly likes = inject(LikeService);
  protected readonly missions = inject(MissionService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  protected readonly path = computed(() => this.game.selectedPath() ?? this.registry.paths()[0]);
  protected readonly hero = computed(() => this.game.selectedCharacter() ?? this.registry.characters()[0]);
  protected readonly pathAuthor = computed(() => this.registry.pathAuthor(this.path()?.id ?? ''));
  protected readonly statuses = computed(() => (this.path()?.missions ?? []).map((m) => this.missions.status(m)));


  /** L'eroe parte dalla prima missione disponibile (o dall'ultima sbloccata). */
  protected readonly startId = computed(() => {
    const ms = this.path()?.missions ?? [];
    const st = this.statuses();
    const open = ms.findIndex((_, i) => st[i] === 'available');
    const lastOpen = st.map((s) => s !== 'locked').lastIndexOf(true);
    return ms[open >= 0 ? open : Math.max(0, lastOpen)]?.id ?? null;
  });
  protected readonly picked = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.picked() ?? this.startId();
    return this.path()?.missions.find((m) => m.id === id);
  });

  /** Missione appena completata (se c'è): l'eroe la lascia e cammina verso la successiva. */
  protected readonly walkFrom = this.game.lastCompletedId();
  protected readonly catalog = signal<CatalogKind | null>(null);
  protected readonly leaderboardOpen = signal(false);
  /** Il percorso è fatto di sfide: ha una classifica locale. */
  protected readonly hasChallenges = computed(() => !!this.path()?.missions.some((m) => m.challenge));
  protected readonly query = signal('');
  protected readonly foundPaths = computed(() => {
    const q = this.norm(this.query());
    return byDependency(this.registry.paths()).filter((p) => this.norm(`${p.title} ${p.description} ${p.tags.join(' ')}`).includes(q));
  });
  protected readonly foundHeroes = computed(() => {
    const q = this.norm(this.query());
    return this.registry.characters().filter((c) => this.norm(`${c.name} ${c.author} ${c.description} ${c.tags.join(' ')}`).includes(q));
  });
  private touch(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  }
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  constructor() {
    this.game.lastCompletedId.set(null);
    // Il campo di ricerca prende il fuoco da solo solo con mouse e tastiera: su un dispositivo touch aprirebbe la tastiera sopra la lista.
    effect(() => {
      if (!this.touch()) this.searchInput()?.nativeElement.focus();
    });
    // Scroll lock mentre la modale è aperta.
    effect((onCleanup) => {
      if (!this.catalog()) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      onCleanup(() => (document.body.style.overflow = prev));
    });
  }

  protected openCatalog(kind: CatalogKind): void {
    this.query.set('');
    this.catalog.set(kind);
  }
  protected closeCatalog(): void {
    this.catalog.set(null);
  }
  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closeCatalog();
  }
  /** «Completa «X» per sbloccarlo» se il percorso è bloccato, altrimenti niente. */
  protected lockNote(p: LearningPath): string {
    const missing = this.missions.missingFor(p);
    return missing.length ? this.i18n.t('home.pathLocked', { names: missing.map((m) => m.title).join(', ') }) : '';
  }
  protected choosePath(p: LearningPath): void {
    if (!this.missions.pathUnlocked(p)) return;
    this.game.selectPath(p.id);
    this.picked.set(null);
    this.closeCatalog();
  }
  protected chooseHero(c: Character): void {
    if (!this.game.isCharacterUnlocked(c.id)) return;
    this.game.selectCharacter(c.id);
    this.closeCatalog();
  }
  protected enter(id: string): void {
    void this.router.navigate(['/missione', id]);
  }

  private norm(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
