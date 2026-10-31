import { TestBed } from '@angular/core/testing';
import { GameLoop } from './core/graphics/game-loop';
import { spriteSize } from './core/graphics/sprite';
import { SpriteView } from './shared/components/sprite-view';

const sprite = { palette: { a: '#ff0000', b: '#00ff00' }, pixels: ['a.b', '.a.'] };

describe('sprite', () => {
  it('spriteSize usa la riga più larga e il numero di righe, per la scala', () => {
    expect(spriteSize(sprite, 1)).toEqual({ w: 3, h: 2 });
    expect(spriteSize(sprite, 4)).toEqual({ w: 12, h: 8 });
  });
});

describe('SpriteView', () => {
  function render(scale?: number) {
    const f = TestBed.createComponent(SpriteView);
    f.componentRef.setInput('sprite', sprite);
    if (scale) f.componentRef.setInput('scale', scale);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('disegna un rettangolo per ogni pixel non trasparente, con il colore della palette', () => {
    const rects = Array.from(render().querySelectorAll('rect'));
    expect(rects.length).toBe(3);
    expect(rects.map((r) => r.getAttribute('fill'))).toEqual(['#ff0000', '#00ff00', '#ff0000']);
  });

  it('ha viewBox, dimensioni in pixel e alternativa testuale', () => {
    const svg = render(5).querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 3 2');
    expect(svg.style.width).toBe('15px');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Sprite pixel-art');
  });
});

describe('GameLoop', () => {
  it('chiama update e draw a ogni frame, con dt limitato, e si ferma con stop()', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const dts: number[] = [];
    let draws = 0;
    const loop = new GameLoop((dt) => dts.push(dt), () => draws++);
    loop.start();
    loop.start(); // un secondo start non duplica il ciclo
    expect(callbacks.length).toBe(1);
    callbacks.shift()!(performance.now() + 5000); // tab in background: dt clamp a 0.05 s
    expect(dts).toEqual([0.05]);
    expect(draws).toBe(1);
    loop.stop();
    callbacks.shift()?.(performance.now() + 100);
    expect(draws).toBe(1);
    vi.unstubAllGlobals();
  });
});
