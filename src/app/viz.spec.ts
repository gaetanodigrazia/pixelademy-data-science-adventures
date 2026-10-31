import { PACKS } from './core/data/packs.generated';
import { MissionViz } from './core/models/mission.model';
import { validateOutput } from './core/utils/validator';
import { evaluateViz, vizLine } from './core/utils/viz';

const base = { name: 'misure', unit: 'cm' };
const list: MissionViz = { ...base, kind: 'list-read', values: [120, 135, 150, 142, 128], index: 3, expected: [142] };
const run = (v: MissionViz, out: string, err = '') => evaluateViz(v, true, out, err);

describe('viz: dal codice al mondo di gioco', () => {
  it('prima dell\'esecuzione descrive cosa fare per ogni tipo di scena', () => {
    for (const m of PACKS[0].paths[0].missions) {
      const o = evaluateViz(m.viz!, false, '', '');
      expect(o.status, m.id).toBe('idle');
      expect(o.message.length, m.id).toBeGreaterThan(10);
    }
  });

  it('list-read: valore giusto, altra posizione, fuori scala, None, numero estraneo', () => {
    expect(run(list, '142\n')).toMatchObject({ status: 'ok', index: 3 });
    expect(run(list, '135\n')).toMatchObject({ status: 'wrong', index: 1 });
    const oob = run(list, '', 'IndexError: list index out of range');
    expect(oob.status).toBe('error');
    expect(oob.message).toContain('0 a 4');
    expect(run(list, 'None\n').status).toBe('wrong');
    expect(run(list, '999\n').status).toBe('wrong');
    expect(run(list, '', 'NameError: x').status).toBe('error');
  });

  it('count: indica se i sensori accesi sono pochi o troppi', () => {
    const v: MissionViz = { ...base, kind: 'count', values: [0, 2, 5, 0, 1], expected: [5] };
    expect(run(v, '5\n').status).toBe('ok');
    expect(run(v, '3\n').message).toContain('meno');
    expect(run(v, '9\n').message).toContain('più');
  });

  it('filter: confronta con i valori attesi, segnalando extra e mancanti', () => {
    const v: MissionViz = { ...base, kind: 'filter', values: [12, 35, 48, 22, 61], th: 40, expected: [48, 61] };
    expect(run(v, '[48, 61]\n')).toMatchObject({ status: 'ok', printed: [48, 61] });
    const w = run(v, '[35, 48]\n');
    expect(w.status).toBe('wrong');
    expect(w.message).toContain('1 valore non supera');
    expect(w.message).toContain('ne manca 1');
    expect(run(v, '[61, 48]\n').message).toContain('ordine');
  });

  it('sum / mean / range / pipeline: la linea è troppo bassa o troppo alta', () => {
    for (const kind of ['sum', 'mean', 'range', 'pipeline'] as const) {
      const v: MissionViz = { ...base, kind, values: [10, 20, 30], th: 15, expected: [50] };
      expect(run(v, '50\n'), kind).toMatchObject({ status: 'ok', value: 50 });
      expect(run(v, '10\n').message, kind).toContain('in basso');
      expect(run(v, '90\n').message, kind).toContain('in alto');
    }
  });

  it('alarm: spia giusta o opposta, testo non valido', () => {
    const v: MissionViz = { ...base, kind: 'alarm', values: [29, 33, 35], th: 30, expected: 'ALLARME' };
    expect(run(v, 'ALLARME\n')).toMatchObject({ status: 'ok', text: 'allarme' });
    expect(run(v, 'OK\n')).toMatchObject({ status: 'wrong', text: 'ok' });
    expect(run(v, 'boh\n').message).toContain('ALLARME oppure OK');
  });

  it('dict: legge la zona giusta o dice quale zona ha letto', () => {
    const v: MissionViz = { ...base, name: 'registro', kind: 'dict', values: [18, 27, 34, 21], labels: ['nord', 'est', 'sud', 'ovest'], index: 2, expected: [34] };
    expect(run(v, '34\n')).toMatchObject({ status: 'ok', index: 2 });
    expect(run(v, '27\n')).toMatchObject({ status: 'wrong', index: 1 });
    expect(run(v, '27\n').message).toContain("'est'");
    expect(run(v, '', "KeyError: 'sudd'").message).toContain('Chiave inesistente');
  });

  it('extreme: evidenzia la barra stampata e dice se è quella giusta', () => {
    const v: MissionViz = { ...base, kind: 'extreme', values: [8, 5, 3, 6], mode: 'min', expected: [3] };
    expect(run(v, '3\n')).toMatchObject({ status: 'ok', index: 2 });
    expect(run(v, '8\n')).toMatchObject({ status: 'wrong', index: 0 });
    expect(run(v, '8\n').message).toContain('minimo');
  });
});

describe('missioni del percorso', () => {
  const missions = PACKS[0].paths.flatMap((p) => p.missions);

  it('ogni missione ha una scena coerente con la sua validazione', () => {
    expect(missions.length).toBe(PACKS[0].paths.reduce((n, p) => n + p.missions.length, 0));
    for (const m of missions) {
      expect(m.viz, m.id).toBeDefined();
      const lines = m.validation.expected as string[];
      // la scena legge la riga della propria sezione nel bollettino atteso
      const mine = lines.find((l) => l.startsWith(`${m.viz!.label}:`));
      expect(mine, m.id).toBeDefined();
      const shown = vizLine(lines.join('\n'), m.viz!).replace(/[\[\]]/g, '');
      if (Array.isArray(m.viz!.expected)) {
        // numeri: «5.0» (float di Python) vale 5
        expect(shown.split(',').map(Number), m.id).toEqual(m.viz!.expected);
      } else {
        expect(shown, m.id).toBe(m.viz!.expected);
      }
    }
  });

  it('la soluzione di riferimento vince nella scena e nella validazione', () => {
    for (const m of missions) {
      const out = (m.validation.expected as string[]).join('\n');
      expect(evaluateViz(m.viz!, true, vizLine(out, m.viz!), '').status, m.id).toBe('ok');
      expect(validateOutput(out, m.validation).ok, m.id).toBe(true);
    }
  });
});
