import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MINI_PACK } from './testing/mini-pack';
import { MeanCalc } from './shared/components/games/mean-calc';

const pack = MINI_PACK;
const A = [17, 19, 22, 28, 31, 26, 21]; // somma 164, quantità 7, media 23,428571…

function mount(onCleared: () => void, v = A) {
  const f = TestBed.createComponent(MeanCalc);
  const ref = f.componentRef as ComponentRef<MeanCalc>;
  ref.setInput('character', pack.characters[0]);
  ref.setInput('config', { level: 5, v, unit: '°C' });
  ref.setInput('onCleared', onCleared);
  f.detectChanges();
  return f;
}
const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('[aria-label="Possibili risultati"] button'));
const tap = (el: HTMLElement, text: string) => {
  const b = buttons(el).find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`risposta «${text}» non trovata tra: ${buttons(el).map((x) => x.textContent?.trim()).join(', ')}`);
  b.click();
};
const msg = (el: HTMLElement) => el.querySelector('footer.msg')?.textContent ?? '';

describe('calcolo della media (missione 5)', () => {
  it('si vince in 4 passi: somma, quantità, divisione, arrotondamento; onCleared una volta sola', () => {
    const cleared = vi.fn();
    const f = mount(cleared);
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.gm-query')!.textContent).toContain('sum(misure)');
    for (const answer of ['164', '7', '23.429', '23.43']) {
      expect(cleared).not.toHaveBeenCalled();
      tap(el, answer);
      f.detectChanges();
    }
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('print → 23.43');
  });

  it('ogni passo offre 4 risposte distinte, compresa quella giusta', () => {
    const f = mount(vi.fn());
    const el: HTMLElement = f.nativeElement;
    for (const answer of ['164', '7', '23.429', '23.43']) {
      const texts = buttons(el).map((b) => b.textContent!.trim());
      expect(texts.length).toBe(4);
      expect(new Set(texts).size).toBe(4);
      expect(texts).toContain(answer);
      tap(el, answer);
      f.detectChanges();
    }
  });

  it('le sviste comuni sono spiegate: dividere per n−1, non dividere, non arrotondare', () => {
    const f = mount(vi.fn());
    const el: HTMLElement = f.nativeElement;
    tap(el, '164'); f.detectChanges();
    tap(el, '7'); f.detectChanges();
    // passo 3: media = 164 / 7. Tra le risposte sbagliate: 164 / 6, la somma stessa, …
    const texts = buttons(el).map((b) => b.textContent!.trim());
    const wrong = texts.find((t) => t !== '23.429')!;
    tap(el, wrong); f.detectChanges();
    expect(msg(el).length).toBeGreaterThan(20);
    expect(msg(el)).not.toContain('→ 23.429');
    expect(el.querySelector('.miss')?.textContent ?? el.textContent).toContain('Errori 1');
  });

  it('funziona anche con una media esatta (nessun duplicato tra le risposte)', () => {
    const f = mount(vi.fn(), [10, 20, 30]); // somma 60, quantità 3, media 20
    const el: HTMLElement = f.nativeElement;
    for (const answer of ['60', '3', '20', '20']) {
      const texts = buttons(el).map((b) => b.textContent!.trim());
      expect(new Set(texts).size).toBe(texts.length);
      expect(texts.length).toBe(4);
      tap(el, answer);
      f.detectChanges();
    }
    expect(el.textContent).toContain('print → 20');
  });
});
