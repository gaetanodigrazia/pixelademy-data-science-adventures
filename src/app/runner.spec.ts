import { TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PACKS } from './core/data/packs.generated';
import { Runner, indexObstacles, lenObstacles, obstaclesFor, RunnerConfig } from './shared/components/games/runner';
import { BONUS_CHANCE, BONUS_MAX_ERRORS, bonusEarned, rollBonus } from './core/utils/bonus';
import { MINI_PACK } from './testing/mini-pack';
import { btn, goToTask, openMission, setup } from './testing/mission-harness';

const cfg = (over: Partial<RunnerConfig> = {}): RunnerConfig => ({ kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1, ...over });

describe('Corsa dei condizionali: generazione degli ostacoli', () => {
  it('index: ostacoli veri e falsi in parti uguali (al massimo quanti ne esistono), con la verità calcolata davvero e la spiegazione', () => {
    const obs = indexObstacles(cfg({ count: 8 }));
    expect(obs.length).toBe(8);
    expect(obs.filter((o) => o.truth).length).toBe(4);
    expect(indexObstacles(cfg()).length).toBe(14); // 7 valori × 2 operatori al livello 1: non ce ne sono 18
    for (const o of obs) {
      const m = /^prezzi\[(-?\d+)\] (>|<|>=|<=) 6$/.exec(o.cond)!;
      expect(m, o.cond).not.toBeNull();
      const v = [3, 8, 5, 12, 7, 4, 9];
      const x = v[+m[1] < 0 ? v.length + +m[1] : +m[1]];
      const expected = { '>': x > 6, '<': x < 6, '>=': x >= 6, '<=': x <= 6 }[m[2] as '>' | '<' | '>=' | '<='];
      expect(o.truth).toBe(expected);
      expect(o.why).toContain(String(x));
    }
  });

  it('index: al livello 1 niente indici negativi né >=, <=; dal livello 2 sì', () => {
    expect(indexObstacles(cfg({ level: 1 })).every((o) => !/\[-/.test(o.cond) && !/[<>]=/.test(o.cond))).toBe(true);
    const l2 = indexObstacles(cfg({ level: 2, count: 20 }));
    expect(l2.some((o) => /\[-/.test(o.cond))).toBe(true);
  });

  it('len: la lista cambia con append e pop, mai vuota, e la verità segue len() reale', () => {
    const obs = lenObstacles(cfg({ kind: 'len', name: 'carrello', v: [4, 6, 9, 2, 5], level: 2 }));
    expect(obs.length).toBe(18);
    let state = [4, 6, 9, 2, 5];
    for (const o of obs) {
      const parsed = JSON.parse(o.lines[0].replace(/^carrello = /, ''));
      expect(parsed).toEqual(state); // lo stato mostrato è quello vero
      const ap = /append\((\d+)\)/.exec(o.lines[1]);
      state = ap ? [...state, +ap[1]] : state.slice(0, -1);
      expect(state.length).toBeGreaterThan(0);
      const c = /^len\(carrello\) (>|==) (\d+)$/.exec(o.cond)!;
      expect(c, o.cond).not.toBeNull();
      expect(o.truth).toBe(c[1] === '>' ? state.length > +c[2] : state.length === +c[2]);
    }
    expect(obs.some((o) => o.truth)).toBe(true);
    expect(obs.some((o) => !o.truth)).toBe(true);
  });

  it('è deterministica: stessi dati, stessa corsa', () => {
    expect(JSON.stringify(obstaclesFor(cfg()))).toBe(JSON.stringify(obstaclesFor(cfg())));
    expect(JSON.stringify(obstaclesFor(cfg({ kind: 'len' })))).toBe(JSON.stringify(obstaclesFor(cfg({ kind: 'len' }))));
  });
});

describe('Corsa dei condizionali: il minigioco', () => {
  function mount(config: Record<string, unknown>, onCleared: (r?: { mistakes: number }) => void = () => undefined) {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() { /* niente */ }, removeEventListener() { /* niente */ }, media: q }));
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Runner);
    const ref = fixture.componentRef as ComponentRef<unknown>;
    ref.setInput('character', MINI_PACK.characters[0]);
    ref.setInput('config', config);
    ref.setInput('onCleared', onCleared);
    fixture.detectChanges();
    return { fixture, g: fixture.componentInstance as unknown as { current(): { truth: boolean }; done(): number; obstacles: unknown[] }, el: fixture.nativeElement as HTMLElement };
  }
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('rispondere giusto a tutti gli ostacoli vince senza errori; si prosegue dopo una pausa', () => {
    vi.useFakeTimers();
    let result: { mistakes: number } | undefined;
    const { fixture, g, el } = mount({ kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1 }, (r) => (result = r));
    const total = g.obstacles.length;
    for (let i = 0; i < total; i++) {
      const truth = g.current().truth;
      const [jump, run] = Array.from(el.querySelectorAll<HTMLButtonElement>('.row button'));
      (truth ? jump : run).click();
      fixture.detectChanges();
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
    }
    expect(g.done()).toBe(total);
    expect(result).toEqual({ mistakes: 0 });
    expect(el.textContent).toContain('Traguardo');
  });

  it('una risposta sbagliata è un errore ma non blocca: si passa all\'ostacolo dopo', () => {
    vi.useFakeTimers();
    let result: { mistakes: number } | undefined;
    const { fixture, g, el } = mount({ kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1, count: 3 }, (r) => (result = r));
    for (let i = 0; i < 3; i++) {
      const truth = g.current().truth;
      const [jump, run] = Array.from(el.querySelectorAll<HTMLButtonElement>('.row button'));
      (truth ? run : jump).click(); // sempre sbagliata
      fixture.detectChanges();
      expect(el.querySelector('.msg')!.textContent).toMatch(/Andava (saltata|corsa)/);
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
    }
    expect(result).toEqual({ mistakes: 3 });
  });

  it('con «riduci movimento» non c\'è limite di tempo', () => {
    vi.useFakeTimers();
    const { fixture, g, el } = mount({ kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1 });
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(g.done()).toBe(0);
    expect(el.textContent).toContain('Nessun limite di tempo');
  });

  it('da tastiera: ↑ salta e → corre', () => {
    vi.useFakeTimers();
    const { fixture, g } = mount({ kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1, count: 3 });
    const truth = g.current().truth;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: truth ? 'ArrowUp' : 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.msg').textContent).toContain('Giusto');
  });
});

describe('Le Liste: la corsa bonus tra battaglia e task', () => {
  const liste = PACKS[0].paths.find((p) => p.id === 'adventure-core-liste')!;
  beforeEach(() => { vi.stubGlobal('matchMedia', undefined); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('le tre missioni hanno il bonus, le altre del pack no', () => {
    expect(liste.missions.every((m) => m.bonus?.type === 'adventure-runner')).toBe(true);
    expect(liste.missions.map((m) => (m.bonus!.config as { kind: string }).kind)).toEqual(['index', 'len', 'len']);
    const others = PACKS.flatMap((p) => p.paths).filter((p) => p.id !== liste.id).flatMap((p) => p.missions);
    expect(others.some((m) => m.bonus)).toBe(false);
  });

  it('dopo una buona battaglia (e il sorteggio) si va alla corsa; «Salta il bonus» porta al task', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // il bonus compare
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    expect(el.querySelector('.steps')!.textContent).not.toContain('Bonus'); // prima della battaglia non c'è
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')!.textContent).toContain('Bonus sbloccato');
    expect(el.querySelector('.steps')!.textContent).toContain('Bonus');
    (Array.from(el.querySelector('[role=dialog]')!.querySelectorAll('button')).find((b) => b.textContent?.includes('Al bonus')) as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Corsa bonus"]')).not.toBeNull();
    expect(el.querySelector('section[aria-label="Task Python"]')).toBeNull();
    expect(btn(el, 'Salta il bonus')).toBeDefined();
    btn(el, 'Salta il bonus').click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('sorteggio sfavorevole: nessun bonus, si va dritti al task', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    const d = el.querySelector('[role=dialog]')!;
    expect(d.textContent).not.toContain('Bonus sbloccato');
    expect(d.textContent).not.toContain('al massimo'); // ha giocato bene: nessun suggerimento
    expect(el.querySelector('.steps')!.textContent).not.toContain('Bonus');
    (Array.from(d.querySelectorAll('button')).find((b) => b.textContent?.includes('Vai al task')) as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('troppi errori in battaglia: niente bonus, anche col sorteggio favorevole, e il messaggio spiega come sbloccarlo', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const g = f.debugElement.query(By.css('.game-host')).componentInstance;
    for (let i = 0; i < 3; i++) g.miss('x');
    g.win();
    f.detectChanges();
    const d = el.querySelector('[role=dialog]')!;
    expect(d.textContent).not.toContain('Bonus sbloccato');
    expect(d.textContent).toContain('al massimo 1 errore');
    f.destroy();
  });

  it('il sorteggio non si ripete ricaricando la pagina', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    setup();
    const id = liste.missions[0].id;
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [id]: 'task' }));
    sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ [id]: true }));
    const { f, el } = await openMission(id);
    expect(el.querySelector('.steps')!.textContent).toContain('Bonus');
    f.destroy();
  });

  it('ricaricando durante la corsa si resta lì, e con la battaglia vinta (task sbloccato)', async () => {
    setup();
    const id = liste.missions[0].id;
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [id]: 'corsa' }));
    const { f, el } = await openMission(id);
    expect(el.querySelector('section[aria-label="Corsa bonus"]')).not.toBeNull();
    f.destroy();
  });

  it('una fase «corsa» salvata per una missione senza bonus ripiega sul task', async () => {
    setup();
    const m = PACKS[0].paths.find((p) => p.id === 'adventure-core-mobilita')!.missions[0];
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [m.id]: 'corsa' }));
    const { f, el } = await openMission(m.id);
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('il harness dei test attraversa il bonus (goToTask)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    goToTask(f);
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });
});

describe('sblocco del bonus', () => {
  it('serve una battaglia con al massimo 1 errore', () => {
    expect(BONUS_MAX_ERRORS).toBe(1);
    expect(bonusEarned(0)).toBe(true);
    expect(bonusEarned(1)).toBe(true);
    expect(bonusEarned(2)).toBe(false);
  });

  it('chi se l\'è guadagnato lo vede a caso (50%); chi no, mai', () => {
    expect(BONUS_CHANCE).toBe(0.5);
    expect(rollBonus(0, () => 0.49)).toBe(true);
    expect(rollBonus(0, () => 0.5)).toBe(false);
    expect(rollBonus(1, () => 0)).toBe(true);
    expect(rollBonus(2, () => 0)).toBe(false); // mai, qualunque sia il sorteggio
  });

  it('su molti sorteggi compare circa una volta su due', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const n = Array.from({ length: 2000 }, () => rollBonus(0, rnd)).filter(Boolean).length;
    expect(n).toBeGreaterThan(900);
    expect(n).toBeLessThan(1100);
  });
});
