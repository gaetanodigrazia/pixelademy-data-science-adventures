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
  {
    slug: 'mobilita',
    title: 'Centro Mobilità',
    description: 'Costruisci il rapporto della linea 7: variazione delle attese, le attese più brevi e la percentuale di attese lunghe.',
    icon: '🚲',
    tags: ['python', 'mobilità', 'città'],
    characterSlug: 'nilo',
    enemySlug: 'ingorgo',
    // esercizi propri (primo, ordinare, contare in percentuale): niente riquadri di Dashboard, pensati per gli esercizi standard
    exercises: ['delta', 'ordina', 'percentuale'],
    dashboard: false,
    project: {
      heading: 'RAPPORTO DELLA LINEA 7',
      // `a` è la serie degli esercizi; `cut` (con `cutName`) è la soglia applicata ad `a` nell'ultimo esercizio
      a: { name: 'attese', label: 'Attese alle fermate', unit: 'min', values: [4, 7, 12, 9, 15, 6, 11] },
      b: { name: 'corse', label: 'Passeggeri per corsa', unit: 'passeggeri', values: [23, 41, 18, 52, 37, 29, 44] },
      c: { name: 'traffico', label: 'Traffico agli incroci', unit: 'veicoli/min', values: [14, 38, 52, 27, 61, 44, 35] },
      k: 3,
      cut: 8,
      cutName: 'soglia_attesa',
      alert: 9,
      registry: { name: 'quartieri', entries: { centro: 320, porto: 145, stazione: 410, collina: 98 }, key: 'stazione', unit: 'passeggeri' },
      extreme: 'max',
      labels: {
        first: 'Variazione dell\'attesa',
        count: 'Le tre attese più brevi',
        filtered: 'Attese lunghe (%)',
        total: 'Passeggeri totali',
        mean: 'Attesa media',
        alert: 'Allerta attese',
        key: 'Passeggeri alla stazione',
        extreme: 'Attesa massima',
        range: 'Escursione delle attese',
        final: 'Traffico medio degli incroci intensi',
      },
    },
    missions: [
      { title: 'Variazione dell\'attesa', story: 'Nilo apre il rapporto della linea 7: quanto è cambiata l\'attesa dalla prima all\'ultima fermata?' },
      { title: 'Le attese più brevi', story: 'Il centro di controllo vuole sapere dove si aspetta meno: le tre attese più brevi della linea.' },
      { title: 'Quante attese sono lunghe?', story: 'Per il piano degli orari serve la percentuale di attese sopra la soglia.' },
    ],
  },
  {
    slug: 'energia',
    title: 'Officina dell\'Energia',
    description: 'Costruisci il registro della centrale: il costo di una lettura, la posizione del picco e la somma dei consumi alti.',
    icon: '🔋',
    tags: ['python', 'energia', 'efficienza'],
    characterSlug: 'teo',
    enemySlug: 'dispersione',
    // esercizi propri (costo con le variabili, posizione del massimo, somma condizionata): niente riquadri di Dashboard
    exercises: ['conversione', 'posizione', 'somma-sopra'],
    dashboard: false,
    project: {
      heading: 'REGISTRO DELLA CENTRALE',
      // `a` è la serie degli esercizi; `k` la lettura del primo esercizio; `cut` (con `cutName`) la soglia applicata ad `a`
      a: { name: 'consumi', label: 'Consumo del quadro', unit: 'kWh', values: [310, 295, 340, 360, 325, 380, 300] },
      b: { name: 'pannelli', label: 'Pannelli attivi', unit: 'pannelli', values: [5, 6, 4, 7, 6, 8, 3] },
      c: { name: 'picchi', label: 'Picchi di consumo', unit: 'kW', values: [2.5, 6.8, 4.1, 9.3, 3.7, 7.5, 5.2] },
      k: 4,
      cut: 330,
      cutName: 'soglia_consumo',
      alert: 325,
      registry: { name: 'linee', entries: { nord: 42, sud: 37, est: 55, ovest: 29 }, key: 'est', unit: 'kW' },
      extreme: 'min',
      labels: {
        first: 'Costo della quinta lettura',
        count: 'Posizione del picco',
        filtered: 'Energia sopra soglia',
        total: 'Pannelli attivi totali',
        mean: 'Consumo medio',
        alert: 'Allerta consumi',
        key: 'Linea est',
        extreme: 'Consumo minimo',
        range: 'Escursione dei consumi',
        final: 'Picco medio dei consumi alti',
      },
    },
    missions: [
      { title: 'Costo di una lettura', story: 'Teo apre il registro della centrale: quanto costa l\'energia di una lettura del quadro?' },
      { title: 'Il picco di consumo', story: 'Teo vuole sapere a che punto è arrivato il picco: la posizione del consumo più alto.' },
      { title: 'Energia sopra soglia', story: 'Solo l\'energia sopra soglia pesa sulla rete: serve la somma dei consumi alti.' },
    ],
  },
  {
    slug: 'statistica',
    title: 'Statistica dei Segnali',
    description: 'Le basi della matematica per la data science: media, mediana, moda, campo di variazione, varianza e deviazione standard, sui segnali delle boe.',
    icon: '📊',
    tags: ['python', 'statistica', 'data science'],
    characterSlug: 'cora',
    enemySlug: 'onda',
    // esercizi propri di statistica descrittiva: niente Dashboard (i riquadri seguono le 10 sezioni standard)
    exercises: ['media', 'mediana', 'moda', 'campo', 'varianza', 'deviazione'],
    dashboard: false,
    project: {
      heading: 'RAPPORTO STATISTICO DELLE BOE',
      // `a` è la serie su cui lavorano tutti gli esercizi; gli altri campi non vengono usati
      a: { name: 'onde', label: 'Altezza delle onde', unit: 'dm', values: [5, 4, 9, 4, 7, 2, 5, 4] },
      b: { name: 'periodi', label: 'Periodo delle onde', unit: 's', values: [6, 8, 7, 9, 8, 10, 7, 8] },
      c: { name: 'correnti', label: 'Velocità delle correnti', unit: 'nodi', values: [2, 3, 5, 4, 6, 3, 2, 4] },
      k: 3,
      cut: 6,
      cutName: 'soglia_onda',
      alert: 5,
      registry: { name: 'boe', entries: { nord: 5, est: 4, sud: 9, ovest: 7 }, key: 'sud', unit: 'dm' },
      extreme: 'max',
      labels: {
        first: 'Altezza media',
        count: 'Altezza mediana',
        filtered: 'Altezza più frequente',
        total: 'Campo di variazione',
        mean: 'Varianza',
        alert: 'Allerta onde',
        key: 'Onda al sud',
        extreme: 'Onda massima',
        range: 'Escursione delle onde',
        final: 'Deviazione standard',
      },
    },
    missions: [
      { title: 'L\'altezza media', story: 'Cora ascolta le boe: prima di tutto serve un numero che riassuma l\'altezza delle onde, la media.' },
      { title: 'Il valore di mezzo', story: 'Una grossa onda sposta la media: Cora cerca la mediana, che non si lascia ingannare.' },
      { title: 'L\'onda più frequente', story: 'Qual è l\'altezza che si ripete più spesso? Cora cerca la moda.' },
      { title: 'Quanto sono sparsi i dati', story: 'Tra l\'onda più bassa e la più alta quanta distanza c\'è? Cora misura il campo di variazione.' },
      { title: 'La varianza', story: 'Per misurare la dispersione attorno alla media Cora somma i quadrati degli scarti.' },
      { title: 'La deviazione standard', story: 'Ultima sezione: la radice della varianza riporta tutto all\'unità dei dati. Il rapporto statistico è completo!' },
    ],
  },
  {
    slug: 'outlier',
    title: 'Caccia agli Outlier',
    description: 'Impara a riconoscere i valori anomali: media, varianza, deviazione standard e z-score, sui tempi di consegna di un servizio.',
    icon: '🔍',
    tags: ['python', 'statistica', 'data science'],
    characterSlug: 'teo',
    enemySlug: 'onda',
    // media → varianza → deviazione → z-score → outlier: ogni sezione riusa le variabili di quelle prima
    exercises: ['media', 'varianza', 'deviazione', 'zscore', 'outlier'],
    dashboard: false,
    project: {
      heading: 'RAPPORTO SUI TEMPI DI CONSEGNA',
      // `a` è la serie su cui lavorano tutti gli esercizi (media 17, deviazione 10, un solo valore anomalo: 46); gli altri campi non vengono usati
      a: { name: 'consegne', label: 'Tempi di consegna', unit: 'min', values: [15, 14, 13, 13, 18, 46, 13, 17, 8, 13] },
      b: { name: 'ordini', label: 'Ordini per ora', unit: 'ordini', values: [12, 18, 25, 31, 22, 15, 9, 20, 27, 14] },
      c: { name: 'distanze', label: 'Distanze percorse', unit: 'km', values: [2, 4, 3, 6, 5, 3, 4, 7, 2, 5] },
      k: 3,
      cut: 20,
      cutName: 'soglia_tempo',
      alert: 18,
      registry: { name: 'zone', entries: { centro: 14, nord: 17, sud: 22, periferia: 31 }, key: 'centro', unit: 'min' },
      extreme: 'max',
      labels: {
        first: 'Tempo medio di consegna',
        count: 'Tempo mediano',
        filtered: 'Tempo più frequente',
        total: 'Campo di variazione',
        mean: 'Varianza dei tempi',
        alert: 'Z-score del tempo massimo',
        key: 'Tempo in centro',
        extreme: 'Consegne anomale',
        range: 'Escursione dei tempi',
        final: 'Deviazione standard',
      },
    },
    missions: [
      { title: 'Il tempo medio', story: 'Teo analizza le consegne di un servizio di corrieri: il primo numero da calcolare è il tempo medio.' },
      { title: 'Quanto variano i tempi', story: 'Una media uguale può nascondere consegne molto diverse: Teo misura la dispersione con la varianza.' },
      { title: 'La deviazione standard', story: 'La varianza è in minuti al quadrato: Teo ne fa la radice per tornare ai minuti.' },
      { title: 'Quanto è lontano il più lento', story: 'Una consegna ha impiegato moltissimo: Teo calcola a quante deviazioni standard dista dalla media.' },
      { title: 'Caccia agli outlier', story: 'Ultima sezione: Teo conta le consegne anomale con la regola dello z-score. Il rapporto è completo!' },
    ],
  },
  {
    slug: 'probabilita',
    title: 'Probabilità con i Dadi',
    description: 'I primi concetti di probabilità: frequenza osservata, valore atteso e probabilità di un evento, con i lanci di un dado.',
    icon: '🎲',
    tags: ['python', 'probabilità', 'data science'],
    characterSlug: 'aura',
    enemySlug: 'nuvola',
    // frequenza → valore atteso → scostamento (dati contro teoria) → probabilità di un evento con due dadi
    exercises: ['frequenza', 'valore-atteso', 'scostamento', 'somma-dadi'],
    dashboard: false,
    project: {
      heading: 'RAPPORTO SUI LANCI DEL DADO',
      // `a` sono i lanci osservati (10 lanci, il 4 esce 3 volte, media 3.7); `k` è la faccia di cui si calcola la frequenza
      a: { name: 'lanci', label: 'Lanci del dado', unit: 'faccia', values: [3, 6, 2, 4, 4, 1, 5, 4, 6, 2] },
      b: { name: 'estrazioni', label: 'Estrazioni', unit: 'numero', values: [7, 12, 3, 9, 15, 4, 11, 6, 2, 10] },
      c: { name: 'monete', label: 'Lanci di monete', unit: 'teste', values: [4, 6, 5, 3, 7, 5, 4, 6, 5, 5] },
      k: 4,
      cut: 3,
      cutName: 'soglia_faccia',
      alert: 4,
      registry: { name: 'giocatori', entries: { anna: 12, bruno: 9, carla: 15, dario: 7 }, key: 'carla', unit: 'punti' },
      extreme: 'max',
      labels: {
        first: 'Frequenza del 4',
        count: 'Valore atteso del dado',
        filtered: 'Scostamento dal valore atteso',
        total: 'Probabilità di fare 7 con due dadi',
        mean: 'Media dei lanci',
        alert: 'Allerta lanci',
        key: 'Punti di Carla',
        extreme: 'Lancio più alto',
        range: 'Escursione dei lanci',
        final: 'Media finale',
      },
    },
    missions: [
      { title: 'Quante volte esce il 4?', story: 'Aura lancia un dado per dieci volte e vuole sapere con che frequenza è uscito il 4.' },
      { title: 'Cosa ci aspettiamo', story: 'Prima dei lanci c\'è la teoria: Aura calcola il valore atteso di un dado a sei facce.' },
      { title: 'Dati contro teoria', story: 'La media dei lanci reali è vicina al valore atteso? Aura ne misura lo scostamento.' },
      { title: 'Due dadi, somma 7', story: 'Ultima sezione: con due dadi, quanto è probabile fare 7? Aura conta tutte le coppie. Il rapporto è completo!' },
    ],
  },
];
