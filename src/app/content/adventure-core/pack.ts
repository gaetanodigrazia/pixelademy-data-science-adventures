import { ContentPack, LearningPath } from '../../core/models/content-pack.model';
import { Mission } from '../../core/models/mission.model';
import { xpForDifficulty } from '../../core/utils/progress';
import { CHARACTERS, ENEMIES } from './characters';
import { PACK_ID, PATH_SEEDS } from './curriculum';
import { GAMES, GAME_IDS } from './games';
import { assembleProject } from './project';
import { missionId, SOLUTIONS } from './solutions';

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
    requires: p.requires?.map((slug) => `${PACK_ID}-${slug}`),
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
