import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import axe from 'axe-core';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { GameStateService } from './core/services/game-state.service';
import { PythonRunnerService } from './core/services/python-runner.service';
import { btn, dialogBtn } from './testing/mission-harness';

// Monaco non gira in jsdom: l'editor ripiega sulla textarea (anch'essa da verificare).
vi.mock('monaco-editor/esm/vs/editor/editor.api.js', () => {
  throw new Error('Monaco non disponibile nei test');
});

const path = PACKS[0].paths[0];

/** Esegue axe sulla pagina renderizzata. In jsdom non si può misurare il contrasto (nessun layout): lo copre `contrast.spec.ts`. */
async function audit(el: HTMLElement) {
  const r = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

describe('accessibilità (axe)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const python = TestBed.inject(PythonRunnerService);
    vi.spyOn(python, 'loadRuntime').mockResolvedValue({});
  });

  async function open(url: string) {
    const f = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    document.body.appendChild(f.nativeElement);
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('home: nessuna violazione', async () => {
    const { el } = await open('/');
    expect(await audit(el)).toEqual([]);
  });

  it('home con il catalogo dei percorsi aperto', async () => {
    const { f, el } = await open('/');
    btn(el, 'Cambia / cerca').click();
    f.detectChanges();
    expect(await audit(el)).toEqual([]);
  });

  it('missione: presentazione del progetto, teoria, battaglia e task', async () => {
    const { f, el } = await open(`/missione/${path.missions[0].id}`);
    expect(await audit(el), 'presentazione').toEqual([]);
    dialogBtn(el, 'Comincia').click();
    f.detectChanges();
    expect(await audit(el), 'teoria').toEqual([]);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    expect(await audit(el), 'battaglia').toEqual([]);
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    dialogBtn(el, 'Vai al task').click();
    f.detectChanges();
    await vi.waitFor(() => expect(el.querySelector('textarea')).not.toBeNull(), { timeout: 4000 });
    f.detectChanges();
    expect(await audit(el), 'task').toEqual([]);
  });

  it('Dashboard del progetto: vuota e piena', async () => {
    const empty = await open(`/progetto/${path.id}`);
    expect(await audit(empty.el), 'vuota').toEqual([]);
    empty.f.destroy();
    for (const m of path.missions) TestBed.inject(GameStateService).completeMission(m);
    const full = await open(`/progetto/${path.id}`);
    expect(await audit(full.el), 'piena').toEqual([]);
  });

  it('pagina «Il progetto»', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ count: 3 }) }));
    const { el } = await open('/info');
    expect(await audit(el)).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('modale privacy', async () => {
    const { f, el } = await open('/');
    btn(el, 'Privacy e dati').click();
    f.detectChanges();
    expect(await audit(el)).toEqual([]);
  });
});
