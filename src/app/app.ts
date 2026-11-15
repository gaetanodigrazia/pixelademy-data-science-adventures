import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VisitService } from './core/services/visit.service';
import { Navbar } from './shared/components/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  template: `<app-navbar /><router-outlet />`,
  // Colonna a tutta altezza: navbar fissa in alto, la pagina occupa il resto e non scorre mai.
  styles: `:host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; min-height: 0; overflow: hidden; }
    router-outlet { display: none; }`,
})
export class App {
  constructor() {
    // una visita per apertura del sito, in modo anonimo (vedi `VisitService`)
    void inject(VisitService).register();
  }
}
