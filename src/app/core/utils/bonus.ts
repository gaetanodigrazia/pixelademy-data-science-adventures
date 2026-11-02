/** Errori massimi nella battaglia per avere la possibilità di un bonus. */
export const BONUS_MAX_ERRORS = 1;
/** Probabilità che il bonus compaia, quando ci si è guadagnati la possibilità. */
export const BONUS_CHANCE = 0.5;

/** Il giocatore ha giocato abbastanza bene da poter ricevere il bonus? */
export const bonusEarned = (mistakes: number): boolean => mistakes <= BONUS_MAX_ERRORS;

/** Il bonus compare solo a chi se lo è guadagnato, e solo a volte (a sorpresa). `rnd` serve ai test. */
export function rollBonus(mistakes: number, rnd: () => number = Math.random): boolean {
  return bonusEarned(mistakes) && rnd() < BONUS_CHANCE;
}
