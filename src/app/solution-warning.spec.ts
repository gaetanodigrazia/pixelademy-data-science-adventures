import { TestBed } from '@angular/core/testing';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { MissionService } from './core/services/mission.service';
import { btn, dialogBtn, expectedOutput, goToTask, openMission, path, runCode, setup } from './testing/mission-harness';

const [m1, m2] = path.missions;
const dlg = (el: HTMLElement) => el.querySelector('[role=dialog]');

describe('«Confronta con la soluzione»: avviso e azzeramento degli XP', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function afterAttempt() {
    const o = await openMission(m1.id);
    goToTask(o.f);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(o.f, 'x');
    return o;
  }

  it('prima di aver superato il task compare l\'avviso con «Annulla» e «OK, mostra la soluzione»', async () => {
    const { f, el } = await afterAttempt();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    const d = dlg(el)!;
    expect(d.textContent).toContain('Aprire la soluzione?');
    expect(d.textContent).toContain('Se apri la soluzione gli XP di questa missione saranno azzerati');
    expect(dialogBtn(el, 'Annulla')).toBeDefined();
    expect(dialogBtn(el, 'OK, mostra la soluzione')).toBeDefined();
    expect(d.textContent).not.toContain('Soluzione di questa sezione'); // non si vede ancora
    f.destroy();
  });

  it('«Annulla» o Esc: la soluzione non si apre e gli XP restano intatti', async () => {
    const { f, el } = await afterAttempt();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dialogBtn(el, 'Annulla').click();
    f.detectChanges();
    expect(dlg(el)).toBeNull();
    expect(el.querySelector('.zeroed')).toBeNull();

    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dlg(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(dlg(el)).toBeNull();
    expect(el.querySelector('.zeroed')).toBeNull();

    // gli XP sono ancora ottenibili
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    expect(TestBed.inject(GameStateService).xp()).toBeGreaterThan(0);
    f.destroy();
  });

  it('«OK» apre la soluzione e da quel momento gli XP della missione sono azzerati (e la barra lo dice)', async () => {
    const { f, el } = await afterAttempt();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dialogBtn(el, 'OK, mostra la soluzione').click();
    f.detectChanges();
    expect(dlg(el)!.textContent).toContain('Soluzione di questa sezione');
    expect(dlg(el)!.textContent).not.toContain('Aprire la soluzione?');
    dialogBtn(el, 'Chiudi')?.click();
    el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
    f.detectChanges();
    expect(el.querySelector('.zeroed')!.textContent).toContain('XP di questa missione azzerati');
    f.destroy();
  });

  it('superando il task con la soluzione vista: 0 XP, tabella ×0.00, ma la missione si completa e sblocca la successiva', async () => {
    TestBed.inject(ContentRegistryService); // contenuti reali
    const { f, el } = await afterAttempt();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dialogBtn(el, 'OK, mostra la soluzione').click();
    f.detectChanges();
    el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
    f.detectChanges();
    const game = TestBed.inject(GameStateService);
    const xp = game.xp();
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    const text = dlg(el)!.textContent!;
    expect(text).toContain('Missione completata!');
    expect(text).toContain('0 XP: hai aperto la soluzione prima di superare il task');
    expect(text).not.toMatch(/\+\d+ XP!/);
    expect(text).toContain('Soluzione aperta prima×0.00');
    expect(text).toContain('Totale0 XP');
    expect(text).toContain('Sezione del bollettino aggiunta: 1/10');
    expect(game.xp()).toBe(xp);
    expect(game.isCompleted(m1.id)).toBe(true);
    expect(TestBed.inject(MissionService).status(m2)).toBe('available');
    expect(el.querySelector('.zeroed')).toBeNull(); // superato: l'avviso sparisce
    f.destroy();
  });

  it('dopo la conferma, riaprire la soluzione non chiede più nulla', async () => {
    const { f, el } = await afterAttempt();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    dialogBtn(el, 'OK, mostra la soluzione').click();
    f.detectChanges();
    el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
    f.detectChanges();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    expect(dlg(el)!.textContent).toContain('Soluzione di questa sezione');
    expect(dlg(el)!.textContent).not.toContain('Aprire la soluzione?');
    f.destroy();
  });

  it('dopo aver superato il task la soluzione si apre senza avviso e senza perdere XP', async () => {
    const { f, el } = await afterAttempt();
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
    f.detectChanges();
    const game = TestBed.inject(GameStateService);
    const xp = game.xp();
    expect(xp).toBeGreaterThan(0);
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    expect(dlg(el)!.textContent).toContain('Soluzione di questa sezione');
    expect(dlg(el)!.textContent).not.toContain('Aprire la soluzione?');
    expect(game.xp()).toBe(xp);
    f.destroy();
  });
});

describe('missione già completata in passato', () => {
  it('rigiocandola, la soluzione si apre senza avviso (gli XP erano già stati guadagnati)', async () => {
    const { run } = setup();
    TestBed.inject(GameStateService).completeMission(m1, { xp: 20 });
    const { f, el } = await openMission(m1.id);
    goToTask(f);
    run.mockResolvedValue({ output: 'boh\n' });
    await runCode(f, 'x');
    const xp = TestBed.inject(GameStateService).xp();
    btn(el, 'Confronta con la soluzione').click();
    f.detectChanges();
    expect(dlg(el)!.textContent).toContain('Soluzione di questa sezione');
    expect(dlg(el)!.textContent).not.toContain('Aprire la soluzione?');
    expect(TestBed.inject(GameStateService).xp()).toBe(xp);
    f.destroy();
  });
});

describe('RewardSummary: prima volta', () => {
  it('una missione superata con 0 XP è completata (firstTime) e la seconda volta no', () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    const g = TestBed.inject(GameStateService);
    expect(g.completeMission(m1, { xp: 0 })).toEqual({ gainedXp: 0, newLevel: null, firstTime: true });
    expect(g.isCompleted(m1.id)).toBe(true);
    expect(g.completeMission(m1, { xp: 50 })).toEqual({ gainedXp: 0, newLevel: null, firstTime: false });
    expect(g.xp()).toBe(0);
  });
});
