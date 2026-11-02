import { BonusKind } from '../../core/utils/platformer-engine';

/**
 * Il tipo di moneta del bonus platform per ogni esercizio: la condizione scritta sulla moneta esercita lo stesso concetto della missione.
 * Ogni esercizio di `EXERCISES` deve comparire qui (lo verifica un test): un esercizio nuovo = una riga nuova.
 */
export const BONUS_KINDS: Record<string, BonusKind> = {
  // 10 concetti standard
  'std-1': 'index',     // leggere un elemento: prezzi[3] > 6
  'std-2': 'len',       // contare: len([4, 6, 9]) > 2
  'std-3': 'cmp',       // filtrare con una soglia: 28 > 22
  'std-4': 'sum',       // sommare
  'std-5': 'mean',      // la media
  'std-6': 'cmp',       // confrontare con una soglia
  'std-7': 'dict',      // dizionari: venti['sud'] > 20
  'std-8': 'minmax',    // minimo e massimo
  'std-9': 'cmp',       // funzioni (decisione su un valore)
  'std-10': 'sum',      // pipeline: somme di valori filtrati
  // esercizi propri
  delta: 'index', ordina: 'minmax', percentuale: 'cmp', conversione: 'cmp', posizione: 'index', 'somma-sopra': 'sum',
  media: 'mean', mediana: 'minmax', moda: 'cmp', campo: 'minmax', varianza: 'mean', deviazione: 'mean', zscore: 'cmp', outlier: 'cmp',
  frequenza: 'cmp', 'valore-atteso': 'mean', scostamento: 'cmp', 'somma-dadi': 'sum',
  'var-assegna': 'cmp', 'var-calcola': 'cmp',
  'liste-modifica': 'pop',
};
