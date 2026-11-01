import { TestBed } from '@angular/core/testing';
import { PrivacyModal } from './shared/components/privacy-modal';
import { GameStateService } from './core/services/game-state.service';
import { ContentRegistryService } from './core/services/content-registry.service';
import { useMiniPack } from './testing/mini-pack';

describe('PrivacyModal', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function mount(open = true) {
    useMiniPack();
    const f = TestBed.createComponent(PrivacyModal);
    f.componentRef.setInput('open', open);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, game: TestBed.inject(GameStateService) };
  }
  const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

  it('chiusa non mostra nulla; aperta spiega che non ci sono account né dati personali', () => {
    expect(mount(false).el.querySelector('[role=dialog]')).toBeNull();
    const { el } = mount();
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
    expect(el.textContent).toContain('non ha server né account');
    expect(el.textContent).toContain('Non raccogliamo dati personali');
    expect(el.textContent).toContain('scelta da fare');
  });

  it('accetta il salvataggio, rifiuta, cancella i dati e azzera i progressi, con messaggio e stato aggiornato', () => {
    const { f, el, game } = mount();
    btn(el, 'Accetta il salvataggio').click();
    f.detectChanges();
    expect(game.consent()).toBe('granted');
    expect(el.textContent).toContain('salvataggio attivo');
    expect(el.querySelector('[role=status]')!.textContent).toContain('Salvataggio attivato');
    expect(btn(el, 'Accetta il salvataggio').disabled).toBe(true);

    btn(el, 'Usa senza salvare').click();
    f.detectChanges();
    expect(game.consent()).toBe('denied');
    expect(localStorage.getItem('pixelademy.player.v1')).toBeNull();

    btn(el, 'Cancella dati salvati').click();
    f.detectChanges();
    expect(game.consent()).toBe('unknown');
    expect(localStorage.getItem('pixelademy.consent.v1')).toBeNull();
  });

  it('si chiude con Esc, con «Chiudi» e con il click sullo sfondo; il Tab resta dentro', () => {
    const { f, el } = mount();
    let closed = 0;
    f.componentInstance.closed.subscribe(() => closed++);
    el.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    btn(el, 'Chiudi').click();
    (el.querySelector('.backdrop') as HTMLElement).click();
    expect(closed).toBe(3);

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const last = buttons[buttons.length - 1];
    last.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('esporta i progressi come file e li reimporta; un file non valido è segnalato senza cambiare nulla', async () => {
    const { f, el, game } = mount();
    let downloaded = '';
    vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => { void b.text().then((t) => (downloaded = t)); return 'blob:x'; }, revokeObjectURL: () => undefined });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    game.completeMission(TestBed.inject(ContentRegistryService).missions()[0]);
    btn(el, 'Esporta i progressi').click();
    f.detectChanges();
    expect(el.querySelector('[role=status]')!.textContent).toContain('scaricato');
    await new Promise((r) => setTimeout(r));
    expect(JSON.parse(downloaded)).toMatchObject({ app: 'pixelademy' });

    const input = el.querySelector('input[type=file]') as HTMLInputElement;
    const pick = async (text: string) => {
      Object.defineProperty(input, 'files', { value: [new File([text], 'p.json')], configurable: true });
      input.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r));
      f.detectChanges();
    };
    game.resetProgress();
    await pick(downloaded);
    expect(el.querySelector('[role=status]')!.textContent).toContain('importati');
    expect(game.xp()).toBeGreaterThan(0);
    const xp = game.xp();
    await pick('boh');
    expect(el.querySelector('[role=status]')!.textContent).toContain('non è valido');
    expect(game.xp()).toBe(xp);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});

describe('PrivacyModal: nessuna raccolta di statistiche', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('non c\'è nessuna casella né testo sulle statistiche anonime: solo il salvataggio locale', () => {
    useMiniPack();
    const f = TestBed.createComponent(PrivacyModal);
    f.componentRef.setInput('open', true);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('input[type=checkbox]')).toBeNull();
    expect(el.textContent).not.toMatch(/statistic|contribuisci|tentativi|abbandon/i);
    expect(el.textContent).toContain('Non raccogliamo dati personali');
  });
});
