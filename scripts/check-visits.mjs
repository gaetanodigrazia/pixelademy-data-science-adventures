// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): il contatore di visite è anonimo. Si intercetta /api/visite e si controlla
// che all'apertura parta UNA sola richiesta POST vuota, senza cookie né referrer, che non si ripeta cambiando pagina, che nulla venga salvato nel
// browser e che con Do Not Track si legga soltanto (GET). Il dominio finto `pixelademy.test` evita la regola «in locale non conta».
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-visits.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = 'http://pixelademy.test:4300';
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP pixelademy.test 127.0.0.1'] });
const problems = [];

async function run({ dnt }) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript((dntOn) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false }); // un browser «normale»
    if (dntOn) Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
  }, dnt);
  const page = await ctx.newPage();
  const seen = [];
  await page.route('**/api/visite', async (route) => {
    const r = route.request();
    seen.push({ method: r.method(), headers: r.headers(), body: r.postData() });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 12430 }) });
  });
  await page.route('**/api/mi-piace', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":3}' }));
  await page.goto(`${base}/`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/`);
  await page.waitForSelector('app-world-map canvas');
  await page.waitForTimeout(800);
  const afterOpen = seen.length;
  await page.goto(`${base}/info`); // ricarica completa: una nuova apertura
  await page.waitForSelector('.visits');
  const info = await page.locator('.visits').innerText();
  const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookie: document.cookie }));
  await ctx.close();
  return { seen, afterOpen, info, storage };
}

const normal = await run({ dnt: false });
const posts = normal.seen.filter((x) => x.method === 'POST');
console.log(`apertura normale: ${normal.afterOpen} richiesta/e alla prima apertura; POST totali dopo due aperture e la pagina Il progetto: ${posts.length}`);
if (posts.length < 1) problems.push('nessun POST all\'apertura');
for (const p of posts) {
  if (p.body) problems.push(`il POST ha un corpo: ${p.body}`);
  if (p.headers.cookie) problems.push('il POST invia cookie');
  if (p.headers.referer) problems.push(`il POST invia il referrer: ${p.headers.referer}`);
}
if (normal.storage.cookie) problems.push(`cookie impostati: ${normal.storage.cookie}`);
if (normal.storage.session.length) problems.push(`sessionStorage: ${normal.storage.session}`);
if (normal.storage.local.length) problems.push(`localStorage: ${normal.storage.local}`);
if (!/12\.430/.test(normal.info)) problems.push(`totale non mostrato: ${normal.info.slice(0, 80)}`);
console.log('pagina Il progetto:', normal.info.replace(/\n/g, ' ').slice(0, 120));
console.log('headers del POST:', JSON.stringify(Object.keys(posts[0]?.headers ?? {})));

const dnt = await run({ dnt: true });
console.log(`Do Not Track: metodi usati = ${[...new Set(dnt.seen.map((x) => x.method))].join(',')}`);
if (dnt.seen.some((x) => x.method === 'POST')) problems.push('con Do Not Track il sito ha contato la visita');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: il contatore è anonimo e rispetta Do Not Track.');
