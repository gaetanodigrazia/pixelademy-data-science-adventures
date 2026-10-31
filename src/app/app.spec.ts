import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { useMiniPack } from './testing/mini-pack';

describe('App (routing)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  async function open(url: string): Promise<{ el: HTMLElement; router: Router }> {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    useMiniPack();
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, router };
  }

  it('la home mostra il marchio nella navbar e la pagina del percorso', async () => {
    const { el } = await open('/');
    expect(el.querySelector('.brand')?.textContent).toContain('PIXELADEMY');
    expect(el.querySelector('app-dashboard')).not.toBeNull();
  });

  it.each([
    ['/missione/abc', 'app-mission-detail'],
    ['/info', 'app-info'],
    ['/progetto/abc', 'app-project-dashboard'],
  ])('%s apre la pagina corrispondente', async (url, tag) => {
    const { el } = await open(url);
    expect(el.querySelector(tag)).not.toBeNull();
  });

  it('un URL sconosciuto reindirizza alla home', async () => {
    const { el, router } = await open('/non-esiste');
    expect(router.url).toBe('/');
    expect(el.querySelector('app-dashboard')).not.toBeNull();
  });
});
