export interface PlayerState {
  xp: number;
  level: number;
  completedMissionIds: string[];
  /** Codice con cui è stata superata ogni missione: i pezzi del progetto del percorso. */
  solvedCode: Record<string, string>;
  selectedCharacterId: string;
  selectedPathId: string;
  /** Ha già espresso il «Mi piace» al progetto (anonimo: conta solo il totale). */
  liked: boolean;
}

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

export interface RewardSummary {
  gainedXp: number;
  newLevel: number | null;
}
