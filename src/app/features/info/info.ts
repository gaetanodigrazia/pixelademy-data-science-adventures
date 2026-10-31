import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Segnaposto: la pagina vera arriva con US-10.2. */
@Component({
  selector: 'app-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>ℹ️ Il progetto</h1><p class="status">Pagina in arrivo.</p></main>`,
})
export class Info {}
