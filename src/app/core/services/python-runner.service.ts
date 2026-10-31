import { Injectable, signal } from '@angular/core';
import { PythonRunResult } from '../models/python.model';

const PYODIDE_VERSION = '0.27.7';
const BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pyodide = any;

@Injectable({ providedIn: 'root' })
export class PythonRunnerService {
  private runtime?: Promise<Pyodide>;
  /** Stato del compilatore, per mostrare l'avanzamento del caricamento. */
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  /** Carica Pyodide al primo utilizzo (lazy) dalla CDN jsdelivr. */
  loadRuntime(): Promise<Pyodide> {
    if (!this.runtime) {
      this.status.set('loading');
      this.runtime = this.init().then(
        (py) => {
          this.status.set('ready');
          return py;
        },
        (err) => {
          this.runtime = undefined; // consente un nuovo tentativo
          this.status.set('error');
          throw err;
        },
      );
    }
    return this.runtime;
  }

  async run(code: string): Promise<PythonRunResult> {
    let pyodide: Pyodide;
    try {
      pyodide = await this.loadRuntime();
    } catch {
      return {
        output: '',
        error: 'Impossibile caricare l\'interprete Python (Pyodide). Verifica la connessione a internet e riprova.',
      };
    }
    let out = '';
    let err = '';
    pyodide.setStdout({ batched: (s: string) => (out += s + '\n') });
    pyodide.setStderr({ batched: (s: string) => (err += s + '\n') });
    let error: string | undefined;
    // namespace isolato a ogni esecuzione
    const globals = pyodide.globals.get('dict')();
    try {
      await pyodide.loadPackagesFromImports(code);
      await pyodide.runPythonAsync(code, { globals });
    } catch (e) {
      error = this.shortError(e);
    } finally {
      globals.destroy?.();
    }
    if (!error && err.trim()) error = err.trim();
    return { output: out, error };
  }

  private shortError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    return msg.trim().split('\n').slice(-4).join('\n');
  }

  private async init(): Promise<Pyodide> {
    await this.loadScript(`${BASE_URL}pyodide.js`);
    const load = (window as any).loadPyodide;
    if (typeof load !== 'function') throw new Error('Pyodide non disponibile');
    return load({ indexURL: BASE_URL });
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).loadPyodide === 'function') return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        reject(new Error('Download di Pyodide non riuscito'));
      };
      document.head.appendChild(s);
    });
  }
}
