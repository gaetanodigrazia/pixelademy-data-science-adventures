import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Segnaposto: la pagina vera arriva con US-08.4. */
@Component({
  selector: 'app-project-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>Dashboard del progetto</h1><p class="status">Pagina in arrivo.</p></main>`,
})
export class ProjectDashboard {}
