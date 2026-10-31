/// <reference lib="webworker" />
import { PYODIDE_BASE_URL, WorkerRequest, createWorkerHandler } from './python-worker-core';

/**
 * Punto d'ingresso del Web Worker: Pyodide gira qui, così un ciclo infinito non blocca la pagina e si può interrompere.
 * È un worker di tipo modulo (niente `importScripts`): Pyodide si carica con `import()` dal file `pyodide.mjs` ospitato dal sito.
 */
const handle = createWorkerHandler(
  async () => {
    const url = `${PYODIDE_BASE_URL}pyodide.mjs`; // indirizzo non letterale: il bundler lo lascia così com'è
    const { loadPyodide } = (await import(/* @vite-ignore */ url)) as { loadPyodide(o: { indexURL: string }): Promise<unknown> };
    return loadPyodide({ indexURL: PYODIDE_BASE_URL });
  },
  (reply) => postMessage(reply),
);

addEventListener('message', (e: MessageEvent<WorkerRequest>) => void handle(e.data));
