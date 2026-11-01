import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PATH_SEEDS } from './content/adventure-core/curriculum';
import { PACKS } from './core/data/packs.generated';
import { LearningPath } from './core/models/content-pack.model';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { MissionService } from './core/services/mission.service';
import { PythonRunnerService } from './core/services/python-runner.service';
import { byDependency, firstUnlocked, isPathUnlocked, missingRequirements, newlyUnlocked, pathCompleted } from './core/utils/path-lock';
import { btn } from './testing/mission-harness';
import { CodeEditor } from './shared/components/code-editor';
import { By } from '@angular/platform-browser';

const paths = PACKS.flatMap((p) => p.paths);
const mobilita = paths.find((p) => p.id === 'adventure-core-mobilita')!;
const nuvole = paths.find((p) => p.id === 'adventure-core-nuvole')!;
const variabili = paths.find((p) => p.id === 'adventure-core-variabili')!;
const liste = paths.find((p) => p.id === 'adventure-core-liste')!;

const mk = (id: string, n: number, requires?: string[]): LearningPath => ({ id, title: id, description: '', icon: '', tags: [], requires, missions: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i}` }) as never) });
const done = (...ids: string[]) => new Set(ids);

describe('path-lock (funzioni pure)', () => {
  const a = mk('a', 2);
  const b = mk('b', 2, ['a']);
  const c = mk('c', 1, ['a', 'b']);
  const all = [b, c, a];

  it('un percorso è sbloccato quando tutte le missioni dei percorsi richiesti sono completate', () => {
    expect(missingRequirements(b, all, done()).map((p) => p.id)).toEqual(['a']);
    expect(missingRequirements(b, all, done('a-0')).map((p) => p.id)).toEqual(['a']); // a metà non basta
    expect(isPathUnlocked(b, all, done('a-0', 'a-1'))).toBe(true);
    expect(missingRequirements(c, all, done('a-0', 'a-1')).map((p) => p.id)).toEqual(['b']); // più requisiti: tutti
    expect(isPathUnlocked(a, all, done())).toBe(true); // senza requisiti
  });

  it('chi ha già progressi in un percorso non lo perde, anche se i requisiti non sono soddisfatti', () => {
    expect(isPathUnlocked(b, all, done('b-0'))).toBe(true);
  });

  it('un requisito che non esiste nei contenuti, o un percorso vuoto, non blocca per sempre', () => {
    expect(isPathUnlocked(mk('x', 1, ['non-esiste']), all, done())).toBe(true);
    expect(pathCompleted(mk('v', 0), done())).toBe(false);
    expect(pathCompleted(a, done('a-0', 'a-1'))).toBe(true);
  });

  it('firstUnlocked: il primo sbloccato nell\'ordine dei percorsi (anche se il primo è bloccato)', () => {
    expect(firstUnlocked(all, done())!.id).toBe('a');
    expect(firstUnlocked([b, a], done())!.id).toBe('a');
    expect(firstUnlocked([], done())).toBeUndefined();
  });

  it('newlyUnlocked: solo i percorsi che questa missione sblocca, e solo la prima volta', () => {
    expect(newlyUnlocked(all, done('a-0'), 'a-0').map((p) => p.id)).toEqual([]);
    expect(newlyUnlocked(all, done('a-0', 'a-1'), 'a-1').map((p) => p.id)).toEqual(['b']);
    expect(newlyUnlocked(all, done('a-0', 'a-1', 'b-0', 'b-1'), 'b-1').map((p) => p.id)).toEqual(['c']);
  });
});

describe('contenuti: percorsi base (Variabili, Liste) e Osservatorio dopo Centro Mobilità', () => {
  it('Le Variabili non richiedono nulla, Le Liste richiedono Le Variabili, tutti gli altri richiedono i due percorsi base', () => {
    expect(variabili.requires ?? []).toEqual([]);
    expect(liste.requires).toEqual([variabili.id]);
    for (const p of paths.filter((x) => ![variabili.id, liste.id].includes(x.id))) {
      expect(p.requires, p.id).toEqual(expect.arrayContaining([variabili.id, liste.id]));
    }
  });

  it('il seed dell\'Osservatorio richiede anche Centro Mobilità e il pack lo traduce in id di percorso', () => {
    expect(PATH_SEEDS.find((s) => s.slug === 'nuvole')!.requires).toEqual(['variabili', 'liste', 'mobilita']);
    expect(nuvole.requires).toEqual([variabili.id, liste.id, mobilita.id]);
    expect(paths.filter((p) => ![nuvole.id, variabili.id, liste.id].includes(p.id)).every((p) => p.requires?.join() === `${variabili.id},${liste.id}`)).toBe(true);
  });

  it('i percorsi base hanno missioni, e il catalogo li ordina prima degli altri', () => {
    expect(variabili.missions.length).toBe(3);
    expect(liste.missions.length).toBe(3);
    const order = byDependency(paths).map((p) => p.id);
    expect(order.slice(0, 2)).toEqual([variabili.id, liste.id]);
    expect(order.indexOf(nuvole.id)).toBeGreaterThan(order.indexOf(mobilita.id));
  });

  it('tutti i requisiti esistono e non ci sono cicli (nessun percorso si blocca da solo)', () => {
    for (const p of paths) for (const r of p.requires ?? []) expect(paths.some((x) => x.id === r), `${p.id} → ${r}`).toBe(true);
    for (const p of paths) expect(isPathUnlocked(p, paths, new Set()) || (p.requires ?? []).length > 0).toBe(true);
    expect(firstUnlocked(paths, new Set())!.id).toBe(variabili.id);
  });
});

describe('stato e missioni', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });
  const finish = (g: GameStateService, p: LearningPath) => p.missions.forEach((m) => g.completeMission(m, { xp: 0 }));
  const finishBase = (g: GameStateService) => { finish(g, variabili); finish(g, liste); };

  it('un giocatore nuovo parte da Le Variabili, non dall\'Osservatorio', () => {
    const g = TestBed.inject(GameStateService);
    expect(g.state().selectedPathId).toBe(variabili.id);
    expect(g.state().selectedCharacterId).toBe(variabili.defaultCharacterId);
  });

  it('senza i percorsi base nessun altro percorso si può scegliere; Le Liste si apre dopo Le Variabili', () => {
    const g = TestBed.inject(GameStateService);
    const ms = TestBed.inject(MissionService);
    for (const p of [liste, mobilita, nuvole]) {
      g.selectPath(p.id);
      expect(g.state().selectedPathId, p.id).toBe(variabili.id);
      expect(ms.status(p.missions[0]), p.id).toBe('locked');
    }
    finish(g, variabili);
    expect(ms.status(liste.missions[0])).toBe('available');
    expect(ms.status(mobilita.missions[0])).toBe('locked'); // serve anche Le Liste
    finish(g, liste);
    expect(ms.status(mobilita.missions[0])).toBe('available');
    g.selectPath(mobilita.id);
    expect(g.state().selectedPathId).toBe(mobilita.id);
  });

  it('l\'Osservatorio non si può scegliere finché Centro Mobilità non è completo', () => {
    const g = TestBed.inject(GameStateService);
    finishBase(g);
    g.selectPath(nuvole.id);
    expect(g.state().selectedPathId).toBe(variabili.id);
    g.completeMission(mobilita.missions[0], { xp: 0 });
    g.selectPath(nuvole.id);
    expect(g.state().selectedPathId).not.toBe(nuvole.id); // 1 missione su 3: non basta
    finish(g, mobilita);
    g.selectPath(nuvole.id);
    expect(g.state().selectedPathId).toBe(nuvole.id);
  });

  it('le missioni dell\'Osservatorio sono bloccate, poi la prima si apre e le altre seguono in sequenza', () => {
    const g = TestBed.inject(GameStateService);
    const ms = TestBed.inject(MissionService);
    expect(ms.status(nuvole.missions[0])).toBe('locked');
    expect(ms.pathUnlocked(nuvole)).toBe(false);
    expect(ms.missingFor(nuvole).map((p) => p.title)).toEqual(['Le Variabili', 'Le Liste', 'Centro Mobilità']);
    finishBase(g);
    expect(ms.missingFor(nuvole).map((p) => p.title)).toEqual(['Centro Mobilità']);
    finish(g, mobilita);
    expect(ms.status(nuvole.missions[0])).toBe('available');
    expect(ms.status(nuvole.missions[1])).toBe('locked');
    g.completeMission(nuvole.missions[0], { xp: 0 });
    expect(ms.status(nuvole.missions[0])).toBe('completed');
    expect(ms.status(nuvole.missions[1])).toBe('available');
    expect(ms.missingFor(nuvole)).toEqual([]);
  });

  it('chi aveva già completato missioni dell\'Osservatorio lo trova ancora sbloccato (e selezionato)', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 20, completedMissionIds: [nuvole.missions[0].id], selectedPathId: nuvole.id }));
    const g = TestBed.inject(GameStateService);
    expect(g.state().selectedPathId).toBe(nuvole.id);
    expect(TestBed.inject(MissionService).status(nuvole.missions[1])).toBe('available');
  });

  it('uno stato salvato con l\'Osservatorio scelto ma bloccato passa al primo percorso sbloccato', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 0, completedMissionIds: [], selectedPathId: nuvole.id }));
    expect(TestBed.inject(GameStateService).state().selectedPathId).toBe(variabili.id);
  });

  it('con un requisito che non esiste nei contenuti il percorso non resta bloccato', () => {
    const reg = TestBed.inject(ContentRegistryService);
    reg.packs.set([{ ...PACKS[0], paths: [{ ...nuvole, requires: ['fantasma'] }] }]);
    expect(TestBed.inject(MissionService).status(nuvole.missions[0])).toBe('available');
  });
});

describe('pagine', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const python = TestBed.inject(PythonRunnerService);
    vi.spyOn(python, 'loadRuntime').mockResolvedValue(undefined);
  });

  async function go(url: string) {
    const f = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, router: TestBed.inject(Router) };
  }

  it('catalogo: l\'Osservatorio è disabilitato con il lucchetto e il motivo; scegliere non fa nulla', async () => {
    const { f, el } = await go('/');
    btn(el, 'Cambia / cerca').click();
    f.detectChanges();
    const results = Array.from(el.querySelectorAll<HTMLButtonElement>('.result'));
    const title = (r: HTMLElement) => r.querySelector('strong')?.textContent;
    const obs = results.find((r) => r.textContent?.includes('Osservatorio delle Nuvole'))!;
    expect(obs.disabled).toBe(true);
    expect(obs.textContent).toContain('Le Variabili');
    expect(obs.textContent).toContain('Le Liste');
    expect(obs.textContent).toContain('Centro Mobilità');
    expect(title(results[0])).toBe('Le Variabili'); // i base per primi
    expect(results[0].disabled).toBe(false);
    expect(results.find((r) => title(r) === 'Centro Mobilità')!.disabled).toBe(true); // bloccato dai percorsi base
    expect(results.find((r) => title(r) === 'Le Liste')!.disabled).toBe(true);
    obs.click();
    expect(TestBed.inject(GameStateService).state().selectedPathId).toBe(variabili.id);
    f.destroy();
  });

  it('catalogo: completato Centro Mobilità, l\'Osservatorio si può scegliere', async () => {
    const g = TestBed.inject(GameStateService);
    for (const p of [variabili, liste, mobilita]) p.missions.forEach((m) => g.completeMission(m, { xp: 0 }));
    const { f, el } = await go('/');
    btn(el, 'Cambia / cerca').click();
    f.detectChanges();
    const obs = Array.from(el.querySelectorAll<HTMLButtonElement>('.result')).find((r) => r.textContent?.includes('Osservatorio delle Nuvole'))!;
    expect(obs.disabled).toBe(false);
    expect(obs.textContent).not.toContain('Completa');
    obs.click();
    f.detectChanges();
    expect(g.state().selectedPathId).toBe(nuvole.id);
    f.destroy();
  });

  it('un indirizzo di una missione dell\'Osservatorio bloccata rimanda alla home; la sua Dashboard non esiste', async () => {
    const a = await go(`/missione/${nuvole.missions[0].id}`);
    expect(a.router.url).toBe('/');
    a.f.destroy();
    const b = await go(`/progetto/${nuvole.id}`);
    expect(b.el.textContent).toContain('Percorso non trovato');
    b.f.destroy();
  });

  it('completando l\'ultima missione di Centro Mobilità la ricompensa annuncia lo sblocco; le prime no', async () => {
    const python = TestBed.inject(PythonRunnerService);
    const run = vi.spyOn(python, 'run');
    const solution = (m: LearningPath['missions'][number]) => TestBed.inject(ContentRegistryService).solution(m.id)!;
    const out = (m: LearningPath['missions'][number]) => (m.validation as { expected: string[] }).expected.join('\n') + '\n';
    const g = TestBed.inject(GameStateService);
    for (const p of [variabili, liste]) p.missions.forEach((m) => g.completeMission(m, { xp: 0 }));
    let last = '';
    for (const [i, m] of mobilita.missions.entries()) {
      const { f, el } = await go(`/missione/${m.id}`);
      const start = btn(el, 'Comincia');
      if (start) { start.click(); f.detectChanges(); }
      g.completeMission(mobilita.missions[Math.max(0, i - 1)], { xp: 0 }); // il percorso è in corso (già completata se i = 0 non serve)
      btn(el, 'Salta la teoria').click();
      f.detectChanges();
      f.debugElement.query(By.css('.game-host')).componentInstance.win();
      f.detectChanges();
      (Array.from(el.querySelector('[role=dialog]')!.querySelectorAll('button')).find((b) => b.textContent?.includes('Vai al task')) as HTMLButtonElement).click();
      f.detectChanges();
      run.mockResolvedValue({ output: out(m) });
      f.debugElement.query(By.directive(CodeEditor)).componentInstance.runCode.emit(solution(m));
      await f.whenStable();
      f.detectChanges();
      last = el.querySelector('[role=dialog]')?.textContent ?? '';
      if (i < mobilita.missions.length - 1) expect(last, `missione ${i + 1}`).not.toContain('Percorso sbloccato');
      f.destroy();
    }
    expect(last).toContain('🔓 Percorso sbloccato: Osservatorio delle Nuvole');
    expect(TestBed.inject(MissionService).status(nuvole.missions[0])).toBe('available');
  });
});

