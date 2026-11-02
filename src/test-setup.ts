import { beforeEach } from 'vitest';
import { bonusSettings } from './app/core/utils/bonus';

/**
 * Il bonus platform si sblocca con al massimo 1 errore nella battaglia (vedi `core/utils/bonus.ts`): nei test è spento di default,
 * così le missioni vanno dritte al task. Chi prova il bonus lo riaccende con `bonusSettings.enabled = true`.
 */
beforeEach(() => {
  bonusSettings.enabled = false;
});
