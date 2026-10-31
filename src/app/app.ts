import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>PIXELADEMY</h1>
      <p class="status">Data Science Adventures</p>
    </main>
  `,
})
export class App {}
