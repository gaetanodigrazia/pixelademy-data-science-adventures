// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): su telefono un trascinamento che parte dall'editor scorre la pagina,
// e un semplice tocco mette ancora a fuoco l'editor.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-touch-scroll.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 500 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const problems = [];
await page.goto(base);
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ 'adventure-core-variabili-01': 'task' })); });
await page.goto(`${base}/missione/adventure-core-variabili-01`);
const start = page.locator('button:has-text("Comincia")');
if (await start.count()) await start.click();
await page.waitForSelector('.monaco-editor', { timeout: 15000 });
await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();

const scrollTop = () => page.evaluate(() => Math.max(...[document.scrollingElement, ...document.querySelectorAll('*')].map((e) => e.scrollTop)));
const cdp = await ctx.newCDPSession(page);
// un dito che si muove di `d` px (d > 0: scende e la pagina torna su)
const drag = async (x, y, d) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (d * i) / 10 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);
};
const box = await page.locator('.monaco-editor').first().boundingBox();
const x = Math.round(box.x + box.width / 2);
const y = Math.round(Math.min(box.y + box.height / 2, 440));

const before = await scrollTop();
await drag(x, y, 100);
const up = await scrollTop();
console.log(`dito che scende sull'editor: scroll ${before} → ${up}`);
if (!(up < before)) problems.push('trascinando verso il basso dall\'editor la pagina non torna su');
await drag(x, Math.min(y, 300), -100);
const down = await scrollTop();
console.log(`dito che sale sull'editor: scroll ${up} → ${down}`);
if (!(down > up)) problems.push('trascinando verso l\'alto dall\'editor la pagina non scorre in giù');

await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();
const b2 = await page.locator('.monaco-editor').first().boundingBox();
await page.touchscreen.tap(Math.round(b2.x + b2.width / 2), Math.round(Math.min(b2.y + 40, 440)));
await page.waitForTimeout(400);
const focused = await page.evaluate(() => document.activeElement?.className?.toString().includes('inputarea') ?? false);
console.log('tocco semplice mette a fuoco l\'editor:', focused);
if (!focused) problems.push('un tocco sull\'editor non lo mette più a fuoco');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: dall\'editor la pagina scorre e il tocco funziona.');
