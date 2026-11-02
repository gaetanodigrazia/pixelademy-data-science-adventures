import { beforeEach, vi } from 'vitest';

/**
 * Il bonus platform compare a caso dopo una buona battaglia (vedi `core/utils/bonus.ts`): nei test il sorteggio è fisso su «niente bonus»,
 * così le missioni vanno dritte al task e i test non sono instabili. Chi prova il bonus imposta `Math.random` a un valore basso.
 */
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
});
