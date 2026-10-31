import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { PACKS } from './core/data/packs.generated';

// Lo script di build che genera, per ogni percorso con Dashboard, l'immagine e la pagina Open Graph: lo si esegue davvero.
const ORIGIN = 'https://esempio.test';
const withDashboard = PACKS.flatMap((p) => p.paths).filter((p) => p.dashboard !== false);

describe('anteprime di condivisione (scripts/generate-share-assets.mjs)', () => {
  beforeAll(() => {
    execFileSync('node', ['scripts/generate-share-assets.mjs'], { env: { ...process.env, SHARE_ORIGIN: ORIGIN }, encoding: 'utf8', timeout: 60000 });
  }, 70000);

  it('c\'è almeno un percorso con Dashboard e solo quelli la hanno', () => {
    expect(withDashboard.length).toBeGreaterThanOrEqual(1);
    for (const p of PACKS.flatMap((x) => x.paths).filter((x) => x.dashboard === false)) {
      expect(existsSync(`public/condividi/${p.id.replace('adventure-core-', '')}/index.html`), p.id).toBe(false);
    }
  });

  for (const p of withDashboard) {
    const slug = p.id.replace('adventure-core-', '');
    it(`${p.id}: PNG 1200×627 e pagina con i meta-tag Open Graph (og:image assoluto)`, () => {
      const png = readFileSync(`public/share/${slug}.png`);
      expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]); // firma PNG
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(627);
      const html = readFileSync(`public/condividi/${slug}/index.html`, 'utf8');
      expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/share/${slug}.png">`);
      expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/condividi/${slug}/">`);
      expect(html).toContain('og:title');
      expect(html).toContain('twitter:card');
      expect(html).toContain("location.replace('/')");
      expect(html).toContain(p.title);
    });
  }
});
