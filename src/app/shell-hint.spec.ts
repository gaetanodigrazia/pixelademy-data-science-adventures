import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MINI_PACK } from './testing/mini-pack';
import { IndexRack } from './shared/components/games/index-rack';

describe('minigiochi: avviso «passo completato»', () => {
  const pack = MINI_PACK;

  function setup(onCleared: () => void) {
    const fixture = TestBed.createComponent(IndexRack);
    const ref = fixture.componentRef as ComponentRef<IndexRack>;
    ref.setInput('character', pack.characters[0]);
    ref.setInput('config', { level: 1, v: [17, 19, 22, 28, 31], k: 3 });
    ref.setInput('onCleared', onCleared);
    fixture.detectChanges();
    return fixture;
  }

  const cells = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('.gm-cell'));

  const dialog = (el: HTMLElement) => el.querySelector('[role=dialog]');
  const close = (el: HTMLElement) => (Array.from(dialog(el)!.querySelectorAll('button')).find((b) => b.textContent?.includes('Continua')) as HTMLButtonElement).click();

  it('dopo ogni passo non finale compare una modale che chiede un\'altra risposta; alla fine no', () => {
    const cleared = vi.fn();
    const f = setup(cleared);
    const el: HTMLElement = f.nativeElement;
    expect(dialog(el)).toBeNull();

    cells(el)[3].click(); // misure[3]
    f.detectChanges();
    expect(dialog(el)!.textContent).toContain('Passo 1 completato');
    expect(dialog(el)!.textContent).toContain('passo 2 di 3');
    expect(dialog(el)!.textContent).toContain('cosa fa adesso questo codice');
    expect(cleared).not.toHaveBeenCalled();
    close(el);
    f.detectChanges();
    expect(dialog(el)).toBeNull();

    cells(el)[1].click(); // sbagliata: nessuna modale
    f.detectChanges();
    expect(dialog(el)).toBeNull();

    cells(el)[0].click(); // misure[0]
    f.detectChanges();
    expect(dialog(el)!.textContent).toContain('Passo 2 completato');
    expect(dialog(el)!.textContent).toContain('passo 3 di 3');
    close(el);
    f.detectChanges();

    cells(el)[4].click(); // misure[-1]: ultimo passo, vince
    f.detectChanges();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(dialog(el)).toBeNull();
  });
});
