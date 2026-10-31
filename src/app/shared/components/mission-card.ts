import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Mission } from '../../core/models/mission.model';
import { MissionStatus } from '../../core/services/mission.service';

@Component({
  selector: 'app-mission-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card" [class.locked]="status() === 'locked'" [class.completed]="status() === 'completed'"
      [routerLink]="status() === 'locked' ? null : ['/missione', mission().id]">
      <div class="head">
        <span class="diff" [attr.aria-label]="'Difficoltà ' + mission().difficulty + ' su 10'" [title]="'Difficoltà ' + mission().difficulty + ' su 10'">
          <span aria-hidden="true">{{ stars() }}</span>
          <span class="num">{{ mission().difficulty }}/10</span>
        </span>
        @if (status() === 'completed') { <span aria-label="Completata">✅</span> }
        @else if (status() === 'locked') { <span aria-label="Bloccata">🔒</span> }
      </div>
      <h3>{{ mission().title }}</h3>
      <p class="topic">{{ mission().topic }}</p>
      <p class="story">{{ mission().story }}</p>
      <div class="reward">+{{ mission().xp }} XP</div>
    </a>
  `,
  styles: `
    :host { display: flex; min-width: 0; min-height: 0; }
    .card { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; gap: 4px; overflow: hidden; padding: 8px 12px;
      background: var(--panel); color: var(--text); border: 4px solid var(--line); text-decoration: none; }
    .card:hover:not(.locked) { border-color: var(--accent-2); }
    .card.locked { opacity: .5; pointer-events: none; filter: grayscale(.6); }
    .card.completed { border-color: #34d399; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .diff { display: flex; flex-direction: column; color: var(--accent); font-size: .5rem; line-height: 1.2; }
    .num { color: #cbd5e1; }
    h3 { margin: 0; font-size: .85rem; color: var(--text); line-height: 1.4; }
    .topic { margin: 0; color: #9ca3af; font-size: .65rem; }
    .story { margin: 0; flex: 1; min-height: 0; font-size: .6rem; color: #d1d5db; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; }
    .reward { color: #facc15; font-size: .75rem; }
    @media (max-height: 760px) { .topic { display: none; } .story { -webkit-line-clamp: 1; line-clamp: 1; } }
  `,
})
export class MissionCard {
  readonly mission = input.required<Mission>();
  readonly status = input.required<MissionStatus>();
  protected readonly stars = computed(() => '★'.repeat(this.mission().difficulty) + '☆'.repeat(10 - this.mission().difficulty));
}
