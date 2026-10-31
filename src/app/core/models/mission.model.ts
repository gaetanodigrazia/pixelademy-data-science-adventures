export interface TheorySlide {
  title: string;
  body: string;
}

export type ValidationSpec =
  | { kind: 'numbers'; expected: number[]; tolerance?: number }
  | { kind: 'text'; expected: string }
  /** Output completo del programma, riga per riga: il bollettino cresce a ogni missione. */
  | { kind: 'lines'; expected: string[] };

export interface ValidationResult {
  ok: boolean;
  message: string;
}

export interface MissionGame {
  /** ID di un `GameDefinition` registrato in un ContentPack. */
  type: string;
  config?: Record<string, unknown>;
}

export type VizKind = 'list-read' | 'count' | 'filter' | 'sum' | 'mean' | 'alarm' | 'dict' | 'extreme' | 'range' | 'pipeline' | 'value' | 'pick';

/**
 * Scena di gioco guidata dal codice: al posto del minigioco separato, il risultato del
 * programma dello studente muove il mondo di gioco durante il task.
 */
export interface MissionViz {
  kind: VizKind;
  /** Etichetta della riga che la missione aggiunge al bollettino (prima dei due punti). */
  label?: string;
  /** Nome della variabile Python che contiene i dati (`misure`, `registro`). */
  name: string;
  unit: string;
  values: number[];
  /** Etichette delle chiavi (solo `dict`), nello stesso ordine di `values`. */
  labels?: string[];
  /** Posizione da leggere: `list-read` e `dict`. */
  index?: number;
  th?: number;
  mode?: 'max' | 'min';
  /** `value`: barre evidenziate in giallo come aiuto (indici). */
  marks?: number[];
  /** `value`: il numero stampato è una posizione (indice): si illumina la sua barra. */
  asIndex?: boolean;
  /** Consegna mostrata prima dell'esecuzione (al posto di quella del tipo di scena). */
  note?: string;
  /** Risultato atteso: numeri stampati, oppure la parola per `alarm`. */
  expected: number[] | string;
}

export interface Mission {
  id: string;
  pathId: string;
  title: string;
  topic: string;
  /** 1..10 */
  difficulty: number;
  xp: number;
  prerequisites: string[];
  story: string;
  theory: TheorySlide[];
  briefing: string;
  hint: string;
  /** Codice di partenza: il progetto fino alla missione precedente + la nuova sezione da completare. */
  starterCode: string;
  /** Il progetto fino alla missione precedente (soluzione di riferimento); vuoto per la prima missione. */
  projectBase?: string;
  /** Solo la nuova sezione da completare, da aggiungere al tuo codice precedente. */
  projectSection?: string;
  validation: ValidationSpec;
  game: MissionGame;
  /** Scena di gioco del task: il risultato del programma muove il mondo di gioco (si affianca al minigioco della battaglia). */
  viz?: MissionViz;
  enemyId?: string;
}
