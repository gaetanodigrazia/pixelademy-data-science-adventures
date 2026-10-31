import { GameDefinition } from '../../core/models/game.model';
import { Accumulator } from '../../shared/components/games/accumulator';
import { BranchPicker } from '../../shared/components/games/branch-picker';
import { DictVault } from '../../shared/components/games/dict-vault';
import { ExtremeDuel } from '../../shared/components/games/extreme-duel';
import { FilterBelt } from '../../shared/components/games/filter-belt';
import { FunctionForge } from '../../shared/components/games/function-forge';
import { IndexRack } from '../../shared/components/games/index-rack';
import { ListBench } from '../../shared/components/games/list-bench';
import { MeanCalc } from '../../shared/components/games/mean-calc';
import { PipelineLine } from '../../shared/components/games/pipeline-line';

/** Un minigioco per concetto, nello stesso ordine delle 10 missioni standard: si impara il concetto giocandolo sui dati della missione. Il quiz «Esegui il codice a mano» si aggiunge con US-07.12. */
export const GAMES: GameDefinition[] = [
  { id: 'adventure-index-rack', title: 'Scaffale degli indici', description: 'Trova la cella indicata da un indice, anche negativo.', controls: 'Clic sulle celle', component: IndexRack },
  { id: 'adventure-list-bench', title: 'Banco della lista', description: 'Riempi e svuota una lista guardando len() cambiare.', controls: 'append() e pop()', component: ListBench },
  { id: 'adventure-filter-belt', title: 'Nastro di filtraggio', description: 'Esegui a mano for + if su una serie di valori.', controls: 'append o salta', component: FilterBelt },
  { id: 'adventure-accumulator', title: "Registro dell'accumulatore", description: 'Traccia il valore di totale a ogni giro del ciclo.', controls: 'Clic sul valore corretto', component: Accumulator },
  { id: 'adventure-mean-calc', title: 'Calcolo della media', description: 'Scomponi media = sum / len: somma, quantità, divisione e arrotondamento.', controls: 'Clic sul risultato', component: MeanCalc },
  { id: 'adventure-branch-picker', title: 'Quale ramo scatta?', description: 'Scegli se l\'if/else stampa ALLARME o OK, anche quando la media è uguale alla soglia.', controls: 'Clic sul ramo', component: BranchPicker },
  { id: 'adventure-dict-vault', title: 'Archivio chiavi', description: 'Recupera valori per chiave, compreso il KeyError.', controls: 'Clic sui cassetti', component: DictVault },
  { id: 'adventure-extreme-duel', title: 'Duello degli estremi', description: "Scopri l'algoritmo di massimo e minimo confronto dopo confronto.", controls: 'Clic sul vincitore', component: ExtremeDuel },
  { id: 'adventure-function-forge', title: 'Fucina delle funzioni', description: 'Monta una funzione riga per riga e provala con un test.', controls: 'Clic sulle righe', component: FunctionForge },
  { id: 'adventure-pipeline-line', title: 'Linea di analisi', description: 'Componi una pipeline e guarda i dati cambiare a ogni passo.', controls: 'Clic sui passi', component: PipelineLine },
];

export const GAME_IDS = GAMES.map((g) => g.id);
