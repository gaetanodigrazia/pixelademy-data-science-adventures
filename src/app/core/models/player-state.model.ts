/** Il miglior risultato su una sfida: XP guadagnati, secondi impiegati ed errori. */
export interface ChallengeRecord {
  xp: number;
  seconds: number;
  errors: number;
  /** Quando è stato ottenuto (ms dal 1970). */
  at: number;
}

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
  /** Lingua dell'interfaccia scelta dall'utente (se manca si usa quella del browser). */
  locale?: 'it' | 'en';
  /** Classifica locale: il miglior risultato di ogni sfida, per id di missione. */
  records: Record<string, ChallengeRecord>;
  /**
   * Il giorno (UTC, `AAAA-MM-GG`) in cui questa apertura del sito è già stata contata dal contatore anonimo, per non contarla di nuovo
   * lo stesso giorno. Si salva solo con il consenso al salvataggio, come il resto, e non identifica nessuno.
   */
  countedDay?: string;
}

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

export interface RewardSummary {
  gainedXp: number;
  /** È la prima volta che la missione viene superata (anche con 0 XP): la missione si completa e il progetto avanza. */
  firstTime: boolean;
  newLevel: number | null;
}
