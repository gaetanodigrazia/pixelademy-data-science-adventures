/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * La logica dell'interprete che gira nel Web Worker, separata dal contatto con `self` così si può provare con un Pyodide finto.
 * Protocollo: la pagina invia `init` e `run`; il worker risponde `ready`, `init-error` e `result`.
 */
export type WorkerRequest = { type: 'init' } | { type: 'run'; id: number; code: string };
export type WorkerReply =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  /** I pacchetti sono pronti e il codice sta per partire: da qui conta il timeout (il download dei pacchetti no). */
  | { type: 'started'; id: number }
  | { type: 'result'; id: number; output: string; error?: string };

type Pyodide = any;

/** Versione di Pyodide (la stessa del pacchetto `pyodide` in devDependencies, copiato in `/pyodide/` dalla build). */
export const PYODIDE_VERSION = '0.27.7';
/** Pyodide è ospitato dal sito stesso: niente CDN, funziona offline (con il Service Worker) e la cache è sotto il nostro controllo. */
export const PYODIDE_BASE_URL = '/pyodide/';

/** Ultime righe di un errore Python (il resto è rumore di traceback interno). */
const shortError = (e: unknown): string => (e instanceof Error ? e.message : String(e)).trim().split('\n').slice(-4).join('\n');

/** Esegue `code` in un namespace isolato e raccoglie stdout/stderr. */
export async function runInPyodide(pyodide: Pyodide, code: string, onStart: () => void = () => undefined): Promise<{ output: string; error?: string }> {
  let out = '';
  let err = '';
  pyodide.setStdout({ batched: (s: string) => (out += s + '\n') });
  pyodide.setStderr({ batched: (s: string) => (err += s + '\n') });
  let error: string | undefined;
  const globals = pyodide.globals.get('dict')();
  try {
    // I pacchetti (es. pandas) si scaricano qui; i messaggi «Loading…/Loaded…» di Pyodide non devono finire nell'output del programma
    await pyodide.loadPackagesFromImports(code, { messageCallback: () => undefined, errorCallback: () => undefined });
    onStart();
    await pyodide.runPythonAsync(code, { globals });
  } catch (e) {
    error = shortError(e);
  } finally {
    globals.destroy?.();
  }
  if (!error && err.trim()) error = err.trim();
  return { output: out, error };
}

/** Il gestore dei messaggi: `load` scarica e avvia Pyodide (una sola volta), `post` risponde alla pagina. */
export function createWorkerHandler(load: () => Promise<Pyodide>, post: (r: WorkerReply) => void): (m: WorkerRequest) => Promise<void> {
  let runtime: Promise<Pyodide> | undefined;
  return async (m) => {
    if (m.type === 'init') {
      runtime ??= load();
      try {
        await runtime;
        post({ type: 'ready' });
      } catch (e) {
        runtime = undefined;
        post({ type: 'init-error', message: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
    try {
      const py = await (runtime ??= load());
      post({ type: 'result', id: m.id, ...(await runInPyodide(py, m.code, () => post({ type: 'started', id: m.id }))) });
    } catch (e) {
      runtime = undefined;
      post({ type: 'result', id: m.id, output: '', error: e instanceof Error ? e.message : String(e) });
    }
  };
}
