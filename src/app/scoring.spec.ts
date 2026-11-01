import { SCORING } from './core/utils/scoring-config';
import { codeSimilarity, parSeconds, scoreAttempt } from './core/utils/scoring';

const base = { baseXp: 100, difficulty: 1, seconds: 10, errors: 0, code: 'print(1)', reference: 'print(1)', solutionViewed: false };

describe('scoring', () => {
  it('assegna tutti gli XP a una soluzione identica, veloce e senza errori', () => {
    const s = scoreAttempt(base);
    expect(s.xp).toBe(100);
    expect(s.similarity).toBe(1);
  });

  it('toglie XP in base al tempo oltre il riferimento, con un minimo', () => {
    const par = parSeconds(1);
    expect(scoreAttempt({ ...base, seconds: par }).timeFactor).toBe(1);
    expect(scoreAttempt({ ...base, seconds: par * 2 }).timeFactor).toBeCloseTo(0.85);
    expect(scoreAttempt({ ...base, seconds: par * 10 }).timeFactor).toBe(0.7);
  });

  it('toglie il 10% per ogni errore, fino al 50%', () => {
    expect(scoreAttempt({ ...base, errors: 2 }).xp).toBe(80);
    expect(scoreAttempt({ ...base, errors: 20 }).xp).toBe(50);
  });

  it('premia la vicinanza alla soluzione di riferimento e ignora commenti e spazi', () => {
    expect(codeSimilarity('x = 1  # nota\nprint( x )', 'x=1\nprint(x)')).toBe(1);
    const far = scoreAttempt({ ...base, code: 'for i in range(9): pass' });
    expect(far.similarityFactor).toBeLessThan(0.8);
    expect(far.xp).toBeLessThan(scoreAttempt(base).xp);
  });

  it('azzera gli XP se la soluzione è stata aperta prima di superare il task (e il fattore lo dice)', () => {
    const r = scoreAttempt({ ...base, solutionViewed: true });
    expect(r.xp).toBe(0);
    expect(r.viewedFactor).toBe(0);
    expect(scoreAttempt({ ...base, baseXp: 500, seconds: 0, solutionViewed: true }).xp).toBe(0); // qualunque base, tempo o somiglianza
    expect(scoreAttempt(base).viewedFactor).toBe(1);
  });

  it('senza la soluzione non scende mai sotto 1 XP', () => {
    expect(scoreAttempt({ ...base, baseXp: 1, errors: 9, seconds: 9999, code: 'tutto diverso' }).xp).toBe(1);
  });
});

describe('anti-incolla', () => {
  const base = { baseXp: 100, difficulty: 1, seconds: 3, errors: 0, code: 'x = 1', reference: 'x = 1', solutionViewed: false };

  it('codice incollato (≥ 40 caratteri), quasi identico alla soluzione, in ≤ 5 s: XP ×0,6 e motivazione nel calcolo', () => {
    const typed = scoreAttempt(base);
    const pasted = scoreAttempt({ ...base, pastedChars: 120 });
    expect(typed.pasteFactor).toBe(1);
    expect(pasted.pasteFactor).toBe(0.6);
    expect(pasted.xp).toBe(Math.round(typed.xp * 0.6));
  });

  it('non scatta se si è scritto a mano, se si è incollato poco, se ci si è messo più di 5 s o se il codice è diverso', () => {
    expect(scoreAttempt({ ...base, pastedChars: 0 }).pasteFactor).toBe(1);
    expect(scoreAttempt({ ...base, pastedChars: 10 }).pasteFactor).toBe(1);
    expect(scoreAttempt({ ...base, pastedChars: 120, seconds: 6 }).pasteFactor).toBe(1);
    expect(scoreAttempt({ ...base, pastedChars: 120, code: 'y = 2 + 3 + 4 + 5 + 6' }).pasteFactor).toBe(1);
  });

  it('i parametri stanno in un solo file di configurazione', () => {
    expect(SCORING.paste).toEqual({ minChars: 40, minSimilarity: 0.9, maxSeconds: 5, factor: 0.6 });
    expect(parSeconds(2)).toBe(SCORING.parBase + 2 * SCORING.parPerDifficulty);
  });
});
