// Prova end-to-end (opzionale, non in CI): le sfide con pandas girano davvero in Pyodide, nel browser, e finiscono in classifica.
//   1. npm run pyodide:packages   (scarica pandas e dipendenze in public/pyodide)
//   2. npm start                  (in un altro terminale)
//   3. node scripts/check-challenges.mjs [http://localhost:4200]
// Richiede Playwright con Chromium. Incolla nell'editor la soluzione di ogni sfida, la esegue e controlla l'esito e la classifica.
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4200';

const tmp = mkdtempSync(join(tmpdir(), 'pixelademy-challenges-'));
buildSync({ entryPoints: ['src/app/content/challenges/pack.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(tmp, 'pack.cjs'), logLevel: 'error' });
const pack = require(join(tmp, 'pack.cjs')).default;
rmSync(tmp, { recursive: true, force: true });
const missions = pack.paths[0].missions;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
const page = await ctx.newPage();
let ok = true;
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.evaluate(() => {
  localStorage.setItem('pixelademy.consent.v1', 'granted');
});
for (const m of missions) {
  await page.goto(`${base}/missione/${m.id}`);
  await page.waitForSelector('.monaco-editor', { timeout: 30000 });
  await page.evaluate((t) => navigator.clipboard.writeText(t), pack.solutions[m.id]);
  await page.click('.monaco-editor');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+V');
  await page.click('button[aria-label="Esegui codice"]');
  await page.waitForSelector('.foot [role=status]', { timeout: 180000 });
  const status = (await page.locator('.foot [role=status]').innerText()).trim();
  const out = (await page.locator('pre.console').first().innerText()).trim().replace(/\n/g, ' | ');
  const pass = status.startsWith('✔');
  ok &&= pass;
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${m.id}: «${out}» → ${status}`);
}
await page.goto(`${base}/`);
await page.evaluate((id) => {
  const s = JSON.parse(localStorage.getItem('pixelademy.player.v1'));
  s.selectedPathId = id;
  s.locale = 'it'; // il browser di prova è in inglese: l'interfaccia lo segue
  localStorage.setItem('pixelademy.player.v1', JSON.stringify(s));
}, pack.paths[0].id);
await page.goto(`${base}/`);
await page.click('button:has-text("Classifica")');
await page.waitForSelector('app-leaderboard tbody tr');
const rows = await page.locator('app-leaderboard tbody tr').count();
console.log(`classifica: ${rows} righe`);
ok &&= rows === missions.length;
await browser.close();
console.log(ok ? 'OK: le sfide con pandas funzionano e sono in classifica.' : 'PROBLEMI');
process.exit(ok ? 0 : 1);
