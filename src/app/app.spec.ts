import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('mostra la home vuota con il titolo del progetto', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('PIXELADEMY');
  });
});
