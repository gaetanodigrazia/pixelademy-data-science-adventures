import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, output, signal, viewChild } from '@angular/core';

/** Editor Python basato su Monaco, con ripiego su textarea se Monaco non è disponibile. */
@Component({
  selector: 'app-code-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor-wrap" (click)="tapFocus()">
      <div #host class="host" [hidden]="fallback()" aria-label="Editor di codice Python"></div>
      @if (fallback()) {
        <textarea #ta class="fallback" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Editor di codice Python"
          [value]="text()" (input)="text.set($any($event.target).value)" (focus)="typing.set(true)" (blur)="typing.set(false)"></textarea>
      }
    </div>
    <div class="row left">
      <button type="button" class="btn primary" [disabled]="running()" (click)="run()" aria-label="Esegui codice">
        {{ running() ? 'In esecuzione…' : '▶ Esegui codice' }}
      </button>
      <button type="button" class="btn" [disabled]="running()" (click)="reset()" aria-label="Ripristina codice iniziale" title="Ripristina codice iniziale">↺<span class="lbl"> Ripristina</span></button>
      <!-- Solo su touch: apre/chiude la tastiera. Il pulsante non ruba il fuoco all'editor, altrimenti chiuderla la riaprirebbe. -->
      <button type="button" class="btn kb" [attr.aria-pressed]="typing()" aria-label="Mostra o nascondi la tastiera"
        (pointerdown)="$event.preventDefault()" (mousedown)="$event.preventDefault()" (click)="toggleKeyboard()">⌨ {{ typing() ? 'Chiudi' : 'Scrivi' }}</button>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
    .editor-wrap { flex: 1; min-height: 80px; border: 3px solid var(--line); background: #1e1e1e; }
    .host { height: 100%; }
    .fallback { width: 100%; height: 100%; background: #1e1e1e; color: #e6e6e6; font: 14px 'Courier New', monospace; border: 0; padding: 8px; resize: none; }
    @media (max-width: 600px) { .fallback { padding: 6px; } }
    .left { justify-content: flex-start; margin: 0; }
    .kb { display: none; }
    @media (hover: none) and (pointer: coarse) { .kb { display: inline-block; } }
    /* Telefono: «Ripristina» diventa una sola icona, così i tre pulsanti stanno su una riga. */
    @media (max-width: 600px) { .lbl { display: none; } }
  `,
})
export class CodeEditor implements AfterViewInit, OnDestroy {
  readonly starterCode = input.required<string>();
  readonly running = input(false);
  readonly runCode = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  protected readonly fallback = signal(false);
  protected readonly text = signal('');
  private readonly ta = viewChild<ElementRef<HTMLTextAreaElement>>('ta');
  /** L'editor ha il fuoco (la tastiera del telefono è aperta o sta per aprirsi). */
  protected readonly typing = signal(false);
  private editor?: {
    getValue(): string; setValue(v: string): void; dispose(): void; focus(): void;
    onDidFocusEditorText(cb: () => void): unknown; onDidBlurEditorText(cb: () => void): unknown;
  };

  constructor() {
    effect(() => {
      const code = this.starterCode();
      this.text.set(code);
      this.editor?.setValue(code);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      const monaco = await import('monaco-editor/esm/vs/editor/editor.api.js');
      await import('monaco-editor/esm/vs/basic-languages/python/python.contribution.js');
      if (!this.host().nativeElement.isConnected) return;
      // Telefono: carattere piccolo, margini ridotti e righe lunghe a capo, così il codice si legge senza scorrere di lato.
      const compact = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 600px)').matches;
      this.editor = monaco.editor.create(this.host().nativeElement, {
        value: this.starterCode(),
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: compact ? 11 : 14,
        lineHeight: compact ? 16 : undefined,
        scrollBeyondLastLine: false,
        tabSize: 4,
        ariaLabel: 'Editor di codice Python',
        ...(compact
          ? {
              wordWrap: 'on' as const,
              lineNumbersMinChars: 2,
              lineDecorationsWidth: 4,
              glyphMargin: false,
              folding: false,
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }
          : {}),
      });
      this.editor.onDidFocusEditorText(() => this.typing.set(true));
      this.editor.onDidBlurEditorText(() => this.typing.set(false));
    } catch {
      this.fallback.set(true);
    }
  }

  /**
   * Un tocco sull'editor mette a fuoco il campo di testo dentro il gesto dell'utente: iOS mostra la tastiera solo così
   * (Monaco mette a fuoco su pointerdown, che per Safari non basta).
   */
  protected tapFocus(): void {
    this.editor?.focus();
  }

  protected toggleKeyboard(): void {
    const area = this.ta()?.nativeElement;
    if (this.typing()) {
      (area ?? (document.activeElement as HTMLElement | null))?.blur();
    } else if (area) {
      area.focus();
    } else {
      this.editor?.focus();
    }
  }

  protected run(): void {
    this.runCode.emit(this.editor ? this.editor.getValue() : this.text());
  }

  protected reset(): void {
    this.text.set(this.starterCode());
    this.editor?.setValue(this.starterCode());
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
  }
}
