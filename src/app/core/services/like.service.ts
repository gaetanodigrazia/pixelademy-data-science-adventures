import { Injectable, inject, signal } from '@angular/core';
import { GameStateService } from './game-state.service';

const API = '/api/mi-piace';

/** Il «Mi piace» anonimo: legge e aumenta un contatore globale. Non invia nulla di sé (niente corpo, niente identificativi). */
@Injectable({ providedIn: 'root' })
export class LikeService {
  /** Totale dei «Mi piace»; `null` finché non si conosce (o se il servizio non risponde). */
  readonly count = signal<number | null>(null);
  readonly sending = signal(false);
  private readonly game = inject(GameStateService);
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    await this.call('GET');
  }

  /** Aumenta il contatore. Ritorna `true` se il «Mi piace» è stato registrato. */
  async like(): Promise<boolean> {
    this.sending.set(true);
    try {
      return await this.call('POST');
    } finally {
      this.sending.set(false);
    }
  }

  /** Il «Mi piace» dei pulsanti: una volta sola per giocatore (si ricorda nello stato). */
  async likeOnce(): Promise<void> {
    if (this.game.liked() || this.sending()) return;
    if (await this.like()) this.game.markLiked();
  }

  private async call(method: 'GET' | 'POST'): Promise<boolean> {
    try {
      const r = await fetch(API, { method, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) return false;
      const { count } = (await r.json()) as { count: unknown };
      if (typeof count !== 'number') return false;
      this.count.set(count);
      return true;
    } catch {
      return false; // offline, o in locale senza la funzione: il pulsante c'è ma non succede nulla
    }
  }
}
