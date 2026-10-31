import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { btn, expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

describe('pagina missione: ricompensa e avanzamento', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function complete(index: number) {
    const reg = TestBed.inject(ContentRegistryService);
    const o = await openMission(path.missions[index].id);
    goToTask(o.f);
    run.mockResolvedValue({ output: expectedOutput(index) });
    await runCode(o.f, reg.solution(path.missions[index].id)!);
    return o;
  }
  const dlg = (el: HTMLElement) => el.querySelector('[role=dialog]')!;

  it('superata la missione si apre la ricompensa con XP, calcolo dei fattori e avanzamento del bollettino', async () => {
    const { f, el } = await complete(0);
    const d = dlg(el);
    expect(d.textContent).toContain('Missione completata!');
    expect(d.textContent).toMatch(/\+\d+ XP!/);
    const rows = Array.from(d.querySelectorAll('table.breakdown tr')).map((r) => r.textContent ?? '');
    expect(rows[0]).toContain(`XP della missione${path.missions[0].xp}`);
    expect(rows.some((r) => r.startsWith('Tempo'))).toBe(true);
    expect(rows.some((r) => r.startsWith('Errori (0)'))).toBe(true);
    expect(rows.some((r) => r.startsWith('Vicinanza alla soluzione'))).toBe(true);
    expect(rows.at(-1)).toContain('Totale');
    expect(d.textContent).toContain('Sezione del bollettino aggiunta: 1/10');
    f.destroy();
  });

  it('«Prossima missione →» porta alla missione successiva, ora sbloccata', async () => {
    const { f, el } = await complete(0);
    const next = Array.from(dlg(el).querySelectorAll('a')).find((a) => a.textContent?.includes('Prossima missione'))!;
    expect(next.getAttribute('href')).toBe(`/missione/${path.missions[1].id}`);
    expect(dlg(el).textContent).not.toContain('Progetto completato');
    f.destroy();
  });

  it('«Chiudi» chiude la ricompensa e lascia la pagina del task con l\'esito', async () => {
    const { f, el } = await complete(0);
    btn(dlg(el) as HTMLElement, 'Chiudi').click();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(el.querySelector('.foot [role=status]')!.textContent).toContain('Bollettino corretto');
    f.destroy();
  });

  it('se si sale di livello lo dice', async () => {
    const game = TestBed.inject(GameStateService);
    game.state.update((s) => ({ ...s, xp: 45 }));
    const { f, el } = await complete(0);
    expect(game.level()).toBeGreaterThan(1);
    expect(dlg(el).textContent).toContain(`Sei salito al livello ${game.level()}!`);
    f.destroy();
  });

  it('a progetto completo: «Progetto completato!», Dashboard e «Condividi su LinkedIn», niente missione successiva', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    const game = TestBed.inject(GameStateService);
    for (const m of path.missions.slice(0, 9)) game.completeMission(m, { code: reg.solution(m.id)! });
    const { f, el } = await complete(9);
    const d = dlg(el);
    expect(d.textContent).toContain('Progetto completato!');
    expect(d.textContent).toContain('Sezione del bollettino aggiunta: 10/10');
    expect(Array.from(d.querySelectorAll('a')).some((a) => a.textContent?.includes('Prossima missione'))).toBe(false);
    const share = Array.from(d.querySelectorAll('a')).find((a) => a.textContent?.includes('Condividi su LinkedIn'))!;
    expect(share.getAttribute('href')).toBe(`/progetto/${path.id}?condividi=1`);
    expect(Array.from(d.querySelectorAll('a')).some((a) => a.getAttribute('href') === `/progetto/${path.id}` && a.textContent?.includes('Dashboard'))).toBe(true);
    f.destroy();
  });

  it('rifare una missione già completata non dà altri XP e non mostra il calcolo', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    const game = TestBed.inject(GameStateService);
    game.completeMission(path.missions[0], { code: reg.solution(path.missions[0].id)! });
    const xp = game.xp();
    const { f, el } = await complete(0);
    expect(game.xp()).toBe(xp);
    expect(dlg(el).textContent).not.toContain('Calcolo');
    expect(el.querySelector('table.breakdown')).toBeNull();
    f.destroy();
  });
});
