import { PACKS } from './core/data/packs.generated';
import { validateOutput } from './core/utils/validator';

const pack = PACKS[0];

describe('progetto di ogni percorso', () => {
  for (const path of pack.paths) {
    describe(path.id, () => {
      const lines = (i: number) => (path.missions[i].validation as { expected: string[] }).expected;

      it('ogni missione aggiunge una sezione: codice e bollettino contengono quelli della missione precedente', () => {
        path.missions.forEach((m, i) => {
          expect(m.validation.kind).toBe('lines');
          expect(m.starterCode).toBe((m.projectBase ?? '') + m.projectSection);
          if (i === 0) return;
          const prev = path.missions[i - 1];
          expect(pack.solutions[m.id].startsWith(pack.solutions[prev.id])).toBe(true);
          expect(m.projectBase).toBe(pack.solutions[prev.id]);
          expect(lines(i).slice(0, lines(i - 1).length)).toEqual(lines(i - 1));
          expect(lines(i).length).toBeGreaterThan(lines(i - 1).length);
        });
      });

      it('la partenza di ogni missione non è già la soluzione', () => {
        for (const m of path.missions) {
          expect(m.starterCode).not.toBe(pack.solutions[m.id]);
        }
      });

      it('l\'ultima missione completa il progetto: il bollettino ha un titolo e una sezione per missione (e la chiusura nei percorsi completi)', () => {
        const n = path.missions.length;
        const last = lines(n - 1);
        expect(last[0]).toMatch(/^=== .+ ===$/);
        // il titolo, una riga per sezione e, solo se il percorso copre tutti i 10 concetti, la riga di chiusura
        if (n === 10) {
          expect(last.at(-1)).toBe('=== FINE DEL BOLLETTINO ===');
          expect(last.length).toBe(12);
        } else {
          expect(last.at(-1)).not.toMatch(/^===/);
          expect(last.length).toBe(1 + n);
        }
        expect(validateOutput(last.join('\n'), path.missions.at(-1)!.validation).ok).toBe(true);
      });

      it('un output parziale non supera la validazione e non rivela la riga mancante', () => {
        const i = Math.min(4, path.missions.length - 1); // la quinta missione, o l'ultima nei percorsi brevi
        const m = path.missions[i];
        const partial = lines(i - 1).join('\n');
        const r = validateOutput(partial, m.validation);
        expect(r.ok).toBe(false);
        expect(r.message).not.toContain(lines(i).at(-1)!);
      });
    });
  }
});
