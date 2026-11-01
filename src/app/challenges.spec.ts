import { execFileSync } from 'node:child_process';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { PACKS } from './core/data/packs.generated';
import { btn, openMission, runCode, setup } from './testing/mission-harness';

const pack = PACKS.find((p) => p.id === 'challenges')!;
const path = pack.paths[0];

describe('sfide in stile Kaggle (pandas)', () => {
  it('il pack è registrato: un percorso senza Dashboard, 3 sfide in difficoltà crescente, ognuna con dataset e soluzione', () => {
    expect(pack).toBeDefined();
    expect(path.dashboard).toBe(false);
    expect(path.missions.map((m) => m.difficulty)).toEqual([1, 2, 3]);
    for (const [i, m] of path.missions.entries()) {
      expect(m.challenge).toBe(true);
      expect(m.starterCode).toContain('pd.read_csv(io.StringIO(DATI))');
      expect(pack.solutions[m.id]).toBeTruthy();
      expect(m.starterCode).not.toBe(pack.solutions[m.id]);
      expect(m.prerequisites).toEqual(i === 0 ? [] : [path.missions[i - 1].id]);
    }
  });

  it('ogni sfida usa un eroe che esiste (di un altro pack) e non ha minigioco né teoria', () => {
    TestBed.resetTestingModule();
    const reg = TestBed.inject(ContentRegistryService);
    expect(reg.character(path.defaultCharacterId!)).toBeDefined();
    for (const m of path.missions) expect(m.theory).toEqual([]);
  });

  it('i dati del dataset sono quelli attesi (le risposte si ricavano da lì)', () => {
    const out = execFileSync('python3', ['-E', '-c', `${pack.solutions[path.missions[2].id].split('\n# 1.')[0]}\nprint(len(vendite), list(vendite.columns))`], { encoding: 'utf8' });
    expect(out.trim()).toBe("9 ['categoria', 'prezzo', 'quantita']");
  });
});

describe('pagina di una sfida', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup(true)));
  const m1 = path.missions[0];

  it('si apre direttamente sul task: niente teoria, battaglia, fasi né «↺ Teoria»', async () => {
    const { f, el } = await openMission(m1.id);
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    expect(el.querySelector('section[aria-label=Teoria]')).toBeNull();
    expect(el.querySelector('ol.steps')).toBeNull();
    expect(btn(el, '↺ Teoria')).toBeUndefined();
    expect(el.querySelector('details.brief')!.textContent).toContain('vendite');
    f.destroy();
  });

  it('la risposta giusta completa la sfida e dà XP; quella sbagliata no', async () => {
    const { f, el } = await openMission(m1.id);
    run.mockResolvedValue({ output: '10.0\n' });
    await runCode(f, 'x');
    expect(el.querySelector('.foot [role=status]')!.textContent).toContain('riga 1');
    run.mockResolvedValue({ output: '11.83\n' });
    await runCode(f, TestBed.inject(ContentRegistryService).solution(m1.id)!);
    expect(TestBed.inject(GameStateService).isCompleted(m1.id)).toBe(true);
    expect(TestBed.inject(GameStateService).xp()).toBeGreaterThan(0);
    f.destroy();
  });

  it('una sfida bloccata (la precedente non è superata) rimanda alla home', async () => {
    const { f } = await openMission(path.missions[1].id);
    expect(TestBed.inject(Router).url).toBe('/');
    f.destroy();
  });
});

describe('pacchetti Python extra (pandas)', () => {
  it('il piano di download include pandas e le sue dipendenze, con sha256 e in ordine di dipendenza', () => {
    const plan = JSON.parse(execFileSync('node', ['scripts/fetch-pyodide-packages.mjs', '--plan'], { encoding: 'utf8' })) as { version: string; packages: { name: string; file: string; sha256: string }[] };
    const names = plan.packages.map((p) => p.name);
    expect(names).toContain('pandas');
    for (const dep of ['numpy', 'python-dateutil', 'pytz', 'six']) {
      expect(names, dep).toContain(dep);
      expect(names.indexOf(dep), dep).toBeLessThan(names.indexOf('pandas'));
    }
    for (const p of plan.packages) {
      expect(p.file).toMatch(/\.whl$/);
      expect(p.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(plan.version).toBe('0.27.7');
  });
});
