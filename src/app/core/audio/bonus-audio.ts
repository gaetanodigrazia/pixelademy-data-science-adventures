/**
 * Audio del bonus platform: una musichetta a 8 bit e i suoni delle monete, **sintetizzati** con WebAudio (nessun file da scaricare,
 * nessuna licenza). La melodia è originale, in Do maggiore pentatonica. Il contesto audio nasce solo dopo un gesto dell'utente
 * («Via!»), come richiedono i browser; senza WebAudio (o con l'audio spento) ogni metodo è un no-op silenzioso.
 */

const KEY = 'pixelademy.bonus.sound.v1';

/** Frequenza di una nota MIDI. */
const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
const REST = -1;

/** Melodia: 4 battute da 8 crome (note MIDI; E5 = 76). In Do maggiore pentatonica: allegra e facile da cantare. */
const LEAD = [
  76, 79, 81, 79, 76, 79, 84, REST,
  74, 76, 79, 76, 74, 72, REST, REST,
  69, 72, 76, 72, 69, 72, 74, 76,
  67, 71, 74, 79, 76, 74, 72, REST,
];
/** Basso: una nota ogni due crome (note MIDI, Do2 = 36). */
const BASS = [36, 36, 31, 31, 33, 33, 29, 31, 36, 36, 31, 31, 33, 33, 29, 31];
const BPM = 132;
const EIGHTH = 60 / BPM / 2; // durata di una croma (secondi)

type Ctx = AudioContext;

export class BonusAudio {
  private ctx?: Ctx;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private next = 0;
  private playing = false;
  private muted: boolean;

  constructor() {
    this.muted = BonusAudio.savedMuted();
  }

  /** L'ambiente ha WebAudio? (nei test con jsdom e in browser molto vecchi no) */
  static supported(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }

  static savedMuted(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'off';
    } catch {
      return false;
    }
  }

  get isMuted(): boolean { return this.muted; }

  setMuted(m: boolean): void {
    this.muted = m;
    try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* senza storage la scelta vale solo per questa sessione */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  /** Avvia la musica. Va chiamato dentro un gesto dell'utente (clic, tocco, tasto). */
  start(): void {
    if (this.playing || !BonusAudio.supported()) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx ??= new AC();
      this.master ??= this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      void this.ctx.resume?.();
      this.playing = true;
      this.step = 0;
      this.next = this.ctx.currentTime + 0.05;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 80);
    } catch {
      this.playing = false; // l'audio è un di più: se non parte, si gioca in silenzio
    }
  }

  /** Mette in pausa la musica (e i suoni in corso). */
  pause(): void {
    void this.ctx?.suspend?.();
  }

  resume(): void {
    if (this.playing) void this.ctx?.resume?.();
  }

  /** Ferma la musica (fine corsa). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.playing = false;
  }

  /** Libera il contesto audio (chiusura del gioco). */
  dispose(): void {
    this.stop();
    try { void this.ctx?.close?.(); } catch { /* già chiuso */ }
    this.ctx = undefined;
    this.master = undefined;
  }

  /** «Ding» alla moneta giusta: due note rapide, la seconda più acuta (come ogni moneta che si rispetti). */
  coin(): void {
    this.tone(hz(83), 0, 0.07, 'square', 0.22);
    this.tone(hz(88), 0.07, 0.28, 'square', 0.22);
  }

  /** «Bonk» alla scelta sbagliata: una nota bassa che scende. */
  bonk(): void {
    this.tone(hz(52), 0, 0.22, 'sawtooth', 0.28, hz(40));
  }

  /** Piccola fanfara di fine corsa. */
  fanfare(): void {
    [72, 76, 79, 84].forEach((n, i) => this.tone(hz(n), i * 0.11, i === 3 ? 0.45 : 0.1, 'square', 0.2));
  }

  /* ───────────── interni ───────────── */

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    while (this.next < ctx.currentTime + 0.35) {
      const i = this.step % LEAD.length;
      const lead = LEAD[i];
      if (lead !== REST) this.toneAt(hz(lead), this.next, EIGHTH * 0.9, 'square', 0.1);
      if (i % 2 === 0) this.toneAt(hz(BASS[(i / 2) % BASS.length]), this.next, EIGHTH * 1.8, 'triangle', 0.2);
      this.next += EIGHTH;
      this.step++;
    }
  }

  private tone(freq: number, delay: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    if (this.muted || !this.ctx || !this.master) return;
    this.toneAt(freq, this.ctx.currentTime + delay, dur, type, vol, slideTo);
  }

  private toneAt(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(g).connect(master);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    } catch {
      /* un suono perso non deve fermare il gioco */
    }
  }
}
