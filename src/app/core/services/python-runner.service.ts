import { InjectionToken, Injectable, inject, signal } from '@angular/core';
import { PythonRunResult } from '../models/python.model';
import type { WorkerReply, WorkerRequest } from '../workers/python-worker-core';

/** Dopo quanti ms un programma ancora in esecuzione viene interrotto (ciclo infinito o troppo lento). */
export const RUN_TIMEOUT_MS = 5000;

/** Il minimo del Worker che serve al servizio: così nei test si sostituisce con uno finto. */
export interface PythonWorker {
  postMessage(m: WorkerRequest): void;
  terminate(): void;
  onmessage: ((e: { data: WorkerReply }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export const PYTHON_WORKER_FACTORY = new InjectionToken<() => PythonWorker>('PYTHON_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Worker(new URL('../workers/python.worker', import.meta.url), { type: 'module' }) as unknown as PythonWorker,
});

const NO_RUNTIME = 'Impossibile caricare l\'interprete Python (Pyodide). Verifica la connessione a internet e riprova.';

/**
 * Esegue Python (Pyodide) in un Web Worker: la pagina resta reattiva e un programma che non finisce si può interrompere
 * (da solo dopo `timeoutMs`, o con `stop()`). Interrompere significa terminare il worker: Pyodide si ricarica alla prossima esecuzione.
 */
@Injectable({ providedIn: 'root' })
export class PythonRunnerService {
  private readonly factory = inject(PYTHON_WORKER_FACTORY);
  /** Stato del compilatore, per mostrare l'avanzamento del caricamento. */
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  private worker?: PythonWorker;
  private ready?: Promise<void>;
  private nextId = 1;
  private pending = new Map<number, (r: PythonRunResult) => void>();
  private abort?: (message: string) => void;

  /** Carica Pyodide al primo utilizzo (lazy) nel worker. */
  loadRuntime(): Promise<void> {
    if (!this.ready) {
      this.status.set('loading');
      let worker: PythonWorker;
      try {
        worker = this.factory();
      } catch {
        // browser senza Web Worker (o file del worker non disponibile): stesso esito di un download fallito
        this.status.set('error');
        return Promise.reject(new Error('Worker non disponibile'));
      }
      this.worker = worker;
      this.ready = new Promise<void>((resolve, reject) => {
        worker.onmessage = (e) => {
          const m = e.data;
          if (m.type === 'ready') {
            this.status.set('ready');
            resolve();
          } else if (m.type === 'init-error') {
            this.dispose('error');
            reject(new Error(m.message));
          } else {
            this.pending.get(m.id)?.({ output: m.output, error: m.error });
            this.pending.delete(m.id);
          }
        };
        worker.onerror = () => {
          this.dispose('error');
          reject(new Error('Worker non disponibile'));
        };
        worker.postMessage({ type: 'init' });
      });
      this.ready.catch(() => undefined);
    }
    return this.ready;
  }

  /** Esegue il codice; dopo `timeoutMs` dall'avvio dell'esecuzione (non del caricamento) lo interrompe. */
  async run(code: string, timeoutMs = RUN_TIMEOUT_MS): Promise<PythonRunResult> {
    try {
      await this.loadRuntime();
    } catch {
      return { output: '', error: NO_RUNTIME };
    }
    const worker = this.worker!;
    const id = this.nextId++;
    return new Promise<PythonRunResult>((resolve) => {
      const timer = setTimeout(() => this.interrupt(`Il programma ha impiegato più di ${timeoutMs / 1000} secondi ed è stato interrotto (ciclo infinito?).`), timeoutMs);
      const finish = (r: PythonRunResult) => {
        clearTimeout(timer);
        this.pending.delete(id);
        this.abort = undefined;
        resolve(r);
      };
      this.pending.set(id, finish);
      this.abort = (message) => finish({ output: '', error: message });
      worker.postMessage({ type: 'run', id, code });
    });
  }

  /** Interrompe l'esecuzione in corso (pulsante «Interrompi»). Non fa nulla se non c'è. */
  stop(): void {
    this.interrupt('Esecuzione interrotta.');
  }

  private interrupt(message: string): void {
    if (!this.abort) return;
    const abort = this.abort;
    this.dispose('idle');
    abort(message);
  }

  private dispose(status: 'idle' | 'error'): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    this.pending.clear();
    this.status.set(status);
  }
}
