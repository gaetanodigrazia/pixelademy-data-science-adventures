import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PACKS } from './core/data/packs.generated';
import { ChallengeRecord } from './core/models/player-state.model';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { Dashboard } from './features/dashboard/dashboard';
import { Leaderboard } from './shared/components/leaderboard';
import { openMission, runCode, setup } from './testing/mission-harness';

const path = PACKS.find((p) => p.id === 'challenges')!.paths[0];
const [c1, c2] = path.missions;
const rec = (xp: number, seconds = 30, errors = 0): ChallengeRecord => ({ xp, seconds, errors, at: 1 });

describe('classifica locale: record per sfida', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('il primo risultato è un record; poi conta solo chi ha più XP o, a parità, meno secondi', () => {
    const g = TestBed.inject(GameStateService);
    expect(g.recordResult(c1.id, rec(30, 40))).toBe(true);
    expect(g.recordResult(c1.id, rec(25, 10))).toBe(false); // meno XP
    expect(g.recordResult(c1.id, rec(30, 40))).toBe(false); // uguale
    expect(g.recordResult(c1.id, rec(30, 20))).toBe(true); // stessi XP, più veloce
    expect(g.recordResult(c1.id, rec(35, 99))).toBe(true); // più XP
    expect(g.state().records[c1.id]).toEqual(rec(35, 99));
  });

  it('si salva con il consenso, si ritrova al ricaricamento e si cancella con i dati', () => {
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    g.recordResult(c1.id, rec(30));
    TestBed.resetTestingModule();
    const again = TestBed.inject(GameStateService);
    expect(again.state().records[c1.id]).toEqual(rec(30));
    again.clearStoredData();
    expect(again.state().records).toEqual({});
  });

  it('record malformati o di sfide inesistenti sono scartati al caricamento e all\'importazione', () => {
    localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({
      schemaVersion: 5, xp: 0,
      records: { [c1.id]: rec(30), fantasma: rec(10), [c2.id]: { xp: 'tanti', seconds: 1, errors: 0, at: 1 }, [path.missions[2].id]: { xp: -5, seconds: 1, errors: 0, at: 1 } },
    }));
    const g = TestBed.inject(GameStateService);
    expect(Object.keys(g.state().records)).toEqual([c1.id]);
  });
});

describe('Leaderboard (componente)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });
  function mount() {
    const f = TestBed.createComponent(Leaderboard);
    f.componentRef.setInput('path', path);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, game: TestBed.inject(GameStateService) };
  }

  it('senza risultati invita a superare una sfida e dice che resta sul dispositivo', () => {
    const { el } = mount();
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).toContain('Nessun risultato ancora');
    expect(el.textContent).toContain('solo sul tuo dispositivo');
  });

  it('elenca i migliori risultati in ordine di XP (a parità, meno secondi) con il totale', () => {
    const { f, el, game } = mount();
    game.recordResult(c1.id, rec(30, 50));
    game.recordResult(c2.id, rec(45, 70, 2));
    game.recordResult(path.missions[2].id, rec(45, 20, 1));
    f.detectChanges();
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => Array.from(r.children).map((c) => c.textContent!.trim()));
    expect(rows).toEqual([
      ['1', path.missions[2].title, '45', '20 s', '1'],
      ['2', c2.title, '45', '70 s', '2'],
      ['3', c1.title, '30', '50 s', '0'],
    ]);
    expect(el.textContent).toContain('120 XP');
    expect(el.querySelector('table')!.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('home: pulsante «Classifica»', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  const btn = (el: HTMLElement, t: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(t)) as HTMLButtonElement;

  async function home(pathId: string) {
    const game = TestBed.inject(GameStateService);
    // i percorsi base (variabili, liste) sbloccano tutti gli altri
    for (const p of TestBed.inject(ContentRegistryService).paths().filter((x) => ['adventure-core-variabili', 'adventure-core-liste'].includes(x.id))) {
      for (const m of p.missions) game.completeMission(m, { xp: 0 });
    }
    game.selectPath(pathId);
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('compare solo nei percorsi di sfide e apre la classifica', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    const normal = await home(reg.paths().find((p) => !p.missions.some((m) => m.challenge))!.id);
    expect(btn(normal.el, 'Classifica')).toBeUndefined();
    normal.f.destroy();
    const { f, el } = await home(path.id);
    btn(el, 'Classifica').click();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')!.textContent).toContain('Classifica locale');
  });
});

describe('pagina sfida: il record', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function solveChallenge1() {
    run.mockResolvedValue({ output: '11.83\n' });
    const { f, el } = await openMission(c1.id);
    await runCode(f, TestBed.inject(ContentRegistryService).solution(c1.id)!);
    return { f, el };
  }
  const dlg = (el: HTMLElement) => el.querySelector('[role=dialog]')!.textContent ?? '';

  it('superare una sfida registra il record e lo dice nella ricompensa', async () => {
    const { f, el } = await solveChallenge1();
    const game = TestBed.inject(GameStateService);
    expect(game.state().records[c1.id]).toMatchObject({ xp: game.xp(), errors: 0 });
    expect(dlg(el)).toMatch(/\d+ XP in \d+ s: nuovo record!/);
    f.destroy();
  });

  it('rigiocare non dà altri XP; un risultato peggiore non cambia il record', async () => {
    const first = await solveChallenge1();
    first.f.destroy();
    const game = TestBed.inject(GameStateService);
    const xp = game.xp();
    const best = game.state().records[c1.id];
    // rigioca con un errore prima: XP più bassi → nessun nuovo record
    const { f, el } = await openMission(c1.id);
    run.mockResolvedValue({ output: 'sbagliato\n' });
    await runCode(f, 'x');
    run.mockResolvedValue({ output: '11.83\n' });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(c1.id)!);
    expect(game.xp()).toBe(xp);
    expect(game.state().records[c1.id]).toEqual(best);
    expect(el.querySelector('[role=dialog]')?.textContent ?? '').not.toContain('nuovo record');
    f.destroy();
  });
});
