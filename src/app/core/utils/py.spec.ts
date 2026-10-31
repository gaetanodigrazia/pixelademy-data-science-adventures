import { pyFloat, pyRound } from './py';

describe('py', () => {
  // Valori verificati con Python 3: round() arrotonda «al pari» sui .5
  it('pyRound arrotonda come round() di Python', () => {
    expect([0.5, 1.5, 2.5, 3.5, 2.4, 2.6].map(pyRound)).toEqual([0, 2, 2, 4, 2, 3]);
  });

  it('pyFloat formatta come str(float) di Python', () => {
    expect(pyFloat(5)).toBe('5.0');
    expect(pyFloat(4.5)).toBe('4.5');
    expect(pyFloat(1 / 3)).toBe('0.3333');
    expect(pyFloat(0)).toBe('0.0');
  });
});
