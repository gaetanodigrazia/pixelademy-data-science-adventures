import { ProjectSpec } from './concepts';

export const PACK_ID = 'adventure-core';

export interface MissionText {
  title: string;
  story: string;
}

export interface PathSeed {
  slug: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  characterSlug: string;
  enemySlug: string;
  /** Il progetto del percorso: completare le sue missioni lo realizza. */
  project: ProjectSpec;
  /**
   * Gli esercizi delle missioni, nell'ordine (id di `EXERCISES`, in `exercises.ts`). Se manca: i primi N dei 10 standard.
   * Il primo deve aprire il progetto (`delta`, `conversione`…), gli altri no. Gli esercizi propri non hanno ancora i riquadri
   * della Dashboard: questi percorsi vanno con `dashboard: false`.
   */
  exercises?: string[];
  /** Dashboard dei risultati: `true` (default) o `false` per un percorso con il solo progetto, senza pagina dei grafici. */
  dashboard?: boolean;
  /** Da 1 a 10 missioni, una per concetto nell'ordine fisso dei concetti: un percorso breve usa i primi (difficoltà 1..N). */
  missions: MissionText[];
}


/** I percorsi del pack: ognuno si aggiunge con la propria issue (US-11.x). */
export const PATH_SEEDS: PathSeed[] = [];
