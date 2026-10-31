import { PlayerState } from '../models/player-state.model';

/** Versione corrente dello stato salvato. Ogni cambio di forma incrementa il numero e aggiunge un passo in `STEPS`. */
export const STATE_VERSION = 2;

type Raw = Record<string, unknown>;

/** Passo `n → n+1`: riceve lo stato alla versione `n` e lo porta alla successiva. */
const STEPS: Record<number, (s: Raw) => Raw> = {
  // v1 (nessun `schemaVersion`) → v2: il campo di versione e i valori predefiniti dei campi aggiunti nel tempo
  1: (s) => ({ ...s, liked: s['liked'] === true, solvedCode: typeof s['solvedCode'] === 'object' && s['solvedCode'] ? s['solvedCode'] : {} }),
};

/**
 * Porta uno stato salvato (di qualunque versione, anche senza `schemaVersion`) alla versione corrente.
 * Ritorna `null` se non è un oggetto o se viene da una versione futura (non si prova a interpretarlo).
 */
export function migrateState(raw: unknown): Partial<PlayerState> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  let s = raw as Raw;
  let v = Number.isInteger(s['schemaVersion']) ? (s['schemaVersion'] as number) : 1;
  if (v < 1 || v > STATE_VERSION) return null;
  while (v < STATE_VERSION) {
    s = STEPS[v](s);
    v++;
  }
  return { ...(s as Partial<PlayerState>), schemaVersion: STATE_VERSION };
}

/** Il file di esportazione: lo stato con un'intestazione che lo riconosce. */
export interface StateExport {
  app: 'pixelademy';
  schemaVersion: number;
  state: PlayerState;
}

export function exportState(state: PlayerState): string {
  const out: StateExport = { app: 'pixelademy', schemaVersion: STATE_VERSION, state: { ...state, schemaVersion: STATE_VERSION } };
  return JSON.stringify(out, null, 2);
}

/** Legge un file di esportazione (anche di una versione precedente); `null` se non è valido. */
export function parseExport(text: string): Partial<PlayerState> | null {
  try {
    const data = JSON.parse(text) as Partial<StateExport>;
    if (data?.app !== 'pixelademy' || !data.state) return null;
    return migrateState({ ...data.state, schemaVersion: data.schemaVersion ?? data.state.schemaVersion });
  } catch {
    return null;
  }
}
