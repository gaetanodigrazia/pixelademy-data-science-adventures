import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PACKS } from './core/data/packs.generated';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { PythonRunnerService } from './core/services/python-runner.service';
import { ProjectIntro } from './shared/components/project-intro';
import { ProjectModal } from './shared/components/project-modal';

const path = PACKS[0].paths[0];
const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('presentazione del progetto e della Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function intro(p = path) {
    const f = TestBed.createComponent(ProjectIntro);
    f.componentRef.setInput('path', p);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, d: (f.nativeElement as HTMLElement).querySelector('[role=dialog]')! };
  }

  it('presenta progetto, Dashboard (con i suoi 4 riquadri) e cosa succede alla fine', () => {
    const { d } = intro();
    const t = d.textContent ?? '';
    expect(t).toContain('Il tuo progetto');
    expect(t).toContain('La Dashboard');
    expect(t).toContain('Alla fine');
    expect(t).toContain(`missione ${path.missions.length}`);
    expect(t).not.toContain('badge');
    expect(d.querySelectorAll('.tiles li').length).toBe(4);
    expect(d.querySelector('a[href*="/progetto/"]')).not.toBeNull();
  });

  it('«Comincia» chiude la presentazione', () => {
    const { f, el } = intro();
    const closed = vi.fn();
    f.componentInstance.closed.subscribe(closed);
    btn(el, 'Comincia').click();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('un percorso senza Dashboard non ne parla e non offre l\'anteprima', () => {
    const { d } = intro({ ...path, dashboard: false });
    expect(d.textContent).toContain('Il tuo progetto');
    expect(d.textContent).toContain('bollettino completo');
    expect(d.textContent).not.toContain('Dashboard');
    expect(d.querySelectorAll('.tiles li').length).toBe(0);
    expect(d.querySelector('a[href*="/progetto/"]')).toBeNull();
  });

  it('un percorso breve (3 missioni) mostra solo i riquadri che può accendere', () => {
    const short = { ...path, missions: path.missions.slice(0, 3) };
    expect(intro(short).d.querySelectorAll('.tiles li').length).toBe(3);
  });
});

describe('modale del progetto', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function modal() {
    const f = TestBed.createComponent(ProjectModal);
    f.componentRef.setInput('path', path);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('senza missioni completate invita a iniziare e non mostra codice', () => {
    const { el } = modal();
    expect(el.textContent).toContain(`0/${path.missions.length} sezioni del bollettino`);
    expect(el.textContent).toContain('Completa la prima missione');
    expect(el.querySelector('pre.code')).toBeNull();
    expect(el.querySelectorAll('.pieces li.on').length).toBe(0);
  });

  it('con missioni completate mostra l\'avanzamento e il codice del progetto fino a lì, eseguibile', async () => {
    const reg = TestBed.inject(ContentRegistryService);
    const game = TestBed.inject(GameStateService);
    game.completeMission(path.missions[0]);
    game.completeMission(path.missions[1]);
    const run = vi.spyOn(TestBed.inject(PythonRunnerService), 'run').mockResolvedValue({ output: 'ok\n' });
    const { f, el } = modal();
    expect(el.textContent).toContain('2/10 sezioni');
    expect(el.querySelectorAll('.pieces li.on').length).toBe(2);
    expect(el.querySelector('[role=progressbar]')!.getAttribute('aria-valuenow')).toBe('2');
    const code = el.querySelector('pre.code')!.textContent;
    expect(code).toBe(reg.solution(path.missions[1].id));
    btn(el, 'Esegui il bollettino').click();
    await f.whenStable();
    f.detectChanges();
    expect(run).toHaveBeenCalledWith(code);
    expect(el.querySelector('pre.out')!.textContent).toContain('ok');
  });

  it('usa il codice scritto dall\'utente se coerente con il progetto', () => {
    const game = TestBed.inject(GameStateService);
    const ref = TestBed.inject(ContentRegistryService).solution(path.missions[0].id)!;
    game.completeMission(path.missions[0], { code: ref + '# mio commento\n' });
    expect(modal().el.querySelector('pre.code')!.textContent).toContain('# mio commento');
  });

  it('a progetto completo lo dice', () => {
    const game = TestBed.inject(GameStateService);
    for (const m of path.missions) game.completeMission(m);
    expect(modal().el.textContent).toContain('progetto completo! 🏆');
  });
});
