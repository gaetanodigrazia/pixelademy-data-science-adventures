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

describe('percorso «energia»', () => {
  it('bollettino', () => {
    expect(lines('energia').slice(1)).toEqual(['Costo della quinta lettura: 81.25', 'Posizione del picco: 5', 'Energia sopra soglia: 1080']);
  });

  it('3 missioni di difficoltà 1..3, senza Dashboard, tutte con il quiz', () => {
    const p = path('energia');
    expect(p.missions.map((m) => m.difficulty)).toEqual([1, 2, 3]);
    expect(p.dashboard).toBe(false);
    expect(p.missions.every((m) => m.game.type === 'adventure-quiz')).toBe(true);
  });

  it('non ripete i primi tre esercizi standard di Nuvole', () => {
    const nuvole = path('nuvole').missions.slice(0, 3).map((m) => m.topic);
    for (const m of path('energia').missions) expect(nuvole).not.toContain(m.topic);
  });

  quizCases('energia');
});

describe('percorso di statistica', () => {
  it('bollettino: media, mediana, moda, campo, varianza e deviazione standard', () => {
    expect(lines('statistica').slice(1)).toEqual([
      'Altezza media: 5.0', 'Altezza mediana: 4.5', 'Altezza più frequente: 4', 'Campo di variazione: 7', 'Varianza: 4.0', 'Deviazione standard: 2.0',
    ]);
  });

  it('6 missioni di difficoltà 1..6', () => {
    const p = path('statistica');
    expect(p.missions.map((m) => m.difficulty)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('varianza e deviazione richiedono che le sezioni da cui dipendono vengano prima', () => {
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['media', 'deviazione'] })).toThrow('richiede');
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['media', 'varianza'] })).not.toThrow();
  });

  it('pyFloat stampa i float come Python', () => {
    expect([5, 4.5, 2, 0.25].map(pyFloat)).toEqual(['5.0', '4.5', '2.0', '0.25']);
  });

  quizCases('statistica');
});

describe('percorso «outlier»', () => {
  it('bollettino', () => {
    expect(lines('outlier').slice(1)).toEqual([
      'Tempo medio di consegna: 17.0', 'Varianza dei tempi: 100.0', 'Deviazione standard: 10.0', 'Z-score del tempo massimo: 2.9', 'Consegne anomale: 1',
    ]);
  });

  it('5 missioni di difficoltà 1..5, senza Dashboard, tutte con il quiz', () => {
    const p = path('outlier');
    expect(p.missions.map((m) => m.difficulty)).toEqual([1, 2, 3, 4, 5]);
    expect(p.dashboard).toBe(false);
    expect(p.missions.every((m) => m.game.type === 'adventure-quiz')).toBe(true);
  });

  it('z-score e outlier richiedono la deviazione (quindi media → varianza → deviazione prima)', () => {
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['media', 'zscore'] })).toThrow('richiede');
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['media', 'outlier'] })).toThrow('richiede');
  });

  quizCases('outlier');
});

describe('percorso «probabilita»', () => {
  it('bollettino', () => {
    expect(lines('probabilita').slice(1)).toEqual([
      'Frequenza del 4: 0.3', 'Valore atteso del dado: 3.5', 'Scostamento dal valore atteso: 0.2', 'Probabilità di fare 7 con due dadi: 0.1667',
    ]);
  });

  it('4 missioni di difficoltà 1..4, senza Dashboard, tutte con il quiz', () => {
    const p = path('probabilita');
    expect(p.missions.map((m) => m.difficulty)).toEqual([1, 2, 3, 4]);
    expect(p.dashboard).toBe(false);
    expect(p.missions.every((m) => m.game.type === 'adventure-quiz')).toBe(true);
  });

  it('scostamento e somma dei dadi richiedono il valore atteso', () => {
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['frequenza', 'scostamento'] })).toThrow('richiede');
    expect(() => exercisesFor({ slug: 'x', missions: [1, 2], exercises: ['frequenza', 'valore-atteso'] })).not.toThrow();
  });

  quizCases('probabilita');
});

describe('percorsi base: Le Variabili e Le Liste', () => {
  it('bollettini: il titolo, poi una riga per missione', () => {
    expect(lines('variabili')).toEqual(['=== BOLLETTINO DEL PASSAPAROLA ===', 'Passi di oggi: 7800', "Passi oltre l'obiettivo: 1800", 'Passi con il bonus: 9300']);
    expect(lines('liste')).toEqual(['=== ELENCO DELLA SPESA ===', 'Prezzo del quarto articolo: 12', 'Articoli nel carrello: 5', 'Carrello aggiornato: [4, 6, 9, 2, 5, 7]']);
  });
  it('3 missioni di difficoltà 1..3 ciascuno, senza Dashboard, con il quiz', () => {
    for (const slug of ['variabili', 'liste']) {
      expect(path(slug).missions.map((m) => m.difficulty)).toEqual([1, 2, 3]);
      expect(path(slug).dashboard).toBe(false);
    }
    // Le Liste riusano i minigiochi standard per leggere e contare, e il quiz per l'append
    for (const m of path('variabili').missions) expect(m.game.type).toBe(QUIZ_GAME);
    expect(path('liste').missions.map((m) => m.game.type === QUIZ_GAME)).toEqual([false, false, true]);
  });
  it('Le Variabili non usano ancora le liste (niente parentesi quadre nel codice)', () => {
    const code = path('variabili').missions.at(-1)!.starterCode;
    expect(code).not.toMatch(/[\[\]]/);
  });
  it('liste-aggiungi richiede la lista del carrello (std-2) e le variabili calcolano su var-assegna', () => {
    expect(EXERCISES['liste-aggiungi'].requires).toEqual(['std-2']);
    expect(EXERCISES['var-calcola'].requires).toEqual(['var-assegna']);
    expect(EXERCISES['var-cambia'].requires).toEqual(['var-assegna']);
  });
});
describe('percorsi base: quiz', () => { quizCases('variabili'); });
describe('percorsi base: quiz di liste-aggiungi', () => {
  const m = path('liste').missions[2];
  it(`${m.id}: passi con risposta giusta e almeno 2 sviste spiegate`, () => {
    const quiz = quizFor(m.game.config as never);
    expect(quiz.steps.length).toBe(3);
    for (const st of quiz.steps) expect(st.traps.length).toBeGreaterThanOrEqual(2);
  });
});
