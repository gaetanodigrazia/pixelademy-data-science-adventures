export interface PlayerState {
  /** Versione dello schema salvato: permette di migrare i progressi senza perderli (vedi `state-migrations.ts`). */
  schemaVersion: number;
  xp: number;
  level: number;
  completedMissionIds: string[];
  /** Codice con cui è stata superata ogni missione: i pezzi del progetto del percorso. */
  solvedCode: Record<string, string>;
  selectedCharacterId: string;
  selectedPathId: string;
  /** Ha già espresso il «Mi piace» al progetto (anonimo: conta solo il totale). */
  liked: boolean;
  /** Ha scelto di contribuire con statistiche anonime e aggregate (opt-in, spento di default). */
  telemetry: boolean;
  /** Lingua dell'interfaccia scelta dall'utente (se manca si usa quella del browser). */
  locale?: 'it' | 'en';
}

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

export interface RewardSummary {
  gainedXp: number;
  newLevel: number | null;
}
