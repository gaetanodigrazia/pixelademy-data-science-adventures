import { TestBed } from '@angular/core/testing';
import { BarChart } from './shared/components/bar-chart';

describe('BarChart', () => {
  function mount(inputs: Record<string, unknown>) {
    const f = TestBed.createComponent(BarChart);
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('disegna una barra per valore, con etichetta numerica e valori arrotondati a 2 decimali', () => {
    const el = mount({ values: [10, 5, 2.345] });
    expect(el.querySelectorAll('rect').length).toBe(3);
    expect(Array.from(el.querySelectorAll('text.val')).map((t) => t.textContent)).toEqual(['10', '5', '2.35']);
    expect(Array.from(el.querySelectorAll('text.cat')).map((t) => t.textContent)).toEqual(['1', '2', '3']);
  });

  it('usa le etichette date e la barra più alta è quella con il valore maggiore', () => {
    const el = mount({ values: [4, 8], labels: ['lun', 'mar'] });
    expect(Array.from(el.querySelectorAll('text.cat')).map((t) => t.textContent)).toEqual(['lun', 'mar']);
    const h = Array.from(el.querySelectorAll('rect')).map((r) => Number(r.getAttribute('height')));
    expect(h[1]).toBeGreaterThan(h[0]);
    expect(h[1] / h[0]).toBeCloseTo(2, 1);
  });

  it('evidenzia le barre indicate e disegna le linee di riferimento con il loro tono', () => {
    const el = mount({ values: [1, 5, 3], marks: { 1: 'bad', 2: 'good' }, refs: [{ value: 3, label: 'media 3', tone: 'good' }, { value: 4, label: 'soglia' }] });
    const cls = Array.from(el.querySelectorAll('rect')).map((r) => r.getAttribute('class'));
    expect(cls).toEqual(['col ', 'col bad', 'col good']);
    const lines = Array.from(el.querySelectorAll('line')).map((l) => l.getAttribute('class'));
    expect(lines).toEqual(['ref good', 'ref accent']);
    expect(Array.from(el.querySelectorAll('text.ref-label')).map((t) => t.textContent)).toEqual(['media 3', 'soglia']);
    // la linea di soglia (4) sta più in alto di quella a 3
    const ys = Array.from(el.querySelectorAll('line')).map((l) => Number(l.getAttribute('y1')));
    expect(ys[1]).toBeLessThan(ys[0]);
  });

  it('ha un\'alternativa testuale per i lettori di schermo', () => {
    expect(mount({ values: [1] }).querySelector('svg')!.getAttribute('aria-label')).toBe('Grafico a barre');
    const el = mount({ values: [1], ariaLabel: 'Temperature: 17, 19' });
    expect(el.querySelector('svg')!.getAttribute('role')).toBe('img');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Temperature: 17, 19');
  });
});
