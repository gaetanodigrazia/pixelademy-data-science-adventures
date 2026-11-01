import { forwardTouchScroll } from './core/utils/touch-scroll';

/** jsdom non ha TouchEvent con `touches`: costruiamo eventi semplici con la proprietà. */
function touch(type: string, x: number, y: number, target: HTMLElement) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & { touches: { clientX: number; clientY: number }[] };
  e.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  target.dispatchEvent(e);
  return e;
}

describe('forwardTouchScroll: da telefono la pagina scorre anche se il dito parte dall\'editor', () => {
  let box: HTMLElement, host: HTMLElement, inner: HTMLElement, seen: string[], off: () => void;

  beforeEach(() => {
    document.body.innerHTML = '<div id="box" style="overflow-y:auto"><div id="host"><div id="inner"></div></div></div>';
    box = document.getElementById('box')!;
    host = document.getElementById('host')!;
    inner = document.getElementById('inner')!;
    Object.defineProperty(box, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(box, 'clientHeight', { value: 300, configurable: true });
    seen = [];
    for (const t of ['touchstart', 'touchmove', 'touchend']) inner.addEventListener(t, () => seen.push(t)); // «Monaco»
    off = forwardTouchScroll(host);
  });
  afterEach(() => off());

  it('un trascinamento verticale scorre il contenitore e non arriva a Monaco', () => {
    touch('touchstart', 100, 200, inner);
    touch('touchmove', 100, 190, inner); // 10px: supera la soglia
    const e = touch('touchmove', 100, 150, inner);
    expect(box.scrollTop).toBe(50); // dito su di 50 px → contenuto giù di 50
    expect(e.defaultPrevented).toBe(true);
    touch('touchend', 0, 0, inner);
    expect(seen).toEqual(['touchstart']); // Monaco vede solo l'inizio, mai i movimenti
  });

  it('un tocco o un movimento minimo restano a Monaco (cursore e tastiera)', () => {
    touch('touchstart', 100, 200, inner);
    const e = touch('touchmove', 101, 203, inner);
    touch('touchend', 0, 0, inner);
    expect(box.scrollTop).toBe(0);
    expect(e.defaultPrevented).toBe(false);
    expect(seen).toEqual(['touchstart', 'touchmove', 'touchend']);
  });

  it('un gesto orizzontale resta a Monaco (selezione, scorrimento di lato)', () => {
    touch('touchstart', 100, 200, inner);
    touch('touchmove', 160, 205, inner);
    touch('touchend', 0, 0, inner);
    expect(box.scrollTop).toBe(0);
    expect(seen).toContain('touchmove');
  });

  it('dopo la rimozione non intercetta più nulla', () => {
    off();
    touch('touchstart', 100, 200, inner);
    touch('touchmove', 100, 100, inner);
    expect(box.scrollTop).toBe(0);
  });
});
