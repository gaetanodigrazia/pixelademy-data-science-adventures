import { TestBed } from '@angular/core/testing';
import { DifficultyStars } from './shared/components/difficulty-stars';

describe('stelle della difficoltà', () => {
  function render(value: number) {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(DifficultyStars);
    f.componentRef.setInput('value', value);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('mostra tante stelle piene quanta è la difficoltà, su 10', () => {
    const el = render(3);
    expect(el.querySelector('.stars')!.textContent).toBe('★★★☆☆☆☆☆☆☆');
  });

  it('ha un tooltip «Difficoltà N su 10», raggiungibile da tastiera e letto dagli screen reader', () => {
    const el = render(7);
    expect(el.querySelector('.tip')!.textContent!.trim()).toBe('Difficoltà 7 su 10');
    const wrap = el.querySelector<HTMLElement>('.wrap')!;
    expect(wrap.getAttribute('tabindex')).toBe('0');
    expect(wrap.getAttribute('aria-label')).toBe('Difficoltà 7 su 10');
    expect(wrap.getAttribute('role')).toBe('img');
  });
});
