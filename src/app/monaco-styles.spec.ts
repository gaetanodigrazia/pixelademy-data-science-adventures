import { readFileSync } from 'node:fs';
import { MONACO_CSS, loadMonacoStyles } from './core/utils/monaco-styles';

const angular = JSON.parse(readFileSync('angular.json', 'utf8')).projects.pixelademy.architect.build;
const ngsw = JSON.parse(readFileSync('ngsw-config.json', 'utf8'));

describe('CSS di Monaco: collegato dall\'app, non solo presente nel bundle', () => {
  afterEach(() => {
    document.getElementById('monaco-styles')?.remove();
    vi.useRealTimers();
  });
  const link = () => document.getElementById('monaco-styles') as HTMLLinkElement | null;

  it('la build produce un file dedicato non iniettato, con il nome che il codice si aspetta', () => {
    const entry = angular.options.styles.find((s: unknown) => typeof s === 'object') as { input: string; bundleName: string; inject: boolean };
    expect(entry.input).toBe('node_modules/monaco-editor/min/vs/editor/editor.main.css');
    expect(entry.inject).toBe(false);
    expect(`${entry.bundleName}.css`).toBe(MONACO_CSS);
  });

  it('il Service Worker lo mette in cache con il resto dei CSS (l\'editor si vede anche offline)', () => {
    const app = ngsw.assetGroups.find((g: { name: string }) => g.name === 'app');
    expect(app.resources.files).toContain('/*.css');
  });

  it('aggiunge un solo <link rel=stylesheet> e aspetta il caricamento', async () => {
    const p = loadMonacoStyles();
    expect(link()!.rel).toBe('stylesheet');
    expect(link()!.getAttribute('href')).toBe(MONACO_CSS);
    let resolved = false;
    void p.then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);
    link()!.dispatchEvent(new Event('load'));
    await p;
    expect(document.querySelectorAll('#monaco-styles').length).toBe(1);
  });

  it('chiamata di nuovo non duplica il link e risolve subito se già caricato', async () => {
    const p = loadMonacoStyles();
    link()!.dispatchEvent(new Event('load'));
    await p;
    await loadMonacoStyles();
    expect(document.querySelectorAll('#monaco-styles').length).toBe(1);
  });

  it('due chiamate insieme condividono lo stesso link', async () => {
    const a = loadMonacoStyles();
    const b = loadMonacoStyles();
    link()!.dispatchEvent(new Event('load'));
    await Promise.all([a, b]);
    expect(document.querySelectorAll('#monaco-styles').length).toBe(1);
  });

  it('se il file non si carica (errore) o è troppo lento (8 s) si prosegue comunque', async () => {
    const p = loadMonacoStyles();
    link()!.dispatchEvent(new Event('error'));
    await expect(p).resolves.toBeUndefined();

    document.getElementById('monaco-styles')?.remove();
    vi.useFakeTimers();
    const slow = loadMonacoStyles();
    await vi.advanceTimersByTimeAsync(8100);
    await expect(slow).resolves.toBeUndefined();
  });
});
