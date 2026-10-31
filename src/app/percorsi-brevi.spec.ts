import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PATH_SEEDS } from './content/adventure-core/curriculum';
import { assembleProject } from './content/adventure-core/project';
import { PACKS } from './core/data/packs.generated';
import { LearningPath } from './core/models/content-pack.model';
import { drawShareImage, ShareCard, SHARE_W } from './core/utils/share-image';
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


describe('immagine di condivisione con 3 riquadri', () => {
  const card = (title: string): ShareCard => ({ title, stats: [{ label: 'x', text: '1' }], values: [1, 2, 3], labels: [], marks: {}, refs: [] });
  function widths(n: number): number[] {
    const calls: unknown[][] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key: string) => (key === 'measureText' ? (s: string) => ({ width: s.length * 6 }) : (...a: unknown[]) => void (key === 'fillRect' && calls.push(a))),
      set: () => true,
    });
    drawShareImage(ctx as unknown as CanvasRenderingContext2D, {
      heading: 'H', pathTitle: 'P', done: n, total: n, date: null,
      cards: Array.from({ length: n }, (_, i) => card(`C${i}`)),
    });
    // i pannelli dei riquadri: rettangoli larghi almeno 500
    return calls.map((a) => a[2] as number).filter((w) => w > 500 && w < SHARE_W - 40); // esclude lo sfondo e la cornice (>= 1184)
  }

  it('con 4 riquadri sono tutti a mezza larghezza; con 3 l\'ultimo occupa tutta la riga', () => {
    const four = widths(4);
    expect(four.length).toBe(4);
    expect(new Set(four.map((w) => Math.round(w))).size).toBe(1);
    const three = widths(3);
    expect(three.length).toBe(3);
    expect(three.filter((w) => w > 1000).length).toBe(1); // l'ultimo, a tutta larghezza
  });

  it('con 1 e 2 riquadri non si rompe', () => {
    expect(widths(1).length).toBe(1);
    expect(widths(2).length).toBe(2);
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
