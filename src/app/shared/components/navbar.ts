import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { SHARE_TEXT_COPIED, ShareService } from '../../core/services/share.service';
import { levelShareText } from '../../core/utils/share-image';
import { I18nService, LOCALES } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PrivacyModal } from './privacy-modal';
import { SpriteView } from './sprite-view';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, SpriteView, PrivacyModal, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav" [attr.aria-label]="'nav.label' | t">
      <button type="button" class="btn burger" aria-controls="nav-items" [attr.aria-expanded]="menuOpen()"
        [attr.aria-label]="menuOpen() ? ('nav.closeMenu' | t) : ('nav.openMenu' | t)" (click)="toggleMenu()">{{ menuOpen() ? '✕' : '☰' }}</button>
      <a routerLink="/" class="brand" aria-label="Pixelademy" (click)="closeMenu()">PIXELADEMY</a>

      <div id="nav-items" class="items" [class.open]="menuOpen()">
        <div class="links">
          @if (!onHome()) { <a routerLink="/" class="btn home" (click)="closeMenu()">{{ 'nav.home' | t }}</a> }
          <a routerLink="/info" class="btn info" (click)="closeMenu()">{{ 'nav.project' | t }}</a>
        </div>

        <div class="right">
        <div class="profile">
          <button type="button" class="btn profile-btn" aria-haspopup="true" [attr.aria-expanded]="profileOpen()"
            [attr.aria-label]="'nav.profile' | t: { level: game.level(), xp: game.xp() }" (click)="profileOpen.set(!profileOpen()); shareMessage.set('')">
            @if (game.selectedCharacter(); as c) { <app-sprite-view [sprite]="c.sprite" [scale]="2" [label]="c.name" /> }
            <span class="pname">{{ game.selectedCharacter()?.name }}</span>
            <span class="lv">{{ 'nav.levelShort' | t: { level: game.level() } }}</span> <span aria-hidden="true">{{ profileOpen() ? '▴' : '▾' }}</span>
          </button>
          @if (profileOpen()) {
            <div class="menu panel" role="region" aria-label="Esperienza e livello">
              <p><strong>{{ 'nav.level' | t: { level: game.level() } }}</strong></p>
              <p class="status">{{ 'nav.xpToward' | t: { into: game.xpInto(), span: game.xpSpan(), next: game.level() + 1 } }}</p>
              <div class="bar" role="progressbar" [attr.aria-valuenow]="game.xpInto()" aria-valuemin="0" [attr.aria-valuemax]="game.xpSpan()"
                [attr.aria-label]="'nav.xpBar' | t: { into: game.xpInto(), span: game.xpSpan() }"><span [style.width.%]="game.levelProgress()"></span></div>
              <p class="status">{{ 'nav.xpTotal' | t: { xp: game.xp() } }}</p>
              <button type="button" class="btn share" (click)="shareProfile()">🔗 Condividi livello e XP</button>
              <p class="status" role="status">{{ shareMessage() }}</p>
            </div>
          }
        </div>

        @if (i18n.choiceEnabled) {
          <div class="lang" role="group" [attr.aria-label]="'nav.language' | t">
            @for (l of locales; track l) {
              <button type="button" class="btn" [attr.aria-pressed]="i18n.locale() === l" [class.primary]="i18n.locale() === l" (click)="i18n.setLocale(l)">{{ l.toUpperCase() }}</button>
            }
          </div>
        }

        <button type="button" class="btn privacy" aria-haspopup="dialog" [attr.aria-label]="'nav.privacyAria' | t" (click)="openPrivacy()">{{ 'nav.privacy' | t }}</button>
        </div>
      </div>
    </nav>

    @if (game.consent() === 'unknown') {
      <section class="consent" [attr.aria-label]="'nav.consentAria' | t">
        <span>{{ 'nav.consentAsk' | t }}</span>
        <button type="button" class="btn primary" (click)="game.acceptSaving()">{{ 'nav.consentYes' | t }}</button>
        <button type="button" class="btn" (click)="game.declineSaving()">{{ 'nav.consentNo' | t }}</button>
        <button type="button" class="btn" (click)="privacyOpen.set(true)">{{ 'nav.consentMore' | t }}</button>
      </section>
    }

    <app-privacy-modal [open]="privacyOpen()" (closed)="privacyOpen.set(false)" />
  `,
  styles: `
    /* Mobile: barra con menu a scomparsa e logo sempre centrato */
    :host { display: block; flex: none; position: relative; z-index: 20; }
    .nav { position: relative; display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; gap: 8px;
      padding: 8px 12px; background: #000; border-bottom: 4px solid var(--accent); }
    .burger { grid-column: 1; width: 48px; padding: 6px 0; font-size: 1.2rem; }
    .brand { grid-column: 2; text-align: center; color: var(--accent); text-decoration: none; letter-spacing: .08em; font-size: .8rem; white-space: nowrap; }
    .items { display: none; }
    .items.open { display: flex; flex-direction: column; gap: 8px; position: absolute; top: 100%; left: 0; right: 0; z-index: 30;
      padding: 8px 12px 12px; background: #000; border-bottom: 4px solid var(--accent); }
    .items .btn { width: 100%; text-align: left; }
    .links { display: flex; flex-direction: column; gap: 8px; }
    .right { display: flex; flex-direction: column; gap: 8px; }
    .profile-btn { display: flex; align-items: center; gap: 8px; background: var(--accent); color: #1b1b2f; box-shadow: 0 3px 0 #92400e; }
    /* chiuso: sempre giallo (anche in hover/tocco, dove l'hover resta appiccicato su mobile); aperto: scuro */
    .profile-btn[aria-expanded='false'], .profile-btn[aria-expanded='false']:hover:not(:disabled) { background: var(--accent); color: #1b1b2f; }
    .profile-btn[aria-expanded='true'], .profile-btn[aria-expanded='true']:hover:not(:disabled) { background: var(--panel-2); color: var(--text); box-shadow: 0 3px 0 #000; }
    .pname { flex: 1; }
    .lv { background: #1b1b2f; color: var(--accent); padding: 0 6px; font-size: .55rem; }
    .menu { margin: 6px 0 0; background: #0b0b24; }
    .menu p { margin: 4px 0; }
    .menu .share { width: 100%; margin-top: 4px; }
    .lang { display: flex; gap: 4px; }
    .lang .btn { min-width: 44px; padding: 6px 8px; }
    .consent { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 12px; background: var(--panel); border-bottom: 3px solid var(--accent); font-size: .55rem; }
    .consent span { flex: 1 1 100%; }

    /* Desktop: barra orizzontale, logo al centro */
    @media (min-width: 640px) {
      .nav { grid-template-columns: 1fr auto 1fr; padding: 10px 16px; }
      .burger { display: none; }
      .brand { grid-column: 2; font-size: 1rem; letter-spacing: .12em; }
      .items, .items.open { display: contents; position: static; }
      .items .btn { width: auto; }
      .links { grid-column: 1; grid-row: 1; justify-self: start; flex-direction: row; }
      .right { grid-column: 3; grid-row: 1; justify-self: end; flex-direction: row; align-items: flex-start; }
      .profile { position: relative; }
      .menu { position: absolute; top: calc(100% + 6px); right: 0; width: 300px; z-index: 30; margin: 0; }
      .consent span { flex: 1 1 auto; }
    }
  `,
})
export class Navbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  /** Sulla home il pulsante «Home» non serve. */
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  protected readonly onHome = computed(() => (this.url() ?? '/').split(/[?#]/)[0] === '/');
  protected readonly game = inject(GameStateService);
  protected readonly i18n = inject(I18nService);
  protected readonly locales = LOCALES;
  protected readonly menuOpen = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly shareMessage = signal('');
  private readonly sharing = inject(ShareService);
  protected readonly privacyOpen = signal(false);

  /**
   * Condivide livello ed XP: il foglio di condivisione riceve il link al sito; il testo completo va negli appunti,
   * perché LinkedIn non lo precompila.
   */
  protected async shareProfile(): Promise<void> {
    this.shareMessage.set('');
    const link = typeof location !== 'undefined' ? location.origin : '';
    const body = levelShareText(this.game.level(), this.game.xp());
    const r = await this.sharing.shareLink(link, body, `${body} ${link}`.trim());
    if (r.kind === 'cancelled') return;
    if (r.kind === 'composer') this.shareMessage.set('Ho aperto LinkedIn con il testo: il link mostrerà il tuo profilo come foto.');
    else {
      this.shareMessage.set(r.textCopied ? SHARE_TEXT_COPIED : 'Non è stato possibile copiare il testo.');
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.profileOpen.set(false);
  }
  protected openPrivacy(): void {
    this.closeMenu();
    this.privacyOpen.set(true);
  }

  /** Clic o tocco fuori dal menu del profilo (e dal suo pulsante): il menu si chiude. Dentro non lo chiude. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: Event): void {
    if (!this.profileOpen()) return;
    const profile = this.host.nativeElement.querySelector('.profile');
    if (profile && e.composedPath().includes(profile)) return;
    this.profileOpen.set(false);
  }

  @HostListener('keydown.escape')
  protected onEsc(): void {
    this.closeMenu();
  }
}
