import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { MissionDetail } from './features/mission-detail/mission-detail';
import { GameStateService } from './core/services/game-state.service';
import { coversProject, projectCode, solutionSoFar } from './core/utils/project-code';
import { composeProject } from './core/utils/project-context';

const pack = PACKS[0];
const path = pack.paths[0];
const sol = (i: number) => pack.solutions[path.missions[i].id];

describe('codice del progetto', () => {
  it('riconosce il codice coerente con il progetto e scarta quello di versioni precedenti', () => {
    expect(coversProject(sol(2), sol(2))).toBe(true);
    expect(coversProject(sol(3), sol(2))).toBe(true); // un progetto più avanzato contiene quello precedente
    expect(coversProject('misure = [12, 35]\nfiltrati = []\nprint(filtrati)\n', sol(2))).toBe(false);
    expect(coversProject('', sol(2))).toBe(false);
  });

  it('usa il codice salvato solo se coerente, altrimenti quello di riferimento', () => {
    expect(projectCode(undefined, sol(1))).toBe(sol(1));
    expect(projectCode('print(1)', sol(1))).toBe(sol(1));
    const mine = sol(1).replace('len(pioggia)', 'len(pioggia) + 0');
    expect(projectCode(mine, sol(1))).toBe(mine);
  });

  it('la soluzione «fino a qui» è il tuo codice con la sezione corrente risolta', () => {
    const m = path.missions[3];
    const mine = sol(2).replace('# 3.', '# 3. (mio)');
    const shown = solutionSoFar(mine, m.projectBase!, sol(3));
    expect(shown.startsWith(mine.trimEnd())).toBe(true);
    expect(shown).toContain('totale += m');
    expect(shown).toContain('# 3. (mio)');
    expect(solutionSoFar('', m.projectBase!, sol(3))).toBe(sol(3));
  });
});

describe('pagina missione: ripartenza del progetto', () => {
  async function open(missionIndex: number, savedPrev?: string) {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const game = TestBed.inject(GameStateService);
    path.missions.slice(0, missionIndex).forEach((m) => game.completeMission(m));
    if (savedPrev !== undefined) {
      const prev = path.missions[missionIndex - 1].id;
      game.state.update((s) => ({ ...s, solvedCode: { ...s.solvedCode, [prev]: savedPrev } }));
    }
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(`/missione/${path.missions[missionIndex].id}`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const inst = fixture.debugElement.query(By.directive(MissionDetail)).componentInstance as {
      phase: { set(v: string): void };
      showAll: { set(v: boolean): void };
      base(): string;
      section(): string;
      sectionSolution(): string;
    };
    /** Il programma che viene eseguito: sezioni precedenti + quella dell'editor. */
    const full = () => composeProject(inst.base(), inst.section());
    return { inst, full, fixture };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('la missione 4 riparte dal progetto di riferimento se il codice salvato è di una versione precedente', async () => {
    const { inst, full } = await open(3, 'misure = [12, 35, 48]\nfiltrati = [48]\nprint(filtrati)\n');
    expect(full()).toContain('pioggia = [0, 2, 5, 0, 1, 7, 3]');
    expect(full()).toContain('# 4.');
    // nell'editor c'è solo la sezione 4: le sezioni precedenti restano nascoste
    expect(inst.section()).toContain('# 4.');
    expect(inst.section()).not.toContain('# 3.');
    expect(inst.section()).not.toContain('pioggia = [');
  });

  it('riparte dal proprio codice quando è coerente con il progetto, senza mostrarlo nell\'editor', async () => {
    const mine = sol(2).replace('# 3.', '# 3. (mio)');
    const { inst, full } = await open(3, mine);
    expect(inst.base()).toContain('# 3. (mio)');
    expect(inst.section()).not.toContain('(mio)');
    expect(full()).toContain('# 3. (mio)');
    expect(full()).toContain('# 4.');
    // la soluzione mostrata è solo quella della sezione
    expect(inst.sectionSolution()).toContain('totale += m');
    expect(inst.sectionSolution()).not.toContain('(mio)');
    expect(inst.sectionSolution()).not.toContain('# 3.');
  });

  it('nel task restano le istruzioni («Cosa fare») e si può aprire tutto il programma', async () => {
    const { inst, fixture } = await open(4); // missione 5: la sezione usa solo `temperature`
    inst.phase.set('task');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('details.brief')?.textContent).toContain('Cosa fare');
    expect(el.querySelector('details.brief p')?.textContent).toContain('media');
    const ctx = el.querySelector('details.ctx')!;
    expect(ctx.textContent).toContain('ti serve: temperature');
    expect(ctx.querySelector('pre')!.textContent!.split('\n').length).toBe(1);

    (ctx.querySelector('button.all') as HTMLButtonElement).click();
    fixture.detectChanges();
    const all = el.querySelector('details.ctx pre')!.textContent ?? '';
    expect(all.split('\n').length).toBeGreaterThan(5);
    expect(all).toContain('# 4.'); // anche le sezioni precedenti
    expect(el.querySelector('details.ctx button.all')!.textContent).toContain('solo ciò che serve');
  });

  it('una missione che non usa codice precedente lo dice, e offre comunque il programma intero', async () => {
    const { inst, fixture } = await open(3); // missione 4: usa `pioggia`; la 3 definisce da sé i dati
    inst.phase.set('task');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('details.ctx button.all')).not.toBeNull();
  });
});
