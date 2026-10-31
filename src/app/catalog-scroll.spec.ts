import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { useMiniPack } from './testing/mini-pack';

const css = readFileSync('src/app/features/dashboard/dashboard.ts', 'utf8');
const rule = (selector: string): string => new RegExp(`^\\s*${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? '';

describe('cataloghi e scelta eroe: scorrimento', () => {
  it('l\'elenco scorre dentro la finestra e le voci tengono la loro altezza (flex: none)', () => {
    expect(rule('.results')).toMatch(/overflow-y:\s*auto/);
    expect(rule('.results')).toMatch(/min-height:\s*0/);
    expect(rule('.results')).toMatch(/overscroll-behavior:\s*contain/);
    expect(rule('.result')).toMatch(/flex:\s*none/);
  });

  it('gli eroi del riquadro stanno su una riga che scorre di lato, senza andare a capo', () => {
    expect(rule('.choices')).toMatch(/flex-wrap:\s*nowrap/);
    expect(rule('.choices')).toMatch(/overflow-x:\s*auto/);
    expect(rule('.choice')).toMatch(/flex:\s*none/);
  });
});

describe('catalogo: campo di ricerca', () => {
  let coarse = false;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    useMiniPack();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('pointer: coarse') && coarse, addEventListener: () => undefined, removeEventListener: () => undefined }));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function openCatalog() {
    const f = TestBed.createComponent(Dashboard);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    await f.whenStable();
    (Array.from(f.nativeElement.querySelectorAll('button')).find((b) => (b as HTMLElement).textContent?.includes('Cambia / cerca')) as HTMLButtonElement).click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
  }

  it('con mouse e tastiera prende il fuoco da solo', async () => {
    coarse = false;
    const input = await openCatalog();
    expect(document.activeElement).toBe(input);
  });

  it('su un dispositivo touch non lo prende: la tastiera non si apre sopra la lista', async () => {
    coarse = true;
    const input = await openCatalog();
    expect(document.activeElement).not.toBe(input);
  });
});
