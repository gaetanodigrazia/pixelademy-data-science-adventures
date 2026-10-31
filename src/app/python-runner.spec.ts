import { TestBed } from '@angular/core/testing';
import { PythonRunnerService } from './core/services/python-runner.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
type W = Window & { loadPyodide?: unknown };

/** Un Pyodide finto: l'esecuzione «stampa» ciò che il test decide e registra i namespace usati. */
function fakePyodide(program: (code: string, out: (s: string) => void, err: (s: string) => void) => void | Promise<void>) {
  let out: (s: string) => void = () => undefined;
  let err: (s: string) => void = () => undefined;
  const namespaces: object[] = [];
  const destroyed: object[] = [];
  return {
    namespaces,
    destroyed,
    setStdout: (o: { batched: (s: string) => void }) => (out = o.batched),
    setStderr: (o: { batched: (s: string) => void }) => (err = o.batched),
    globals: { get: () => () => { const g = { destroy: () => destroyed.push(g) }; namespaces.push(g); return g; } },
    loadPackagesFromImports: async () => undefined,
    runPythonAsync: async (code: string, opts: { globals: object }) => {
      expect(opts.globals).toBe(namespaces[namespaces.length - 1]);
      await program(code, (s) => out(s), (s) => err(s));
    },
  };
}

describe('PythonRunnerService', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => delete (window as W).loadPyodide);

  const install = (py: ReturnType<typeof fakePyodide>) => ((window as W).loadPyodide = vi.fn(async () => py));

  it('esegue il codice e restituisce l\'output delle print, una riga per volta', async () => {
    const py = fakePyodide((code, out) => { for (const l of code.split(';')) out(l); });
    install(py);
    const r = await TestBed.inject(PythonRunnerService).run('a;b');
    expect(r).toEqual({ output: 'a\nb\n', error: undefined });
  });

  it('un errore di Python torna come messaggio, limitato alle ultime righe', async () => {
    install(fakePyodide(() => { throw new Error('riga1\nriga2\nriga3\nriga4\nriga5\nNameError: x'); }));
    const r = await TestBed.inject(PythonRunnerService).run('x');
    expect(r.error).toBe('riga3\nriga4\nriga5\nNameError: x');
  });

  it('se Python scrive solo su stderr senza eccezione, quello è l\'errore', async () => {
    install(fakePyodide((_c, _o, err) => err('Warning: attenzione')));
    expect((await TestBed.inject(PythonRunnerService).run('x')).error).toBe('Warning: attenzione');
  });

  it('ogni esecuzione ha il suo namespace, distrutto alla fine (le variabili non si trascinano)', async () => {
    const py = fakePyodide(() => undefined);
    install(py);
    const s = TestBed.inject(PythonRunnerService);
    await s.run('a = 1');
    await s.run('print(a)');
    expect(py.namespaces.length).toBe(2);
    expect(py.namespaces[0]).not.toBe(py.namespaces[1]);
    expect(py.destroyed).toEqual(py.namespaces);
  });

  it('carica Pyodide una sola volta e aggiorna lo stato: idle → loading → ready', async () => {
    const load = install(fakePyodide(() => undefined));
    const s = TestBed.inject(PythonRunnerService);
    expect(s.status()).toBe('idle');
    const p = s.run('1');
    expect(s.status()).toBe('loading');
    await p;
    await s.run('2');
    expect(s.status()).toBe('ready');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('se il download fallisce dà un messaggio sulla connessione, stato error, e consente un nuovo tentativo', async () => {
    const s = TestBed.inject(PythonRunnerService);
    const first = s.run('1');
    await Promise.resolve();
    const script = document.head.querySelector('script[src*="pyodide.js"]')!;
    script.dispatchEvent(new Event('error'));
    const r = await first;
    expect(r.output).toBe('');
    expect(r.error).toContain('Verifica la connessione');
    expect(s.status()).toBe('error');
    expect(document.head.querySelector('script[src*="pyodide.js"]')).toBeNull();

    install(fakePyodide((_c, out) => out('ok')));
    expect((await s.run('1')).output).toBe('ok\n');
    expect(s.status()).toBe('ready');
  });
});
