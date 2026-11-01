import { LearningPath } from '../models/content-pack.model';

/** Tutte le missioni del percorso sono completate. */
export function pathCompleted(path: LearningPath, completed: ReadonlySet<string>): boolean {
  return path.missions.length > 0 && path.missions.every((m) => completed.has(m.id));
}

/**
 * I percorsi che mancano per sbloccare `path` (quelli di `requires` non ancora completati). Vuoto = sbloccato.
 * - Chi ha già completato missioni del percorso non le perde: un percorso con progressi è sbloccato.
 * - Un requisito che non esiste nei contenuti non blocca (non si resta chiusi per sempre).
 */
export function missingRequirements(path: LearningPath, paths: readonly LearningPath[], completed: ReadonlySet<string>): LearningPath[] {
  if (path.missions.some((m) => completed.has(m.id))) return [];
  return (path.requires ?? [])
    .map((id) => paths.find((p) => p.id === id))
    .filter((p): p is LearningPath => !!p && !pathCompleted(p, completed));
}

export const isPathUnlocked = (path: LearningPath, paths: readonly LearningPath[], completed: ReadonlySet<string>): boolean =>
  missingRequirements(path, paths, completed).length === 0;

/** I percorsi in ordine di dipendenza (prima i base, poi quelli che li richiedono); a pari livello resta l'ordine dei contenuti. */
export function byDependency(paths: readonly LearningPath[]): LearningPath[] {
  const depth = (p: LearningPath, seen: ReadonlySet<string> = new Set()): number => {
    if (seen.has(p.id)) return 0;
    const next = new Set(seen).add(p.id);
    return Math.max(-1, ...(p.requires ?? []).map((id) => paths.find((x) => x.id === id)).filter((x): x is LearningPath => !!x).map((x) => depth(x, next))) + 1;
  };
  return paths.map((p, i) => ({ p, i, d: depth(p) })).sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.p);
}

/** Il primo percorso sbloccato (quello con cui si parte). */
export function firstUnlocked(paths: readonly LearningPath[], completed: ReadonlySet<string>): LearningPath | undefined {
  paths = byDependency(paths);
  return paths.find((p) => isPathUnlocked(p, paths, completed)) ?? paths[0];
}

/** I percorsi che si sbloccano grazie a `justCompleted` (erano bloccati prima di quella missione e ora no). */
export function newlyUnlocked(paths: readonly LearningPath[], completedNow: ReadonlySet<string>, justCompleted: string): LearningPath[] {
  const before = new Set(completedNow);
  before.delete(justCompleted);
  return paths.filter((p) => !isPathUnlocked(p, paths, before) && isPathUnlocked(p, paths, completedNow));
}
