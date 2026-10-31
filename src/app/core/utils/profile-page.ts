import { levelFromXp } from './progress';

/** Il parametro XP dell'indirizzo del profilo: un intero ragionevole, altrimenti `null` (la pagina risponde 404). */
export function parseProfileXp(raw: string): number | null {
  if (!/^\d{1,7}$/.test(raw)) return null;
  return Number(raw);
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** La pagina che LinkedIn (e le altre app) leggono per l'anteprima: titolo, descrizione e foto del profilo. Chi la apre finisce nell'app. */
export function profileHtml(origin: string, xp: number): string {
  const level = levelFromXp(xp);
  const url = `${origin}/condividi/profilo/${xp}`;
  const image = `${url}.png`;
  const title = `Sono al livello ${level} su Pixelademy`;
  const description = `${xp} XP guadagnati imparando la data science giocando. Prova anche tu!`;
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Pixelademy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="627">
  <meta property="og:image:alt" content="${esc(`Livello ${level} su Pixelademy, ${xp} XP`)}">
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
}
