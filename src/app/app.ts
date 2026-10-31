import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  template: `<app-navbar /><router-outlet />`,
  // Colonna a tutta altezza: navbar fissa in alto, la pagina occupa il resto e non scorre mai.
  styles: `:host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; min-height: 0; overflow: hidden; }
    router-outlet { display: none; }`,
})
export class App {}
