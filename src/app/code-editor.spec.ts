import { TestBed } from '@angular/core/testing';
import { CodeEditor } from './shared/components/code-editor';

// Monaco non gira in jsdom: lo si fa fallire in modo deterministico, così il componente usa il ripiego su textarea.
vi.mock('monaco-editor/esm/vs/editor/editor.api.js', () => {
  throw new Error('Monaco non disponibile nei test');
});

describe('CodeEditor', () => {
  async function mount(code = 'print(1)', running = false) {
    const f = TestBed.createComponent(CodeEditor);
    f.componentRef.setInput('starterCode', code);
    f.componentRef.setInput('running', running);
    f.detectChanges();
    await vi.waitFor(() => expect(f.nativeElement.querySelector('textarea')).not.toBeNull(), { timeout: 4000 });
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, ta: f.nativeElement.querySelector('textarea') as HTMLTextAreaElement };
  }
  const btn = (el: HTMLElement, label: string) => el.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  it('mostra il codice di partenza e ha un\'etichetta accessibile', async () => {
    const { ta } = await mount('x = 1');
    expect(ta.value).toBe('x = 1');
    expect(ta.getAttribute('aria-label')).toBe('Editor di codice Python');
  });

  it('«Esegui codice» emette il testo corrente, anche modificato', async () => {
    const { f, el, ta } = await mount('x = 1');
    const run = vi.fn();
    f.componentInstance.runCode.subscribe(run);
    ta.value = 'x = 2';
    ta.dispatchEvent(new Event('input'));
    btn(el, 'Esegui codice').click();
    expect(run).toHaveBeenCalledWith('x = 2');
  });

  it('«Ripristina» riporta il codice di partenza; se cambia il codice di partenza l\'editor si aggiorna', async () => {
    const { f, el, ta } = await mount('x = 1');
    ta.value = 'boh';
    ta.dispatchEvent(new Event('input'));
    f.detectChanges(); // come nel browser: tra la digitazione e il click l'app ridisegna
    btn(el, 'Ripristina codice iniziale').click();
    f.detectChanges();
    expect(ta.value).toBe('x = 1');
    f.componentRef.setInput('starterCode', 'y = 5');
    f.detectChanges();
    expect(ta.value).toBe('y = 5');
  });

  it('durante l\'esecuzione i pulsanti sono disabilitati', async () => {
    const { el } = await mount('x', true);
    expect(btn(el, 'Esegui codice').disabled).toBe(true);
    expect(btn(el, 'Esegui codice').textContent).toContain('In esecuzione');
    expect(btn(el, 'Ripristina codice iniziale').disabled).toBe(true);
  });
});
