import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PACKS } from './core/data/packs.generated';
import { BONUS_MAX_ERRORS, bonusEarned, bonusSettings, unlockBonus } from './core/utils/bonus';
import { COIN_R, COIN_Y, CoinSpec, PlatformerEngine, RUN_SECONDS, WORLD, chooseThreshold, coinSpecs, ruleFor } from './core/utils/platformer-engine';
import { Platformer } from './shared/components/games/platformer';
import { ContentRegistryService } from './core/services/content-registry.service';
import { MINI_PACK } from './testing/mini-pack';
import { btn, goToTask, openMission, setup } from './testing/mission-harness';
import { ComponentRef } from '@angular/core';

const cfg = (over: Partial<Parameters<typeof coinSpecs>[0]> = {}) => ({ name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], level: 1, ...over });

describe('bonus platform: la regola e le monete (nessuna operazione)', () => {
  it('la soglia sta nella forbice più larga vicino al centro dei dati', () => {
    expect(chooseThreshold([3, 8, 5, 12, 7, 4, 9])).toBe(6); // 3 4 5 | 7 8 9 12: la forbice 5→7 è la più larga
    expect(chooseThreshold([17, 19, 22, 28, 31, 26, 21])).toBe(24); // 17 19 21 22 | 26 28 31
    expect(chooseThreshold([310, 295, 340, 360, 325, 380, 300])).toBeGreaterThan(300);
    expect(chooseThreshold([5])).toBe(5);
  });

  it('i livelli dispari prendono i numeri «maggiori di», quelli pari «minori di»', () => {
    expect(ruleFor(cfg({ level: 1 }))).toEqual({ op: '>', th: 6, word: 'maggiori' });
    expect(ruleFor(cfg({ level: 2 })).word).toBe('minori');
  });

  it('ogni moneta mostra un numero della serie e la verità segue la regola', () => {
    for (const level of [1, 2, 3, 4]) {
      const rule = ruleFor(cfg({ level }));
      for (const c of coinSpecs(cfg({ level }), 20)) {
        expect(cfg().v).toContain(c.value);
        expect(c.truth).toBe(rule.op === '>' ? c.value > rule.th : c.value < rule.th);
        expect(c.why).toContain(String(c.value));
        expect(c.why).toMatch(/va presa|va evitata/);
      }
    }
  });

  it('vere e false si alternano: mai più di due uguali di fila, e mai lo stesso numero due volte di fila', () => {
    const specs = coinSpecs(cfg(), 30);
    let run = 1;
    for (let i = 1; i < specs.length; i++) {
      run = specs[i].truth === specs[i - 1].truth ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
      expect(specs[i].value).not.toBe(specs[i - 1].value);
    }
    const yes = specs.filter((c) => c.truth).length;
    expect(yes).toBeGreaterThan(8);
    expect(specs.length - yes).toBeGreaterThan(8);
  });

  it('è deterministica, e un altro seed dà un\'altra serie', () => {
    expect(JSON.stringify(coinSpecs(cfg()))).toBe(JSON.stringify(coinSpecs(cfg())));
    expect(JSON.stringify(coinSpecs(cfg(), 16, 1))).not.toBe(JSON.stringify(coinSpecs(cfg(), 16, 2)));
  });

  it('senza due gruppi (tutti uguali) non c\'è gioco: nessuna moneta', () => {
    expect(coinSpecs(cfg({ v: [5, 5, 5] }))).toEqual([]);
  });

  it('in ogni missione del pack: monete vere e false, solo numeri, regola chiara', () => {
    for (const p of PACKS[0].paths) for (const m of p.missions) {
      const c = m.bonus!.config as { name: string; v: number[]; level: number };
      const specs = coinSpecs(c, 16);
      expect(specs.length, m.id).toBe(16);
      expect(specs.some((x) => x.truth), m.id).toBe(true);
      expect(specs.some((x) => !x.truth), m.id).toBe(true);
      expect(ruleFor(c).th, m.id).not.toBeNaN();
    }
  });
});

/** Gioca come un bot: salta quando la moneta sta per arrivare e va presa, non salta altrimenti. */
function play(engine: PlatformerEngine, decide: (c: { truth: boolean }) => boolean): void {
  const dt = 1 / 60;
  while (!engine.finished) {
    const c = engine.coins.find((x) => x.state === 'live' && x.x > WORLD.heroX - 20);
    if (c && c.x - WORLD.heroX < 50 && c.x - WORLD.heroX > 30 && decide(c) && engine.onGround) engine.jump();
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
    expect(e.distance).toBe(d);
  });

  it('il salto è alto: picco di ~120 px, ~0,8 s in aria, niente doppio salto', () => {
    const e = new PlatformerEngine(specs());
    e.jump();
    let peak = 0, steps = 0;
    while (!e.onGround || steps === 0) { e.step(1 / 120); peak = Math.max(peak, e.y); steps++; if (steps > 400) break; }
    expect(peak).toBeGreaterThan(110);
    expect(peak).toBeLessThan(130);
    expect(steps / 120).toBeGreaterThan(0.7);
    expect(steps / 120).toBeLessThan(0.9);
    e.jump(); e.step(1 / 60);
    e.jump(); e.step(1 / 60);
    expect(e.vy).toBeLessThan(600); // non è stato rilanciato in aria
  });

  it('l\'eroe sta nel mondo: il picco del salto resta sotto il bordo alto', () => {
    expect(WORLD.ground - 125 - WORLD.heroH).toBeGreaterThanOrEqual(0);
  });

  it('chi salta solo per le monete giuste non fa errori', () => {
    const e = new PlatformerEngine(specs(16));
    play(e, (c) => c.truth);
    expect(e.mistakes).toBe(0);
    expect(e.correct).toBeGreaterThanOrEqual(9);
    expect(e.score).toBeGreaterThan(100);
    expect(e.best).toBe(e.correct);
  });

  it('chi non salta mai non prende nulla: le giuste sono errori, le altre si evitano', () => {
    const e = new PlatformerEngine(specs(16));
    play(e, () => false);
    for (const c of e.coins.filter((x) => x.state !== 'live')) {
      expect(c.state).toBe('passed');
      expect(c.correct).toBe(!c.truth);
    }
    expect(e.mistakes).toBe(e.coins.filter((c) => c.state === 'passed' && c.truth).length);
    expect(e.score).toBeGreaterThan(0); // le monete sbagliate evitate valgono
  });

  it('prendere una moneta falsa è un errore e azzera la serie', () => {
    const e = new PlatformerEngine([{ value: 3, truth: false, why: 'x' }, { value: 9, truth: true, why: 'y' }]);
    // salta in modo da prendere la prima (falsa)
    for (let i = 0; i < 600 && e.coins[0].state === 'live'; i++) {
      if (e.coins[0].x - WORLD.heroX < 45 && e.onGround) e.jump();
      e.step(1 / 60);
    }
    expect(e.coins[0].state).toBe('taken');
    expect(e.mistakes).toBe(1);
    expect(e.streak).toBe(0);
  });

  it('le monete sono tutte alla stessa quota, raggiungibile solo saltando', () => {
    expect(COIN_Y).toBeGreaterThan(WORLD.heroH + COIN_R); // da fermo l\'eroe non le tocca
    const e = new PlatformerEngine(specs());
    const c = e.coins[0];
    c.x = WORLD.heroX; // proprio sopra l\'eroe, a terra: non la prende
    e.step(0.001);
    expect(c.state).toBe('live');
    e.jump();
    for (let i = 0; i < 60 && c.state === 'live'; i++) { c.x = WORLD.heroX; e.step(1 / 60); }
    expect(c.state).toBe('taken'); // saltando sì
  });
});

describe('bonus platform: il componente', () => {
  type G = { phase(): string; engine: PlatformerEngine; update(dt: number): void; score(): number; startRun(): void };
  function mount(onCleared: (r?: { mistakes: number }) => void = () => undefined) {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Platformer);
    const ref = fixture.componentRef as ComponentRef<unknown>;
    ref.setInput('character', MINI_PACK.characters[0]);
    ref.setInput('config', { name: 'prezzi', v: [3, 8, 5, 12, 7, 4, 9], level: 1 });
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

  it('la schermata iniziale spiega l\'obiettivo e i comandi prima del «Via!»', () => {
    const { el } = mount();
    const veil = el.querySelector('.veil.start')!;
    expect(veil.textContent).toContain('Obiettivo');
    expect(veil.textContent).toContain('Prendi i numeri maggiori di 6');
    expect(veil.textContent).toContain('Salta per prenderli');
    expect(veil.textContent).toContain('non saltare');
    expect(veil.textContent).toMatch(/tocco|Spazio/);
    expect(veil.textContent).toContain('15 secondi');
    expect(veil.querySelector('button')!.textContent).toContain('Via!');
  });

  it('dopo il «Via!» la schermata iniziale sparisce e resta la regola sopra il gioco', () => {
    const { fixture, g, el } = mount();
    g.startRun();
    fixture.detectChanges();
    expect(el.querySelector('.veil.start')).toBeNull();
    expect(el.querySelector('.goal')!.textContent).toContain('Prendi i numeri maggiori di 6');
  });

  it('la riga della regola compare durante la corsa (prima c\'è la schermata iniziale), in parole semplici e senza operazioni', () => {
    const { fixture, g, el } = mount();
    expect(el.querySelector('.goal')).toBeNull();
    g.startRun();
    fixture.detectChanges();
    const goal = el.querySelector('.goal')!.textContent!;
    expect(goal).toContain('Prendi i numeri maggiori di 6');
    expect(goal).toContain('salta');
    expect(goal).toContain('non saltare');
    expect(goal).not.toMatch(/[<>]|sum\(|len\(|pop\(/); // niente codice
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


describe('bonus in ogni missione', () => {
  it('ogni missione dei percorsi di base ha il bonus platform (le sfide pandas, senza battaglia, no)', () => {
    for (const p of PACKS.flatMap((x) => x.paths)) for (const m of p.missions) {
      if (m.challenge) expect(m.bonus, m.id).toBeUndefined();
      else expect(m.bonus?.type, m.id).toBe('adventure-platformer');
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
    ref.setInput('config', { name: 'v', v: [3, 8, 5, 12, 7, 4, 9], level: 1 });
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
    // il bot salta a intervalli regolari e così prende alcune monete (giuste o sbagliate)
    const e = g.engine;
    for (let i = 0; i < 60 * 15; i++) { if (i % 50 === 0) e.jump(); g.update(1 / 60); }
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
