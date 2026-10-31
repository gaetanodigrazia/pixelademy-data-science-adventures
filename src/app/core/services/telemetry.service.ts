import { Injectable, inject } from '@angular/core';
import { EventType } from '../utils/event-counter';
import { GameStateService } from './game-state.service';

const API = '/api/eventi';

/**
 * Statistiche anonime: invia un evento aggregato solo se l'utente ha acconsentito al salvataggio **e** ha attivato
 * le statistiche (opt-in). Il corpo è solo `{ type, mission }`: niente identificativi, niente cookie, niente referrer.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly game = inject(GameStateService);

  get enabled(): boolean {
    return this.game.consent() === 'granted' && this.game.state().telemetry === true;
  }

  record(type: EventType, mission: string): void {
    if (!this.enabled) return;
    try {
      void fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, mission }),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* le statistiche non devono mai disturbare il gioco */
    }
  }
}
