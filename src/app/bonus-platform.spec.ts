import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PACKS } from './core/data/packs.generated';
import { BONUS_MAX_ERRORS, bonusEarned, bonusSettings, unlockBonus } from './core/utils/bonus';
import { BONUS_KINDS } from './content/adventure-core/bonus-kinds';
import { EXERCISES } from './content/adventure-core/exercises';
import { AIR_Y, COIN_R, CoinSpec, PlatformerEngine, RUN_SECONDS, WORLD, clearGap, coinSpecs, isSmall } from './core/utils/platformer-engine';
import { Platformer } from './shared/components/games/platformer';
import { ContentRegistryService } from './core/services/content-registry.service';
import { MINI_PACK } from './testing/mini-pack';
import { btn, goToTask, openMission, setup } from './testing/mission-harness';
import { ComponentRef } from '@angular/core';

const cfg = (over: Partial<Parameters<typeof coinSpecs>[0]> = {}) => ({ kind: 'index' as const, name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1, ...over });

describe('bonus platform: generazione delle monete', () => {
  it('index: la condizione dice il vero (verificato sui dati) e la spiegazione cita il valore', () => {
    const v = [3, 8, 5, 12, 7, 4, 9];
    const specs = coinSpecs(cfg(), 12);
    expect(specs.length).toBe(12);
    expect(Math.abs(specs.filter((c) => c.truth).length - 6)).toBeLessThanOrEqual(1); // metà vere e metà false (a meno di uno)
    for (const c of specs) {
      const m = /^prezzi\[(-?\d+)\] (>|<) (\d+)$/.exec(c.cond)!;
      expect(m, c.cond).not.toBeNull();
      const x = v[+m[1] < 0 ? v.length + +m[1] : +m[1]];
      expect(c.truth).toBe(m[2] === '>' ? x > +m[3] : x < +m[3]);
      expect(c.why).toContain(String(x));
    }
  });

  it('solo `>` e `<`, mai indici negativi: niente trabocchetti', () => {
    for (const level of [1, 2, 3, 5]) {
      for (const c of coinSpecs(cfg({ level }), 16)) expect(c.cond, c.cond).not.toMatch(/>=|<=|==|\[-/);
    }
  });

  it('index: le soglie sono ben distanti dal valore (colpo d\'occhio)', () => {
    const v = [3, 8, 5, 12, 7, 4, 9];
    for (const c of coinSpecs(cfg(), 12)) {
      const m = /^prezzi\[(\d+)\] (?:>|<) (\d+)$/.exec(c.cond)!;
      expect(clearGap(v[+m[1]], +m[2]), c.cond).toBe(true);
    }
  });

  it('pop: [..].pop() vale l\'ultimo elemento della lista scritta', () => {
    for (const c of coinSpecs(cfg({ kind: 'pop', name: 'carrello', v: [4, 6, 9, 2, 5], th: 6, level: 2 }), 16)) {
      const m = /^\[([\d, ]+)\]\.pop\(\) (>|<) (\d+)$/.exec(c.cond)!;
      expect(m, c.cond).not.toBeNull();
      const last = +m[1].split(',').pop()!;
      expect(c.truth).toBe(m[2] === '>' ? last > +m[3] : last < +m[3]);
    }
  });

  it('len: len([..]) conta davvero gli elementi', () => {
    for (const c of coinSpecs(cfg({ kind: 'len', name: 'carrello', v: [4, 6, 9, 2, 5], level: 3 }), 16)) {
      const m = /^len\(\[([\d, ]+)\]\) (>|==) (-?\d+)$/.exec(c.cond)!;
      expect(m, c.cond).not.toBeNull();
      const n = m[1].split(',').length;
      expect(c.truth).toBe(m[2] === '>' ? n > +m[3] : n === +m[3]);
    }
  });

  it('è deterministica e le serie con seed diversi sono diverse', () => {
    expect(JSON.stringify(coinSpecs(cfg()))).toBe(JSON.stringify(coinSpecs(cfg())));
    expect(JSON.stringify(coinSpecs(cfg(), 12, 1))).not.toBe(JSON.stringify(coinSpecs(cfg(), 12, 2)));
  });
});

/** Gioca come un bot: salta (o no) per prendere/evitare ogni moneta secondo la regola giusta. */
function play(engine: PlatformerEngine, decide: (c: { air: boolean; truth: boolean }) => boolean): void {
  const dt = 1 / 60;
  while (!engine.finished) {
    // la prossima moneta viva: se serve saltare, salta quando è a ~70 px (il salto dura ~0,65 s)
    const c = engine.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
    if (c && c.x - WORLD.heroX < 55 && c.x - WORLD.heroX > 40 && decide(c) && engine.onGround) engine.jump();
    engine.step(dt);
  }
}
const specs = (n = 16): CoinSpec[] => coinSpecs(cfg(), n);

describe('bonus platform: il motore', () => {
  it('dura 15 secondi, poi si ferma', () => {
    const e = new PlatformerEngine(specs());
    for (let i = 0; i < 60 * 15 + 30; i++) e.step(1 / 60);
    expect(e.t).toBe(RUN_SECONDS);
    expect(e.finished).toBe(true);
    const d = e.distance;
    e.step(1);
    expect(e.distance).toBe(d); // fermo
  });

  it('il salto ha un arco: parte, sale di ~75 px, ricade e non si può rifare in aria', () => {
    const e = new PlatformerEngine(specs());
    e.jump();
    let peak = 0, steps = 0;
    while (!e.onGround || steps === 0) { e.step(1 / 120); peak = Math.max(peak, e.y); steps++; if (steps > 400) break; }
    expect(peak).toBeGreaterThan(65);
    expect(peak).toBeLessThan(90);
    expect(steps / 120).toBeGreaterThan(0.5);
    expect(steps / 120).toBeLessThan(0.8);
    e.jump(); e.step(1 / 60); // in aria: il doppio salto non esiste
    const y1 = e.y;
    e.jump();
    e.step(1 / 60);
    expect(e.vy).toBeLessThan(480); // non è stato rilanciato
    expect(y1).toBeGreaterThan(0);
  });

  it('chi risponde sempre bene ottiene tutte decisioni giuste e nessun errore', () => {
    const e = new PlatformerEngine(specs(16));
    // a terra: salta per evitare se falsa; in aria: salta per prendere se vera
    play(e, (c) => (c.air ? c.truth : !c.truth));
    expect(e.mistakes).toBe(0);
    expect(e.correct).toBeGreaterThanOrEqual(9);
    expect(e.score).toBeGreaterThan(100);
    expect(e.best).toBe(e.correct);
  });

  it('chi non salta mai prende le monete a terra (anche le false) e lascia passare quelle in aria (anche le vere)', () => {
    const e = new PlatformerEngine(specs(16));
    play(e, () => false);
    const resolved = e.coins.filter((c) => c.state !== 'live');
    for (const c of resolved) {
      expect(c.state).toBe(c.air ? 'passed' : 'taken');
      expect(c.correct).toBe(c.air ? !c.truth : c.truth);
    }
    expect(e.mistakes).toBeGreaterThan(0);
  });

  it('chi salta sempre fa l\'opposto: prende quelle in aria, evita quelle a terra', () => {
    const e = new PlatformerEngine(specs(16));
    play(e, () => true);
    for (const c of e.coins.filter((x) => x.state !== 'live')) {
      expect(c.state, `${c.cond} (${c.air ? 'aria' : 'terra'})`).toBe(c.air ? 'taken' : 'passed');
    }
  });

  it('la serie azzera con un errore e dà punti extra', () => {
    const e = new PlatformerEngine(specs(16));
    play(e, (c) => (c.air ? c.truth : !c.truth));
    const perfect = e.score;
    const e2 = new PlatformerEngine(specs(16));
    play(e2, () => false);
    expect(perfect).toBeGreaterThan(e2.score);
    expect(e2.streak).toBeLessThanOrEqual(e2.best);
  });

  it('quota alternata a coppie: mai più di due monete di fila alla stessa quota', () => {
    const e = new PlatformerEngine(specs(16));
    let run = 1;
    for (let i = 1; i < e.coins.length; i++) {
      run = e.coins[i].air === e.coins[i - 1].air ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
    }
  });

  it('le monete in aria stanno all\'altezza giusta e quelle a terra sul suolo (collisione con l\'eroe)', () => {
    expect(AIR_Y).toBeGreaterThan(COIN_R);
    const e = new PlatformerEngine(specs());
    expect(e.coins.some((c) => c.air)).toBe(true);
    expect(e.coins.some((c) => !c.air)).toBe(true);
  });
});

describe('bonus platform: il componente', () => {
  type G = { phase(): string; engine: PlatformerEngine; update(dt: number): void; score(): number; startRun(): void };
  function mount(onCleared: (r?: { mistakes: number }) => void = () => undefined) {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Platformer);
    const ref = fixture.componentRef as ComponentRef<unknown>;
    ref.setInput('character', MINI_PACK.characters[0]);
    ref.setInput('config', { kind: 'index', name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1 });
    ref.setInput('onCleared', onCleared);
    fixture.detectChanges();
    return { fixture, g: fixture.componentInstance as unknown as G, el: fixture.nativeElement as HTMLElement };
  }

  it('parte con «Via!», non prima; finiti i 15 secondi chiama onCleared una volta con gli errori', () => {
    let calls = 0; let result: { mistakes: number } | undefined;
    const { fixture, g, el } = mount((r) => { calls++; result = r; });
    expect(g.phase()).toBe('ready');
    expect(el.textContent).toContain('Via!');
    g.update(5); // fermo: non succede nulla finché non si parte
    expect(g.engine.t).toBe(0);
    g.startRun();
    for (let i = 0; i < 16 * 60; i++) g.update(1 / 60);
    fixture.detectChanges();
    expect(g.phase()).toBe('done');
    expect(calls).toBe(1);
    expect(result!.mistakes).toBe(g.engine.mistakes);
    expect(el.textContent).toContain('Tempo!');
  });

  it('mostra la lista dei dati (indice) e dice la regola', () => {
    const { el } = mount();
    expect(el.textContent).toContain('prezzi = [3, 8, 5, 12, 7, 4, 9]');
    expect(el.textContent).toContain('vera');
  });

  it('pausa: il tempo e il gioco si fermano, si riprende solo dal pulsante', () => {
    type P = G & { paused(): boolean; togglePause(): void; onPointer(e: Event): void };
    const { fixture, g, el } = mount();
    const p = g as unknown as P;
    expect(el.querySelector('button[aria-label^="Pausa"]')).toBeNull(); // prima di partire non c'è
    g.startRun();
    fixture.detectChanges();
    g.update(2);
    const t = g.engine.t;
    const pause = el.querySelector<HTMLButtonElement>('button[aria-label^="Pausa"]')!;
    expect(pause.textContent).toContain('Pausa');
    pause.click();
    fixture.detectChanges();
    expect(p.paused()).toBe(true);
    expect(el.textContent).toContain('In pausa');
    g.update(5); // il tempo non scorre
    expect(g.engine.t).toBe(t);
    // un tocco sull'area non riprende, e il salto è ignorato
    p.onPointer({ target: el.querySelector('.stage') } as unknown as Event);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(p.paused()).toBe(true);
    expect(g.engine.y).toBe(0);
    // «Riprendi»
    el.querySelector<HTMLButtonElement>('.veil button')!.click();
    fixture.detectChanges();
    expect(p.paused()).toBe(false);
    g.update(1);
    expect(g.engine.t).toBeCloseTo(t + 1, 5);
  });

  it('P ed Esc mettono in pausa e riprendono; se la scheda va in background il gioco si ferma da solo', () => {
    type P = G & { paused(): boolean };
    const { fixture, g } = mount();
    const p = g as unknown as P;
    g.startRun();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    expect(p.paused()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(p.paused()).toBe(false);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(p.paused()).toBe(true);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('Spazio e ↑ saltano durante la corsa e fanno partire quando è pronta', () => {
    const { fixture, g } = mount();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    fixture.detectChanges();
    expect(g.phase()).toBe('running');
    g.update(0.05);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    g.update(0.05);
    expect(g.engine.y).toBeGreaterThan(0);
  });
});

describe('Le Liste: il bonus platform tra battaglia e task', () => {
  const liste = PACKS[0].paths.find((p) => p.id === 'adventure-core-liste')!;
  beforeEach(() => { vi.stubGlobal('matchMedia', undefined); bonusSettings.enabled = true; });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('Le Liste: indici, pop e len; ogni missione dei percorsi di base ha un bonus, le sfide pandas (senza battaglia) no', () => {
    expect(liste.missions.map((m) => (m.bonus!.config as { kind: string }).kind)).toEqual(['index', 'pop', 'len']);
    for (const p of PACKS.flatMap((x) => x.paths)) {
      for (const m of p.missions) {
        if (m.challenge) expect(m.bonus, m.id).toBeUndefined();
        else expect(m.bonus?.type, m.id).toBe('adventure-platformer');
      }
    }
  });

  it('dopo una buona battaglia si va al bonus; «Salta il bonus» porta al task', async () => {
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    expect(el.querySelector('.steps')!.textContent).not.toContain('Bonus'); // prima della battaglia non c'è
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')!.textContent).toContain('Bonus sbloccato');
    expect(el.querySelector('.steps')!.textContent).toContain('Bonus');
    (Array.from(el.querySelector('[role=dialog]')!.querySelectorAll('button')).find((b) => b.textContent?.includes('Al bonus')) as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Corsa bonus"]')).not.toBeNull();
    expect(el.querySelector('section[aria-label="Task Python"]')).toBeNull();
    expect(btn(el, 'Salta il bonus')).toBeDefined();
    btn(el, 'Salta il bonus').click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('con un solo errore (il massimo) il bonus si sblocca comunque', async () => {
    setup();
    bonusSettings.enabled = true;
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const g = f.debugElement.query(By.css('.game-host')).componentInstance;
    g.miss('x');
    g.win();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')!.textContent).toContain('Bonus sbloccato');
    f.destroy();
  });

  it('troppi errori in battaglia: bonus non sbloccato, e il messaggio dice quanti errori e cosa fare', async () => {
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const g = f.debugElement.query(By.css('.game-host')).componentInstance;
    for (let i = 0; i < 3; i++) g.miss('x');
    g.win();
    f.detectChanges();
    const d = el.querySelector('[role=dialog]')!;
    expect(d.textContent).not.toContain('Bonus sbloccato');
    expect(d.textContent).toContain('Bonus non sbloccato: hai fatto 3 errori, ne servono al massimo 1');
    expect(d.textContent).toContain('ricomincia dalla teoria');
    expect(el.querySelector('.steps')!.textContent).not.toContain('Bonus');
    f.destroy();
  });

  it('l\'esito dello sblocco si ricorda ricaricando la pagina', async () => {
    setup();
    const id = liste.missions[0].id;
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [id]: 'task' }));
    sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ [id]: true }));
    const { f, el } = await openMission(id);
    expect(el.querySelector('.steps')!.textContent).toContain('Bonus');
    f.destroy();
  });

  it('ricaricando durante la corsa si resta lì, e con la battaglia vinta (task sbloccato)', async () => {
    setup();
    const id = liste.missions[0].id;
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [id]: 'corsa' }));
    const { f, el } = await openMission(id);
    expect(el.querySelector('section[aria-label="Corsa bonus"]')).not.toBeNull();
    f.destroy();
  });

  it('una fase «corsa» salvata per una missione senza bonus ripiega sul task', async () => {
    setup();
    const m = PACKS[0].paths.find((p) => p.id === 'adventure-core-mobilita')!.missions[0];
    // la stessa missione, ma senza bonus (come se il contenuto fosse cambiato dopo il salvataggio)
    TestBed.inject(ContentRegistryService).packs.set(PACKS.map((pk) => ({ ...pk, paths: pk.paths.map((pa) => ({ ...pa, missions: pa.missions.map((mm) => (mm.id === m.id ? { ...mm, bonus: undefined } : mm)) })) })));
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [m.id]: 'corsa' }));
    const { f, el } = await openMission(m.id);
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('il harness dei test attraversa il bonus (goToTask)', async () => {
    setup();
    const { f, el } = await openMission(liste.missions[0].id);
    goToTask(f);
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });
});

describe('sblocco del bonus', () => {
  it('si sblocca sempre con al massimo 1 errore, mai con di più (nessun sorteggio)', () => {
    expect(BONUS_MAX_ERRORS).toBe(1);
    expect(bonusEarned(0)).toBe(true);
    expect(bonusEarned(1)).toBe(true);
    expect(bonusEarned(2)).toBe(false);
    bonusSettings.enabled = true;
    // nessun elemento casuale: stesso esito qualunque sia Math.random
    for (const r of [0, 0.3, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      expect(unlockBonus(0)).toBe(true);
      expect(unlockBonus(1)).toBe(true);
      expect(unlockBonus(2)).toBe(false);
    }
    vi.restoreAllMocks();
  });

  it('l\'interruttore dei test lo spegne', () => {
    bonusSettings.enabled = false;
    expect(unlockBonus(0)).toBe(false);
  });
});

describe('bonus in ogni missione: monete adatte al concetto', () => {
  it('ogni esercizio dichiara il suo tipo di moneta (e non ce ne sono di orfani)', () => {
    for (const id of Object.keys(EXERCISES)) expect(BONUS_KINDS[id], `manca il tipo per «${id}» in bonus-kinds.ts`).toBeDefined();
    for (const id of Object.keys(BONUS_KINDS)) expect(EXERCISES[id], `«${id}» non è un esercizio`).toBeDefined();
  });

  it('per ogni missione del pack le monete si generano, sono metà vere e metà false, e la condizione è vera davvero', () => {
    for (const p of PACKS[0].paths) {
      for (const m of p.missions) {
        const c = m.bonus!.config as { kind: 'index'; name: string; v: number[]; th: number; level: number; d?: Record<string, number> };
        const specs = coinSpecs(c, 16);
        expect(specs.length, m.id).toBeGreaterThanOrEqual(8);
        const yes = specs.filter((x) => x.truth).length;
        expect(yes, `${m.id}: vere`).toBeGreaterThanOrEqual(Math.floor(specs.length / 2) - 2);
        expect(specs.length - yes, `${m.id}: false`).toBeGreaterThanOrEqual(Math.floor(specs.length / 2) - 2);
        for (const s of specs) expect(s.cond.length, m.id).toBeLessThan(34); // sta sulla moneta senza uscire dallo schermo
        for (const s of specs) expect(evaluate(s.cond), `${m.id}: ${s.cond}`).toBe(s.truth);
      }
    }
  });
});

/** Valuta una condizione di moneta con Python-in-JS (stesse regole per i soli costrutti usati dai generatori). */
function evaluate(cond: string): boolean {
  const js = cond
    .replace(/(\w+)\[(-?\d+)\] /g, (_m, name, i) => `__r(${name}, ${i}) `) // lista o dizionario: gestito sotto
    .replace(/sum\((\[[^\]]*\])\)/g, 'sumOf($1)').replace(/max\((\[[^\]]*\])\)/g, 'Math.max(...$1)').replace(/min\((\[[^\]]*\])\)/g, 'Math.min(...$1)')
    .replace(/len\((\[[^\]]*\])\)/g, '($1).length').replace(/(\[[^\]]*\])\.pop\(\)/g, '($1).at(-1)')
    .replace(/==/g, '===');
  const world: Record<string, unknown> = {};
  for (const c of PACKS[0].paths) {
    const proj = (c as unknown as { project?: { a: { name: string; values: number[] }; b: { name: string; values: number[] }; c: { name: string; values: number[] }; registry: { name: string; entries: Record<string, number> } } }).project;
    if (!proj) continue;
    world[proj.a.name] = proj.a.values; world[proj.b.name] = proj.b.values; world[proj.c.name] = proj.c.values; world[proj.registry.name] = proj.registry.entries;
  }
  const names = Object.keys(world);
  const keyed = js.replace(/(\w+)\['(\w+)'\]/g, (_m, n, k) => `${n}.${k}`);
  // eslint-disable-next-line no-new-func
  return new Function(...names, 'sumOf', '__r', `return (${keyed});`)(...names.map((n) => world[n]), (a: number[]) => a.reduce((x, y) => x + y, 0), (l: number[], i: number) => l.at(i)) as boolean;
}

describe('condizioni semplici: un gioco, non un esercizio', () => {
  it('clearGap: distanti almeno 2 (o il 15%)', () => {
    expect(clearGap(7, 6)).toBe(false);
    expect(clearGap(9, 6)).toBe(true);
    expect(clearGap(340, 300)).toBe(false);
    expect(clearGap(380, 300)).toBe(true);
  });

  it('in tutte le missioni: mai un valore vicino alla soglia (niente «325 < 325»)', () => {
    for (const p of PACKS[0].paths) for (const m of p.missions) {
      for (const s of coinSpecs(m.bonus!.config as never, 16)) {
        // confronti diretti «x > t» e «x < t», anche dopo [i], ['k'], max/min/sum/len/pop
        const t = +/(\d+)$/.exec(s.cond)![1];
        const val = +(/vale (-?[\d.]+)|ha (\d+) elementi|= (\d+):/.exec(s.why) ?? []).slice(1).find(Boolean)!;
        if (Number.isFinite(val) && !/len\(/.test(s.cond) && t !== 0) expect(clearGap(val, t), `${m.id}: ${s.cond} (${s.why})`).toBe(true);
      }
    }
  });

  it('con numeri grandi (Officina dell\'Energia) si confrontano i valori: niente somme né liste', () => {
    const energia = PACKS[0].paths.find((p) => p.id === 'adventure-core-energia')!;
    for (const m of energia.missions) {
      const c = m.bonus!.config as { kind: 'sum'; name: string; v: number[]; th: number; level: number };
      expect(isSmall(c.v)).toBe(false);
      if (!['sum', 'minmax', 'cmp'].includes(c.kind)) continue;
      for (const s of coinSpecs(c, 16)) expect(s.cond, `${m.id}: ${s.cond}`).toMatch(/^\d+ (?:>|<) \d+$/);
    }
  });

  it('con numeri piccoli, somme e massimi usano pochi numeri e la soglia è lontana', () => {
    const c = { kind: 'sum' as const, name: 'v', v: [4, 7, 2, 9, 5], th: 6, level: 1 };
    for (const s of coinSpecs(c, 16)) {
      const nums = /\[([\d, ]+)\]/.exec(s.cond)![1].split(',').length;
      expect(nums, s.cond).toBe(2);
      const total = /\[(\d+), (\d+)\]/.exec(s.cond)!.slice(1).reduce((a, x) => a + +x, 0);
      const t = +/> (\d+)$/.exec(s.cond)![1];
      expect(Math.abs(total - t), s.cond).toBeGreaterThanOrEqual(2);
    }
    for (const s of coinSpecs({ ...c, kind: 'minmax' }, 16)) expect(/\[([\d, ]+)\]/.exec(s.cond)![1].split(',').length, s.cond).toBeLessThanOrEqual(3);
  });

  it('in tutte le missioni le liste scritte sulle monete hanno al massimo 4 numeri e le condizioni sono corte', () => {
    for (const p of PACKS[0].paths) for (const m of p.missions) {
      for (const s of coinSpecs(m.bonus!.config as never, 16)) {
        for (const lst of s.cond.match(/\[[\d, ]+\]/g) ?? []) expect(lst.split(',').length, `${m.id}: ${s.cond}`).toBeLessThanOrEqual(4);
        expect(s.cond.length, `${m.id}: ${s.cond}`).toBeLessThan(30);
      }
    }
  });
});

describe('bonus platform: audio nel gioco', () => {
  type G = { audio: Record<string, ReturnType<typeof vi.fn>>; phase(): string; engine: PlatformerEngine; update(dt: number): void; startRun(): void; toggleSound(): void; muted(): boolean; togglePause(): void };
  function mount() {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Platformer);
    const ref = fixture.componentRef as ComponentRef<unknown>;
    ref.setInput('character', MINI_PACK.characters[0]);
    ref.setInput('config', { kind: 'cmp', name: 'v', v: [3, 8, 5, 12, 7, 4, 9], th: 6, level: 1 });
    ref.setInput('onCleared', () => undefined);
    fixture.detectChanges();
    const g = fixture.componentInstance as unknown as G;
    g.audio = { start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), dispose: vi.fn(), coin: vi.fn(), bonk: vi.fn(), fanfare: vi.fn(), setMuted: vi.fn(), isMuted: false as never };
    return { fixture, g, el: fixture.nativeElement as HTMLElement };
  }

  it('la musica parte con «Via!» (gesto dell\'utente), non prima', () => {
    const { g } = mount();
    expect(g.audio['start']).not.toHaveBeenCalled();
    g.startRun();
    expect(g.audio['start']).toHaveBeenCalledTimes(1);
  });

  it('«ding» quando si prende una moneta giusta, «bonk» se si prende una sbagliata, silenzio se si evita', () => {
    const { g } = mount();
    g.startRun();
    // il bot: prende tutto camminando (a terra) e non salta mai
    const e = g.engine;
    for (let i = 0; i < 60 * 15; i++) g.update(1 / 60);
    const takenRight = e.coins.filter((c) => c.state === 'taken' && c.correct).length;
    const takenWrong = e.coins.filter((c) => c.state === 'taken' && !c.correct).length;
    expect(takenRight + takenWrong).toBeGreaterThan(0);
    expect(g.audio['coin']).toHaveBeenCalledTimes(takenRight);
    expect(g.audio['bonk']).toHaveBeenCalledTimes(takenWrong);
  });

  it('pausa e ripresa fermano e riavviano l\'audio; a fine corsa musica ferma e fanfara', () => {
    const { g } = mount();
    g.startRun();
    g.togglePause();
    expect(g.audio['pause']).toHaveBeenCalled();
    g.togglePause();
    expect(g.audio['resume']).toHaveBeenCalled();
    for (let i = 0; i < 16 * 60; i++) g.update(1 / 60);
    expect(g.audio['stop']).toHaveBeenCalled();
    expect(g.audio['fanfare']).toHaveBeenCalledTimes(1);
  });

  it('il pulsante 🔊/🔇 c\'è anche prima di partire', () => {
    const { el } = mount();
    const btn = el.querySelector<HTMLButtonElement>('.ctl button')!;
    expect(btn.getAttribute('aria-label')).toMatch(/audio/);
  });
});
