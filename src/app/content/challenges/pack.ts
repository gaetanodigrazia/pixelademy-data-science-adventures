import { ContentPack } from '../../core/models/content-pack.model';
import { Mission } from '../../core/models/mission.model';
import { xpForDifficulty } from '../../core/utils/progress';

/**
 * Sfide in stile Kaggle: un dataset (CSV), una domanda e `pandas`. Si aprono direttamente sul task, senza teoria né battaglia.
 * I dati sono nel codice di partenza (`io.StringIO`), così ogni sfida è autosufficiente e verificabile.
 */
const PACK_ID = 'challenges';
const PATH_ID = `${PACK_ID}-pandas`;

const DATASET = `categoria,prezzo,quantita
libri,12.5,3
libri,8.0,5
giochi,25.0,2
giochi,30.0,1
cibo,4.5,10
cibo,5.5,8
libri,15.0,2
giochi,22.5,4
cibo,6.0,6`;

const PREAMBLE = `import io
import pandas as pd

# Vendite di un negozio: una riga per vendita
DATI = """${DATASET}
"""
vendite = pd.read_csv(io.StringIO(DATI))
`;

interface Spec {
  title: string;
  topic: string;
  story: string;
  briefing: string;
  hint: string;
  /** La parte da completare (con `None` o commenti) e la soluzione. */
  starter: string;
  solution: string;
  validation: Mission['validation'];
}

const SPECS: Spec[] = [
  {
    title: 'Il prezzo medio dei libri',
    topic: 'Filtrare un DataFrame e farne la media',
    story: 'Il negozio vuole sapere a che prezzo vende i libri, in media.',
    briefing: 'Il DataFrame `vendite` ha le colonne `categoria`, `prezzo` e `quantita`. Calcola il prezzo medio delle vendite della categoria «libri», arrotondalo a 2 decimali e stampalo.',
    hint: 'Seleziona le righe con vendite[vendite["categoria"] == "libri"], poi prendi la colonna "prezzo" e usa .mean().',
    starter: '# 1. Prezzo medio dei libri (2 decimali)\nmedia_libri = None\nprint(round(media_libri, 2))\n',
    solution: '# 1. Prezzo medio dei libri (2 decimali)\nmedia_libri = vendite[vendite["categoria"] == "libri"]["prezzo"].mean()\nprint(round(media_libri, 2))\n',
    validation: { kind: 'lines', expected: ['11.83'] },
  },
  {
    title: 'La categoria che incassa di più',
    topic: 'Raggruppare e sommare (groupby)',
    story: 'Quale categoria porta più soldi? L\'incasso di una vendita è prezzo × quantità.',
    briefing: 'Aggiungi la colonna `incasso` (prezzo × quantita), raggruppa per `categoria` e somma gli incassi. Stampa il nome della categoria con l\'incasso maggiore e, sulla riga dopo, il suo incasso.',
    hint: 'vendite["incasso"] = vendite["prezzo"] * vendite["quantita"]; poi vendite.groupby("categoria")["incasso"].sum() e .idxmax() / .max().',
    starter: '# 2. Incasso per categoria\nvendite["incasso"] = None\nper_categoria = None\nprint(None)  # nome della categoria con più incasso\nprint(None)  # il suo incasso\n',
    solution: '# 2. Incasso per categoria\nvendite["incasso"] = vendite["prezzo"] * vendite["quantita"]\nper_categoria = vendite.groupby("categoria")["incasso"].sum()\nprint(per_categoria.idxmax())\nprint(per_categoria.max())\n',
    validation: { kind: 'lines', expected: ['11.83', 'giochi', '170.0'] },
  },
  {
    title: 'Vendite sopra la media',
    topic: 'Confrontare con la media di una colonna',
    story: 'Quante vendite hanno venduto più pezzi della media?',
    briefing: 'Conta quante righe di `vendite` hanno `quantita` maggiore della quantità media di tutte le vendite, e stampa il numero.',
    hint: 'Confronta la colonna con la sua media: vendite["quantita"] > vendite["quantita"].mean() dà una serie di True/False; sommala o filtra e usa len().',
    starter: '# 3. Vendite con quantità sopra la media\nsopra = None\nprint(sopra)\n',
    solution: '# 3. Vendite con quantità sopra la media\nsopra = (vendite["quantita"] > vendite["quantita"].mean()).sum()\nprint(sopra)\n',
    validation: { kind: 'lines', expected: ['11.83', 'giochi', '170.0', '4'] },
  },
];

const missionId = (i: number) => `${PATH_ID}-${String(i + 1).padStart(2, '0')}`;
const solutions: Record<string, string> = {};
let base = '';

const missions: Mission[] = SPECS.map((s, i) => {
  const difficulty = i + 1;
  const section = `\n${s.starter}`;
  solutions[missionId(i)] = PREAMBLE + base + `\n${s.solution}`;
  const m: Mission = {
    id: missionId(i),
    pathId: PATH_ID,
    title: s.title,
    topic: s.topic,
    difficulty,
    xp: xpForDifficulty(difficulty) + 10,
    prerequisites: i === 0 ? [] : [missionId(i - 1)],
    story: s.story,
    theory: [],
    briefing: s.briefing,
    hint: s.hint,
    starterCode: PREAMBLE + base + section,
    validation: s.validation,
    game: { type: 'challenge' },
    challenge: true,
  };
  base += `\n${s.solution}`;
  return m;
});

const pack: ContentPack = {
  id: PACK_ID,
  title: 'Sfide',
  author: 'Pixelademy',
  paths: [
    {
      id: PATH_ID,
      title: 'Sfide con pandas',
      description: 'Un dataset, una domanda, pandas: tre sfide per passare dalle liste Python all\'analisi dei dati vera.',
      icon: '🐼',
      tags: ['pandas', 'dataset', 'data science'],
      missions,
      dashboard: false,
      defaultCharacterId: 'adventure-core-teo',
      contributor: { name: 'Gaetano Di Grazia', url: 'https://github.com/gaetanodigrazia' },
    },
  ],
  characters: [],
  enemies: [],
  games: [],
  solutions,
};

export default pack;
