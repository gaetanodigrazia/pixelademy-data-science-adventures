import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Segnaposto: la pagina vera arriva con US-06.1. */
@Component({
  selector: 'app-mission-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>Missione</h1><p class="status">Pagina in arrivo.</p></main>`,
})
export class MissionDetail {}
