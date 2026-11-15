import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { BoardRow } from '../utils/board-server';
import { GameStateService } from './game-state.service';

const API = '/api/classifica';
/** Dopo l'ultimo guadagno di XP si aspetta un po' prima di aggiornare la classifica (un solo invio per serie di missioni). */
const DEBOUNCE_MS = 4000;

/**
 * Classifica globale **facoltativa**. Non succede nulla finché il giocatore non si iscrive di sua volontà (consenso + dichiarazione
 * di avere almeno 14 anni): il sito non contatta la classifica per iscrivere, aggiornare o cancellare. Per vedere la classifica basta
 * aprirla. Si invia solo: numero del giocatore, codice segreto, XP e livello. Niente cookie, `credentials: 'omit'`, `no-referrer`.
 */
@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly game = inject(GameStateService);
  readonly top = signal<BoardRow[]>([]);
  /** `true` mentre una richiesta è in corso. */
  readonly busy = signal(false);
  /** Messaggio d'errore leggibile dell'ultima operazione (vuoto se è andata bene). */
  readonly error = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Gli XP che il server conosce già: si invia solo se cambiano. */
  private sent: number | null = null;

  constructor() {
    // iscritto: ogni cambio di XP (o il primo dopo l'apertura del sito) aggiorna la classifica, con un po' di attesa
    effect((onCleanup) => {
      const board = this.game.board();
      const xp = this.game.xp();
      if (!board) {
        this.sent = null;
        return;
      }
      if (xp === this.sent) return;
      const t = setTimeout(() => untracked(() => void this.sync()), DEBOUNCE_MS);
      onCleanup(() => clearTimeout(t));
    });
  }

  /** Legge la classifica (solo lettura). */
  async refresh(): Promise<void> {
    const r = await this.call({ method: 'GET' });
    if (r.ok) this.top.set((r.data as { top: BoardRow[] }).top ?? []);
  }

  /** Iscrive il giocatore. Servono il consenso al salvataggio locale (il codice va conservato) e le due dichiarazioni. */
  async join(): Promise<boolean> {
    if (this.game.consent() !== 'granted' || this.game.board()) return false;
    const xp = this.game.xp();
    const r = await this.call({ action: 'join', consent: true, adult: true, xp, level: this.game.level() });
    if (!r.ok) return false;
    const d = r.data as { n: number; token: string };
    this.game.setBoard({ n: d.n, token: d.token });
    this.sent = xp;
    await this.refresh();
    return true;
  }

  /** Esce e cancella i propri dati dal server. `true` se non si era iscritti o se la cancellazione è riuscita. */
  async leave(): Promise<boolean> {
    const board = this.game.board();
    if (!board) return true;
    const r = await this.call({ action: 'leave', n: board.n, token: board.token });
    // 404: già cancellato (per esempio per inattività): vale come cancellato
    if (!r.ok && r.status !== 404) return false;
    this.game.setBoard(null);
    this.sent = null;
    await this.refresh();
    return true;
  }

  private async sync(): Promise<void> {
    const board = this.game.board();
    if (!board) return;
    const xp = this.game.xp();
    const r = await this.call({ action: 'update', n: board.n, token: board.token, xp, level: this.game.level() }, true);
    if (r.ok) {
      this.sent = xp;
      return;
    }
    if (r.status === 404 || r.status === 403) this.game.setBoard(null); // l'iscrizione non esiste più: non si riprova all'infinito
    else if (r.status === 429 || r.status === 0 || r.status >= 500) {
      // troppo presto o servizio non raggiungibile: si riprova più tardi
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.sync(), DEBOUNCE_MS * 2);
    }
  }

  private async call(init: { method: 'GET' } | Record<string, unknown>, quiet = false): Promise<{ ok: boolean; status: number; data: unknown }> {
    if (typeof fetch !== 'function') return { ok: false, status: 0, data: null };
    const get = 'method' in init;
    if (!quiet) {
      this.busy.set(true);
      this.error.set('');
    }
    try {
      const res = await fetch(API, {
        method: get ? 'GET' : 'POST',
        ...(get ? {} : { body: JSON.stringify(init), headers: { 'content-type': 'application/json' } }),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok && !quiet) this.error.set((data as { error?: string } | null)?.error ?? 'error');
      return { ok: res.ok, status: res.status, data };
    } catch {
      if (!quiet) this.error.set('offline');
      return { ok: false, status: 0, data: null };
    } finally {
      if (!quiet) this.busy.set(false);
    }
  }
}
