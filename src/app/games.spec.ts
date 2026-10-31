import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { r2 } from './shared/components/games/base-game';
import { Game, mountGame } from './testing/game-harness';
import { IndexRack } from './shared/components/games/index-rack';
import { ListBench } from './shared/components/games/list-bench';
// <<IMPORTS>>

interface Case { id: string; index: number; component: Type<unknown>; solve: (g: Game) => void }

/** Gioca ogni gioco come un giocatore esperto: la sequenza di mosse corrette per quel concetto. */
const CASES: Case[] = [
  { id: 'adventure-index-rack', index: 0, component: IndexRack, solve: (g) => { for (const q of [...g.queries]) g.pick(q.idx); } },
  { id: 'adventure-list-bench', index: 1, component: ListBench, solve: (g) => { for (let i = 0; i < 100 && !g.cleared; i++) (g.items().length < g.goal().target ? g.append() : g.pop()); } },
  // <<CASES>>
];

describe('minigiochi: si impara giocando', () => {
  afterEach(() => vi.useRealTimers());

  for (const c of CASES) {
    it(`${c.id}: si vince con le mosse giuste, una sola volta`, () => {
      vi.useFakeTimers();
      const cleared = vi.fn();
      const { fixture, g } = mountGame(c.component, c.index, cleared);
      expect(fixture.nativeElement.textContent).toContain('Obiettivo');
      expect(cleared).not.toHaveBeenCalled();
      c.solve(g);
      fixture.detectChanges();
      expect(cleared).toHaveBeenCalledTimes(1);
      g.win();
      expect(cleared).toHaveBeenCalledTimes(1);
      // i timer del gioco sono ripuliti (non si contano quelli del framework, es. della modale «passo completato»)
      expect(g.timeouts.size + g.intervals.size).toBe(0);
      fixture.destroy();
    });
  }

    it('indici: la cella sbagliata svela gli indici e non avanza', () => {
    const cleared = vi.fn();
    const { fixture, g } = mountGame(IndexRack, 0, cleared);
    g.pick(g.queries[0].idx === 0 ? 1 : 0);
    fixture.detectChanges();
    expect(g.showIdx()).toBe(true);
    expect(g.round()).toBe(0);
    expect(g.mistakes()).toBe(1);
  });

    it('lista: pop() su lista vuota è un IndexError', () => {
    const { g } = mountGame(ListBench, 1);
    g.pop();
    expect(g.mistakes()).toBe(1);
    expect(g.feedback().text).toContain('IndexError');
  });

  // <<EXTRA>>
});
