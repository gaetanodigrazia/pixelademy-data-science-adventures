import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { I18nKey } from './it';

/** `{{ 'nav.home' | t }}` o `{{ 'nav.level' | t: { level: 3 } }}`. Non pura: si aggiorna al cambio di lingua. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(key: I18nKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
