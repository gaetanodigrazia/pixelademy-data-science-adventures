import { EXERCISES, exercisesFor, stat } from './content/adventure-core/exercises';

const path = (n: number, exercises?: string[]) => ({ slug: 'prova', missions: new Array(n).fill(0), exercises });

describe('registro degli esercizi', () => {
  it('senza elenco usa i primi N dei 10 standard', () => {
    expect(exercisesFor(path(3)).map((e) => e.id)).toEqual(['std-1', 'std-2', 'std-3']);
    expect(exercisesFor(path(10)).length).toBe(10);
  });

  it('contiene gli esercizi standard e quelli propri dei percorsi', () => {
    const ids = ['delta', 'ordina', 'percentuale', 'conversione', 'posizione', 'somma-sopra', 'media', 'mediana', 'moda', 'campo', 'varianza', 'deviazione', 'zscore', 'outlier', 'frequenza', 'valore-atteso', 'scostamento', 'somma-dadi'];
    for (const id of ['std-1', 'std-10', ...ids]) expect(EXERCISES[id], id).toBeDefined();
  });

  it('esercizi propri: un percorso valido passa la validazione', () => {
    expect(exercisesFor(path(3, ['delta', 'ordina', 'percentuale'])).map((e) => e.id)).toEqual(['delta', 'ordina', 'percentuale']);
    expect(exercisesFor(path(3, ['media', 'varianza', 'deviazione'])).length).toBe(3);
  });

  it('errori espliciti: numero di esercizi, id sconosciuto, primo che non apre, apertura fuori posto, dipendenza mancante', () => {
    expect(() => exercisesFor(path(3, ['delta']))).toThrow(/3 missioni ma 1 esercizi/);
    expect(() => exercisesFor(path(2, ['delta', 'boh']))).toThrow(/sconosciuto/);
    expect(() => exercisesFor(path(2, ['ordina', 'delta']))).toThrow(/deve aprire il progetto/);
    expect(() => exercisesFor(path(2, ['delta', 'conversione']))).toThrow(/solo al primo posto/);
    expect(() => exercisesFor(path(2, ['media', 'deviazione']))).toThrow(/richiede/);
  });

  it('stat: media, mediana, varianza e deviazione di popolazione', () => {
    const s = stat([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.variance).toBe(4);
    expect(s.std).toBe(2);
  });
});
