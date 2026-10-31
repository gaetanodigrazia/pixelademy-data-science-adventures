import { ContentRegistryService } from '../core/services/content-registry.service';
import { ContentPack } from '../core/models/content-pack.model';
import { Mission } from '../core/models/mission.model';
import { TestBed } from '@angular/core/testing';

/** Pack di prova per i test dei servizi: un percorso di 10 missioni in sequenza e un eroe. Non fa parte dell'app. */
export const MINI_PATH_ID = 'mini-path';

const mission = (i: number): Mission => ({
  id: `${MINI_PATH_ID}-${String(i).padStart(2, '0')}`,
  pathId: MINI_PATH_ID,
  title: `Missione ${i}`,
  topic: 'prova',
  difficulty: i,
  xp: 20 + 10 * (i - 1),
  prerequisites: i === 1 ? [] : [`${MINI_PATH_ID}-${String(i - 1).padStart(2, '0')}`],
  story: '',
  theory: [],
  briefing: '',
  hint: '',
  starterCode: '',
  validation: { kind: 'text', expected: 'ok' },
  game: { type: 'mini-game' },
});

export const MINI_PACK: ContentPack = {
  id: 'mini',
  title: 'Pack di prova',
  author: 'test',
  paths: [{ id: MINI_PATH_ID, title: 'Percorso di prova', description: '', icon: '🧪', tags: [], missions: Array.from({ length: 10 }, (_, i) => mission(i + 1)), defaultCharacterId: 'mini-hero' }],
  characters: [
    { id: 'mini-hero', name: 'Eroe', description: '', author: 'test', tags: [], unlockLevel: 1, sprite: { palette: {}, pixels: [] } },
    { id: 'mini-elite', name: 'Elite', description: '', author: 'test', tags: [], unlockLevel: 3, sprite: { palette: {}, pixels: [] } },
  ],
  enemies: [],
  games: [],
  solutions: {},
};

/** Registra il pack di prova nel registro del TestBed corrente (da chiamare prima di creare GameStateService). */
export function useMiniPack(): ContentRegistryService {
  const reg = TestBed.inject(ContentRegistryService);
  reg.packs.set([MINI_PACK]);
  return reg;
}
