import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { useMiniPack } from './testing/mini-pack';

describe('Home (Dashboard)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  async function mount(withContent = true) {
    if (withContent) useMiniPack();
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, game: TestBed.inject(GameStateService) };
  }
  const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
  const dialog = (el: HTMLElement) => el.querySelector('[role=dialog]');

  it('senza contenuti spiega come aggiungere un pack', async () => {
    const { el } = await mount(false);
    expect(el.textContent).toContain('Nessun contenuto disponibile');
    expect(el.textContent).toContain('npm run packs');
  });

  it('mostra percorso, livello, mappa con le missioni, scheda della prima missione e link alla Dashboard', async () => {
    const { el } = await mount();
    expect(el.querySelector('h1')!.textContent).toContain('Percorso di prova');
    expect(el.textContent).toContain('Livello 1');
    expect(el.querySelector('app-world-map canvas')).not.toBeNull();
    expect(el.querySelector('app-mission-card h3')!.textContent).toContain('Missione 1');
    expect(el.textContent).toContain('0 / 10 missioni');
    expect(el.querySelector('a[href="/progetto/mini-path"]')).not.toBeNull();
  });

  it('la scheda di una missione bloccata non è un link; quella disponibile sì', async () => {
    const { f, el, game } = await mount();
    const reg = TestBed.inject(ContentRegistryService);
    expect(el.querySelector('app-mission-card a')!.getAttribute('href')).toBe('/missione/mini-path-01');
    game.completeMission(reg.missions()[0]);
    f.detectChanges();
    expect(el.querySelector('app-mission-card h3')!.textContent).toContain('Missione 2');
  });

  it('catalogo percorsi: si apre, filtra senza badare agli accenti, scegliere chiude; Esc chiude', async () => {
    const { f, el } = await mount();
    expect(dialog(el)).toBeNull();
    btn(el, 'Cambia / cerca (1)').click();
    f.detectChanges();
    expect(dialog(el)).not.toBeNull();
    expect(el.querySelectorAll('.result').length).toBe(1);
    const q = el.querySelector('input[type=search]') as HTMLInputElement;
    q.value = 'zzz';
    q.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(el.textContent).toContain('Nessun percorso trovato.');
    q.value = 'PÉRCORSO di prova';
    q.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(el.querySelectorAll('.result').length).toBe(1);
    (el.querySelector('.result') as HTMLButtonElement).click();
    f.detectChanges();
    expect(dialog(el)).toBeNull();

    btn(el, 'Cambia / cerca (1)').click();
    f.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(dialog(el)).toBeNull();
  });

  it('eroi: quello da sbloccare è disabilitato con il lucchetto finché non si raggiunge il livello', async () => {
    const { f, el, game } = await mount();
    const elite = el.querySelector('button[aria-label="Scegli Elite"]') as HTMLButtonElement;
    expect(elite.disabled).toBe(true);
    expect(elite.title).toContain('Liv. 3');
    elite.click();
    expect(game.state().selectedCharacterId).toBe('mini-hero');

    game.completeMission(TestBed.inject(ContentRegistryService).missions()[0], { xp: 200 });
    f.detectChanges();
    expect(elite.disabled).toBe(false);
    elite.click();
    f.detectChanges();
    expect(game.state().selectedCharacterId).toBe('mini-elite');
    expect(el.querySelector('section[aria-label=Eroe] strong')!.textContent).toBe('Elite');
  });

  it('catalogo eroi: mostra il livello di sblocco e non permette di scegliere un eroe bloccato', async () => {
    const { f, el } = await mount();
    btn(el, 'Cerca eroi (2)').click();
    f.detectChanges();
    expect(el.querySelectorAll('.result').length).toBe(2);
    expect(el.textContent).toContain('Si sblocca al livello 3');
    const locked = Array.from(el.querySelectorAll<HTMLButtonElement>('.result')).find((b) => b.textContent?.includes('Elite'))!;
    expect(locked.disabled).toBe(true);
  });

  it('entrare in una missione dalla mappa naviga a /missione/:id', async () => {
    const { f } = await mount();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    (f.componentInstance as unknown as { enter(id: string): void }).enter('mini-path-01');
    expect(nav).toHaveBeenCalledWith(['/missione', 'mini-path-01']);
  });
});
