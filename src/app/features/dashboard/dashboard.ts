import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Segnaposto: la pagina vera arriva con US-05.2. */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>PIXELADEMY</h1><p class="status">Data Science Adventures</p></main>`,
})
export class Dashboard {}
