import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EN } from './core/i18n/en';
import { I18nService, LANGUAGE_CHOICE_ENABLED, LOCALES, pickLocale } from './core/i18n/i18n.service';
import { IT } from './core/i18n/it';
import { GameStateService } from './core/services/game-state.service';
import { Dashboard } from './features/dashboard/dashboard';
import { Navbar } from './shared/components/navbar';
import { PrivacyModal } from './shared/components/privacy-modal';
import { useMiniPack } from './testing/mini-pack';

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dizionari it/en', () => {
  it('l\'inglese ha esattamente le stesse chiavi dell\'italiano, tutte non vuote', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(IT).sort());
    for (const [k, v] of Object.entries(EN)) expect(v.trim(), k).not.toBe('');
  });

  it('ogni testo ha gli stessi segnaposto {nome} nelle due lingue', () => {
    for (const k of Object.keys(IT) as (keyof typeof IT)[]) expect(params(EN[k]), k).toEqual(params(IT[k]));
  });

  it('l\'inglese non è una copia dell\'italiano (restano uguali solo parole identiche nelle due lingue)', () => {
    const same = (Object.keys(IT) as (keyof typeof IT)[]).filter((k) => IT[k] === EN[k] && /[a-zà-ù]{4,}/i.test(IT[k]));
    expect(same).toEqual(['nav.home', 'nav.levelShort', 'home.dashboard', 'home.contributor']); // «Home», «Lv», «Dashboard» e «Contributor» sono uguali nelle due lingue
  });
});

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    useMiniPack();
  });

  it('pickLocale: lingue del browser che iniziano con «en» → inglese, il resto → italiano', () => {
    expect(pickLocale(['en-US', 'it'])).toBe('en');
    expect(pickLocale(['EN'])).toBe('en');
    expect(pickLocale(['it-IT', 'en'])).toBe('it');
    expect(pickLocale(['fr'])).toBe('it');
    expect(pickLocale([])).toBe('it');
    expect(pickLocale(undefined)).toBe('it');
  });

  it('parte in italiano, traduce con i segnaposto e cambia lingua (anche l\'attributo lang del documento)', () => {
    const i = TestBed.inject(I18nService);
    expect(i.locale()).toBe('it');
    expect(i.t('nav.level', { level: 3 })).toBe('Livello 3');
    i.setLocale('en');
    expect(i.t('nav.level', { level: 3 })).toBe('Level 3');
    expect(document.documentElement.lang).toBe('en');
    expect(i.t('nav.xpToward', { into: 5, span: 50, next: 2 })).toBe('5 / 50 XP towards level 2');
    expect(LOCALES).toEqual(['it', 'en']);
  });

  it('detect (scelta accesa): la scelta salvata vince sulla lingua del browser; senza scelta si usa il browser', () => {
    TestBed.resetTestingModule(); // la beforeEach ha già creato il modulo
    TestBed.configureTestingModule({ providers: [{ provide: LANGUAGE_CHOICE_ENABLED, useValue: true }] });
    vi.stubGlobal('navigator', { ...navigator, languages: ['en-GB'] });
    let i = TestBed.inject(I18nService);
    i.detect();
    expect(i.locale()).toBe('en');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LANGUAGE_CHOICE_ENABLED, useValue: true }] });
    useMiniPack();
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    g.setLocale('it');
    i = TestBed.inject(I18nService);
    i.detect();
    expect(i.locale()).toBe('it');
    vi.unstubAllGlobals();
  });

  it('la scelta si ricorda con il consenso e si ritrova al ricaricamento (scelta accesa)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LANGUAGE_CHOICE_ENABLED, useValue: true }] });
    useMiniPack();
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    TestBed.inject(I18nService).setLocale('en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LANGUAGE_CHOICE_ENABLED, useValue: true }] });
    useMiniPack();
    const again = TestBed.inject(I18nService);
    again.detect();
    expect(again.locale()).toBe('en');
  });
});

describe('interfaccia in inglese', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    useMiniPack();
  });
  const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

  it('la navbar cambia lingua dai pulsanti IT/EN, con stato annunciato (scelta accesa)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: LANGUAGE_CHOICE_ENABLED, useValue: true }] });
    useMiniPack();
    const f = TestBed.createComponent(Navbar);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Il progetto');
    expect(el.textContent).toContain('Vuoi salvare i progressi');
    expect(btn(el, 'IT').getAttribute('aria-pressed')).toBe('true');
    btn(el, 'EN').click();
    f.detectChanges();
    expect(btn(el, 'EN').getAttribute('aria-pressed')).toBe('true');
    expect(el.textContent).toContain('The project');
    expect(el.textContent).toContain('Privacy and data');
    expect(el.textContent).toContain('Do you want to save your progress in this browser?');
    expect(el.textContent).not.toContain('Il progetto');
    expect(el.querySelector('.profile-btn')!.getAttribute('aria-label')).toBe('Player profile: level 1, 0 XP');
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('la modale privacy e i suoi messaggi seguono la lingua', () => {
    TestBed.inject(I18nService).setLocale('en');
    const f = TestBed.createComponent(PrivacyModal);
    f.componentRef.setInput('open', true);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('has no servers or accounts');
    expect(el.textContent).toContain('choice to make');
    btn(el, 'Allow saving').click();
    f.detectChanges();
    expect(el.querySelector('[role=status]')!.textContent).toContain('Saving turned on.');
    expect(el.textContent).toContain('saving on');
  });

  it('la home mostra titoli, pulsanti e cataloghi in inglese', async () => {
    TestBed.inject(I18nService).setLocale('en');
    const f = TestBed.createComponent(Dashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Level 1');
    expect(el.textContent).toContain('0 / 10 missions');
    expect(el.textContent).toContain('Change / search (1)');
    expect(el.textContent).toContain('Search heroes (2)');
    btn(el, 'Change / search').click();
    f.detectChanges();
    expect(el.textContent).toContain('PATH CATALOG');
    expect(el.querySelector('input[type=search]')!.getAttribute('aria-label')).toBe('Search paths');
  });
});

describe('scelta della lingua spenta (stato attuale)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    useMiniPack();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('di default la scelta è spenta', () => {
    expect(TestBed.inject(LANGUAGE_CHOICE_ENABLED)).toBe(false);
    expect(TestBed.inject(I18nService).choiceEnabled).toBe(false);
  });

  it('con il browser in inglese l\'interfaccia resta in italiano', () => {
    vi.stubGlobal('navigator', { ...navigator, languages: ['en-US', 'en'] });
    const i = TestBed.inject(I18nService);
    i.detect();
    expect(i.locale()).toBe('it');
    expect(document.documentElement.lang).toBe('it');
  });

  it('anche con una lingua inglese salvata in precedenza resta in italiano', () => {
    const g = TestBed.inject(GameStateService);
    g.acceptSaving();
    g.setLocale('en');
    const i = TestBed.inject(I18nService);
    i.detect();
    expect(i.locale()).toBe('it');
  });

  it('la navbar non mostra il selettore IT/EN', () => {
    const f = TestBed.createComponent(Navbar);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.lang')).toBeNull();
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'EN')).toBe(false);
    expect(el.textContent).toContain('Il progetto');
  });
});
