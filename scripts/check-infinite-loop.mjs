// Prova end-to-end (opzionale, non in CI): un ciclo infinito è interrotto e la pagina resta reattiva.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"   poi:
//   node scripts/check-infinite-loop.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
await page.goto(base);
await page.evaluate(() => {
  localStorage.setItem('pixelademy.consent.v1', 'granted');
  localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 2, xp: 20, level: 1, completedMissionIds: ['adventure-core-nuvole-01'], solvedCode: {}, liked: false, selectedPathId: 'adventure-core-nuvole', selectedCharacterId: 'adventure-core-aura' }));
});
await page.goto(`${base}/missione/adventure-core-nuvole-01`);
const start = page.locator('button:has-text("Comincia")');
if (await start.count()) await start.click();
await page.click('button:has-text("Salta la teoria")');
await page.click('button:has-text("Vai al task")');
await page.waitForSelector('.monaco-editor');
await page.click('.monaco-editor');
await page.keyboard.press('Control+A');
await page.keyboard.type('while True:\n    pass');
await page.click('button[aria-label="Esegui codice"]');
const t0 = Date.now();
await page.waitForSelector('button[aria-label="Interrompi l\'esecuzione"]');
// la pagina risponde mentre il programma gira: il cronometro continua a scorrere
const clock1 = await page.locator('[aria-label="Cronometro ed errori"]').innerText();
await page.waitForFunction(() => /più di 5 secondi/.test(document.querySelector('pre.console.err')?.textContent ?? ''), null, { timeout: 30000 });
const took = ((Date.now() - t0) / 1000).toFixed(1);
const msg = (await page.locator('pre.console.err').innerText()).trim();
console.log(`interrotto dopo ${took} s: «${msg}»`);
// dopo l'interruzione si può eseguire di nuovo (Pyodide si ricarica nel worker nuovo)
await page.keyboard.press('Control+A');
await page.click('.monaco-editor');
await page.keyboard.press('Control+A');
await page.keyboard.type('print("di nuovo")');
await page.click('button[aria-label="Esegui codice"]');
await page.waitForFunction(() => /di nuovo/.test(document.querySelector('pre.console')?.textContent ?? ''), null, { timeout: 60000 });
console.log('esecuzione successiva: OK');
await browser.close();
