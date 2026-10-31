/** Python arrotonda «al pari» sui .5 (2.5 → 2, 3.5 → 4): lo stesso qui, così i valori attesi coincidono con quelli del programma. */
export const pyRound = (x: number): number => {
  const f = Math.floor(x);
  const d = x - f;
  return d < 0.5 ? f : d > 0.5 ? f + 1 : f % 2 === 0 ? f : f + 1;
};

/** Un numero come lo stampa Python per un float: 5 → "5.0", 4.5 → "4.5". */
export const pyFloat = (x: number): string => (Number.isInteger(x) ? x.toFixed(1) : String(Math.round(x * 10000) / 10000));
