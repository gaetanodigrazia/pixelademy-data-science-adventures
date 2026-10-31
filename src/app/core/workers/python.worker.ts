/// <reference lib="webworker" />
import { PYODIDE_BASE_URL, WorkerRequest, createWorkerHandler } from './python-worker-core';

/** Punto d'ingresso del Web Worker: Pyodide gira qui, così un ciclo infinito non blocca la pagina e si può interrompere. */
const handle = createWorkerHandler(
  async () => {
    importScripts(`${PYODIDE_BASE_URL}pyodide.js`);
    return (self as unknown as { loadPyodide(o: { indexURL: string }): Promise<unknown> }).loadPyodide({ indexURL: PYODIDE_BASE_URL });
  },
  (reply) => postMessage(reply),
);

addEventListener('message', (e: MessageEvent<WorkerRequest>) => void handle(e.data));
