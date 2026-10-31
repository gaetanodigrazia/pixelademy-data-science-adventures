import { existsSync, readFileSync } from 'node:fs';
import { PYODIDE_BASE_URL, PYODIDE_VERSION } from './core/workers/python-worker-core';

const json = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const angular = json('angular.json').projects.pixelademy.architect.build;
const ngsw = json('ngsw-config.json');
const manifest = json('public/manifest.webmanifest');

describe('app installabile e offline (PWA)', () => {
  it('il manifest ha nome, modalità standalone, colori e icone 192/512 (anche maskable) che esistono davvero', () => {
    expect(manifest.name).toContain('Pixelademy');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.lang).toBe('it');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
    for (const i of manifest.icons as { src: string; sizes: string }[]) {
      const buf = readFileSync(`public/${i.src}`);
      const [w, h] = i.sizes.split('x').map(Number);
      expect([buf.readUInt32BE(16), buf.readUInt32BE(20)], i.src).toEqual([w, h]);
    }
  });

  it('index.html collega il manifest e il colore del tema', () => {
    const html = readFileSync('src/index.html', 'utf8');
    expect(html).toContain('rel="manifest" href="manifest.webmanifest"');
    expect(html).toContain('name="theme-color"');
  });

  it('il Service Worker è attivato in produzione con la configurazione ngsw-config.json', () => {
    expect(angular.configurations.production.serviceWorker).toBe('ngsw-config.json');
    expect(readFileSync('src/app/app.config.ts', 'utf8')).toContain("provideServiceWorker('ngsw-worker.js'");
  });

  it('la guscio dell\'app si mette in cache subito; Pyodide e le icone alla prima richiesta e si aggiornano insieme alla versione', () => {
    const app = ngsw.assetGroups.find((g: { name: string }) => g.name === 'app');
    const assets = ngsw.assetGroups.find((g: { name: string }) => g.name === 'assets');
    expect(app.installMode).toBe('prefetch');
    for (const f of ['/index.html', '/manifest.webmanifest', '/*.js', '/*.css']) expect(app.resources.files).toContain(f);
    expect(assets.installMode).toBe('lazy');
    expect(assets.resources.files).toContain('/pyodide/**');
  });
});

describe('Pyodide ospitato dal sito', () => {
  it('si carica dallo stesso dominio (niente CDN) e la versione coincide con il pacchetto installato', () => {
    expect(PYODIDE_BASE_URL).toBe('/pyodide/');
    expect(json('node_modules/pyodide/package.json').version).toBe(PYODIDE_VERSION);
    expect(json('package.json').devDependencies.pyodide).toBe(PYODIDE_VERSION);
  });

  it('la build copia in /pyodide/ tutti i file che servono all\'interprete', () => {
    const rule = angular.options.assets.find((a: { output?: string }) => a.output === 'pyodide');
    expect(rule.input).toBe('node_modules/pyodide');
    const files = (rule.glob as string).replace(/[{}]/g, '').split(',');
    for (const f of ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
      expect(files, f).toContain(f);
      expect(existsSync(`node_modules/pyodide/${f}`), f).toBe(true);
    }
  });

  it('il worker non dipende da CDN né da importScripts (i worker di tipo modulo non lo hanno)', () => {
    const src = readFileSync('src/app/core/workers/python.worker.ts', 'utf8');
    expect(src).not.toMatch(/cdn\.|jsdelivr|importScripts\(/);
    expect(src).toContain('pyodide.mjs');
  });
});
