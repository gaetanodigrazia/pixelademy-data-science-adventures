import { readFileSync } from 'node:fs';

/** Contrasto WCAG tra due colori esadecimali (#rrggbb). */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string): number => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Le variabili del tema sono lette da styles.css: se cambiano, il test misura quelle nuove.
const css = readFileSync('src/styles.css', 'utf8');
const token = (name: string): string => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1];

describe('contrasto del tema (WCAG AA, ≥ 4.5:1 per il testo)', () => {
  const pairs: [string, string, string][] = [
    ['text', 'bg', 'testo su sfondo'], ['text', 'panel', 'testo su pannello'], ['text', 'panel-2', 'testo su pulsante'],
    ['muted', 'bg', 'testo attenuato su sfondo'], ['muted', 'panel', 'testo attenuato su pannello'],
    ['accent', 'bg', 'giallo su sfondo'], ['accent', 'panel', 'giallo su pannello'], ['accent-2', 'panel', 'titoli su pannello'],
    ['good', 'panel', 'verde su pannello'], ['bad', 'panel', 'rosso su pannello'],
  ];
  it.each(pairs)('%s su %s (%s)', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('il pulsante principale: testo scuro su giallo', () => {
    expect(ratio('#111827', token('accent'))).toBeGreaterThanOrEqual(4.5);
  });
});
