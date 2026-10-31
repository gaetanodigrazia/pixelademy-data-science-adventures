import { ProjectSpec } from './concepts';

export const PACK_ID = 'adventure-core';

export interface MissionText {
  title: string;
  story: string;
}

export interface PathSeed {
  slug: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  characterSlug: string;
  enemySlug: string;
  /** Il progetto del percorso: completare le sue missioni lo realizza. */
  project: ProjectSpec;
  /**
   * Gli esercizi delle missioni, nell'ordine (id di `EXERCISES`, in `exercises.ts`). Se manca: i primi N dei 10 standard.
   * Il primo deve aprire il progetto (`delta`, `conversione`…), gli altri no. Gli esercizi propri non hanno ancora i riquadri
   * della Dashboard: questi percorsi vanno con `dashboard: false`.
   */
  exercises?: string[];
  /** Dashboard dei risultati: `true` (default) o `false` per un percorso con il solo progetto, senza pagina dei grafici. */
  dashboard?: boolean;
  /** Da 1 a 10 missioni, una per concetto nell'ordine fisso dei concetti: un percorso breve usa i primi (difficoltà 1..N). */
  missions: MissionText[];
}


/** I percorsi del pack: ognuno si aggiunge con la propria issue (US-11.x). */
export const PATH_SEEDS: PathSeed[] = [
  {
    slug: 'nuvole',
    title: 'Osservatorio delle Nuvole',
    description: 'Costruisci il bollettino meteo dell\'osservatorio: temperatura, pioggia e vento, una sezione per missione.',
    icon: '☁️',
    tags: ['python', 'clima', 'ambiente'],
    characterSlug: 'aura',
    enemySlug: 'nuvola',
    project: {
      heading: 'BOLLETTINO DELL\'OSSERVATORIO',
      a: { name: 'temperature', label: 'Temperature della giornata', unit: '°C', values: [17, 19, 22, 28, 31, 26, 21] },
      b: { name: 'pioggia', label: 'Pioggia', unit: 'mm', values: [0, 2, 5, 0, 1, 7, 3] },
      c: { name: 'vento', label: 'Vento', unit: 'km/h', values: [12, 35, 48, 22, 61, 30, 55] },
      k: 3,
      cut: 40,
      cutName: 'soglia_vento',
      alert: 22,
      registry: { name: 'venti', entries: { nord: 18, est: 27, sud: 34, ovest: 21 }, key: 'sud', unit: 'km/h' },
      extreme: 'min',
      labels: {
        first: 'Temperatura alle 12',
        count: 'Rilevazioni di pioggia',
        filtered: 'Raffiche sopra soglia',
        total: 'Pioggia totale',
        mean: 'Temperatura media',
        alert: 'Allerta caldo',
        key: 'Vento da sud',
        extreme: 'Temperatura minima',
        range: 'Escursione termica',
        final: 'Vento medio delle raffiche',
      },
    },
    missions: [
      { title: 'Il primo termometro', story: 'Aura accende l\'osservatorio e apre il bollettino con la prima lettura del termometro.' },
      { title: 'Conta i pluviometri', story: 'Sul tetto ci sono sensori di pioggia sparsi: il bollettino deve dire quante rilevazioni sono arrivate.' },
      { title: 'Raffiche da segnalare', story: 'Il vento si alza: solo le raffiche più forti entrano nel bollettino.' },
      { title: 'Pioggia della settimana', story: 'Per il registro serve la pioggia totale caduta nella settimana.' },
      { title: 'Temperatura media', story: 'Una singola misura inganna: Aura vuole un valore tipico della giornata.' },
      { title: 'Allerta caldo', story: 'Se la media supera la soglia, l\'osservatorio deve avvisare la città.' },
      { title: 'Il registro dei venti', story: 'Ogni direzione del vento ha la sua velocità media nel registro.' },
      { title: 'La notte più fredda', story: 'I giardinieri chiedono la temperatura più bassa per proteggere le piante.' },
      { title: 'Escursione termica', story: 'Aura riassume la giornata con un solo numero: quanto è cambiata la temperatura.' },
      { title: 'Bollettino finale', story: 'Ultima sezione: la media delle raffiche chiude il bollettino. Il programma è completo!' },
    ],
  },
];
