import { Injectable, computed, signal } from '@angular/core';
import { PACKS } from '../data/packs.generated';
import { ContentPack, LearningPath } from '../models/content-pack.model';
import { Mission } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class ContentRegistryService {
  readonly packs = signal<ContentPack[]>(PACKS);

  readonly paths = computed<LearningPath[]>(() => this.packs().flatMap((p) => p.paths));
  readonly characters = computed(() => this.packs().flatMap((p) => p.characters));
  readonly enemies = computed(() => this.packs().flatMap((p) => p.enemies));
  readonly games = computed(() => this.packs().flatMap((p) => p.games));
  readonly missions = computed<Mission[]>(() => this.paths().flatMap((p) => p.missions));
  readonly isEmpty = computed(() => this.paths().length === 0);

  path(id: string) { return this.paths().find((p) => p.id === id); }
  character(id: string) { return this.characters().find((c) => c.id === id); }
  enemy(id?: string) { return id ? this.enemies().find((e) => e.id === id) : undefined; }
  game(id: string) { return this.games().find((g) => g.id === id); }
  mission(id: string) { return this.missions().find((m) => m.id === id); }

  /** Autore del pack che contiene il percorso. */
  pathAuthor(pathId: string): string | undefined {
    return this.packs().find((p) => p.paths.some((x) => x.id === pathId))?.author;
  }

  solution(missionId: string): string | undefined {
    for (const p of this.packs()) if (p.solutions[missionId]) return p.solutions[missionId];
    return undefined;
  }
}
