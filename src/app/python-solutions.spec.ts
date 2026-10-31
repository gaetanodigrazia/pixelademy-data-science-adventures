import { execFileSync, spawnSync } from 'node:child_process';
import { PACKS } from './core/data/packs.generated';
import { validateOutput } from './core/utils/validator';

// Le soluzioni di riferimento si eseguono con un Python vero (lo stesso linguaggio che l'utente scriverà in Pyodide):
// l'output deve essere esattamente il bollettino atteso, riga per riga. In CI (ubuntu) python3 c'è sempre.
const hasPython = spawnSync('python3', ['--version']).status === 0;
const run = (code: string): string => execFileSync('python3', ['-E', '-c'], code], { encoding: 'utf8', timeout: 20000 });

describe('soluzioni con Python reale', () => {
  it('python3 è disponibile', () => {
    expect(hasPython, 'installa python3 per verificare le soluzioni').toBe(true);
  });

  for (const pack of PACKS) {
    for (const path of pack.paths) {
      for (const m of path.missions) {
        it(`${m.id}: la soluzione stampa esattamente il bollettino atteso`, () => {
          const out = run(pack.solutions[m.id]);
          if (m.validation.kind === 'lines') {
            expect(out.split('\n').map((l) => l.trim()).filter(Boolean)).toEqual(m.validation.expected);
          } else {
            expect(validateOutput(out, m.validation), out).toEqual({ ok: true, message: expect.any(String) });
          }
        });
      }
    }
  }
});
