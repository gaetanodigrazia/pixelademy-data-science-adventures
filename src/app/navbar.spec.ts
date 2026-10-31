import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { GameStateService } from './core/services/game-state.service';
import { useMiniPack } from './testing/mini-pack';

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  async function mount() {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    useMiniPack();
    const f = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, game: TestBed.inject(GameStateService) };
  }
  const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

  it('mostra logo, link a Home e «Il progetto», profilo con livello', async () => {
    const { el } = await mount();
    expect(el.querySelector('.brand')!.textContent).toContain('PIXELADEMY');
    expect(el.querySelector('a[href="/info"]')).not.toBeNull();
    expect(el.querySelector('.profile-btn')!.textContent).toContain('Lv 1');
    expect(el.querySelector('.profile-btn')!.getAttribute('aria-label')).toContain('livello 1, 0 XP');
  });

  it('il menu del profilo mostra livello, XP verso il prossimo livello e una barra accessibile', async () => {
    const { f, el, game } = await mount();
    game.completeMission(useMiniPack().missions()[0], { xp: 70 });
    f.detectChanges();
    expect(el.querySelector('.menu')).toBeNull();
    (el.querySelector('.profile-btn') as HTMLButtonElement).click();
    f.detectChanges();
    const menu = el.querySelector('.menu')!;
    expect(menu.textContent).toContain('Livello 2');
    expect(menu.textContent).toContain('20 / 150 XP verso il livello 3');
    const bar = menu.querySelector('[role=progressbar]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('20');
    expect(bar.getAttribute('aria-valuemax')).toBe('150');
  });

  it('chiede il consenso al primo avvio e lo registra con «Sì, salva» o «No, grazie»', async () => {
    const { f, el, game } = await mount();
    expect(el.querySelector('.consent')).not.toBeNull();
    btn(el, 'Sì, salva').click();
    f.detectChanges();
    expect(game.consent()).toBe('granted');
    expect(el.querySelector('.consent')).toBeNull();
  });

  it('«Privacy e dati» e «Dettagli» aprono la modale; Esc chiude il menu', async () => {
    const { f, el } = await mount();
    btn(el, 'Privacy e dati').click();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
    el.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeNull();

    btn(el, 'Dettagli').click();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('il pulsante hamburger apre e chiude il menu di navigazione (mobile)', async () => {
    const { f, el } = await mount();
    const burger = el.querySelector('.burger') as HTMLButtonElement;
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    burger.click();
    f.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#nav-items')!.classList.contains('open')).toBe(true);
  });
});
