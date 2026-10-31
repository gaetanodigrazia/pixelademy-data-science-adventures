import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  // Colonna a tutta altezza: la pagina occupa il viewport e non scorre mai.
  styles: `:host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; min-height: 0; overflow: hidden; }`,
})
export class App {}
