import { Injectable, inject } from '@angular/core';
import { LearningPath } from '../models/content-pack.model';
import { Mission, ValidationResult } from '../models/mission.model';
import { isPathUnlocked, missingRequirements } from '../utils/path-lock';
import { completionPercent } from '../utils/progress';
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

  /** I percorsi da completare prima di poter giocare `path` (vuoto = sbloccato). */
  missingFor(path: LearningPath): LearningPath[] {
    return missingRequirements(path, this.registry.paths(), new Set(this.game.state().completedMissionIds));
  }

  pathUnlocked(path: LearningPath): boolean {
    return isPathUnlocked(path, this.registry.paths(), new Set(this.game.state().completedMissionIds));
  }

  status(m: Mission): MissionStatus {
    if (this.game.isCompleted(m.id)) return 'completed';
    const path = this.registry.path(m.pathId);
    if (path && !this.pathUnlocked(path)) return 'locked';
    return m.prerequisites.every((p) => this.game.isCompleted(p)) ? 'available' : 'locked';
  }

  completedCount(path: LearningPath): number {
    return path.missions.filter((m) => this.game.isCompleted(m.id)).length;
  }

  /** Percentuale di completamento del percorso (100 solo con tutte le missioni completate). */
  percent(path: LearningPath): number {
    return completionPercent(this.completedCount(path), path.missions.length);
  }

  validate(m: Mission, output: string): ValidationResult {
    return validateOutput(output, m.validation);
  }

  next(m: Mission): Mission | undefined {
    const path = this.registry.path(m.pathId);
    return path?.missions[path.missions.findIndex((x) => x.id === m.id) + 1];
  }
}
