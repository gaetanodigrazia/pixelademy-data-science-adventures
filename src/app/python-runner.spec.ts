import { TestBed } from '@angular/core/testing';
import { PREPARE_TIMEOUT_MS, PYTHON_WORKER_FACTORY, PythonRunnerService, PythonWorker, RUN_TIMEOUT_MS } from './core/services/python-runner.service';
import type { WorkerReply, WorkerRequest } from './core/workers/python-worker-core';

/** Un Worker finto: registra i messaggi della pagina e risponde come decide il test. */
class FakeWorker implements PythonWorker {
  onmessage: PythonWorker['onmessage'] = null;
  onerror: PythonWorker['onerror'] = null;
  sent: WorkerRequest[] = [];
  terminated = false;
  constructor(private readonly behave: (m: WorkerRequest, reply: (r: WorkerReply) => void) => void) {}
  postMessage(m: WorkerRequest): void {
    this.sent.push(m);
    queueMicrotask(() => this.behave(m, (r) => this.onmessage?.({ data: r })));
  }
  terminate(): void {
    this.terminated = true;
  }
}

/** Risponde `ready` all'init e al `run` stampando il codice (o non risponde mai, se `hang`). */
const echo = (hang = false) => (m: WorkerRequest, reply: (r: WorkerReply) => void) => {
  if (m.type === 'init') reply({ type: 'ready' });
  else {
    reply({ type: 'started', id: m.id });
    if (!hang) reply({ type: 'result', id: m.id, output: `out:${m.code}\n` });
  }
};

function setup(behaviors: ((m: WorkerRequest, r: (x: WorkerReply) => void) => void)[]) {
  const workers: FakeWorker[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PYTHON_WORKER_FACTORY, useValue: () => { const w = new FakeWorker(behaviors[Math.min(workers.length, behaviors.length - 1)]); workers.push(w); return w; } }],
  });
  return { workers, service: TestBed.inject(PythonRunnerService) };
}

describe('PythonRunnerService (Web Worker)', () => {
  afterEach(() => vi.useRealTimers());

  it('esegue il codice nel worker e restituisce output ed eventuale errore', async () => {
    const { service, workers } = setup([(m, reply) => {
      if (m.type === 'init') reply({ type: 'ready' });
      else { reply({ type: 'started', id: m.id }); reply({ type: 'result', id: m.id, output: 'a\n', error: m.code === 'boom' ? 'NameError: x' : undefined }); }
    }]);
    expect(await service.run('ok')).toEqual({ output: 'a\n', error: undefined });
    expect(await service.run('boom')).toEqual({ output: 'a\n', error: 'NameError: x' });
    expect(workers[0].sent.map((m) => m.type)).toEqual(['init', 'run', 'run']);
  });

  it('crea un solo worker e lo inizializza una volta; lo stato va idle → loading → ready', async () => {
    const { service, workers } = setup([echo()]);
    expect(service.status()).toBe('idle');
    const first = service.run('1');
    expect(service.status()).toBe('loading');
    await first;
    await service.run('2');
    expect(service.status()).toBe('ready');
    expect(workers.length).toBe(1);
    expect(workers[0].sent.filter((m) => m.type === 'init').length).toBe(1);
  });

  it('più esecuzioni insieme non si confondono (ogni risposta torna alla sua richiesta)', async () => {
    const { service } = setup([echo()]);
    const results = await Promise.all([service.run('a'), service.run('b'), service.run('c')]);
    expect(results.map((r) => r.output)).toEqual(['out:a\n', 'out:b\n', 'out:c\n']);
  });

  it('un ciclo infinito è interrotto dopo il timeout: messaggio chiaro, worker terminato, pagina libera', async () => {
    vi.useFakeTimers();
    const { service, workers } = setup([echo(true)]);
    const p = service.run('while True: pass');
    await vi.advanceTimersByTimeAsync(10); // init
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS);
    const r = await p;
    expect(r.error).toContain('più di 5 secondi');
    expect(r.error).toContain('interrotto');
    expect(workers[0].terminated).toBe(true);
    expect(service.status()).toBe('idle');
  });

  it('dopo un\'interruzione la prossima esecuzione riparte con un worker nuovo', async () => {
    vi.useFakeTimers();
    const { service, workers } = setup([echo(true), echo()]);
    const hung = service.run('x');
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS + 10);
    await hung;
    const again = service.run('y');
    await vi.advanceTimersByTimeAsync(10);
    expect((await again).output).toBe('out:y\n');
    expect(workers.length).toBe(2);
  });

  it('il timeout conta dall\'avvio dell\'esecuzione, non dal caricamento di Pyodide', async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const slowInit = (m: WorkerRequest, reply: (r: WorkerReply) => void) => {
      if (m.type === 'init') release = () => reply({ type: 'ready' });
      else reply({ type: 'result', id: m.id, output: 'ok\n' });
    };
    const { service } = setup([slowInit]);
    const p = service.run('1');
    await vi.advanceTimersByTimeAsync(60_000); // il download dura un minuto: nessun timeout
    release();
    await vi.advanceTimersByTimeAsync(10);
    expect((await p).output).toBe('ok\n');
  });

  it('il download dei pacchetti (es. pandas) non conta nel timeout: conta dal messaggio «started»', async () => {
    vi.useFakeTimers();
    let go!: () => void;
    const slowPackages = (m: WorkerRequest, reply: (r: WorkerReply) => void) => {
      if (m.type === 'init') reply({ type: 'ready' });
      else go = () => { reply({ type: 'started', id: m.id }); reply({ type: 'result', id: m.id, output: 'ok\n' }); };
    };
    const { service } = setup([slowPackages]);
    const p = service.run('import pandas');
    await vi.advanceTimersByTimeAsync(60_000); // 60 s di download: oltre i 5 s del timeout, ma non lo scatena
    go();
    await vi.advanceTimersByTimeAsync(10);
    expect((await p).output).toBe('ok\n');
  });

  it('se la preparazione dei pacchetti dura più del tetto largo, si interrompe con un messaggio sulla connessione', async () => {
    vi.useFakeTimers();
    const { service, workers } = setup([(m, reply) => { if (m.type === 'init') reply({ type: 'ready' }); }]);
    const p = service.run('import pandas');
    await vi.advanceTimersByTimeAsync(PREPARE_TIMEOUT_MS + 100);
    expect((await p).error).toContain('caricamento dei pacchetti');
    expect(workers[0].terminated).toBe(true);
  });

  it('stop() interrompe subito l\'esecuzione in corso e non fa nulla se non ce n\'è', async () => {
    const { service, workers } = setup([echo(true)]);
    service.stop(); // nessuna esecuzione: nessun effetto
    expect(service.status()).toBe('idle');
    const p = service.run('while True: pass');
    await new Promise((r) => setTimeout(r));
    service.stop();
    expect((await p).error).toBe('Esecuzione interrotta.');
    expect(workers[0].terminated).toBe(true);
  });

  it('se Pyodide non si carica dà un messaggio sulla connessione, stato error, e consente un nuovo tentativo', async () => {
    const { service, workers } = setup([
      (m, reply) => { if (m.type === 'init') reply({ type: 'init-error', message: 'rete' }); },
      echo(),
    ]);
    const r = await service.run('1');
    expect(r.output).toBe('');
    expect(r.error).toContain('Verifica la connessione');
    expect(service.status()).toBe('error');
    expect(workers[0].terminated).toBe(true);
    expect((await service.run('2')).output).toBe('out:2\n');
    expect(service.status()).toBe('ready');
    expect(workers.length).toBe(2);
  });

  it('un errore del worker (file non caricabile) è trattato come caricamento fallito', async () => {
    const { service, workers } = setup([() => undefined]);
    const p = service.run('1');
    await new Promise((r) => setTimeout(r));
    workers[0].onerror!(new Event('error'));
    expect((await p).error).toContain('Verifica la connessione');
    expect(service.status()).toBe('error');
  });

  it('senza supporto ai Web Worker il caricamento fallisce con lo stesso messaggio e non lancia eccezioni', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PYTHON_WORKER_FACTORY, useValue: () => { throw new ReferenceError('Worker is not defined'); } }] });
    const service = TestBed.inject(PythonRunnerService);
    await expect(service.loadRuntime()).rejects.toThrow('Worker non disponibile');
    expect((await service.run('1')).error).toContain('Verifica la connessione');
    expect(service.status()).toBe('error');
  });
});
