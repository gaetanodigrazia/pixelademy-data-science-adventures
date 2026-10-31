import { TestBed } from '@angular/core/testing';
import { unlockPaths } from './testing/mission-harness';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { GameStateService } from './core/services/game-state.service';

const path = PACKS[0].paths[0];
const m1 = path.missions[0];

async function open(url: string) {
  const fixture = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  // la presentazione del progetto compare sulla prima missione: la si chiude come farebbe il giocatore
  const start = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Comincia'));
  if (start) { start.click(); fixture.detectChanges(); }
  return { fixture, el };
}
const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('pagina missione: teoria a slide', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    unlockPaths();
  });

  it('parte dalla teoria: titolo, difficoltà, XP, argomento e la prima slide', async () => {
    const { el, fixture } = await open(`/missione/${m1.id}`);
    expect(el.querySelector('h1')!.textContent).toContain(m1.title);
    expect(el.textContent).toContain(`${m1.xp} XP`);
    expect(el.querySelector('[aria-label="Difficoltà 1 su 10"]')).not.toBeNull();
    expect(el.querySelector('section[aria-label=Teoria]')!.textContent).toContain(m1.theory[0].title);
    expect(el.querySelector('ol.steps[aria-label="Fasi della missione"]')).not.toBeNull();
    fixture.destroy();
  });

  it('Avanti/Indietro scorrono le slide; all\'ultima compare «Alla battaglia»', async () => {
    const { el, fixture } = await open(`/missione/${m1.id}`);
    const slide = () => el.querySelector('section[aria-label=Teoria]')!.textContent ?? '';
    expect(btn(el, 'Indietro').disabled).toBe(true);
    for (let i = 1; i < m1.theory.length; i++) {
      btn(el, 'Avanti').click();
      fixture.detectChanges();
      expect(slide()).toContain(m1.theory[i].title);
    }
    expect(btn(el, 'Avanti →')).toBeUndefined();
    expect(btn(el, 'Alla battaglia')).toBeDefined();
    btn(el, 'Indietro').click();
    fixture.detectChanges();
    expect(slide()).toContain(m1.theory[m1.theory.length - 2].title);
    fixture.destroy();
  });

  it('«Salta la teoria» porta alla battaglia, e «↺ Teoria» riparte dalla teoria', async () => {
    const { el, fixture } = await open(`/missione/${m1.id}`);
    btn(el, 'Salta la teoria').click();
    fixture.detectChanges();
    expect(el.querySelector('section[aria-label=Battaglia]')).not.toBeNull();
    expect(el.querySelector('section[aria-label=Teoria]')).toBeNull();
    btn(el, '↺ Teoria').click();
    fixture.detectChanges();
    expect(el.querySelector('section[aria-label=Teoria]')).not.toBeNull();
    fixture.destroy();
  });

  it('una missione bloccata o inesistente non si apre', async () => {
    const { el, fixture } = await open(`/missione/${path.missions[3].id}`);
    expect(el.querySelector('section[aria-label=Teoria]')).toBeNull();
    fixture.destroy();
    const again = await open('/missione/non-esiste');
    expect(again.el.querySelector('section[aria-label=Teoria]')).toBeNull();
    again.fixture.destroy();
    expect(TestBed.inject(GameStateService).isCompleted(path.missions[3].id)).toBe(false);
  });
});
