import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseGame, fmt, list, mean, r2 } from './shared/components/games/base-game';

@Component({ selector: 'app-test-game', template: '' })
class TestGame extends BaseGame {
  playWin() { this.win(); }
  playMiss() { this.miss('no'); }
  order(items: number[], seed: number) { return this.shuffle(items, seed); }
  read() { return { nums: this.nums('v', [9]), n: this.num('k', 5), s: this.str('u', 'x'), lvl: this.level, unit: this.unit }; }
  schedule(fn: () => void) { this.after(fn, 1000); }
  get mistakeCount() { return this.mistakes(); }
}

describe('BaseGame e utilità dei minigiochi', () => {
  afterEach(() => vi.useRealTimers());

  function mount(config: Record<string, unknown> = {}, onCleared = vi.fn()) {
    const f = TestBed.createComponent(TestGame);
    f.componentRef.setInput('config', config);
    f.componentRef.setInput('onCleared', onCleared);
    f.detectChanges();
    return { g: f.componentInstance, onCleared, f };
  }

  it('onCleared è chiamato una sola volta, anche se win() è invocato più volte', () => {
    const { g, onCleared } = mount();
    g.playWin();
    g.playWin();
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it('legge la configurazione con valori di ripiego se mancano o sono di tipo sbagliato', () => {
    expect(mount().g.read()).toEqual({ nums: [9], n: 5, s: 'x', lvl: 1, unit: '' });
    expect(mount({ v: [1, 2], k: 3, u: 'ciao', level: 4, unit: 'mm' }).g.read()).toEqual({ nums: [1, 2], n: 3, s: 'ciao', lvl: 4, unit: 'mm' });
    expect(mount({ v: ['a'], k: 'x', level: -2 }).g.read()).toEqual({ nums: [9], n: 5, s: 'x', lvl: 1, unit: '' });
  });

  it('shuffle è deterministico a parità di seed e dati, ma non cambia gli elementi', () => {
    const { g } = mount();
    const a = g.order([1, 2, 3, 4, 5, 6], 7);
    expect(g.order([1, 2, 3, 4, 5, 6], 7)).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('gli errori si contano; i timer si fermano con la distruzione e con la vittoria', () => {
    vi.useFakeTimers();
    const { g, f } = mount();
    const fn = vi.fn();
    g.playMiss();
    g.playMiss();
    expect(g.mistakeCount).toBe(2);
    g.schedule(fn);
    f.destroy();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('numeri in stile Python: due decimali al massimo, senza zeri superflui', () => {
    expect(r2(1.005 * 100)).toBeCloseTo(100.5, 1);
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(3)).toBe('3');
    expect(list([1, 2.25])).toBe('[1, 2.25]');
    expect(mean([2, 4])).toBe(3);
    expect(mean([])).toBe(0);
  });
});
