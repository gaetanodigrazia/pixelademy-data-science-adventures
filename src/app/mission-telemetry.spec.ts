import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

describe('pagina missione: statistiche anonime', () => {
  let run: ReturnType<typeof setup>['run'];
  let events: { type: string; mission: string }[];
  beforeEach(() => {
    ({ run } = setup());
    events = [];
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => { events.push(JSON.parse(init.body as string)); return { ok: true }; });
  });
  afterEach(() => vi.unstubAllGlobals());
  const m1 = path.missions[0];
  const optIn = () => { const g = TestBed.inject(GameStateService); g.acceptSaving(); g.setTelemetry(true); };

  it('senza opt-in nessun evento parte, qualunque cosa si faccia', async () => {
    const { f } = await openMission(m1.id);
    goToTask(f);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x');
    f.destroy();
    expect(events).toEqual([]);
  });

  it('con opt-in: un evento per ogni tentativo e uno quando la missione è superata', async () => {
    optIn();
    const { f } = await openMission(m1.id);
    goToTask(f);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x');
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    f.destroy();
    expect(events).toEqual([
      { type: 'attempt', mission: m1.id },
      { type: 'attempt', mission: m1.id },
      { type: 'completed', mission: m1.id },
    ]);
  });

  it('lasciare la pagina dopo un tentativo senza aver superato la missione conta un abbandono; senza tentativi no', async () => {
    optIn();
    const idle = await openMission(m1.id);
    idle.f.destroy();
    expect(events).toEqual([]);

    const { f } = await openMission(m1.id);
    goToTask(f);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x');
    f.destroy();
    expect(events.map((e) => e.type)).toEqual(['attempt', 'abandoned']);
  });

  it('dopo aver superato la missione, uscire non è un abbandono', async () => {
    optIn();
    const { f } = await openMission(m1.id);
    goToTask(f);
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    f.destroy();
    expect(events.map((e) => e.type)).toEqual(['attempt', 'completed']);
  });
});
