import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { scoreAttempt } from './core/utils/scoring';
import { IndexRack } from './shared/components/games/index-rack';
import { Game, mountGame } from './testing/game-harness';
import { btn, dialogBtn, expectedOutput, openMission, path, runCode, setup } from './testing/mission-harness';

const base = { baseXp: 100, difficulty: 1, seconds: 10, errors: 0, code: 'print(1)', reference: 'print(1)', solutionViewed: false };
const m1 = path.missions[0];

describe('XP: gli errori della missione sono quelli della battaglia più quelli del task', () => {
  it('battaglia con 3 errori e task pulito: ×0.70', () => {
    const r = scoreAttempt({ ...base, battleErrors: 3 });
    expect(r.errorFactor).toBeCloseTo(0.7);
    expect(r.battleErrors).toBe(3);
    expect(r.xp).toBe(70);
  });

  it('battaglia pulita e 2 esecuzioni fallite nel task: ×0.80', () => {
    const r = scoreAttempt({ ...base, errors: 2 });
    expect(r.errorFactor).toBeCloseTo(0.8);
    expect(r.battleErrors).toBe(0);
  });

  it('gli errori delle due fasi si sommano, con il minimo di ×0.50', () => {
    expect(scoreAttempt({ ...base, errors: 2, battleErrors: 1 }).errorFactor).toBeCloseTo(0.7);
    expect(scoreAttempt({ ...base, errors: 4, battleErrors: 4 }).errorFactor).toBe(0.5);
    expect(scoreAttempt({ ...base, errors: 20, battleErrors: 20 }).xp).toBe(50);
  });

  it('a parità di tutto il resto, più errori in battaglia = meno XP; senza battaglia (sfide) contano solo quelli del task', () => {
    const xp = (battleErrors?: number) => scoreAttempt({ ...base, battleErrors }).xp;
    expect(xp(0)).toBeGreaterThan(xp(1));
    expect(xp(1)).toBeGreaterThan(xp(4));
    expect(xp(undefined)).toBe(xp(0));
  });

  it('il totale coincide con base × fattori (tempo, errori, somiglianza, soluzione, incolla)', () => {
    const r = scoreAttempt({ ...base, errors: 1, battleErrors: 2, seconds: 200, code: 'print(2)' });
    expect(r.xp).toBe(Math.round(r.baseXp * r.timeFactor * r.errorFactor * r.similarityFactor * r.viewedFactor * r.pasteFactor));
  });
});

describe('i minigiochi comunicano gli errori a onCleared', () => {
  it('win() passa il numero di errori commessi (0 se pulito)', () => {
    const cleared = vi.fn();
    const { g } = mountGame(IndexRack, 0, cleared);
    (g as Game).mistakes.set(3);
    (g as Game).win();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(cleared).toHaveBeenCalledWith({ mistakes: 3 });

    const clean = vi.fn();
    const m = mountGame(IndexRack, 0, clean);
    (m.g as Game).win();
    expect(clean).toHaveBeenCalledWith({ mistakes: 0 });
  });

  it('gli errori veri di una partita (mosse sbagliate) arrivano a onCleared', () => {
    const cleared = vi.fn();
    const { g } = mountGame(IndexRack, 0, cleared);
    for (let i = 0; i < 2; i++) g.pick(g.queries[0].idx === 0 ? 1 : 0); // due mosse sbagliate
    for (const q of [...g.queries]) g.pick(q.idx);
    expect(cleared).toHaveBeenCalledWith({ mistakes: 2 });
  });
});

describe('pagina missione: gli errori della battaglia contano negli XP', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function play(battleMistakes: number, taskFailures = 0) {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const game = f.debugElement.query(By.css('.game-host')).componentInstance as Game;
    game.mistakes.set(battleMistakes);
    game.win();
    f.detectChanges();
    dialogBtn(el, 'Vai al task').click();
    f.detectChanges();
    for (let i = 0; i < taskFailures; i++) {
      run.mockResolvedValue({ output: 'boh\n' });
      await runCode(f, 'x');
    }
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    const table = Array.from(el.querySelectorAll('table.breakdown tr')).map((r) => r.textContent ?? '');
    const total = TestBed.inject(GameStateService).xp();
    return { f, table, total };
  }
  const errorRow = (table: string[]) => table.find((r) => r.startsWith('Errori'))!;

  it('la tabella scompone gli errori («battaglia N + task M») e applica il fattore alla somma', async () => {
    const { f, table } = await play(3, 1);
    expect(errorRow(table)).toBe('Errori (battaglia 3 + task 1)×0.60');
    f.destroy();
  });

  it('con gli stessi errori nel task, più errori in battaglia danno meno XP', async () => {
    const clean = await play(0);
    clean.f.destroy();
    ({ run } = setup());
    const messy = await play(4);
    expect(errorRow(clean.table)).toBe('Errori (battaglia 0 + task 0)×1.00');
    expect(errorRow(messy.table)).toBe('Errori (battaglia 4 + task 0)×0.60');
    expect(messy.total).toBeLessThan(clean.total);
    messy.f.destroy();
  });

  it('ricaricando al task gli errori della battaglia contano ancora (sessione)', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const game = f.debugElement.query(By.css('.game-host')).componentInstance as Game;
    game.mistakes.set(2);
    game.win();
    f.detectChanges();
    expect(JSON.parse(sessionStorage.getItem('pixelademy.battle.v1')!)).toEqual({ [m1.id]: 2 });
    dialogBtn(el, 'Vai al task').click();
    f.destroy();

    // «ricarica»: l'app riparte, sessionStorage resta
    ({ run } = setup());
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [m1.id]: 'task' }));
    sessionStorage.setItem('pixelademy.battle.v1', JSON.stringify({ [m1.id]: 2 }));
    const again = await openMission(m1.id);
    run.mockResolvedValue({ output: expectedOutput(0) });
    await runCode(again.f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    const row = Array.from(again.el.querySelectorAll('table.breakdown tr')).map((r) => r.textContent ?? '').find((r) => r.startsWith('Errori'))!;
    expect(row).toBe('Errori (battaglia 2 + task 0)×0.80');
    again.f.destroy();
  });

  it('dati salvati rovinati o negativi sono ignorati (0 errori)', async () => {
    for (const bad of ['{non json', JSON.stringify({ [m1.id]: 'molti' }), JSON.stringify({ [m1.id]: -5 })]) {
      ({ run } = setup());
      sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [m1.id]: 'task' }));
      sessionStorage.setItem('pixelademy.battle.v1', bad);
      const { f, el } = await openMission(m1.id);
      run.mockResolvedValue({ output: expectedOutput(0) });
      await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
      const row = Array.from(el.querySelectorAll('table.breakdown tr')).map((r) => r.textContent ?? '').find((r) => r.startsWith('Errori'))!;
      expect(row, bad).toBe('Errori (battaglia 0 + task 0)×1.00');
      f.destroy();
    }
  });

  it('una sfida (senza battaglia) conta solo gli errori del task', async () => {
    ({ run } = setup(true));
    const { f, el } = await openMission('challenges-pandas-01');
    run.mockResolvedValue({ output: 'sbagliato\n' });
    await runCode(f, 'x');
    run.mockResolvedValue({ output: '11.83\n' });
    await runCode(f, TestBed.inject(ContentRegistryService).solution('challenges-pandas-01')!);
    const row = Array.from(el.querySelectorAll('table.breakdown tr')).map((r) => r.textContent ?? '').find((r) => r.startsWith('Errori'))!;
    expect(row).toBe('Errori (battaglia 0 + task 1)×0.90');
    f.destroy();
  });
});
