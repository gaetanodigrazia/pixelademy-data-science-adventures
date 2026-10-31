import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './shared/components/modal';

@Component({
  imports: [Modal],
  template: `
    <button id="apri">Apri</button>
    @if (open()) {
      <app-modal title="Titolo di prova" [wide]="true" (closed)="open.set(false)">
        <button id="uno">Uno</button>
        <button id="due">Due</button>
      </app-modal>
    }
  `,
})
class Host {
  readonly open = signal(true);
}

describe('Modal', () => {
  async function mount() {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }
  const dialog = (el: HTMLElement) => el.querySelector('[role=dialog]') as HTMLElement | null;

  it('è un dialog modale con titolo, e prende il focus', async () => {
    const { el } = await mount();
    const d = dialog(el)!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toBe('Titolo di prova');
    expect(d.classList.contains('wide')).toBe(true);
    expect(document.activeElement).toBe(d);
  });

  it('Esc chiude la modale e il pulsante ✕ pure', async () => {
    const { f, el } = await mount();
    dialog(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(dialog(el)).toBeNull();

    f.componentInstance.open.set(true);
    f.detectChanges();
    (el.querySelector('button[aria-label=Chiudi]') as HTMLButtonElement).click();
    f.detectChanges();
    expect(dialog(el)).toBeNull();
  });

  it('il click sullo sfondo chiude, quello dentro no', async () => {
    const { f, el } = await mount();
    dialog(el)!.click();
    f.detectChanges();
    expect(dialog(el)).not.toBeNull();
    (el.querySelector('.backdrop') as HTMLElement).click();
    f.detectChanges();
    expect(dialog(el)).toBeNull();
  });

  it('blocca lo scroll della pagina finché è aperta e lo ripristina alla chiusura', async () => {
    const { f, el } = await mount();
    expect(document.body.style.overflow).toBe('hidden');
    (el.querySelector('.backdrop') as HTMLElement).click();
    f.detectChanges();
    await f.whenStable();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('il Tab non esce dalla modale: dall\'ultimo pulsante torna al primo', async () => {
    const { el } = await mount();
    const buttons = Array.from(dialog(el)!.querySelectorAll('button'));
    const last = buttons[buttons.length - 1];
    last.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });
});
