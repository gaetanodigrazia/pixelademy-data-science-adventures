/** Minimal fixed-callback requestAnimationFrame loop; dt is in seconds and clamped. */
export class GameLoop {
  private raf = 0;
  private running = false;
  private elapsed = 0;

  constructor(
    private readonly update: (dt: number, elapsed: number) => void,
    private readonly draw: () => void
  ) {}

  start(): void {
    if (this.running || typeof requestAnimationFrame !== 'function') {
      return;
    }
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) {
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.elapsed += dt;
      this.update(dt, this.elapsed);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
