import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { ContentRegistryService } from './core/services/content-registry.service';

const path = PACKS[0].paths[0];

async function open(url: string) {
  const fixture = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}
const dialog = (el: HTMLElement) => el.querySelector('[role=dialog]');

describe('presentazione del progetto e della Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('sulla prima missione presenta progetto, Dashboard e cosa succede alla fine', async () => {
    const { fixture, el } = await open(`/missione/${path.missions[0].id}`);
    const d = dialog(el)!;
    expect(d).not.toBeNull();
    const t = d.textContent ?? '';
    expect(t).toContain('Il tuo progetto');
    expect(t).toContain('La Dashboard');
    expect(t).toContain('Alla fine');
    expect(t).toContain(`missione ${path.missions.length}`);
    expect(t).not.toContain('badge');
    expect(d.querySelectorAll('.tiles li').length).toBe(4);
    expect(d.querySelector('a[href*="/progetto/"]')).not.toBeNull();
    fixture.destroy();
  });

  it('si chiude con «Comincia» e non si ripresenta nella stessa sessione', async () => {
    const first = await open(`/missione/${path.missions[0].id}`);
    const btn = Array.from(dialog(first.el)!.querySelectorAll('button')).find((b) => b.textContent?.includes('Comincia')) as HTMLButtonElement;
    btn.click();
    first.fixture.detectChanges();
    expect(dialog(first.el)).toBeNull();
    first.fixture.destroy();

    const again = await open(`/missione/${path.missions[0].id}`);
    expect(dialog(again.el)).toBeNull();
    // il pulsante «Progetto» in testata la riapre
    (Array.from(again.el.querySelectorAll('button')).find((b) => b.textContent?.includes('Progetto')) as HTMLButtonElement).click();
    again.fixture.detectChanges();
    expect(dialog(again.el)?.textContent).toContain('Il tuo progetto');
    again.fixture.destroy();
  });

  it('non compare sulle missioni successive (bloccate o no)', async () => {
    sessionStorage.clear();
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ xp: 0, level: 1, completedMissionIds: [path.missions[0].id], solvedCode: {}, selectedCharacterId: PACKS[0].characters[0].id, selectedPathId: path.id }));
    const { fixture, el } = await open(`/missione/${path.missions[1].id}`);
    expect(dialog(el)).toBeNull();
    fixture.destroy();
  });
});

describe('percorso senza Dashboard (dashboard: false)', () => {
  const noDash = { ...path, dashboard: false };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('il percorso del pack ha la Dashboard attiva di default', () => {
    expect(path.dashboard).toBe(true);
  });

  it('la presentazione non parla di Dashboard e non offre l\'anteprima', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    vi.spyOn(reg, 'path').mockReturnValue(noDash);
    const { fixture, el } = await open(`/missione/${path.missions[0].id}`);
    const d = dialog(el)!;
    expect(d.textContent).toContain('Il tuo progetto');
    expect(d.textContent).toContain('bollettino completo');
    expect(d.textContent).not.toContain('Dashboard');
    expect(d.querySelectorAll('.tiles li').length).toBe(0);
    expect(d.querySelector('a[href*="/progetto/"]')).toBeNull();
    fixture.destroy();
  });

  it('la pagina /progetto/:id non esiste per un percorso senza Dashboard', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    vi.spyOn(reg, 'path').mockReturnValue(noDash);
    const { fixture, el } = await open(`/progetto/${path.id}`);
    expect(el.textContent).toContain('Percorso non trovato');
    fixture.destroy();
  });

  it('nella mappa non compare il pulsante Dashboard', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    vi.spyOn(reg, 'path').mockReturnValue(noDash);
    const { fixture, el } = await open('/');
    expect(Array.from(el.querySelectorAll('a')).some((a) => a.textContent?.includes('Dashboard'))).toBe(false);
    fixture.destroy();
  });

  it('con la Dashboard attiva il pulsante nella mappa c\'è', async () => {
    const { fixture, el } = await open('/');
    expect(Array.from(el.querySelectorAll('a')).some((a) => a.textContent?.includes('Dashboard'))).toBe(true);
    fixture.destroy();
  });
});
