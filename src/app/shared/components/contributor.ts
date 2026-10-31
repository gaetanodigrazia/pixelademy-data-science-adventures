import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Contributor } from '../../core/models/content-pack.model';

/** «Contributor: nome», con il nome che porta al profilo (apre in una nuova scheda) se il percorso ne indica l'indirizzo. */
@Component({
  selector: 'app-contributor',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ 'home.contributor' | t }}{{ ' ' }}@if (link() && contributor().url; as url) {
      <a [href]="url" target="_blank" rel="noopener noreferrer">{{ contributor().name }}</a>
    } @else {
      {{ contributor().name }}
    }`,
  styles: `:host { color: var(--muted); } a { color: var(--accent); }`,
})
export class ContributorLine {
  readonly contributor = input.required<Contributor>();
  /** Con `false` mostra solo il nome (dentro un pulsante non può esserci un link). */
  readonly link = input(true);
}
