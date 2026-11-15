import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { GameStateService } from './game-state.service';

const API = '/api/visite';

/**
 * Il contatore di visite anonimo. All'apertura del sito invia **una richiesta vuota** che aumenta di 1 un numero: niente cookie,
 * niente `localStorage` né `sessionStorage`, niente corpo, niente intestazioni identificative (`credentials: 'omit'`, `no-referrer`).
 * Conta caricamenti, non persone: chi ricarica conta ancora.
 *
 * Non conta (legge soltanto il totale) chi ha chiesto di non essere tracciato (Do Not Track o Global Privacy Control), i browser
 * automatici (`navigator.webdriver`: controlli e test) e l'esecuzione in locale.
 *
 * Con il consenso al salvataggio, dopo il conteggio si ricorda nello stato del giocatore il giorno (`countedDay`): lo stesso giorno non si
 * conta di nuovo (si legge soltanto). Senza consenso non si salva nulla e si conta a ogni apertura.
 */
@Injectable({ providedIn: 'root' })
export class VisitService {
  /** Totale delle visite; `null` finché non si conosce (o se il servizio non risponde). */
  readonly count = signal<number | null>(null);
  private registered = false;
  private readonly game = inject(GameStateService);
  /** La visita di questa apertura è stata contata: se il consenso arriva dopo, la data si salva subito. */
  private counted = false;

  constructor() {
    effect(() => {
      if (this.game.consent() === 'granted' && this.counted) untracked(() => { if (!this.game.countedToday()) this.game.markCounted(); });
    });
  }

  /** Il visitatore va contato? */
  static shouldCount(): boolean {
    if (typeof navigator === 'undefined' || typeof location === 'undefined') return false;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    const dnt = nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || nav.msDoNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1';
    if (dnt || nav.globalPrivacyControl === true) return false;
    if (nav.webdriver) return false;
    return !['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  }

  /** Registra la visita (una sola volta per apertura del sito) e aggiorna il totale. */
  async register(): Promise<void> {
    if (this.registered) return;
    this.registered = true;
    // già contata oggi (con il consenso al salvataggio): si legge soltanto
    if (!VisitService.shouldCount() || this.game.countedToday()) {
      await this.call('GET');
      return;
    }
    if (await this.call('POST')) {
      this.counted = true;
      this.game.markCounted(); // no-op senza consenso
    }
  }

  /** Legge il totale senza contare (pagina «Il progetto»). */
  async load(): Promise<void> {
    if (this.count() !== null) return;
    await this.call('GET');
  }

  /** `true` se la richiesta è andata a buon fine e il totale è noto. */
  private async call(method: 'GET' | 'POST'): Promise<boolean> {
    if (typeof fetch !== 'function') return false;
    try {
      const r = await fetch(API, { method, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) return false;
      const { count } = (await r.json()) as { count: unknown };
      if (typeof count !== 'number') return false;
      this.count.set(count);
      return true;
    } catch {
      return false; // offline, o in locale senza la funzione: il sito funziona lo stesso
    }
  }
}
