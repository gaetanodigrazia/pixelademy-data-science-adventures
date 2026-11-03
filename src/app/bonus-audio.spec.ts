import { BonusAudio } from './core/audio/bonus-audio';

/** Un AudioContext finto: conta gli oscillatori creati e tiene lo stato (running/suspended/closed). */
class FakeParam { setValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } setTargetAtTime() { return this; } value = 0; }
class FakeNode { connect(n: unknown) { return n; } gain = new FakeParam(); frequency = new FakeParam(); type = ''; start() { /* niente */ } stop() { /* niente */ } }
const created = { osc: 0, ctx: 0 };
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  constructor() { created.ctx++; }
  createOscillator() { created.osc++; return new FakeNode(); }
  createGain() { return new FakeNode(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

describe('audio del bonus (WebAudio sintetizzato)', () => {
  beforeEach(() => {
    created.osc = 0; created.ctx = 0;
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('senza WebAudio (come in jsdom) tutto è silenzioso e non dà errori', () => {
    expect(BonusAudio.supported()).toBe(false);
    const a = new BonusAudio();
    expect(() => { a.start(); a.coin(); a.bonk(); a.fanfare(); a.pause(); a.resume(); a.stop(); a.dispose(); }).not.toThrow();
    expect(created.ctx).toBe(0);
  });

  it('start() crea il contesto e la musica suona in loop; stop() la ferma', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const a = new BonusAudio();
    expect(created.ctx).toBe(0); // nessun contesto finché non si parte (serve un gesto dell'utente)
    a.start();
    expect(created.ctx).toBe(1);
    const first = created.osc;
    expect(first).toBeGreaterThan(0); // le prime note sono già programmate
    // il tempo scorre (nel finto contesto serve avanzare currentTime): le note continuano a essere programmate
    const ctx = (a as unknown as { ctx: FakeCtx }).ctx;
    ctx.currentTime = 5;
    vi.advanceTimersByTime(200);
    expect(created.osc).toBeGreaterThan(first);
    a.stop();
    const stopped = created.osc;
    ctx.currentTime = 20;
    vi.advanceTimersByTime(500);
    expect(created.osc).toBe(stopped); // ferma
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('coin() suona due note, bonk() una, fanfare() quattro', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const a = new BonusAudio();
    a.start();
    a.stop(); // niente musica: si contano solo i suoni
    const base = created.osc;
    a.coin(); expect(created.osc - base).toBe(2);
    a.bonk(); expect(created.osc - base).toBe(3);
    a.fanfare(); expect(created.osc - base).toBe(7);
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('audio spento: nessun suono, preferenza ricordata', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const a = new BonusAudio();
    a.start();
    a.stop();
    a.setMuted(true);
    const base = created.osc;
    a.coin(); a.bonk(); a.fanfare();
    expect(created.osc).toBe(base);
    expect(a.isMuted).toBe(true);
    expect(localStorage.getItem('pixelademy.bonus.sound.v1')).toBe('off');
    expect(new BonusAudio().isMuted).toBe(true); // la scelta resta
    a.setMuted(false);
    expect(new BonusAudio().isMuted).toBe(false);
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('pausa e ripresa sospendono e riattivano il contesto; dispose lo chiude', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const a = new BonusAudio();
    a.start();
    const ctx = (a as unknown as { ctx: FakeCtx }).ctx;
    a.pause();
    expect(ctx.state).toBe('suspended');
    a.resume();
    expect(ctx.state).toBe('running');
    a.dispose();
    expect(ctx.state).toBe('closed');
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });
});
