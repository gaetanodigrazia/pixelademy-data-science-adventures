// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): il contatore di visite è anonimo. Si intercetta /api/visite e si controlla
// che all'apertura parta UNA sola richiesta POST vuota, senza cookie né referrer, che non si ripeta cambiando pagina, che nulla venga salvato nel
// browser (senza consenso) e che con Do Not Track si legga soltanto (GET). Il dominio finto `pixelademy.test` evita la regola «in locale non conta».
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


// con il salvataggio accettato: stessa persona, una volta al giorno (ricaricando la pagina non si conta di nuovo); senza consenso si conta sempre
async function reloads({ consent }) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();
  const methods = [];
  await page.route('**/api/visite', async (route) => { methods.push(route.request().method()); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":5}' }); });
  await page.route('**/api/mi-piace', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":3}' }));
  await page.goto(`${base}/`);
  await page.evaluate((c) => { localStorage.clear(); if (c) localStorage.setItem('pixelademy.consent.v1', 'granted'); }, consent);
  methods.length = 0;
  for (let i = 0; i < 3; i++) { await page.goto(`${base}/`); await page.waitForSelector('app-world-map canvas'); await page.waitForTimeout(500); }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelademy.player.v1') ?? 'null')?.countedDay ?? null);
  await ctx.close();
  return { methods, saved };
}
const withConsent = await reloads({ consent: true });
console.log(`con il salvataggio: 3 aperture di fila → ${withConsent.methods.join(', ')}; data salvata: ${withConsent.saved}`);
if (withConsent.methods.join() !== 'POST,GET,GET') problems.push(`con il consenso dovrebbe contare una sola volta (POST,GET,GET): ${withConsent.methods}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(withConsent.saved ?? '')) problems.push('la data non è stata salvata');
const without = await reloads({ consent: false });
console.log(`senza consenso: 3 aperture di fila → ${without.methods.join(', ')}; data salvata: ${without.saved}`);
if (without.methods.join() !== 'POST,POST,POST') problems.push(`senza consenso dovrebbe contare ogni apertura: ${without.methods}`);
if (without.saved) problems.push('senza consenso si è salvata una data');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: il contatore è anonimo e rispetta Do Not Track.');
