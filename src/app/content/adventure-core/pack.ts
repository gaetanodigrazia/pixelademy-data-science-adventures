import { ContentPack, LearningPath } from '../../core/models/content-pack.model';
import { Mission } from '../../core/models/mission.model';
import { xpForDifficulty } from '../../core/utils/progress';
import { CHARACTERS, ENEMIES } from './characters';
import { PACK_ID, PATH_SEEDS } from './curriculum';
import { GAMES, GAME_IDS, BONUS_GAME } from './games';
import { BONUS_KINDS } from './bonus-kinds';
import { ProjectSpec } from './concepts';
import { assembleProject } from './project';
import { missionId, SOLUTIONS } from './solutions';

/**
 * Il bonus platform di una missione: il tipo di moneta dipende dall'esercizio (`BONUS_KINDS`) e i dati dal progetto.
 * `index` legge la serie `a`; `pop` e `len` la lista `b`; `dict` il registro; `sum`, `mean`, `minmax` e `cmp` i valori di `a`.
 */
function bonusFor(exerciseId: string, p: ProjectSpec, level: number): Mission['bonus'] {
  const kind = BONUS_KINDS[exerciseId];
  if (!kind) throw new Error(`Manca il tipo di bonus per l'esercizio «${exerciseId}» (bonus-kinds.ts).`);
  const s = kind === 'pop' || kind === 'len' ? p.b : p.a;
  return { type: BONUS_GAME, config: { kind, name: kind === 'dict' ? p.registry.name : s.name, v: s.values, th: p.alert, unit: s.unit, level, d: p.registry.entries } };
}

const paths: LearningPath[] = PATH_SEEDS.map((p) => {
  const pathId = `${PACK_ID}-${p.slug}`;
  const steps = assembleProject(p);
  const missions: Mission[] = steps.map((step, i) => {
    const text = p.missions[i];
    const c = step.concept;
    const difficulty = i + 1;
    return {
      id: missionId(p.slug, i),
      pathId,
      title: text.title,
      topic: c.topic,
      difficulty,
      xp: xpForDifficulty(difficulty),
      prerequisites: i === 0 ? [] : [missionId(p.slug, i - 1)],
      story: text.story,
      theory: c.theory,
      briefing: c.briefing,
      hint: c.hint,
      starterCode: step.base + c.starter,
      projectBase: step.base,
      projectSection: c.starter,
      validation: { kind: 'lines', expected: step.expected },
      // Un gioco per concetto: riceve i dati del progetto e li usa per far imparare giocando.
      game: { type: step.exercise.game ?? GAME_IDS[step.exercise.stdIndex ?? i], config: { level: difficulty, ...step.exercise.gameConfig(p.project) } },
      viz: step.exercise.viz(p.project),
      bonus: bonusFor(step.exercise.id, p.project, difficulty),
      enemyId: `${PACK_ID}-${p.enemySlug}`,
    };
  });
  return {
    id: pathId,
    title: p.title,
    description: p.description,
    icon: p.icon,
    tags: p.tags,
    missions,
    project: p.project,
    dashboard: p.dashboard !== false,
    defaultCharacterId: `${PACK_ID}-${p.characterSlug}`,
    contributor: p.contributor,
    // uno slug con il trattino è già l'id di un percorso di un altro pack (es. `challenges-pandas`)
    requires: p.requires?.map((slug) => (slug.includes('-') ? slug : `${PACK_ID}-${slug}`)),
  };
});

const pack: ContentPack = {
  id: PACK_ID,
  title: 'Avventure di base',
  author: 'Pixelademy',
  paths,
  characters: CHARACTERS,
  enemies: ENEMIES,
  games: GAMES,
  solutions: SOLUTIONS,
};

export default pack;
