import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PACKS } from './core/data/packs.generated';
import { Contributor } from './core/models/content-pack.model';
import { ContentRegistryService } from './core/services/content-registry.service';
import { GameStateService } from './core/services/game-state.service';
import { I18nService } from './core/i18n/i18n.service';
import { PATH_SEEDS } from './content/adventure-core/curriculum';
import { Dashboard } from './features/dashboard/dashboard';
import { ContributorLine } from './shared/components/contributor';
import { MINI_PACK } from './testing/mini-pack';

/** Il testo come lo legge una persona: spazi ripetuti ridotti a uno. */
const txt = (e: Element): string => (e.textContent ?? '').replace(/\s+/g, ' ').trim();
const paths = PACKS.flatMap((p) => p.paths);

describe('contributor dei percorsi: dati', () => {
  it('ogni percorso del repository indica un contributor con nome e indirizzo https', () => {
    for (const p of paths) {
      expect(p.contributor, p.id).toBeDefined();
      expect(p.contributor!.name.trim(), p.id).not.toBe('');
      expect(p.contributor!.url, p.id).toMatch(/^https:\/\/[^\s]+$/);
    }
  });

  it('il contributor del seed arriva al percorso del pack senza altre modifiche', () => {
    for (const seed of PATH_SEEDS) {
      const p = paths.find((x) => x.id === `adventure-core-${seed.slug}`)!;
      expect(p.contributor).toEqual(seed.contributor);
    }
  });
});

describe('ContributorLine', () => {
  function mount(c: Contributor, link = true) {
    const f = TestBed.createComponent(ContributorLine);
    f.componentRef.setInput('contributor', c);
    f.componentRef.setInput('link', link);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('con indirizzo: il nome è un link che si apre in una nuova scheda senza rivelare la pagina', () => {
    const el = mount({ name: 'Ada', url: 'https://example.org/ada' });
    expect(el.textContent).toContain('Contributor:');
    const a = el.querySelector('a')!;
    expect(a.textContent).toBe('Ada');
    expect(a.getAttribute('href')).toBe('https://example.org/ada');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('senza indirizzo, o con link disattivato, mostra solo il nome', () => {
    expect(mount({ name: 'Ada' }).querySelector('a')).toBeNull();
    expect(mount({ name: 'Ada' }).textContent).toContain('Ada');
    const el = mount({ name: 'Ada', url: 'https://example.org/ada' }, false);
    expect(el.querySelector('a')).toBeNull();
    expect(el.textContent).toContain('Ada');
  });

  it('segue la lingua', () => {
    TestBed.inject(I18nService).setLocale('en');
    expect(mount({ name: 'Ada' }).textContent).toContain('Contributor:');
  });
});

describe('home e catalogo', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  const open = (el: HTMLElement, t: string) => (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(t)) as HTMLButtonElement).click();

  async function home(contributor?: Contributor) {
    TestBed.inject(ContentRegistryService).packs.set([{ ...MINI_PACK, paths: [{ ...MINI_PACK.paths[0], contributor }] }]);
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('il riquadro «Percorso» mostra il contributor con il link al profilo', async () => {
    const { el } = await home({ name: 'Ada Lovelace', url: 'https://example.org/ada' });
    const box = el.querySelector('section[aria-label=Percorso]')!;
    expect(txt(box)).toContain('Contributor: Ada Lovelace');
    expect(box.querySelector('a[href="https://example.org/ada"]')).not.toBeNull();
  });

  it('il catalogo lo mostra per ogni percorso (come testo: le voci sono pulsanti)', async () => {
    const { f, el } = await home({ name: 'Ada Lovelace', url: 'https://example.org/ada' });
    open(el, 'Cambia / cerca');
    f.detectChanges();
    const result = el.querySelector('.result')!;
    expect(txt(result)).toContain('Contributor: Ada Lovelace');
    expect(result.querySelector('a')).toBeNull();
  });

  it('un percorso senza contributor non ha nessuna riga', async () => {
    const { f, el } = await home(undefined);
    expect(el.querySelector('.contributor')).toBeNull();
    open(el, 'Cambia / cerca');
    f.detectChanges();
    expect(el.querySelector('.contributor')).toBeNull();
    expect(el.textContent).not.toContain('Contributor');
    void TestBed.inject(GameStateService);
  });
});
