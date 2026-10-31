import { PACKS } from './core/data/packs.generated';
import { MissionViz } from './core/models/mission.model';
import { EXERCISES, QUIZ_GAME, exercisesFor } from './content/adventure-core/exercises';
import { SAMPLE } from './testing/game-harness';
import { pyFloat, pyRound } from './core/utils/py';
import { evaluateViz } from './core/utils/viz';
import { quizFor } from './shared/components/games/quiz-steps';

const pack = PACKS[0];
const path = (slug: string) => pack.paths.find((p) => p.id.endsWith(`-${slug}`))!;
const lines = (slug: string) => (path(slug).missions.at(-1)!.validation as { expected: string[] }).expected;

/** Il quiz di ogni missione di un percorso, sui suoi dati veri: giusta tra almeno 3 opzioni, sviste spiegate, deterministico. */
function quizCases(slug: string) {
  for (const m of path(slug).missions) {
    it(`${m.id}: ogni passo ha la risposta giusta tra almeno 3 opzioni, sviste spiegate, deterministico`, () => {
      const c = m.game.config as { exercise: string; name: string; v: number[]; th: number; thName: string; k: number };
      const quiz = quizFor(c);
      expect(quiz.steps.length).toBeGreaterThan(0);
      for (const st of quiz.steps) {
        const labels = [st.correct, ...st.traps.map((t) => t.label)];
        expect(new Set(labels).size).toBe(labels.length);
        expect(st.traps.length).toBeGreaterThanOrEqual(2);
        for (const t of st.traps) expect(t.why.length).toBeGreaterThan(5);
      }
      expect(JSON.stringify(quizFor(c))).toBe(JSON.stringify(quiz));
    });
  }
}

// I test dei bollettini e delle dipendenze di ogni percorso con esercizi propri entrano con la rispettiva issue (US-11.2…11.6).
describe('esercizi propri', () => {
  it('pyRound arrotonda come Python (al pari sui .5)', () => {
    expect([0.5, 1.5, 2.5, 3.5, 2.4, 2.6].map(pyRound)).toEqual([0, 2, 2, 4, 2, 3]);
  });

  it('exercisesFor rifiuta numero errato, id sconosciuto e apertura fuori posto', () => {
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['delta'] })).toThrow('esercizi');
    expect(() => exercisesFor({ slug: 'x', missions: [1], exercises: ['non-esiste'] })).toThrow('sconosciuto');
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['std-1', 'std-1'] })).toThrow('primo posto');
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['ordina', 'delta'] })).toThrow('aprire');
  });
});

describe('quiz «esegui il codice a mano»', () => {
  // gli esercizi che funzionano con qualunque serie, sui dati di un progetto di prova; quelli di statistica, outlier e probabilità
  // (che richiedono dati adatti: serie pari, media intera, dadi) si verificano sui dati reali con US-11.4…11.6
  const GENERIC = ['delta', 'ordina', 'percentuale', 'conversione', 'posizione', 'somma-sopra'];
  for (const e of GENERIC.map((id) => EXERCISES[id]).filter((x) => x.game === QUIZ_GAME)) {
    it(`${e.id}: ogni passo ha la risposta giusta tra almeno 3 opzioni, sviste spiegate, deterministico`, () => {
      const c = e.gameConfig(SAMPLE) as { exercise: string; name: string; v: number[]; th: number; thName: string; k: number };
      const quiz = quizFor(c);
      expect(quiz.steps.length).toBeGreaterThan(0);
      for (const s of quiz.steps) {
        const labels = [s.correct, ...s.traps.map((t) => t.label)];
        expect(new Set(labels).size).toBe(labels.length);
        expect(s.traps.length).toBeGreaterThanOrEqual(2);
        for (const t of s.traps) expect(t.why.length).toBeGreaterThan(5);
      }
      expect(JSON.stringify(quizFor(c))).toBe(JSON.stringify(quiz));
    });
  }
});

describe('viz «value» e «pick»', () => {
  const value: MissionViz = { kind: 'value', name: 'attese', unit: 'min', values: [4, 7, 12], expected: [8] };
  const idx: MissionViz = { ...value, asIndex: true, expected: [2] };
  const pick: MissionViz = { kind: 'pick', name: 'attese', unit: 'min', values: [4, 7, 12, 9], expected: [4, 7] };

  it('value: numero giusto, troppo basso, troppo alto', () => {
    expect(evaluateViz(value, true, '8\n', '').status).toBe('ok');
    expect(evaluateViz(value, true, '3\n', '').message).toContain('basso');
    expect(evaluateViz(value, true, '30\n', '').message).toContain('alto');
    expect(evaluateViz(idx, true, '2\n', '')).toMatchObject({ status: 'ok' });
    expect(evaluateViz(value, true, '', 'NameError: x').status).toBe('error');
  });

  it('pick: lista nell\'ordine giusto ok, altrimenti sbagliata', () => {
    expect(evaluateViz(pick, true, '[4, 7]\n', '').status).toBe('ok');
    expect(evaluateViz(pick, true, '[7, 4]\n', '').status).toBe('wrong');
    expect(evaluateViz(pick, true, '[4]\n', '').status).toBe('wrong');
  });
});

describe('percorso «mobilita»', () => {
  it('bollettino', () => {
    expect(lines('mobilita').slice(1)).toEqual(["Variazione dell'attesa: 7", 'Le tre attese più brevi: [4, 6, 7]', 'Attese lunghe (%): 57']);
  });

  it('3 missioni di difficoltà 1..3, senza Dashboard, tutte con il quiz', () => {
    const p = path('mobilita');
    expect(p.missions.map((m) => m.difficulty)).toEqual([1, 2, 3]);
    expect(p.dashboard).toBe(false);
    expect(p.missions.every((m) => m.game.type === 'adventure-quiz')).toBe(true);
  });

  it('non ripete i primi tre esercizi standard di Nuvole', () => {
    const nuvole = path('nuvole').missions.slice(0, 3).map((m) => m.topic);
    for (const m of path('mobilita').missions) expect(nuvole).not.toContain(m.topic);
  });

  quizCases('mobilita');
});
