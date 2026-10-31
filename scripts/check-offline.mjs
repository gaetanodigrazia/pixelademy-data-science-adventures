// Prova end-to-end (opzionale, non in CI): Pyodide ospitato dal sito + Service Worker = Python che gira anche offline.
//   1. npm run build && npx http-server dist/pixelademy/browser -p 4300 -s
//   2. node scripts/check-offline.mjs [http://localhost:4300]
// Richiede Playwright con Chromium. Esce con 1 se qualcosa non va.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const MISSION = 'adventure-core-nuvole-01';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const page = await ctx.newPage();
const external = [];
page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().includes('fonts.g')) external.push(r.url()); });

async function runStarter(label) {
  await page.goto(`${base}/missione/${MISSION}`);
  const start = page.locator('button:has-text("Comincia")');
  if (await start.count()) await start.click();
  await page.click('button:has-text("Salta la teoria")');
  await page.click('button:has-text("Vai al task")');
  await page.click('button[aria-label="Esegui codice"]');
  await page.waitForFunction(() => /BOLLETTINO/.test(document.querySelector('pre.console')?.textContent ?? ''), null, { timeout: 120000 });
  const out = await page.locator('pre.console').first().innerText();
  console.log(`${label}: ${JSON.stringify(out.trim().split('\n').slice(0, 2))}`);
  return out;
}

await page.goto(base);
await page.evaluate(() => {
  localStorage.setItem('pixelademy.consent.v1', 'granted');
  localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 2, xp: 20, level: 1, completedMissionIds: ['adventure-core-nuvole-01'], solvedCode: {}, liked: false, selectedPathId: 'adventure-core-nuvole', selectedCharacterId: 'adventure-core-aura' }));
});
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await page.reload();
await page.waitForTimeout(1500);
const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
console.log('Service Worker attivo e in controllo:', controlled);

const online = await runStarter('online ');
await page.waitForTimeout(2000); // il Service Worker finisce di mettere in cache i file
await ctx.setOffline(true);
let offline = '';
try {
  offline = await runStarter('offline');
} catch (e) {
  console.log('offline: FALLITO →', String(e.message).split('\n')[0]);
}
console.log('richieste fuori dal sito:', external.length ? external.slice(0, 3).join(', ') : 'nessuna');
await browser.close();
const ok = controlled && /BOLLETTINO/.test(online) && /BOLLETTINO/.test(offline) && external.length === 0;
console.log(ok ? 'OK: Python gira online e offline, senza CDN.' : 'PROBLEMI');
process.exit(ok ? 0 : 1);
