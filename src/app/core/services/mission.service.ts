import { Injectable, inject } from '@angular/core';
import { LearningPath } from '../models/content-pack.model';
import { Mission, ValidationResult } from '../models/mission.model';
import { validateOutput } from '../utils/validator';
import { ContentRegistryService } from './content-registry.service';
import { GameStateService } from './game-state.service';

export type MissionStatus = 'locked' | 'available' | 'completed';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly registry = inject(ContentRegistryService);
  private readonly game = inject(GameStateService);

  find(id: string): Mission | undefined {
    return this.registry.mission(id);
  }

  status(m: Mission): MissionStatus {
    if (this.game.isCompleted(m.id)) return 'completed';
    return m.prerequisites.every((p) => this.game.isCompleted(p)) ? 'available' : 'locked';
  }

  completedCount(path: LearningPath): number {
    return path.missions.filter((m) => this.game.isCompleted(m.id)).length;
  }

  validate(m: Mission, output: string): ValidationResult {
    return validateOutput(output, m.validation);
  }

  next(m: Mission): Mission | undefined {
    const path = this.registry.path(m.pathId);
    return path?.missions[path.missions.findIndex((x) => x.id === m.id) + 1];
  }
}
