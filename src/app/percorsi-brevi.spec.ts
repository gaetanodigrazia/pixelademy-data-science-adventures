import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PATH_SEEDS } from './content/adventure-core/curriculum';
import { assembleProject } from './content/adventure-core/project';
import { PACKS } from './core/data/packs.generated';
import { LearningPath } from './core/models/content-pack.model';
import { ProjectIntro } from './shared/components/project-intro';

const seed = PATH_SEEDS[0];

describe('assembleProject: da 1 a 10 missioni', () => {
  it('produce tanti passi quante le missioni, usando i primi concetti', () => {
    for (const n of [1, 3, 10]) {
      const steps = assembleProject({ ...seed, missions: seed.missions.slice(0, n) });
      expect(steps.length).toBe(n);
    }
    const [one] = assembleProject({ ...seed, missions: seed.missions.slice(0, 1) });
    expect(one.concept.topic).toBe('Leggere un valore da una lista');
  });

  it('rifiuta 0 missioni e più di 10 con un errore chiaro', () => {
    expect(() => assembleProject({ ...seed, missions: [] })).toThrow('da 1 a 10');
    const eleven = Array.from({ length: 11 }, () => seed.missions[0]);
    expect(() => assembleProject({ ...seed, missions: eleven })).toThrow('da 1 a 10');
  });
});


describe('presentazione del progetto di un percorso breve', () => {
  const nuvole = PACKS[0].paths[0];
  function intro(path: LearningPath) {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(ProjectIntro);
    fixture.componentRef.setInput('path', path);
    fixture.detectChanges();
    return fixture;
  }

  it('con la Dashboard parla di 3 missioni e mostra solo i 3 riquadri che si possono sbloccare', () => {
    const fixture = intro({ ...nuvole, missions: nuvole.missions.slice(0, 3) });
    const d = fixture.nativeElement as HTMLElement;
    expect(d.textContent).toContain('Le 3 missioni');
    expect(d.textContent).toContain('missione 3');
    expect(d.querySelectorAll('.tiles li').length).toBe(3);
    fixture.destroy();
  });

  it('senza Dashboard (percorsi con esercizi propri) non promette riquadri', () => {
    const path = PACKS[0].paths.find((p) => p.dashboard === false)!;
    const fixture = intro(path);
    const d = fixture.nativeElement as HTMLElement;
    expect(d.textContent).toContain('Le 3 missioni');
    expect(d.querySelectorAll('.tiles li').length).toBe(0);
    expect(d.textContent).not.toContain('La Dashboard');
    fixture.destroy();
  });
});
