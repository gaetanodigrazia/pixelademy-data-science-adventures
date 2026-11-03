import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ComponentRef } from '@angular/core';
import { PACKS } from './core/data/packs.generated';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { bonusSettings } from './core/utils/bonus';
import { PlatformerEngine, WORLD, coinSpecs } from './core/utils/platformer-engine';
import { bonusXpFor, scoreAttempt } from './core/utils/scoring';
import { SCORING } from './core/utils/scoring-config';
import { Platformer } from './shared/components/games/platformer';
import { MINI_PACK } from './testing/mini-pack';
import { btn, dialogBtn, openMission, runCode, setup } from './testing/mission-harness';

const base = { baseXp: 100, difficulty: 1, seconds: 10, errors: 0, code: 'x = 1', reference: 'x = 1', solutionViewed: false };
const cfg = { name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], level: 1 };
const specs = (): ReturnType<typeof coinSpecs> => coinSpecs(cfg, 16);

/** Gioca con un bot: salta solo se la moneta va presa (`good`), oppure come dice `decide`. */
function play(e: PlatformerEngine, decide: (c: { truth: boolean }) => boolean): void {
  while (!e.finished) {
    const c = e.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
    if (c && c.x - WORLD.heroX < 50 && c.x - WORLD.heroX > 30 && decide(c) && e.onGround) e.jump();
    e.step(1 / 60);
  }
}

describe('XP extra del bonus platform: il calcolo', () => {
  it('al massimo il 15% degli XP della missione, in proporzione alla bravura', () => {
    expect(SCORING.bonusMax).toBe(0.15);
    expect(bonusXpFor(100, 1)).toBe(15);
    expect(bonusXpFor(100, 0.5)).toBe(8); // 7,5 → 8
    expect(bonusXpFor(100, 0)).toBe(0);
    expect(bonusXpFor(20, 1)).toBe(3);
    expect(bonusXpFor(100, 5)).toBe(15); // mai oltre il tetto
    expect(bonusXpFor(100, -1)).toBe(0);
    expect(bonusXpFor(100, NaN)).toBe(0);
  });

  it('si somma agli XP del task, senza cambiarne il calcolo', () => {
    const none = scoreAttempt(base);
    const full = scoreAttempt({ ...base, bonusRatio: 1 });
    expect(none.bonusXp).toBe(0);
    expect(none.xp).toBe(none.xpBeforeBonus);
    expect(full.xpBeforeBonus).toBe(none.xp);
    expect(full.bonusXp).toBe(15);
    expect(full.xp).toBe(none.xp + 15);
    expect(scoreAttempt({ ...base, bonusRatio: 0.5 }).xp).toBe(none.xp + 8);
  });

  it('il bonus resta contenuto anche con tutti gli altri fattori: non supera il 15% degli XP base', () => {
    const s = scoreAttempt({ ...base, bonusRatio: 1, errors: 5, seconds: 999 });
    expect(s.bonusXp).toBeLessThanOrEqual(base.baseXp * 0.15);
  });

  it('con la soluzione aperta (XP azzerati) non c\'è premio', () => {
    const s = scoreAttempt({ ...base, solutionViewed: true, bonusRatio: 1 });
    expect(s.bonusXp).toBe(0);
    expect(s.xp).toBe(0);
  });
});

describe('XP extra del bonus platform: la bravura nel gioco', () => {
  it('chi non salta mai non guadagna nulla (e saltare il bonus nemmeno)', () => {
    const e = new PlatformerEngine(specs());
    expect(e.bonusRatio).toBe(0); // appena partito
    play(e, () => false);
    expect(e.score).toBeGreaterThan(0); // evitare le monete sbagliate fa punti…
    expect(e.bonusRatio).toBe(0); // …ma non dà XP: servono le monete giuste prese
  });

  it('chi prende tutte le monete giuste e nessuna sbagliata arriva al massimo', () => {
    const e = new PlatformerEngine(specs());
    play(e, (c) => c.truth);
    expect(e.bonusRatio).toBeGreaterThanOrEqual(0.9);
  });

  it('prendere monete sbagliate toglie dal premio', () => {
    const good = new PlatformerEngine(specs());
    play(good, (c) => c.truth);
    const sloppy = new PlatformerEngine(specs());
    play(sloppy, () => true); // salta per tutte: prende anche le sbagliate
    expect(sloppy.bonusRatio).toBeLessThan(good.bonusRatio);
  });

  it('serve aver incontrato almeno 3 monete giuste', () => {
    const e = new PlatformerEngine(specs());
    for (let i = 0; i < 60; i++) e.step(1 / 60); // 1 secondo: nessuna moneta ancora arrivata
    expect(e.bonusRatio).toBe(0);
  });
});

describe('XP extra del bonus platform: nel gioco', () => {
  type G = { engine: PlatformerEngine; update(dt: number): void; startRun(): void };
  function mount(xp: number | undefined, onCleared: (r?: { mistakes: number; bonusRatio?: number }) => void) {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Platformer);
    const ref = fixture.componentRef as ComponentRef<unknown>;
    ref.setInput('character', MINI_PACK.characters[0]);
    ref.setInput('config', { ...cfg, ...(xp ? { xp } : {}) });
    ref.setInput('onCleared', onCleared);
    fixture.detectChanges();
    return { fixture, g: fixture.componentInstance as unknown as G, el: fixture.nativeElement as HTMLElement };
  }

  it('a fine corsa comunica la bravura a chi ha aperto il bonus', () => {
    let r: { mistakes: number; bonusRatio?: number } | undefined;
    const { fixture, g } = mount(20, (x) => (r = x));
    g.startRun();
    for (let i = 0; i < 16 * 60; i++) {
      const c = g.engine.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
      if (c && c.truth && c.x - WORLD.heroX < 50 && c.x - WORLD.heroX > 30 && g.engine.onGround) g.engine.jump();
      g.update(1 / 60);
    }
    fixture.detectChanges();
    expect(r!.bonusRatio).toBeGreaterThanOrEqual(0.9);
  });

  it('la schermata finale dice quanti XP extra si sono guadagnati (al completamento del task)', () => {
    const { fixture, g, el } = mount(20, () => undefined);
    g.startRun();
    for (let i = 0; i < 16 * 60; i++) {
      const c = g.engine.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
      if (c && c.truth && c.x - WORLD.heroX < 50 && c.x - WORLD.heroX > 30 && g.engine.onGround) g.engine.jump();
      g.update(1 / 60);
    }
    fixture.detectChanges();
    expect(el.querySelector('.end')!.textContent).toMatch(/\+[23] XP extra/);
    expect(el.querySelector('.end')!.textContent).toContain('completi il task');
  });

  it('senza monete prese dice come guadagnarli', () => {
    const { fixture, g, el } = mount(20, () => undefined);
    g.startRun();
    for (let i = 0; i < 16 * 60; i++) g.update(1 / 60); // non salta mai
    fixture.detectChanges();
    expect(el.querySelector('.end')!.textContent).toContain('Prendi più monete giuste per vincere XP extra');
  });
});

describe('XP extra del bonus platform: nella missione', () => {
  const liste = PACKS[0].paths.find((p) => p.id === 'adventure-core-liste')!;
  const m1 = liste.missions[0];
  beforeEach(() => bonusSettings.enabled = true);

  /** Parte da uno stato nuovo con «Le Variabili» completato, così «Le Liste» è aperto e la sua prima missione è ancora da fare (si guadagnano XP). */
  function freshListe() {
    const { run } = setup();
    bonusSettings.enabled = true;
    const game = TestBed.inject(GameStateService);
    game.resetProgress();
    for (const m of PACKS[0].paths.find((p) => p.id === 'adventure-core-variabili')!.missions) game.completeMission(m, { xp: 0 });
    game.selectPath('adventure-core-liste');
    return { run, game };
  }

  /** Arriva al bonus (battaglia senza errori), lo gioca con un bot (`perfect`) o lo salta, poi supera il task. */
  async function playMission(how: 'perfect' | 'skip' | 'solution') {
    const { run, game } = freshListe();
    const xp0 = game.xp();
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    dialogBtn(el, 'Al bonus').click();
    f.detectChanges();
    if (how === 'perfect' || how === 'solution') {
      const g = f.debugElement.query(By.directive(Platformer)).componentInstance as unknown as G2;
      g.startRun();
      for (let i = 0; i < 16 * 60; i++) {
        const c = g.engine.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
        if (c && c.truth && c.x - WORLD.heroX < 50 && c.x - WORLD.heroX > 30 && g.engine.onGround) g.engine.jump();
        g.update(1 / 60);
      }
      f.detectChanges();
      btn(el, 'Vai al task').click();
    } else {
      btn(el, 'Salta il bonus').click();
    }
    f.detectChanges();
    if (how === 'solution') {
      run.mockResolvedValue({ output: 'boh\n' });
      await runCode(f, 'x'); // un tentativo sbagliato: poi compare «Confronta con la soluzione»
      btn(el, 'Confronta con la soluzione').click();
      f.detectChanges();
      dialogBtn(el, 'OK, mostra la soluzione').click();
      f.detectChanges();
      el.querySelector<HTMLButtonElement>('[role=dialog] button[aria-label=Chiudi]')!.click();
      f.detectChanges();
    }
    run.mockResolvedValue({ output: (m1.validation as { expected: string[] }).expected.join('\n') + '\n' });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    return { f, el, gained: game.xp() - xp0, text: el.querySelector('[role=dialog]')?.textContent ?? '' };
  }
  type G2 = { engine: PlatformerEngine; update(dt: number): void; startRun(): void };

  it('giocando bene il bonus si riscuote al task: riga nel riepilogo e XP in più (al massimo il 15%)', async () => {
    const withBonus = await playMission('perfect');
    expect(withBonus.text).toContain('Bonus platform');
    const bonusRow = /Bonus platform \((\d+)%, al massimo il 15%\)\+(\d+)/.exec(withBonus.text)!;
    expect(+bonusRow[1]).toBeGreaterThanOrEqual(90);
    expect(+bonusRow[2]).toBeGreaterThan(0);
    expect(+bonusRow[2]).toBeLessThanOrEqual(Math.round(m1.xp * 0.15));
    withBonus.f.destroy();
    const without = await playMission('skip');
    expect(without.text).not.toContain('Bonus platform');
    expect(withBonus.gained - without.gained).toBe(+bonusRow[2]); // la differenza è proprio il premio
    without.f.destroy();
  });

  it('con la soluzione aperta nessun premio, anche dopo un bonus perfetto', async () => {
    const r = await playMission('solution');
    expect(r.gained).toBe(0);
    expect(r.text).not.toMatch(/Bonus platform \(/);
    r.f.destroy();
  });

  it('il premio si ricorda se si ricarica la pagina tra il bonus e il task', async () => {
    const { run } = freshListe();
    const id = m1.id;
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [id]: 'task' }));
    sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ [id]: true }));
    sessionStorage.setItem('pixelademy.bonusratio.v1', JSON.stringify({ [id]: 1 }));
    const { f, el } = await openMission(id);
    run.mockResolvedValue({ output: (m1.validation as { expected: string[] }).expected.join('\n') + '\n' });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(id)!);
    expect(el.querySelector('[role=dialog]')!.textContent).toMatch(/Bonus platform \(100%/);
    f.destroy();
  });
});
