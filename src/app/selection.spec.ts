import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContentPack } from './core/models/content-pack.model';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { Dashboard } from './features/dashboard/dashboard';
import { MINI_PACK } from './testing/mini-pack';

/** Due percorsi con eroi predefiniti diversi, per verificare che scegliere un percorso porti con sé il suo eroe. */
const hero = (id: string, unlockLevel: number) => ({ ...MINI_PACK.characters[0], id, name: id, unlockLevel });
const TWO: ContentPack = {
  ...MINI_PACK,
  characters: [hero('eroe-a', 1), hero('eroe-b', 1), hero('eroe-top', 4)],
  paths: [
    { ...MINI_PACK.paths[0], id: 'p-a', title: 'Percorso A', defaultCharacterId: 'eroe-a', missions: MINI_PACK.paths[0].missions.map((m) => ({ ...m, id: `a-${m.id}`, pathId: 'p-a', prerequisites: [] })) },
    { ...MINI_PACK.paths[0], id: 'p-b', title: 'Percorso B', defaultCharacterId: 'eroe-b', missions: MINI_PACK.paths[0].missions.map((m) => ({ ...m, id: `b-${m.id}`, pathId: 'p-b', prerequisites: [] })) },
  ],
};

describe('selezione di percorso ed eroe', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(ContentRegistryService).packs.set([TWO]);
  });

  async function home() {
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, game: TestBed.inject(GameStateService) };
  }

  it('scegliere un percorso dal catalogo mostra quel percorso con il suo eroe predefinito', async () => {
    const { f, el, game } = await home();
    expect(el.querySelector('h1')!.textContent).toContain('Percorso A');
    expect(game.state().selectedCharacterId).toBe('eroe-a');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Cambia / cerca')) as HTMLButtonElement).click();
    f.detectChanges();
    const b = Array.from(el.querySelectorAll<HTMLButtonElement>('.result')).find((r) => r.textContent?.includes('Percorso B'))!;
    b.click();
    f.detectChanges();
    expect(el.querySelector('h1')!.textContent).toContain('Percorso B');
    expect(game.state().selectedPathId).toBe('p-b');
    expect(game.state().selectedCharacterId).toBe('eroe-b');
    expect(el.querySelector('section[aria-label=Eroe] strong')!.textContent).toBe('eroe-b');
  });

  it('un eroe con livello di sblocco più alto resta bloccato e mostra il livello richiesto', async () => {
    const { el, game } = await home();
    const top = el.querySelector('button[aria-label="Scegli eroe-top"]') as HTMLButtonElement;
    expect(top.disabled).toBe(true);
    expect(top.title).toContain('Liv. 4');
    game.selectCharacter('eroe-top');
    expect(game.state().selectedCharacterId).toBe('eroe-a');
  });

  it('la scelta è salvata solo con consenso e viene ripristinata al ricaricamento', async () => {
    const { f, game } = await home();
    game.acceptSaving();
    game.selectPath('p-b');
    f.detectChanges();
    TestBed.resetTestingModule();
    TestBed.inject(ContentRegistryService).packs.set([TWO]);
    const again = TestBed.inject(GameStateService);
    expect(again.state().selectedPathId).toBe('p-b');
    expect(again.state().selectedCharacterId).toBe('eroe-b');
  });

  it('un percorso inesistente non cambia nulla', async () => {
    const { game } = await home();
    game.selectPath('boh');
    expect(game.state().selectedPathId).toBe('p-a');
  });
});
