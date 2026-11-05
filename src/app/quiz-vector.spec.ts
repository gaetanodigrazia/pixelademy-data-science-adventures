import { PACKS } from './core/data/packs.generated';
import { QuizConfig, quizFor } from './shared/components/games/quiz-steps';

/**
 * Un quiz «esegui il codice a mano» che parla di una serie (`onde`, `prezzi`…) deve mostrarne la definizione nel pannello del codice:
 * senza il vettore non si possono eseguire i passi a mano.
 */
describe('quiz: il vettore usato è sempre visibile nel pannello del codice', () => {
  const cases = PACKS[0].paths.flatMap((p) => p.missions.filter((m) => m.game.type === 'adventure-quiz').map((m) => ({ id: m.id, config: m.game.config as never })));
  it.each(cases)('$id', ({ config }) => {
    const c = config as QuizConfig;
    const quiz = quizFor(c);
    const uses = (s: string) => new RegExp(`\\b${c.name}\\b`).test(s);
    const mentioned = quiz.code.some(uses) || quiz.steps.some((s) => uses(s.prompt) || uses(s.vars ?? ''));
    if (!mentioned) return; // il quiz non parla della serie (es. lavora su valori già calcolati)
    const defined = quiz.code.some((l) => new RegExp(`^\\s*${c.name}\\s*=`).test(l));
    expect(defined, `«${c.exercise}»: il codice mostrato nomina «${c.name}» ma non ne mostra la definizione:\n${quiz.code.join('\n')}`).toBe(true);
  });
});

describe('quiz: la riga evidenziata resta quella giusta dopo l\'aggiunta del vettore', () => {
  it('mediana: la prima riga del codice originale (sorted) è ora la seconda, e il passo 1 la evidenzia', () => {
    const q = quizFor({ exercise: 'mediana', name: 'onde', unit: 'dm', v: [5, 4, 9, 4, 7, 2, 5, 4], th: 0, thName: 't', k: 0 } as QuizConfig);
    expect(q.code[0]).toBe('onde = [5, 4, 9, 4, 7, 2, 5, 4]');
    expect(q.code[q.steps[0].line]).toContain('sorted(onde)');
    for (const st of q.steps) expect(st.line).toBeLessThan(q.code.length);
  });

  it('un quiz che mostra già la serie non cambia', () => {
    const q = quizFor({ exercise: 'media', name: 'onde', unit: 'dm', v: [5, 4, 9, 4, 7, 2, 5, 4], th: 0, thName: 't', k: 0 } as QuizConfig);
    expect(q.code.filter((l) => l.startsWith('onde =')).length).toBe(1);
  });
});

describe('quiz della moda: i passi evidenziano la riga giusta', () => {
  it('count() è nella riga dell\'if, il risultato finale in «moda = m»', () => {
    const q = quizFor({ exercise: 'moda', name: 'onde', unit: 'dm', v: [5, 4, 9, 4, 7, 2, 5, 4], th: 0, thName: 't', k: 0 } as QuizConfig);
    for (const st of q.steps.slice(0, 3)) expect(q.code[st.line]).toContain('.count(m)');
    expect(q.code[q.steps[3].line]).toContain('moda = m');
  });
});
