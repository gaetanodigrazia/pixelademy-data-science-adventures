import { PACKS } from './core/data/packs.generated';

/** Espressioni che non devono comparire nei testi dei contenuti (vedi docs/CONTENUTI.md). */
const BANNED = [/gratuit/i, /gratis/i, /sconfiggi i bug/i, /corso di python/i];

function texts(): [string, string][] {
  const out: [string, string][] = [];
  for (const pack of PACKS) {
    out.push([`pack ${pack.id}`, pack.title]);
    for (const p of pack.paths) {
      out.push([`${p.id} titolo`, p.title], [`${p.id} descrizione`, p.description], [`${p.id} tag`, p.tags.join(' ')]);
      for (const m of p.missions) {
        out.push([`${m.id} titolo`, m.title], [`${m.id} storia`, m.story], [`${m.id} consegna`, m.briefing], [`${m.id} suggerimento`, m.hint]);
        for (const s of m.theory) out.push([`${m.id} teoria «${s.title}»`, `${s.title} ${s.body}`]);
      }
    }
    for (const c of pack.characters) out.push([`eroe ${c.name}`, c.description]);
    for (const e of pack.enemies) out.push([`nemico ${e.name}`, e.description]);
    for (const g of pack.games) out.push([`gioco ${g.id}`, `${g.title} ${g.description}`]);
  }
  return out;
}

describe('testi dei contenuti: focus data science', () => {
  it('non contengono espressioni vietate (gratuito, «sconfiggi i bug», «corso di Python»)', () => {
    for (const [where, text] of texts()) for (const re of BANNED) expect(text, where).not.toMatch(re);
  });

  it('ogni percorso ha almeno un tag di dati oltre a «python»', () => {
    for (const p of PACKS.flatMap((x) => x.paths)) {
      expect(p.tags.some((t) => t !== 'python'), p.id).toBe(true);
    }
  });

  it('descrizioni e consegne non sono vuote', () => {
    for (const p of PACKS.flatMap((x) => x.paths)) {
      expect(p.description.length, p.id).toBeGreaterThan(20);
      for (const m of p.missions) expect(m.briefing.length, m.id).toBeGreaterThan(20);
    }
  });
});
