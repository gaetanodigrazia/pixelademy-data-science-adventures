// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): l'editor di codice è disegnato bene e il suo CSS si scarica solo dove serve.
// Col dev server il CSS di Monaco è iniettato da JavaScript e un difetto di collegamento non si vede: provare qui, sempre sulla build.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-editor-prod.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: 'it-IT', viewport: { width: 1400, height: 900 } })).newPage();
const monacoRequests = [];
page.on('request', (r) => { if (r.url().endsWith('monaco.css')) monacoRequests.push(r.url()); });
const problems = [];

await page.goto(base);
await page.evaluate(() => {
  localStorage.setItem('pixelademy.consent.v1', 'granted');
  localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 20, level: 1, completedMissionIds: ['adventure-core-nuvole-01'], solvedCode: {}, liked: false, telemetry: false, records: {}, selectedPathId: 'adventure-core-nuvole', selectedCharacterId: 'adventure-core-aura' }));
});
await page.goto(`${base}/`);
await page.waitForSelector('app-world-map canvas');
await page.goto(`${base}/info`);
await page.waitForTimeout(500);
if (monacoRequests.length) problems.push('il CSS di Monaco è stato scaricato da home o Info (serve solo nel task)');

await page.goto(`${base}/missione/adventure-core-nuvole-01`);
const start = page.locator('button:has-text("Comincia")');
if (await start.count()) await start.click();
await page.click('button:has-text("Salta la teoria")');
await page.click('button:has-text("Vai al task")');
await page.waitForSelector('.monaco-editor', { timeout: 30000 });
await page.waitForTimeout(1000);
const m = await page.evaluate(() => {
  const ed = document.querySelector('.monaco-editor').getBoundingClientRect();
  const line = document.querySelector('.view-line').getBoundingClientRect();
  const host = document.querySelector('app-code-editor .host').getBoundingClientRect();
  return { editorLeft: ed.left, editorRight: ed.right, lineLeft: line.left, hostLeft: host.left, hostRight: host.right, link: !!document.querySelector('link#monaco-styles'), hscroll: document.documentElement.scrollWidth - innerWidth };
});
console.log(JSON.stringify({ ...m, monacoRequests: monacoRequests.length }));
if (!m.link) problems.push('il link a monaco.css non c\'è');
if (monacoRequests.length !== 1) problems.push(`monaco.css richiesto ${monacoRequests.length} volte (atteso 1)`);
if (m.lineLeft < m.hostLeft - 1 || m.lineLeft > m.hostRight) problems.push(`il testo è fuori dal riquadro (riga a x=${Math.round(m.lineLeft)}, editor ${Math.round(m.hostLeft)}–${Math.round(m.hostRight)})`);
if (m.hscroll > 0) problems.push(`scroll orizzontale di ${m.hscroll}px`);
await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: editor disegnato bene sulla build di produzione; CSS scaricato solo nel task.');
