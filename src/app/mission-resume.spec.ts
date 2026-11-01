import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { PythonRunnerService } from './core/services/python-runner.service';
import { btn, goToTask, openMission, path, runCode, setup, unlockPaths } from './testing/mission-harness';

const [m1, m2] = path.missions;
const section = (el: HTMLElement, label: string) => el.querySelector(`section[aria-label="${label}"]`);

/** Simula il ricaricamento della pagina: l'app riparte da zero, ma sessionStorage e localStorage restano. */
async function reload(id: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const python = TestBed.inject(PythonRunnerService);
  vi.spyOn(python, 'loadRuntime').mockResolvedValue(undefined);
  vi.spyOn(python, 'run').mockResolvedValue({ output: '' });
  unlockPaths(); // dopo il «ricaricamento» lo stato è nuovo: l'Osservatorio richiede Centro Mobilità
  const f = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(`/missione/${id}`);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const start = btn(f.nativeElement, 'Comincia'); // la presentazione compare una volta per sessione
  if (start) { start.click(); f.detectChanges(); }
  return { f, el: f.nativeElement as HTMLElement };
}

describe('pagina missione: testo di vittoria', () => {
  beforeEach(() => setup());

  it('il modale della battaglia vinta dice «Missione completata! Il task Python è sbloccato.»', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const game = f.debugElement.query(By.css('.game-host')).componentInstance;
    game.win();
    f.detectChanges();
    const text = el.querySelector('[role=dialog]')!.textContent!;
    expect(text).toContain('Missione completata! Il task Python è sbloccato.');
    expect(text).not.toContain('sconfitto');
    expect(text).not.toContain('bug');
    f.destroy();
  });
});

describe('pagina missione: ripresa dopo il ricaricamento', () => {
  beforeEach(() => setup());

  it('dal task: ricaricando si resta al task, con il task sbloccato (teoria e battaglia non si rifanno)', async () => {
    const { f } = await openMission(m1.id);
    goToTask(f);
    f.destroy();
    const again = await reload(m1.id);
    expect(section(again.el, 'Task Python')).not.toBeNull();
    expect(section(again.el, 'Teoria')).toBeNull();
    expect(again.el.querySelector('.step.current')!.textContent).toContain('Task');
    again.f.destroy();
  });

  it('dalla battaglia: si resta in battaglia, ma il task non è sbloccato finché non si vince', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    f.destroy();
    const again = await reload(m1.id);
    expect(section(again.el, 'Battaglia')).not.toBeNull();
    expect(btn(again.el, 'Vai al task')).toBeUndefined();
    again.f.destroy();
  });

  it('dalla teoria (partenza) non si salva nulla; «↺ Teoria» azzera la ripresa', async () => {
    const { f, el } = await openMission(m1.id);
    expect(sessionStorage.getItem('pixelademy.phase.v1')).toBeNull();
    goToTask(f);
    expect(JSON.parse(sessionStorage.getItem('pixelademy.phase.v1')!)).toEqual({ [m1.id]: 'task' });
    btn(el, '↺ Teoria').click();
    f.detectChanges();
    expect(JSON.parse(sessionStorage.getItem('pixelademy.phase.v1')!)).toEqual({});
    f.destroy();
    const again = await reload(m1.id);
    expect(section(again.el, 'Teoria')).not.toBeNull();
    again.f.destroy();
  });

  it('ogni missione ricorda la sua fase; una nuova sessione (storage vuoto) riparte dalla teoria', async () => {
    const game = TestBed.inject(GameStateService);
    game.acceptSaving(); // i progressi si salvano: dopo il ricaricamento la missione 2 è ancora sbloccata
    game.completeMission(m1, { code: TestBed.inject(ContentRegistryService).solution(m1.id)! });
    const first = await openMission(m1.id);
    goToTask(first.f);
    first.f.destroy();
    const other = await reload(m2.id); // un'altra missione non ha fase salvata
    expect(section(other.el, 'Teoria')).not.toBeNull();
    other.f.destroy();
    sessionStorage.clear();
    const fresh = await reload(m1.id);
    expect(section(fresh.el, 'Teoria')).not.toBeNull();
    fresh.f.destroy();
  });

  it('dati salvati rovinati o con fasi inventate non rompono la pagina: si parte dalla teoria', async () => {
    for (const bad of ['{non json', '"stringa"', JSON.stringify({ [m1.id]: 'cielo' }), JSON.stringify({ [m1.id]: 42 })]) {
      sessionStorage.setItem('pixelademy.phase.v1', bad);
      const { f, el } = await reload(m1.id);
      expect(section(el, 'Teoria'), bad).not.toBeNull();
      f.destroy();
    }
  });

  it('le sfide (che si aprono sul task) non dipendono dalla fase salvata', async () => {
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ 'challenges-pandas-01': 'battaglia' }));
    const { f, el } = await reload('challenges-pandas-01');
    expect(section(el, 'Task Python')).not.toBeNull();
    f.destroy();
  });
});

describe('pagina missione: scroll del task', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function taskOfMission2() {
    TestBed.inject(GameStateService).completeMission(m1, { code: TestBed.inject(ContentRegistryService).solution(m1.id)! });
    const o = await openMission(m2.id);
    goToTask(o.f);
    return o;
  }
  const panel = (el: HTMLElement) => section(el, 'Task Python')!;

  it('senza programma esteso né errore il riquadro non scorre (layout di prima)', async () => {
    const { f, el } = await taskOfMission2();
    expect(panel(el).classList.contains('scrolls')).toBe(false);
    f.destroy();
  });

  it('«Mostra tutto il programma» abilita lo scroll del riquadro; «Mostra solo ciò che serve» lo toglie', async () => {
    const { f, el } = await taskOfMission2();
    btn(el, 'Mostra tutto il programma').click();
    f.detectChanges();
    expect(panel(el).classList.contains('scrolls')).toBe(true);
    expect(el.querySelector('pre.whole')).not.toBeNull();
    btn(el, 'Mostra solo ciò che serve').click();
    f.detectChanges();
    expect(panel(el).classList.contains('scrolls')).toBe(false);
    f.destroy();
  });

  it('un errore in console abilita lo scroll; con un nuovo tentativo riuscito torna normale', async () => {
    const { f, el } = await taskOfMission2();
    run.mockResolvedValue({ output: '', error: 'NameError: x' });
    await runCode(f, 'x');
    expect(el.querySelector('pre.console.err')).not.toBeNull();
    expect(panel(el).classList.contains('scrolls')).toBe(true);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x = 1');
    expect(el.querySelector('pre.console.err')).toBeNull();
    expect(panel(el).classList.contains('scrolls')).toBe(false);
    f.destroy();
  });

  it('in modalità scroll l\'editor tiene almeno 260 px e a riposo almeno 200 (non si schiaccia fino a sparire)', () => {
    const css = readFileSync('src/app/features/mission-detail/mission-detail.ts', 'utf8');
    const rule = /\.task\.scrolls \.editor \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/flex:\s*1 0 auto/);
    expect(rule).toMatch(/min-height:\s*260px/);
    expect(/\.task\.scrolls \{([^}]*)\}/.exec(css)?.[1]).toMatch(/overflow-y:\s*auto/);
    // a riposo l'editor ha comunque un'altezza minima (a 680 px di schermo era schiacciato a 74; senza la riga di pulsanti sotto ora è 200) e il riquadro scorre se manca spazio
    expect(/\n    \.editor \{([^}]*)\}/.exec(css)?.[1]).toMatch(/min-height:\s*200px/);
    expect(/\n    \.task \{([^}]*)\}/.exec(css)?.[1]).toMatch(/overflow-y:\s*auto/);
  });
});
