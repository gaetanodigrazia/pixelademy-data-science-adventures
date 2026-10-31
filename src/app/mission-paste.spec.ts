import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContentRegistryService } from './core/services/content-registry.service';
import { CodeEditor } from './shared/components/code-editor';
import { expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

describe('pagina missione: anti-incolla', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));
  const m1 = path.missions[0];

  async function solve(pastedChars: number) {
    ({ run } = setup()); // stato nuovo: una missione già completata non dà XP
    const { f, el } = await openMission(m1.id);
    goToTask(f);
    f.debugElement.query(By.directive(CodeEditor)).componentInstance.pasted.emit(pastedChars);
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    const table = el.querySelector('table.breakdown')!.textContent ?? '';
    const total = Number(/Totale(\d+) XP/.exec(table)![1]);
    f.destroy();
    return { table, total };
  }

  it('incollare la soluzione e consegnarla subito riduce gli XP e lo dice nella tabella', async () => {
    const typed = await solve(0);
    const pasted = await solve(300);
    expect(typed.table).not.toContain('incollato');
    expect(pasted.table).toContain('Codice incollato quasi identico alla soluzione');
    expect(pasted.table).toContain('×0.60');
    expect(pasted.total).toBeLessThan(typed.total);
  });
});
