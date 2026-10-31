import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { SHARE_TEXT_COPIED, SHARE_TEXT_NOT_COPIED, ShareService } from '../../core/services/share.service';
import { shareLink, shareText, ShareImageInput } from '../../core/utils/share-image';
import { Modal } from './modal';

/**
 * Condivisione dei risultati su LinkedIn. Si condivide l'indirizzo di una pagina con l'immagine della Dashboard nei meta-tag
 * Open Graph: LinkedIn la mostra come grande foto nel post. Qui anteprima dell'immagine, testo del post e pulsanti.
 */
@Component({
  selector: 'app-share-modal',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Condividi i tuoi risultati" [wide]="true" (closed)="closed.emit()">
      @if (preview(); as url) {
        <img class="preview" [src]="url" alt="Anteprima dell'immagine della Dashboard da condividere" />
      } @else if (failed()) {
        <p class="err" role="alert">Non sono riuscito a creare l'immagine su questo dispositivo.</p>
      } @else {
        <p class="status" role="status">Preparo l'immagine…</p>
      }

      <label class="lbl" for="post-text">Testo del post (puoi modificarlo)</label>
      <textarea id="post-text" class="post" rows="5" spellcheck="true" [value]="text()" (input)="text.set($any($event.target).value)"></textarea>

      @if (touch) {
        <div class="row">
          <button type="button" class="btn primary" (click)="shareLink()">🔗 Condividi su LinkedIn</button>
          <button type="button" class="btn" [disabled]="!file()" (click)="saveImage()">📷 Salva immagine</button>
          <button type="button" class="btn" (click)="copyText()">📋 Copia testo</button>
        </div>
        <p class="status" role="status" aria-live="polite">{{ message() }}</p>
        <p class="note">«Condividi» apre il foglio di condivisione: scegli la piattaforma e incolla il testo già copiato. Se la foto non compare, usa «Salva immagine».</p>
      } @else {
        <div class="row">
          <button type="button" class="btn primary" [disabled]="!file()" (click)="share()">🔗 Condividi su LinkedIn</button>
          <button type="button" class="btn" [disabled]="!file()" (click)="save()">⬇ Scarica immagine</button>
          <button type="button" class="btn" (click)="copyText()">📋 Copia testo</button>
        </div>
        <p class="status" role="status" aria-live="polite">{{ message() }}</p>
        <p class="note">Si apre LinkedIn con il testo già scritto: dal link nel testo LinkedIn ricava da solo l'anteprima con la Dashboard come foto. L'immagine viene anche copiata e salvata, pronta da incollare (Ctrl+V o ⌘V) o allegare.</p>
      }
      <p class="note">L'immagine mostra solo i risultati del progetto, nessun dato personale.</p>
    </app-modal>
  `,
  styles: `
    .preview { display: block; width: 100%; height: auto; border: 3px solid var(--line); margin-bottom: 8px; image-rendering: auto; }
    .lbl { display: block; font-size: .5rem; color: var(--muted); margin: 4px 0 2px; }
    .post { width: 100%; resize: vertical; padding: 6px 8px; background: #020617; color: var(--text); border: 2px solid var(--line); font: .6rem/1.6 var(--mono); }
    .note { margin: 4px 0 0; font-size: .45rem; line-height: 1.6; color: var(--muted); }
    .status, .err { margin: 4px 0; font-size: .55rem; }
  `,
})
export class ShareModal {
  private readonly service = inject(ShareService);

  readonly data = input.required<ShareImageInput>();
  /** Nome del file scaricato (di solito l'id del percorso). */
  readonly slug = input('dashboard');
  /** Identificativo del percorso: serve all'indirizzo della pagina di anteprima. */
  readonly pathId = input('');
  readonly closed = output<void>();

  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly failed = signal(false);
  protected readonly message = signal('');
  protected readonly text = signal('');
  /** Telefono o tablet (dito, niente mouse): foglio di condivisione al posto del collegamento diretto a LinkedIn. */
  protected readonly touch = typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
  /** L'indirizzo della pagina con l'anteprima (la Dashboard come foto) da condividere. */
  protected readonly link = computed(() => (this.pathId() && typeof location !== 'undefined' ? shareLink(location.origin, this.pathId()) : ''));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());

    // L'immagine si prepara subito: al tocco su «Condividi» deve essere già pronta (i browser vogliono i gesti senza attese).
    effect(() => {
      const d = this.data();
      const slug = this.slug();
      const link = this.link();
      untracked(() => {
        this.text.set(shareText(d, link));
        this.file.set(null);
        this.failed.set(false);
        this.revoke();
        this.service.prepare(d, `pixelademy-dashboard-${slug.replace(/^adventure-core-/, '')}.png`).then(
          (f) => {
            this.file.set(f);
            this.preview.set(URL.createObjectURL(f));
          },
          () => this.failed.set(true),
        );
      });
    });
  }

  private revoke(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }

  /** Computer: apre LinkedIn con il testo (che contiene il link all'anteprima) e copia/scarica l'immagine. */
  protected async share(): Promise<void> {
    const f = this.file();
    if (!f) return;
    const r = await this.service.share(f, this.text());
    this.message.set(
      [
        r.opened ? 'Ho aperto LinkedIn.' : 'Apri LinkedIn e crea un nuovo post.',
        r.copied ? 'Immagine copiata: incollala nel post (Ctrl+V o ⌘V).' : '',
        r.downloaded ? "L'immagine è stata salvata come file: allegala al post con l'icona delle foto." : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  /** Telefono: foglio di condivisione con il link alla pagina di anteprima, e testo completo negli appunti. */
  protected async shareLink(): Promise<void> {
    const link = this.link();
    const full = this.text();
    // il link viaggia come `url`: nel testo del foglio non va ripetuto
    const body = link ? full.split(link).join('').replace(/\n*Prova anche tu:\s*\n?/, '\n').trim() : full;
    const r = await this.service.shareLink(link, body, full);
    if (r.kind === 'cancelled') this.message.set('');
    else if (r.kind === 'composer') this.message.set('Ho aperto LinkedIn con il testo: LinkedIn mostrerà la Dashboard come foto dal link.');
    else {
      this.message.set(r.textCopied ? SHARE_TEXT_COPIED : SHARE_TEXT_NOT_COPIED);
    }
  }

  /** Salva l'immagine (telefono: foglio con «Salva immagine»; altrove: download), per allegarla a mano al post. */
  protected async saveImage(): Promise<void> {
    const f = this.file();
    if (!f) return;
    const r = await this.service.saveImage(f);
    this.message.set(
      r === 'shared'
        ? "Nel foglio scegli «Salva immagine»: la foto va nel rullino; poi allegala al post con l'icona della foto."
        : r === 'downloaded'
          ? "Immagine salvata come file (la trovi in File o nei download): allegala al post con l'icona della foto."
          : r === 'failed'
            ? "Non sono riuscito a salvare l'immagine."
            : '',
    );
  }

  protected save(): void {
    const f = this.file();
    if (f) this.message.set(this.service.download(f) ? 'Immagine salvata: la trovi tra i download.' : 'Non sono riuscito a salvare il file.');
  }

  protected async copyText(): Promise<void> {
    this.message.set((await this.service.copyText(this.text())) ? 'Testo copiato.' : 'Copia non riuscita: seleziona il testo e copialo a mano.');
  }
}
