import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { CompilerLoader } from './shared/components/compiler-loader';
import { btn, expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

describe('pagina missione: task Python', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));
  const m1 = path.missions[0];
  const m2 = path.missions[1];

  async function task(mission = m1) {
    const o = await openMission(mission.id);
    goToTask(o.f);
    return o;
  }

  it('mostra la consegna, la console vuota, il cronometro e il caricamento del compilatore', async () => {
    const { f, el } = await task();
    expect(el.querySelector('details.brief')!.textContent).toContain(m1.briefing);
    expect(el.querySelector('pre.console')!.textContent).toBe('(nessun output)');
    expect(el.querySelector('[aria-label="Cronometro ed errori"]')!.textContent).toContain('00:00');
    expect(f.debugElement.query(By.directive(CompilerLoader))).not.toBeNull();
    expect(btn(el, 'Confronta con la soluzione')).toBeUndefined();
    f.destroy();
  });

  it('l\'editor parte dalla sezione da scrivere; esegue il programma completo e mostra l\'output', async () => {
    const { f, el } = await task();
    run.mockResolvedValue({ output: 'riga uno\n' });
    await runCode(f, 'x = 1\n');
    expect(run).toHaveBeenCalledWith('x = 1\n');
    expect(el.querySelector('pre.console')!.textContent).toBe('riga uno\n');
    expect(btn(el, 'Confronta con la soluzione')).toBeDefined();
    f.destroy();
  });

  it('un output sbagliato dice quale riga non torna e conta un errore', async () => {
    const { f, el } = await task();
    run.mockResolvedValue({ output: `=== ${path.project!.heading} ===\nTemperatura alle 12: 99\n` });
    await runCode(f, 'x');
    expect(el.querySelector('.foot [role=status]')!.textContent).toContain('La riga 2 del bollettino non è corretta');
    expect(el.querySelector('[aria-label="Cronometro ed errori"]')!.textContent).toContain('✘ 1');
    expect(TestBed.inject(GameStateService).isCompleted(m1.id)).toBe(false);
    f.destroy();
  });

  it('un errore di Python è mostrato in rosso (con role=alert) e conta come errore', async () => {
    const { f, el } = await task();
    run.mockResolvedValue({ output: '', error: 'NameError: name \'x\' is not defined' });
    await runCode(f, 'print(x)');
    expect(el.querySelector('pre.console.err[role=alert]')!.textContent).toContain('NameError');
    expect(el.querySelector('.foot [role=status]')!.textContent).toContain('ha generato un errore');
    f.destroy();
  });

  it('l\'output corretto completa la missione: XP assegnati, codice conservato, missione successiva sbloccata', async () => {
    const { f, el } = await task();
    run.mockResolvedValue({ output: expectedOutput(0) });
    const solution = TestBed.inject(ContentRegistryService).solution(m1.id)!;
    await runCode(f, solution);
    const game = TestBed.inject(GameStateService);
    expect(game.isCompleted(m1.id)).toBe(true);
    expect(game.xp()).toBeGreaterThan(0);
    expect(game.state().solvedCode[m1.id]).toBe(solution);
    expect(el.querySelector('.foot [role=status]')!.textContent).toContain('Bollettino corretto');
    f.destroy();
  });

  it('dalla missione 2 si vede il codice precedente in sola lettura e il programma eseguito è codice precedente + sezione', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    TestBed.inject(GameStateService).completeMission(m1, { code: reg.solution(m1.id)! });
    const { f, el } = await task(m2);
    expect(el.querySelector('details.ctx')).not.toBeNull();
    expect(el.querySelector('details.ctx')!.textContent).toContain('Dal codice precedente');
    btn(el, 'Mostra tutto il programma').click();
    f.detectChanges();
    expect(el.querySelector('pre.whole')!.getAttribute('aria-label')).toContain('sola lettura');
    run.mockResolvedValue({ output: '' });
    await runCode(f, 'conteggio = 1');
    const sent = run.mock.calls[0][0];
    expect(sent.startsWith(m2.projectBase!.trimEnd())).toBe(true);
    expect(sent.endsWith('conteggio = 1')).toBe(true);
    f.destroy();
  });

  it('gli errori di Python citano le righe dell\'editor, non quelle del programma completo', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    TestBed.inject(GameStateService).completeMission(m1, { code: reg.solution(m1.id)! });
    const { f, el } = await task(m2);
    run.mockResolvedValue({ output: '', error: 'File "<exec>", line 99, in <module>' });
    await runCode(f, 'x');
    const base = m2.projectBase!.trimEnd().split('\n').length + 1;
    expect(el.querySelector('pre.console.err')!.textContent).toContain(`line ${99 - base}`);
    f.destroy();
  });
});
