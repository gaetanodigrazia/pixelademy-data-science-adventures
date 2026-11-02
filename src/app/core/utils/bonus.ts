/** Errori massimi nella battaglia per sbloccare il bonus. */
export const BONUS_MAX_ERRORS = 1;

/** Interruttore: i test lo spengono (così le missioni vanno dritte al task) e lo riaccendono quelli che provano il bonus. */
export const bonusSettings = { enabled: true };

/** Il giocatore ha giocato abbastanza bene da sbloccare il bonus? */
export const bonusEarned = (mistakes: number): boolean => mistakes <= BONUS_MAX_ERRORS;

/** Il bonus si sblocca (sempre, senza sorteggio) con al massimo `BONUS_MAX_ERRORS` errori nella battaglia. */
export const unlockBonus = (mistakes: number): boolean => bonusSettings.enabled && bonusEarned(mistakes);
