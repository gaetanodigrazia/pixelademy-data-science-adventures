import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { GameStateService } from '../services/game-state.service';
import { EN } from './en';
import { I18nKey, IT } from './it';

/**
 * Interruttore della scelta della lingua (rilevazione dal browser e selettore IT/EN). È **spento**: tradotti ci sono solo navbar,
 * consenso, privacy e home, quindi con l'inglese l'interfaccia sarebbe mista. Si riaccende quando le traduzioni sono complete
 * (vedi la issue #82): in un test o in `app.config.ts` basta fornire `{ provide: LANGUAGE_CHOICE_ENABLED, useValue: true }`.
 */
export const LANGUAGE_CHOICE_ENABLED = new InjectionToken<boolean>('LANGUAGE_CHOICE_ENABLED', { providedIn: 'root', factory: () => false });

export type Locale = 'it' | 'en';
export const LOCALES: Locale[] = ['it', 'en'];
const DICTIONARIES: Record<Locale, Record<I18nKey, string>> = { it: IT, en: EN };

/** La lingua sceglibile dalla lingua del browser: `en*` → inglese, tutto il resto → italiano. */
export function pickLocale(languages: readonly string[] | undefined): Locale {
  return languages?.[0]?.toLowerCase().startsWith('en') ? 'en' : 'it';
}

/**
 * Traduzioni dell'interfaccia (it/en). Parte in italiano; `detect()` (chiamata all'avvio dell'app) sceglie dalla lingua del
 * browser, a meno che l'utente abbia già scelto (scelta salvata con il consenso). I contenuti didattici (teoria, missioni, giochi)
 * non sono ancora tradotti: restano in italiano.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly game = inject(GameStateService);
  readonly locale = signal<Locale>('it');
  /** La scelta della lingua è disponibile (selettore e rilevazione dal browser)? */
  readonly choiceEnabled = inject(LANGUAGE_CHOICE_ENABLED);

  detect(): void {
    if (!this.choiceEnabled) {
      this.apply('it'); // scelta disattivata: sempre italiano, anche con browser in inglese o una lingua salvata
      return;
    }
    const saved = this.game.state().locale;
    this.apply(saved ?? pickLocale(typeof navigator !== 'undefined' ? navigator.languages : undefined));
  }

  setLocale(l: Locale): void {
    this.apply(l);
    this.game.setLocale(l);
  }

  /** Il testo per `key` nella lingua corrente, con i segnaposto `{nome}` sostituiti. */
  t(key: I18nKey, params: Record<string, string | number> = {}): string {
    return DICTIONARIES[this.locale()][key].replace(/\{(\w+)\}/g, (all, name: string) => (name in params ? String(params[name]) : all));
  }

  private apply(l: Locale): void {
    this.locale.set(l);
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  }
}
