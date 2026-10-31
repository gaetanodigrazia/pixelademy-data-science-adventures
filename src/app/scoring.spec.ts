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

  it('dimezza gli XP se la soluzione è stata aperta prima di superare il task', () => {
    expect(scoreAttempt({ ...base, solutionViewed: true }).xp).toBe(50);
  });

  it('non scende mai sotto 1 XP', () => {
    expect(scoreAttempt({ ...base, baseXp: 1, errors: 9, solutionViewed: true }).xp).toBe(1);
  });
});
