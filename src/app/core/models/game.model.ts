import { Type } from '@angular/core';
import { Character, Enemy } from './character.model';

export type GameConfig = Record<string, unknown>;

/** Com'è andata la battaglia: gli errori commessi (contano nel calcolo degli XP della missione). */
export interface GameResult {
  mistakes: number;
}

export interface GameComponentInputs {
  character: Character;
  enemy?: Enemy;
  config: GameConfig;
  onCleared: (result?: GameResult) => void;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  controls: string;
  component: Type<GameComponentInputs>;
}
