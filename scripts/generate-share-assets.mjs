// Genera, per ogni percorso con Dashboard, l'immagine di anteprima da condividere e la pagina che la annuncia a LinkedIn:
//   public/share/<percorso>.png            — la Dashboard completa (1200×627)
//   public/condividi/<percorso>/index.html — meta-tag Open Graph (og:image…) + rimando all'app
// LinkedIn mostra l'immagine come grande foto nel post quando si condivide l'indirizzo della pagina.
// I risultati della Dashboard sono quelli del bollettino di riferimento: uguali per tutti, quindi l'immagine è statica.
// Se qualcosa non va (es. modulo nativo non disponibile) avvisa e prosegue: la pubblicazione del sito non deve fallire.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = (process.env.SHARE_ORIGIN || process.env.URL || 'http://localhost:4300').replace(/\/$/, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function main() {
  const { build } = await import('esbuild');
  const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');

  const tmp = mkdtempSync(join(tmpdir(), 'pixelademy-share-'));
  try {
    const bundle = join(tmp, 'share.mjs');
    await build({ entryPoints: [join(root, 'scripts/share-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'silent' });
    const m = await import(pathToFileURL(bundle).href);

    // carattere pixel dell'app (se manca si usa quello di ripiego: l'immagine esce comunque)
    try {
      GlobalFonts.registerFromPath(join(root, 'node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff'), 'Press Start 2P');
    } catch (e) {
      console.warn('share: carattere pixel non registrato:', e.message);
    }

    // niente avanzi di percorsi che non hanno (più) la Dashboard
    rmSync(join(root, 'public/condividi'), { recursive: true, force: true });
    let made = 0;
    for (const seed of m.PATH_SEEDS) {
      if (seed.dashboard === false) continue;
      const steps = m.assembleProject(seed);
      const total = steps.length;
      const lines = steps[total - 1].expected;
      const input = {
        heading: seed.project.heading,
        pathTitle: seed.title,
        done: total,
        total,
        cards: m.buildDashboardCards(seed.project, total, lines, total),
        date: null, // l'anteprima è uguale per tutti: niente data
      };

      const canvas = createCanvas(m.SHARE_W, m.SHARE_H);
      m.drawShareImage(canvas.getContext('2d'), input);
      const png = canvas.toBuffer('image/png');
      mkdirSync(join(root, 'public/share'), { recursive: true });
      writeFileSync(join(root, `public/share/${seed.slug}.png`), png);

      const pageUrl = `${origin}/condividi/${seed.slug}/`;
      const image = `${origin}/share/${seed.slug}.png`;
      const title = `Ho completato «${seed.title}» su Pixelademy`;
      const description = `In ${total} ${total === 1 ? 'missione' : 'missioni'} ho usato Python per costruire il ${seed.project.heading.charAt(0) + seed.project.heading.slice(1).toLowerCase()} e ne ho visualizzato i risultati in una dashboard. Impara la data science giocando.`;
      const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Pixelademy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="${m.SHARE_W}">
  <meta property="og:image:height" content="${m.SHARE_H}">
  <meta property="og:image:alt" content="${esc(`La Dashboard del progetto «${seed.project.heading}»`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:image" content="${esc(image)}">
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b24;color:#fde047;font:16px monospace;text-align:center}a{color:#fbbf24}</style>
</head>
<body>
  <p>${esc(title)}<br><a href="/">Apri Pixelademy →</a></p>
  <script>location.replace('/');</script>
</body>
</html>
`;
      mkdirSync(join(root, `public/condividi/${seed.slug}`), { recursive: true });
      writeFileSync(join(root, `public/condividi/${seed.slug}/index.html`), html);
      made++;
      console.log(`share: ${seed.slug} → public/share/${seed.slug}.png (${Math.round(png.length / 1024)} KB), public/condividi/${seed.slug}/index.html`);
    }
    console.log(`share: ${made} percors${made === 1 ? 'o' : 'i'} (indirizzi con ${origin})`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.warn('share: anteprime non generate (la pubblicazione prosegue):', e?.message ?? e);
});
