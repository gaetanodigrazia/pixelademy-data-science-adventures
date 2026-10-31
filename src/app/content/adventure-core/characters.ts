import { Character, Enemy } from '../../core/models/character.model';
import { PACK_ID } from './curriculum';
import {
  AURA_SPRITE, CLOUD_ENEMY_SPRITE, CORA_SPRITE, JAM_ENEMY_SPRITE,
  LEAK_ENEMY_SPRITE, NILO_SPRITE, TEO_SPRITE, WAVE_ENEMY_SPRITE,
} from './sprites';

const AUTHOR = 'Pixelademy';

export const CHARACTERS: Character[] = [
  { id: `${PACK_ID}-aura`, name: 'Aura', description: 'Meteorologa nomade: legge il cielo e l\'aria per prevedere il tempo.', author: AUTHOR, tags: ['aria', 'clima'], unlockLevel: 1, sprite: AURA_SPRITE },
  { id: `${PACK_ID}-nilo`, name: 'Nilo', description: 'Cartografo della mobilità: trasforma strade e fermate in mappe chiare.', author: AUTHOR, tags: ['mappe', 'percorsi'], unlockLevel: 1, sprite: NILO_SPRITE },
  { id: `${PACK_ID}-cora`, name: 'Cora', description: 'Biologa delle maree: ascolta i segnali dell\'oceano tra le onde.', author: AUTHOR, tags: ['oceano', 'segnali'], unlockLevel: 1, sprite: CORA_SPRITE },
  { id: `${PACK_ID}-teo`, name: 'Teo', description: 'Tecnico delle reti energetiche: cerca ogni watt sprecato.', author: AUTHOR, tags: ['energia', 'efficienza'], unlockLevel: 1, sprite: TEO_SPRITE },
];

export const ENEMIES: Enemy[] = [
  { id: `${PACK_ID}-nuvola`, name: 'Nuvola confusa', description: 'Disperde le misure con piogge fuori stagione.', sprite: CLOUD_ENEMY_SPRITE },
  { id: `${PACK_ID}-ingorgo`, name: 'Ingorgo logico', description: 'Blocca i dati nelle code di un incrocio infinito.', sprite: JAM_ENEMY_SPRITE },
  { id: `${PACK_ID}-onda`, name: 'Onda anomala', description: 'Copre i segnali delle boe con rumore.', sprite: WAVE_ENEMY_SPRITE },
  { id: `${PACK_ID}-dispersione`, name: 'Dispersione energetica', description: 'Fa evaporare i kilowatt dalla rete.', sprite: LEAK_ENEMY_SPRITE },
];
