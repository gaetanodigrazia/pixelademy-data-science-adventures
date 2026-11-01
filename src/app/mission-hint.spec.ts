import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { stripBase } from './core/utils/scoring';
import { btn, dialogBtn, expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

describe('pagina missione: suggerimento e soluzione', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));
  const m1 = path.missions[0];

  async function task() {
    const o = await openMission(m1.id);
    goToTask(o.f);
    return o;
  }

  it('il suggerimento si mostra e si nasconde', async () => {
    const { f, el } = await task();
    expect(el.textContent).not.toContain(m1.hint);
    btn(el, 'Suggerimento').click();
    f.detectChanges();
    expect(el.querySelector('.hintrow')!.textContent).toContain(m1.hint);
    btn(el, 'Nascondi suggerimento').click();
    f.detectChanges();
    expect(el.textContent).not.toContain(m1.hint);
    f.destroy();
  });

  it('la soluzione non si può aprire prima di aver provato; dopo un tentativo sì, ed è la sola sezione della missione', async () => {
    const { f, el } = await task();
    expect(btn(el, 'Confronta con la soluzione')).toBeUndefined();
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x');
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dialogBtn(el, 'OK, mostra la soluzione').click(); // l'avviso chiede conferma prima di aprirla
    f.detectChanges();
    const d = el.querySelector('[role=dialog]')!;
    expect(d.textContent).toContain('Soluzione di questa sezione');
    const reference = TestBed.inject(ContentRegistryService).solution(m1.id)!;
    expect(d.querySelector('pre')!.textContent).toBe(stripBase(reference, m1.projectBase ?? '').trim());
    f.destroy();
  });

  it('aprire la soluzione prima di superare il task azzera gli XP e lo dice nel calcolo', async () => {
    const finish = async (peek: boolean) => {
      ({ run } = setup());
      const { f, el } = await task();
      if (peek) {
        run.mockResolvedValue({ output: 'boh\n' });
        await runCode(f, 'x');
        btn(el, 'Confronta con la soluzione').click();
        f.detectChanges();
        dialogBtn(el, 'OK, mostra la soluzione').click();
        f.detectChanges();
        el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
        f.detectChanges();
      }
      run.mockResolvedValue({ output: expectedOutput(0) });
      await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
      const result = { xp: TestBed.inject(GameStateService).xp(), table: el.querySelector('table.breakdown')?.textContent ?? '' };
      f.destroy();
      return result;
    };
    const clean = await finish(false);
    const peeked = await finish(true);
    expect(clean.table).not.toContain('Soluzione aperta prima');
    expect(peeked.table).toContain('Soluzione aperta prima');
    expect(peeked.table).toContain('×0.00');
    expect(peeked.xp).toBe(0);
    expect(clean.xp).toBeGreaterThan(0);
  });

  it('aprire la soluzione DOPO aver superato il task non toglie XP', async () => {
    const { f, el } = await task();
    const sol = TestBed.inject(ContentRegistryService).solution(m1.id)!;
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, sol);
    const xp = TestBed.inject(GameStateService).xp();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    expect(TestBed.inject(GameStateService).xp()).toBe(xp);
    expect(el.querySelector('table.breakdown')!.textContent).not.toContain('Soluzione aperta prima');
    f.destroy();
  });
});
