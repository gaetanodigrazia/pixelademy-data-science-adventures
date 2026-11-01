import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PythonRunnerService } from './core/services/python-runner.service';
import { CodeEditor } from './shared/components/code-editor';
import { btn, goToTask, openMission, path, setup } from './testing/mission-harness';

const m1 = path.missions[0];
const bar = (el: HTMLElement) => el.querySelector('.hintrow')!;
const labels = (root: Element) => Array.from(root.querySelectorAll('button')).map((b) => b.getAttribute('aria-label') ?? b.textContent!.trim());

describe('barra del task: aiuti e azioni nella stessa riga', () => {
  let run: ReturnType<typeof setup>['run'];
  beforeEach(() => ({ run } = setup()));

  async function task() {
    const o = await openMission(m1.id);
    goToTask(o.f);
    return o;
  }

  it('nella stessa riga ci sono due gruppi divisi da un filetto: aiuti (Suggerimento, Scena) e azioni (Esegui, Ripristina)', async () => {
    const { f, el } = await task();
    const groups = Array.from(bar(el).querySelectorAll('[role=group]'));
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Aiuti', 'Azioni sul codice']);
    expect(groups[0].textContent).toContain('Suggerimento');
    expect(groups[0].textContent).toContain('Scena');
    expect(labels(groups[1]).slice(0, 2)).toEqual(['Esegui codice', 'Ripristina codice iniziale']);
    const sep = bar(el).querySelector('.sep')!;
    expect(sep.getAttribute('aria-hidden')).toBe('true');
    // il filetto sta tra i due gruppi
    expect(groups[0].nextElementSibling).toBe(sep);
    expect(sep.nextElementSibling).toBe(groups[1]);
    f.destroy();
  });

  it('sotto l\'editor non c\'è più la riga dei pulsanti: lo spazio va all\'editor', async () => {
    const { f, el } = await task();
    const editor = el.querySelector('app-code-editor')!;
    expect(editor.querySelector('.row')).toBeNull();
    expect(Array.from(editor.querySelectorAll('button'))).toEqual([]);
    expect(editor.querySelector('textarea, .host')).not.toBeNull();
    f.destroy();
  });

  it('«Esegui codice» esegue il codice dell\'editor; «Ripristina» riporta quello di partenza', async () => {
    const { f, el } = await task();
    await vi.waitFor(() => expect(el.querySelector('textarea')).not.toBeNull(), { timeout: 4000 }).catch(() => undefined);
    const ed = f.debugElement.query(By.directive(CodeEditor)).componentInstance as CodeEditor;
    const runCode = vi.fn();
    ed.runCode.subscribe(runCode);
    btn(el, 'Esegui codice').click();
    expect(runCode).toHaveBeenCalledTimes(1);
    expect(typeof runCode.mock.calls[0][0]).toBe('string');
    const reset = vi.spyOn(ed, 'reset');
    btn(el, 'Ripristina').click();
    expect(reset).toHaveBeenCalledTimes(1);
    f.destroy();
  });

  it('durante l\'esecuzione «Esegui» e «Ripristina» sono disabilitati e compare «Interrompi», che ferma Python', async () => {
    const { f, el } = await task();
    let finish!: () => void;
    run.mockReturnValue(new Promise((r) => (finish = () => r({ output: '' }))));
    const stop = vi.spyOn(TestBed.inject(PythonRunnerService), 'stop');
    expect(btn(el, 'Interrompi')).toBeUndefined();
    f.debugElement.query(By.directive(CodeEditor)).componentInstance.runCode.emit('x');
    f.detectChanges();
    expect((el.querySelector('button[aria-label="Esegui codice"]') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('button[aria-label="Ripristina codice iniziale"]') as HTMLButtonElement).disabled).toBe(true);
    btn(el, 'Interrompi').click();
    expect(stop).toHaveBeenCalled();
    finish();
    await f.whenStable();
    f.detectChanges();
    expect(btn(el, 'Interrompi')).toBeUndefined();
    expect((el.querySelector('button[aria-label="Esegui codice"]') as HTMLButtonElement).disabled).toBe(false);
    f.destroy();
  });

  it('c\'è il pulsante della tastiera (visibile solo su touch) e l\'ordine di Tab è aiuti, azioni, editor', async () => {
    const { f, el } = await task();
    const kb = el.querySelector('button[aria-label="Mostra o nascondi la tastiera"]') as HTMLButtonElement;
    expect(kb).not.toBeNull();
    expect(kb.getAttribute('aria-pressed')).toBe('false');
    const order = Array.from(el.querySelectorAll('.hintrow button, app-code-editor textarea, app-code-editor .host')).map((n) => n.getAttribute('aria-label') ?? n.textContent!.trim().slice(0, 14));
    expect(order.indexOf('Esegui codice')).toBeGreaterThan(order.findIndex((t) => t.includes('Suggerimento')));
    expect(order.indexOf('Ripristina codice iniziale')).toBeGreaterThan(order.indexOf('Esegui codice'));
    f.destroy();
  });
});

describe('CodeEditor: barra interna opzionale', () => {
  it('con toolbar=false non mostra i pulsanti ma run() e reset() funzionano da fuori', async () => {
    const f = TestBed.createComponent(CodeEditor);
    f.componentRef.setInput('starterCode', 'x = 1');
    f.componentRef.setInput('toolbar', false);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('button').length).toBe(0);
    const out = vi.fn();
    f.componentInstance.runCode.subscribe(out);
    await vi.waitFor(() => expect(f.nativeElement.querySelector('textarea')).not.toBeNull(), { timeout: 4000 }).catch(() => undefined);
    f.componentInstance.run();
    expect(out).toHaveBeenCalled();
    expect(typeof f.componentInstance.typing()).toBe('boolean');
  });
});

describe('barra del task: stile', () => {
  const css = readFileSync('src/app/features/mission-detail/mission-detail.ts', 'utf8');
  it('filetto di separazione tra i gruppi; editor più alto (200 px); su telefono i gruppi vanno a capo e il filetto sparisce', () => {
    expect(/\n    \.sep \{([^}]*)\}/.exec(css)?.[1]).toMatch(/width:\s*3px/);
    expect(/\n    \.editor \{([^}]*)\}/.exec(css)?.[1]).toMatch(/min-height:\s*200px/);
    expect(css).toMatch(/\.sep \{ display: none; \}/);
    expect(css).toMatch(/\.group \{ width: 100%; \}/);
  });
});
