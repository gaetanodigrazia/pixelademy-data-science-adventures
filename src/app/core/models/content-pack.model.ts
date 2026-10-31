import { Character, Enemy } from './character.model';
import { GameDefinition } from './game.model';
import { Mission } from './mission.model';
import { ProjectSpec } from './project.model';

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  missions: Mission[];
  /** Il progetto che le missioni costruiscono; alimenta la dashboard dei risultati. */
  project?: ProjectSpec;
  /** Mostra la Dashboard dei risultati del progetto (link, presentazione, pagina). Se omesso vale `true`. */
  dashboard?: boolean;
  defaultCharacterId?: string;
}

export interface ContentPack {
  id: string;
  title: string;
  author: string;
  paths: LearningPath[];
  characters: Character[];
  enemies: Enemy[];
  games: GameDefinition[];
  /** Soluzioni di riferimento, indicizzate per ID missione. */
  solutions: Record<string, string>;
}
