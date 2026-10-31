import { Type } from '@angular/core';
import { Character, Enemy } from './character.model';

export type GameConfig = Record<string, unknown>;

export interface GameComponentInputs {
  character: Character;
  enemy?: Enemy;
  config: GameConfig;
  onCleared: () => void;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  controls: string;
  component: Type<GameComponentInputs>;
}
