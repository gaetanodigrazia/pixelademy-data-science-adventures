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

describe('Navbar: menu del profilo, chiusura con clic fuori', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    useMiniPack();
  });

  async function mount() {
    const f = TestBed.createComponent(App);
    document.body.appendChild(f.nativeElement); // gli eventi devono arrivare al documento come in un browser vero
    await TestBed.inject(Router).navigateByUrl('/');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const toggle = el.querySelector('.profile-btn') as HTMLButtonElement;
    const menu = () => el.querySelector('.menu');
    return { f, el, toggle, menu };
  }

  afterEach(() => document.body.innerHTML = '');

  it('un clic fuori dal menu lo chiude', async () => {
    const { f, el, toggle, menu } = await mount();
    toggle.click();
    f.detectChanges();
    expect(menu()).not.toBeNull();
    document.body.click();
    f.detectChanges();
    expect(menu()).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el).toBeTruthy();
  });

  it('un clic su un altro punto della pagina (titolo, link, pulsante della barra) lo chiude', async () => {
    const { f, el, toggle, menu } = await mount();
    for (const target of [el.querySelector('.brand'), el.querySelector('a[href="/info"]'), el.querySelector('.privacy')] as HTMLElement[]) {
      toggle.click();
      f.detectChanges();
      expect(menu()).not.toBeNull();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      f.detectChanges();
      expect(menu(), target.className).toBeNull();
    }
  });

  it('un clic dentro il menu non lo chiude', async () => {
    const { f, toggle, menu } = await mount();
    toggle.click();
    f.detectChanges();
    menu()!.querySelector('p')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    menu()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    f.detectChanges();
    expect(menu()).not.toBeNull();
  });

  it('il pulsante del profilo lo chiude (e non lo riapre); Esc lo chiude; a menu chiuso un clic fuori non fa nulla', async () => {
    const { f, el, toggle, menu } = await mount();
    toggle.click();
    f.detectChanges();
    toggle.click();
    f.detectChanges();
    expect(menu()).toBeNull();

    toggle.click();
    f.detectChanges();
    el.querySelector('app-navbar')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(menu()).toBeNull();

    document.body.click();
    f.detectChanges();
    expect(menu()).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('dopo la chiusura con un clic fuori si può riaprire', async () => {
    const { f, toggle, menu } = await mount();
    toggle.click();
    f.detectChanges();
    document.body.click();
    f.detectChanges();
    toggle.click();
    f.detectChanges();
    expect(menu()).not.toBeNull();
  });
});
