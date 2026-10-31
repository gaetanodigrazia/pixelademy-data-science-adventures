import { PACK_ID, PATH_SEEDS } from './curriculum';
import { assembleProject } from './project';

export const missionId = (slug: string, index: number) =>
  `${PACK_ID}-${slug}-${String(index + 1).padStart(2, '0')}`;

/** Soluzioni di riferimento (il progetto completo fino a quella missione), indicizzate per ID missione. */
export const SOLUTIONS: Record<string, string> = Object.fromEntries(
  PATH_SEEDS.flatMap((p) => assembleProject(p).map((step, i) => [missionId(p.slug, i), step.solution] as const)),
);
