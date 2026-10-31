import { Injectable } from '@angular/core';
import { linkedInComposerUrl, renderShareImage, ShareImageInput } from '../utils/share-image';

/** Dopo il foglio di condivisione (telefono): il testo è negli appunti. Lo stesso messaggio per ogni condivisione. */
export const SHARE_TEXT_COPIED = 'Il testo è già copiato: tieni premuto e scegli Incolla nella piattaforma scelta per la condivisione.';
export const SHARE_TEXT_NOT_COPIED = 'Il testo non si è copiato: usa «Copia testo» e incollalo.';

/** Computer: si apre LinkedIn con il testo e l'immagine viene copiata e/o scaricata, da incollare o allegare. */
export interface ShareResult {
  copied: boolean;
  downloaded: boolean;
  opened: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  /** L'immagine PNG della Dashboard, come file. */
  async prepare(input: ShareImageInput, name: string): Promise<File> {
    return new File([await renderShareImage(input)], name, { type: 'image/png' });
  }

  /** Il dispositivo sa condividere un file (telefoni, alcuni browser): si apre il foglio di condivisione con LinkedIn tra le app. */
  canShareFile(file: File): boolean {
    try {
      return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }

  /**
   * Computer: apre subito LinkedIn con il testo (dentro il gesto dell'utente, con il file già pronto: i browser bloccano le
   * finestre se prima si aspetta qualcosa di lento), poi copia e scarica l'immagine per incollarla o allegarla.
   * Non si usa il foglio di condivisione del sistema: LinkedIn non vi compare, né riceve immagini da lì.
   */
  async share(file: File, text: string): Promise<ShareResult> {
    const win = this.openComposer(text);
    const copied = await this.copyImage(file);
    const downloaded = this.download(file);
    return { copied, downloaded, opened: !!win };
  }

  /** Apre il compositore di LinkedIn con il testo. Senza `noopener` tra le opzioni, così `window.open` restituisce la finestra e si sa se è partita. */
  private openComposer(text: string): Window | null {
    if (typeof window.open !== 'function') return null;
    const win = window.open(linkedInComposerUrl(text), '_blank');
    if (win) win.opener = null;
    return win;
  }

  /**
   * Telefono, passo 1: salva l'immagine. Il foglio di condivisione (con il solo file) offre «Salva immagine» e «Salva in File»;
   * LinkedIn non riceve immagini da lì, quindi la foto si allega a mano dal rullino.
   */
  async saveImage(file: File): Promise<'shared' | 'cancelled' | 'downloaded' | 'failed'> {
    if (this.canShareFile(file)) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'cancelled';
      }
    }
    return this.download(file) ? 'downloaded' : 'failed';
  }

  /**
   * Telefono: foglio di condivisione con il LINK alla pagina di anteprima. LinkedIn la mostra come post con la Dashboard in
   * grande (immagine Open Graph); il testo non si può precompilare, quindi `copy` (testo completo) va negli appunti, da incollare.
   * Senza foglio di condivisione si apre il compositore di LinkedIn con il testo.
   */
  async shareLink(url: string, text: string, copy: string): Promise<{ kind: 'shared' | 'cancelled' | 'composer'; textCopied: boolean }> {
    const copied = this.copyText(copy); // nello stesso gesto, prima di lasciare la pagina
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(url ? { url, text } : { text });
        return { kind: 'shared', textCopied: await copied };
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return { kind: 'cancelled', textCopied: await copied };
      }
    }
    this.openComposer(copy);
    return { kind: 'composer', textCopied: await copied };
  }

  download(file: File): boolean {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return true;
    } catch {
      return false;
    }
  }

  async copyImage(file: File): Promise<boolean> {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
      await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
      return true;
    } catch {
      return false;
    }
  }

  async copyText(s: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      return false;
    }
  }
}
