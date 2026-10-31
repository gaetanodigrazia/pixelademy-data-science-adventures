import { TestBed } from '@angular/core/testing';
import { PrivacyModal } from './shared/components/privacy-modal';
import { GameStateService } from './core/services/game-state.service';
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
});
