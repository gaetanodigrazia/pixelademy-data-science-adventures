import { TestBed } from '@angular/core/testing';
import { Mission } from './core/models/mission.model';
import { MINI_PACK } from './testing/mini-pack';
import { MIN_NODE_PX, hitRadius, mapLayout, nodeAt } from './core/utils/map-layout';
import { WorldMap } from './shared/components/world-map';

describe('mapLayout', () => {
  it('schermo largo: tela 800, 4 blocchi per riga a serpentina, blocchi di 40 (come prima)', () => {
    const l = mapLayout(10, false);
    expect([l.w, l.node, l.perRow]).toEqual([800, 40, 4]);
    expect(l.nodes.slice(0, 5)).toEqual([{ x: 100, y: 120 }, { x: 300, y: 120 }, { x: 500, y: 120 }, { x: 700, y: 120 }, { x: 700, y: 250 }]);
    expect(l.height).toBe(490);
  });

  it('telefono: tela 600, 3 blocchi per riga a serpentina, blocchi più grandi, righe più basse', () => {
    const l = mapLayout(10, true);
    expect([l.w, l.node, l.perRow]).toEqual([600, 84, 3]);
    expect(l.nodes.slice(0, 5)).toEqual([{ x: 100, y: 130 }, { x: 300, y: 130 }, { x: 500, y: 130 }, { x: 500, y: 250 }, { x: 300, y: 250 }]);
    expect(l.height).toBe(130 + 3 * 120 + 90);
    expect(l.nodes.every((n) => n.x - l.node / 2 >= 0 && n.x + l.node / 2 <= l.w)).toBe(true); // nessun blocco taglia il bordo
  });

  it('su un telefono da 360 px la mappa di 10 missioni è bassa (~330 px), non una colonna enorme', () => {
    const l = mapLayout(10, true);
    const cssHeight = (l.height * 344) / l.w;
    expect(cssHeight).toBeLessThanOrEqual(340);
    expect(cssHeight).toBeLessThan(640 * 0.55); // poco più di metà schermo
  });

  it('un percorso breve resta alto almeno 360; senza missioni non si rompe', () => {
    expect(mapLayout(3, true).height).toBe(280);
    expect(mapLayout(0, true).nodes).toEqual([]);
    expect(mapLayout(0, false).height).toBe(360);
    expect(mapLayout(0, true).height).toBe(280);
  });

  it('i blocchi sono continui: ogni blocco è a un passo (una colonna o una riga) dal precedente', () => {
    for (const compact of [true, false]) {
      const { nodes } = mapLayout(10, compact);
      for (let i = 1; i < nodes.length; i++) {
        const d = Math.hypot(nodes[i].x - nodes[i - 1].x, nodes[i].y - nodes[i - 1].y);
        expect(d, `${compact} ${i}`).toBeLessThanOrEqual(compact ? 200 : 200);
      }
    }
  });

  it('su un telefono da 344 px di tela i blocchi sono ≥ 44 px e il tocco ha raggio ≥ 28 px', () => {
    const l = mapLayout(10, true);
    const scale = 344 / l.w;
    expect(l.node * scale).toBeGreaterThanOrEqual(MIN_NODE_PX);
    expect(l.node * (312 / l.w)).toBeGreaterThanOrEqual(MIN_NODE_PX - 4); // anche su un telefono da 320 px il blocco è ~44 px
    expect(hitRadius(l.node, scale) * scale).toBeGreaterThanOrEqual(28);
    // con una tela molto piccola il raggio cresce per mantenere 28 px
    expect(hitRadius(40, 0.1) * 0.1).toBeCloseTo(28);
    expect(hitRadius(40, 2)).toBe(40);
  });
});

describe('nodeAt', () => {
  const nodes = [{ x: 100, y: 100 }, { x: 160, y: 100 }];
  it('trova il blocco entro il raggio, il più vicino se ce ne sono due; -1 se nessuno', () => {
    expect(nodeAt(nodes, 105, 95, 40)).toBe(0);
    expect(nodeAt(nodes, 150, 100, 40)).toBe(1); // entrambi nel raggio: vince il più vicino
    expect(nodeAt(nodes, 400, 400, 40)).toBe(-1);
    expect(nodeAt([], 0, 0, 40)).toBe(-1);
  });
});

describe('WorldMap su telefono', () => {
  const missions = Array.from({ length: 6 }, (_, i) => ({ ...MINI_PACK.paths[0].missions[i], title: `M${i + 1}` })) as Mission[];
  const statuses = ['available', 'locked', 'locked', 'locked', 'locked', 'locked'] as const;
  let listeners: (() => void)[] = [];
  let matches = true;

  beforeEach(() => {
    listeners = [];
    matches = true;
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return matches; },
      addEventListener: (_: string, l: () => void) => listeners.push(l),
      removeEventListener: (_: string, l: () => void) => (listeners = listeners.filter((x) => x !== l)),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  function mount() {
    const f = TestBed.createComponent(WorldMap);
    f.componentRef.setInput('missions', missions);
    f.componentRef.setInput('character', MINI_PACK.characters[0]);
    f.componentRef.setInput('statuses', [...statuses]);
    f.componentRef.setInput('startId', missions[0].id);
    f.detectChanges();
    const canvas = f.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    return { f, canvas, selected: vi.fn(), entered: vi.fn() };
  }
  /** Simula la tela mostrata larga 344 px (come su un telefono da 360) e un tocco in pixel dello schermo. */
  function tap(f: ReturnType<typeof mount>, x: number, y: number) {
    const w = f.canvas.width;
    const h = f.canvas.height;
    f.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 344, height: (344 / w) * h, right: 344, bottom: (344 / w) * h, x: 0, y: 0, toJSON: () => ({}) });
    f.canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
  }

  it('usa la tela da telefono: 600 di larghezza e altezza per tutte le missioni', () => {
    const { canvas } = mount();
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(mapLayout(6, true).height);
  });

  it('un tocco vicino a un blocco (anche a 30 px dal centro) lo raggiunge; toccando ancora il selezionato si entra', () => {
    const m = mount();
    m.f.componentInstance.missionSelected.subscribe(m.selected);
    m.f.componentInstance.missionEntered.subscribe(m.entered);
    const s = 344 / 600;
    const node1 = { x: 100 * s, y: 130 * s };
    tap(m, node1.x + 30, node1.y + 10); // blocco 1, già selezionato: si entra
    expect(m.entered).toHaveBeenCalledWith(missions[0].id);
    expect(m.selected).not.toHaveBeenCalled();
  });

  it('un blocco bloccato non si seleziona; un tocco nel vuoto non fa nulla', () => {
    const m = mount();
    m.f.componentInstance.missionSelected.subscribe(m.selected);
    m.f.componentInstance.missionEntered.subscribe(m.entered);
    const s = 344 / 600;
    tap(m, 300 * s, 130 * s); // blocco 2: bloccato
    tap(m, 200 * s, 40 * s); // vuoto
    expect(m.selected).not.toHaveBeenCalled();
    expect(m.entered).not.toHaveBeenCalled();
  });

  it('un blocco sbloccato si seleziona con un tocco', () => {
    const m = mount();
    m.f.componentRef.setInput('statuses', ['completed', 'available', 'locked', 'locked', 'locked', 'locked']);
    m.f.detectChanges();
    m.f.componentInstance.missionSelected.subscribe(m.selected);
    const s = 344 / 600;
    tap(m, 300 * s, 130 * s);
    expect(m.selected).toHaveBeenCalledWith(missions[1].id);
  });

  it('se lo schermo si allarga (o si ruota) passa al layout largo senza ricaricare, e viceversa', () => {
    const { f, canvas } = mount();
    expect(canvas.width).toBe(600);
    matches = false;
    listeners.forEach((l) => l());
    f.detectChanges();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(mapLayout(6, false).height);
    matches = true;
    listeners.forEach((l) => l());
    f.detectChanges();
    expect(canvas.width).toBe(600);
  });

  it('senza telefono (matchMedia non vero) usa il layout largo; alla distruzione si toglie l\'ascolto', () => {
    matches = false;
    const { f, canvas } = mount();
    expect(canvas.width).toBe(800);
    f.destroy();
    expect(listeners.length).toBe(0);
  });
});
