/**
 * Il codice salvato è davvero una versione del progetto? Deve definire ogni variabile del progetto di riferimento
 * (dati, risultati intermedi). Il codice salvato da versioni precedenti dei contenuti, con esercizi diversi, non passa.
 */
export function coversProject(code: string, reference: string): boolean {
  const names = [...new Set([...reference.matchAll(/^(\w+) = /gm)].map((m) => m[1]))];
  return names.length > 0 && names.every((n) => new RegExp(`^${n} = `, 'm').test(code));
}

/** Il progetto fino a una missione: il codice dell'utente se è coerente con il progetto, altrimenti quello di riferimento. */
export function projectCode(saved: string | undefined, reference: string): string {
  return saved && coversProject(saved, reference) ? saved : reference;
}

/** La soluzione «fino a questo punto»: il codice dell'utente con la sezione corrente risolta come da riferimento. */
export function solutionSoFar(base: string, referenceBase: string, referenceSolution: string): string {
  if (!base || !referenceSolution.startsWith(referenceBase)) return referenceSolution;
  return `${base.trimEnd()}\n${referenceSolution.slice(referenceBase.length)}`;
}
