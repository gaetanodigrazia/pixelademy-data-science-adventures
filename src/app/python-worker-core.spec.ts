import { WorkerReply, createWorkerHandler, runInPyodide } from './core/workers/python-worker-core';

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
    runPythonAsync: async (code: string) => { await program(code, (s) => out(s), (s) => err(s)); },
  };
}

describe('runInPyodide', () => {
  it('restituisce l\'output delle print, una riga per volta', async () => {
    const py = fakePyodide((code, out) => { for (const l of code.split(';')) out(l); });
    expect(await runInPyodide(py, 'a;b')).toEqual({ output: 'a\nb\n', error: undefined });
  });

  it('un errore di Python torna come messaggio, limitato alle ultime righe', async () => {
    const py = fakePyodide(() => { throw new Error('riga1\nriga2\nriga3\nriga4\nriga5\nNameError: x'); });
    expect((await runInPyodide(py, 'x')).error).toBe('riga3\nriga4\nriga5\nNameError: x');
  });

  it('se Python scrive solo su stderr senza eccezione, quello è l\'errore', async () => {
    const py = fakePyodide((_c, _o, err) => err('Warning: attenzione'));
    expect((await runInPyodide(py, 'x')).error).toBe('Warning: attenzione');
  });

  it('ogni esecuzione ha il suo namespace, distrutto alla fine (le variabili non si trascinano)', async () => {
    const py = fakePyodide(() => undefined);
    await runInPyodide(py, 'a = 1');
    await runInPyodide(py, 'print(a)');
    expect(py.namespaces.length).toBe(2);
    expect(py.namespaces[0]).not.toBe(py.namespaces[1]);
    expect(py.destroyed).toEqual(py.namespaces);
  });
});

describe('createWorkerHandler', () => {
  it('init carica Pyodide una volta sola e risponde ready; run risponde result con lo stesso id', async () => {
    const load = vi.fn(async () => fakePyodide((_c, out) => out('ciao')));
    const replies: WorkerReply[] = [];
    const handle = createWorkerHandler(load, (r) => replies.push(r));
    await handle({ type: 'init' });
    await handle({ type: 'init' });
    await handle({ type: 'run', id: 7, code: 'print(1)' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(replies).toEqual([{ type: 'ready' }, { type: 'ready' }, { type: 'result', id: 7, output: 'ciao\n', error: undefined }]);
  });

  it('se il caricamento fallisce risponde init-error e al tentativo dopo riprova', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('rete')).mockResolvedValue(fakePyodide(() => undefined));
    const replies: WorkerReply[] = [];
    const handle = createWorkerHandler(load, (r) => replies.push(r));
    await handle({ type: 'init' });
    await handle({ type: 'init' });
    expect(replies).toEqual([{ type: 'init-error', message: 'rete' }, { type: 'ready' }]);
  });
});
