/** Un blocco missione sulla mappa, in unità della tela. */
export interface MapNode {
  x: number;
  y: number;
}

/** Misure della mappa: tela larga 800 con 4 blocchi per riga, oppure (telefono) larga 600 con 3 per riga, righe più basse e blocchi più grandi. */
export interface MapLayout {
  /** Larghezza e altezza della tela, in unità. */
  w: number;
  height: number;
  /** Lato di un blocco missione, in unità. */
  node: number;
  perRow: number;
  nodes: MapNode[];
}

/** Larghezza (px) fino alla quale la mappa passa al layout da telefono. */
export const COMPACT_MAX_WIDTH = 760;
/** Raggio minimo dell'area di tocco, in pixel dello schermo (diametro 56 px, oltre i 44 raccomandati). */
export const MIN_TOUCH_RADIUS_PX = 28;
/** Lato minimo visibile di un blocco, in pixel dello schermo. */
export const MIN_NODE_PX = 44;

/** I blocchi si dispongono a serpentina: la riga dispari va da destra a sinistra, così il percorso è continuo. */
export function mapLayout(count: number, compact: boolean): MapLayout {
  const perRow = compact ? 3 : 4;
  const rowGap = compact ? 120 : 130;
  // su telefono il primo blocco sta più in basso: sopra c'è il titolo della missione e, sopra il blocco, l'eroe
  const top = compact ? 130 : 120;
  const nodes = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
    return { x: 100 + col * 200, y: top + row * rowGap };
  });
  const bottom = compact ? 90 : 110;
  return {
    w: compact ? 600 : 800,
    height: Math.max(compact ? 280 : 360, ...nodes.map((n) => n.y + bottom)),
    // 84 unità su una tela mostrata a ~344 px = 48 px sullo schermo (≥ 44 anche su telefoni da 320 px, con l'area di tocco allargata)
    node: compact ? 84 : 40,
    perRow,
    nodes,
  };
}

/** Il raggio (in unità) entro cui un tocco colpisce un blocco: mai meno del blocco, mai meno di 28 px sullo schermo. */
export function hitRadius(node: number, scale: number): number {
  return Math.max(node, MIN_TOUCH_RADIUS_PX / Math.max(scale, 0.01));
}

/** L'indice del blocco più vicino al punto (x, y) entro `radius`, o -1. */
export function nodeAt(nodes: MapNode[], x: number, y: number, radius: number): number {
  let best = -1;
  let bestD = radius;
  nodes.forEach((n, i) => {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
