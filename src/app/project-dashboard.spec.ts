import { TestBed } from '@angular/core/testing';
import { unlockPaths } from './testing/mission-harness';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { GameStateService } from './core/services/game-state.service';

const path = PACKS[0].paths[0];

describe('dashboard del progetto', () => {
  async function open(completed: number) {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    unlockPaths();
    const game = TestBed.inject(GameStateService);
    path.missions.slice(0, completed).forEach((m) => game.completeMission(m));
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(`/progetto/${path.id}`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('senza missioni completate invita a iniziare', async () => {
    const el = await open(0);
    expect(el.textContent).toContain('Nessun risultato ancora');
    expect(el.querySelector('app-bar-chart')).toBeNull();
  });

  it('mostra i risultati prodotti e blocca quelli delle missioni mancanti', async () => {
    const el = await open(4);
    expect(el.textContent).toContain('4/10 sezioni');
    expect(el.textContent).toContain('28 °C'); // missione 1
    expect(el.textContent).toContain('18 mm'); // missione 4: pioggia totale
    expect(el.textContent).toContain('3 su 7'); // missione 3: raffiche sopra soglia
    expect(el.textContent).not.toContain('23.43'); // la media arriva con la missione 5
    expect(el.textContent).toContain('missione 5');
    expect(el.querySelectorAll('app-bar-chart').length).toBe(3); // il registro arriva con la missione 7
    expect(el.textContent).toContain('Completa la missione 7');
  });

  it('con tutte le missioni il progetto è completo e la dashboard è piena', async () => {
    const el = await open(10);
    expect(el.textContent).toContain('progetto completo');
    expect(el.querySelectorAll('app-bar-chart').length).toBe(4);
    expect(el.textContent).toContain('ALLARME');
    expect(el.textContent).toContain('54.67 km/h');
    expect(el.querySelector('.locked-chart')).toBeNull();
    expect(el.querySelectorAll('.stat.locked').length).toBe(0);
  });
});
