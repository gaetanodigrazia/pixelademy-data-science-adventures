import { CONCEPT_COUNT, Concept } from './concepts';
import { Exercise, exercisesFor } from './exercises';
import { PathSeed } from './curriculum';

export interface ProjectStep {
  exercise: Exercise;
  concept: Concept;
  /** Il progetto fino alla missione precedente (soluzione di riferimento). */
  base: string;
  /** Il progetto completo fino a questa missione (soluzione di riferimento). */
  solution: string;
  /** Output atteso: il bollettino fino a questa sezione. */
  expected: string[];
}

/**
 * Monta i passi del progetto (da 1 a 10, tanti quante le missioni del percorso): ogni sezione si aggiunge al codice e al
 * bollettino dei passi precedenti. Gli esercizi sono quelli scelti dal percorso (`exercises`) o i primi dei 10 standard.
 */
export function assembleProject(path: PathSeed): ProjectStep[] {
  const n = path.missions.length;
  if (n < 1 || n > CONCEPT_COUNT) throw new Error(`Il percorso «${path.slug}» ha ${n} missioni: devono essere da 1 a ${CONCEPT_COUNT}.`);
  const exercises = exercisesFor(path);
  let base = '';
  let expected: string[] = [];
  return exercises.map((exercise) => {
    const concept = exercise.concept(path.project);
    const solution = base + concept.solution;
    expected = [...expected, ...concept.lines];
    const step: ProjectStep = { exercise, concept, base, solution, expected };
    base = solution;
    return step;
  });
}
