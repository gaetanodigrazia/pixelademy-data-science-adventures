import { validateOutput } from './core/utils/validator';

describe('validateOutput', () => {
  it('rifiuta output vuoto', () => {
    expect(validateOutput('  \n', { kind: 'numbers', expected: [1] }).ok).toBe(false);
  });
  it('rifiuta output non numerico', () => {
    expect(validateOutput('None', { kind: 'numbers', expected: [1] }).ok).toBe(false);
    expect(validateOutput('Il totale è 5', { kind: 'numbers', expected: [5] }).ok).toBe(false);
  });
  it('accetta numeri con tolleranza e liste', () => {
    expect(validateOutput('3.3333\n', { kind: 'numbers', expected: [3.33] }).ok).toBe(true);
    expect(validateOutput('3.4', { kind: 'numbers', expected: [3.33] }).ok).toBe(false);
    expect(validateOutput('[48, 61, 55]', { kind: 'numbers', expected: [48, 61, 55] }).ok).toBe(true);
    expect(validateOutput('[48, 61]', { kind: 'numbers', expected: [48, 61, 55] }).ok).toBe(false);
  });
  it("lines: confronta l'output riga per riga senza rivelare la soluzione", () => {
    const spec = { kind: 'lines' as const, expected: ['A: 1', 'B: 2'] };
    expect(validateOutput('A: 1\nB: 2\n', spec).ok).toBe(true);
    const bad = validateOutput('A: 1\nB: None', spec);
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain('riga 2');
    expect(bad.message).not.toContain('B: 2');
    expect(validateOutput('A: 1', spec).message).toContain('servono 2');
    expect(validateOutput('A: 1\nB: 2\nC: 3', spec).ok).toBe(false);
  });
  it('confronta il testo ignorando maiuscole e spazi', () => {
    expect(validateOutput(' allarme\n', { kind: 'text', expected: 'ALLARME' }).ok).toBe(true);
    expect(validateOutput('OK', { kind: 'text', expected: 'ALLARME' }).ok).toBe(false);
  });
});
