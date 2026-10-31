import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MINI_PACK } from './testing/mini-pack';
import { BranchPicker } from './shared/components/games/branch-picker';

const pack = MINI_PACK;
const A = [17, 19, 22, 28, 31, 26, 21]; // media 23,43

function mount(onCleared: () => void, config: Record<string, unknown> = { level: 6, v: A, th: 22, unit: '°C' }) {
  const f = TestBed.createComponent(BranchPicker);
  const ref = f.componentRef as ComponentRef<BranchPicker>;
  ref.setInput('character', pack.characters[0]);
  ref.setInput('config', config);
  ref.setInput('onCleared', onCleared);
  f.detectChanges();
  return f;
}
const tap = (el: HTMLElement, branch: 'ALLARME' | 'OK') => {
  const b = Array.from(el.querySelectorAll<HTMLButtonElement>('[aria-label="Cosa stampa il programma"] button')).find((x) => x.textContent!.includes(branch));
  if (!b) throw new Error(`pulsante ${branch} non trovato`);
  b.click();
};
const msg = (el: HTMLElement) => el.querySelector('footer.msg')?.textContent ?? '';
const query = (el: HTMLElement) => el.querySelector('.gm-query')?.textContent ?? '';

describe('quale ramo scatta? (missione 6)', () => {
  it('prova 5 valori: sopra, sotto, la media vera, uguale alla soglia, appena sopra', () => {
    const cleared = vi.fn();
    const f = mount(cleared);
    const el: HTMLElement = f.nativeElement;
    const seq: [string, 'ALLARME' | 'OK'][] = [['26', 'ALLARME'], ['18', 'OK'], ['23.43', 'ALLARME'], ['22', 'OK'], ['22.01', 'ALLARME']];
    for (const [value, branch] of seq) {
      expect(cleared).not.toHaveBeenCalled();
      expect(query(el)).toContain(`media = ${value} `);
      tap(el, branch);
      f.detectChanges();
    }
    expect(cleared).toHaveBeenCalledTimes(1);
  });

  it('il caso «uguale alla soglia» insegna che > non include l\'uguale', () => {
    const f = mount(vi.fn());
    const el: HTMLElement = f.nativeElement;
    for (const b of ['ALLARME', 'OK', 'ALLARME'] as const) { tap(el, b); f.detectChanges(); }
    expect(query(el)).toContain('media = 22 ');
    tap(el, 'ALLARME'); // sbagliato
    f.detectChanges();
    expect(msg(el)).toContain("l'uguale non basta");
    tap(el, 'OK');
    f.detectChanges();
    expect(msg(el)).toContain('>=');
  });

  it('una risposta sbagliata spiega il confronto e non fa avanzare', () => {
    const f = mount(vi.fn());
    const el: HTMLElement = f.nativeElement;
    tap(el, 'OK'); // media 26 > 22 → ALLARME
    f.detectChanges();
    expect(msg(el)).toContain('26 > 22 → True');
    expect(query(el)).toContain('media = 26 ');
  });

  it('non ripete valori uguali (media vera uguale alla soglia)', () => {
    const f = mount(vi.fn(), { level: 6, v: [20, 22, 24], th: 22 }); // media 22
    const el: HTMLElement = f.nativeElement;
    const seen: string[] = [];
    for (let i = 0; i < 10 && /media = /.test(query(el)); i++) {
      seen.push(query(el).match(/media = ([\d.]+)/)![1]);
      const over = Number(seen[seen.length - 1]) > 22;
      tap(el, over ? 'ALLARME' : 'OK');
      f.detectChanges();
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(4);
  });
});
