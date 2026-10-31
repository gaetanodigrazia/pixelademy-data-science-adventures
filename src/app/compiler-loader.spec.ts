import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerLoader } from './shared/components/compiler-loader';

type Status = 'idle' | 'loading' | 'ready' | 'error';

describe('compiler-loader', () => {
  afterEach(() => vi.useRealTimers());

  function setup(status: Status) {
    const fixture = TestBed.createComponent(CompilerLoader);
    const ref = fixture.componentRef as ComponentRef<CompilerLoader>;
    ref.setInput('status', status);
    fixture.detectChanges();
    return { fixture, ref, el: fixture.nativeElement as HTMLElement };
  }
  const now = (el: HTMLElement) => Number(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'));

  it('anche se il compilatore è già pronto, la barra resta ~2 s e si riempie', () => {
    vi.useFakeTimers();
    const { fixture, el } = setup('ready');
    expect(el.textContent).toContain('Carico il compilatore');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(now(el)).toBeGreaterThan(30);
    expect(now(el)).toBeLessThan(70);
    vi.advanceTimersByTime(1100);
    fixture.detectChanges();
    expect(now(el)).toBe(100);
    expect(el.textContent).toContain('pronto');
    vi.advanceTimersByTime(800);
    fixture.detectChanges();
    expect(el.querySelector('.loader')).toBeNull();
  });

  it('se il compilatore tarda, resta sotto il 90% finché non è pronto', () => {
    vi.useFakeTimers();
    const { fixture, el } = setup('loading');
    vi.advanceTimersByTime(2000);
    fixture.detectChanges();
    expect(now(el)).toBeGreaterThan(70);
    expect(now(el)).toBeLessThanOrEqual(90);
    vi.advanceTimersByTime(20000);
    fixture.detectChanges();
    expect(now(el)).toBe(90);
    expect(el.textContent).toContain('Carico');
  });

  it('quando il compilatore diventa pronto dopo i 2 s va subito al 100% e scompare', () => {
    vi.useFakeTimers();
    const { fixture, ref, el } = setup('loading');
    vi.advanceTimersByTime(5000);
    ref.setInput('status', 'ready');
    fixture.detectChanges();
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(now(el)).toBe(100);
    vi.advanceTimersByTime(800);
    fixture.detectChanges();
    expect(el.querySelector('.loader')).toBeNull();
  });

  it('la barra non torna mai indietro quando il compilatore diventa pronto a metà corsa', () => {
    vi.useFakeTimers();
    const { fixture, ref, el } = setup('loading');
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    const before = now(el);
    ref.setInput('status', 'ready');
    fixture.detectChanges();
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(now(el)).toBeGreaterThanOrEqual(before);
  });

  it('in caso di errore mostra «Riprova», che emette retry', () => {
    const { fixture, el } = setup('error');
    const spy = vi.fn();
    fixture.componentInstance.retry.subscribe(spy);
    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(btn.textContent).toContain('Riprova');
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
