import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { PrivacyModal } from './privacy-modal';
import { SpriteView } from './sprite-view';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, SpriteView, PrivacyModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav" aria-label="Navigazione principale">
      <button type="button" class="btn burger" aria-controls="nav-items" [attr.aria-expanded]="menuOpen()"
        [attr.aria-label]="menuOpen() ? 'Chiudi menu' : 'Apri menu'" (click)="toggleMenu()">{{ menuOpen() ? '✕' : '☰' }}</button>
      <a routerLink="/" class="brand" aria-label="Pixelademy" (click)="closeMenu()">PIXELADEMY</a>

      <div id="nav-items" class="items" [class.open]="menuOpen()">
        <div class="links">
          <a routerLink="/" class="btn home" (click)="closeMenu()">🏠 Home</a>
          <a routerLink="/info" class="btn info" (click)="closeMenu()">ℹ️ Il progetto</a>
        </div>

        <div class="right">
        <div class="profile">
          <button type="button" class="btn profile-btn" aria-haspopup="true" [attr.aria-expanded]="profileOpen()"
            aria-label="Profilo giocatore: livello {{ game.level() }}, {{ game.xp() }} XP" (click)="profileOpen.set(!profileOpen())">
            @if (game.selectedCharacter(); as c) { <app-sprite-view [sprite]="c.sprite" [scale]="2" [label]="c.name" /> }
            <span class="pname">{{ game.selectedCharacter()?.name }}</span>
            <span class="lv">Lv {{ game.level() }}</span> <span aria-hidden="true">{{ profileOpen() ? '▴' : '▾' }}</span>
          </button>
          @if (profileOpen()) {
            <div class="menu panel" role="region" aria-label="Esperienza e livello">
              <p><strong>Livello {{ game.level() }}</strong></p>
              <p class="status">{{ game.xpInto() }} / {{ game.xpSpan() }} XP verso il livello {{ game.level() + 1 }}</p>
              <div class="bar" role="progressbar" [attr.aria-valuenow]="game.xpInto()" aria-valuemin="0" [attr.aria-valuemax]="game.xpSpan()"
                [attr.aria-label]="game.xpInto() + ' su ' + game.xpSpan() + ' XP per il prossimo livello'"><span [style.width.%]="game.levelProgress()"></span></div>
              <p class="status">XP totali: {{ game.xp() }}</p>
            </div>
          }
        </div>

        <button type="button" class="btn privacy" aria-haspopup="dialog" aria-label="Privacy e dati" (click)="openPrivacy()">🔒 Privacy e dati</button>
        </div>
      </div>
    </nav>

    @if (game.consent() === 'unknown') {
      <section class="consent" aria-label="Consenso al salvataggio">
        <span>Vuoi salvare i progressi in questo browser?</span>
        <button type="button" class="btn primary" (click)="game.acceptSaving()">Sì, salva</button>
        <button type="button" class="btn" (click)="game.declineSaving()">No, grazie</button>
        <button type="button" class="btn" (click)="privacyOpen.set(true)">Dettagli</button>
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
  protected readonly game = inject(GameStateService);
  protected readonly menuOpen = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly privacyOpen = signal(false);

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

  @HostListener('keydown.escape')
  protected onEsc(): void {
    this.closeMenu();
  }
}
