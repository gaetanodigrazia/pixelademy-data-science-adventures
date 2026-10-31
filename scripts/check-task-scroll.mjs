// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): scroll del task e ripresa dopo il ricaricamento.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-task-scroll.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 680 } })).newPage();
const problems = [];
const ids = (n) => Array.from({ length: n }, (_, i) => `adventure-core-nuvole-${String(i + 1).padStart(2, '0')}`);

await page.goto(base);
await page.evaluate((done) => {
  localStorage.setItem('pixelademy.consent.v1', 'granted');
  localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 20, level: 1, completedMissionIds: done, solvedCode: {}, liked: false, telemetry: false, records: {}, selectedPathId: 'adventure-core-nuvole', selectedCharacterId: 'adventure-core-aura' }));
  sessionStorage.clear();
}, ids(2));

const open = async (id) => {
  await page.goto(`${base}/missione/${id}`);
  const start = page.locator('button:has-text("Comincia")');
  if (await start.count()) await start.click();
};
const metrics = () => page.evaluate(() => {
  const p = document.querySelector('section[aria-label="Task Python"]');
  const ed = document.querySelector('app-code-editor')?.getBoundingClientRect(); // editor + pulsanti Esegui/Ripristina
  return { scrolls: p.classList.contains('scrolls'), scrollable: p.scrollHeight > p.clientHeight + 1, overflowY: getComputedStyle(p).overflowY, editorH: ed ? Math.round(ed.height) : 0 };
});

// 1. ripresa dopo il ricaricamento: dal task si resta al task; dalla battaglia si resta in battaglia (task ancora bloccato se non vinta)
await open('adventure-core-nuvole-02');
await page.click('button:has-text("Salta la teoria")');
await page.click('button:has-text("Vai al task")'); // la 2 è già completata: il task è sbloccato
await page.reload();
await page.waitForSelector('section[aria-label="Task Python"]', { timeout: 15000 }).catch(() => problems.push('ricaricando dal task non si resta al task'));
if (await page.locator('section[aria-label="Teoria"]').count()) problems.push('ricaricando dal task è tornata la teoria');

await open('adventure-core-nuvole-03');
await page.click('button:has-text("Salta la teoria")');
await page.reload();
await page.waitForSelector('section[aria-label="Battaglia"]', { timeout: 15000 }).catch(() => problems.push('ricaricando dalla battaglia non si resta in battaglia'));
if (await page.locator('section[aria-label="Task Python"]').count()) problems.push('ricaricando dalla battaglia il task risulta aperto');
console.log('ripresa: task → task, battaglia → battaglia');

// 2. «Mostra tutto il programma» abilita lo scroll e l'editor non si schiaccia
await open('adventure-core-nuvole-02');
await page.waitForSelector('section[aria-label="Task Python"]'); // la fase 'task' della 2 è ricordata
await page.waitForSelector('.monaco-editor', { timeout: 30000 });
const before = await metrics();
await page.click('button:has-text("Mostra tutto il programma")');
await page.waitForTimeout(300);
const whole = await metrics();
console.log('programma esteso:', JSON.stringify({ before, whole }));
if (before.scrolls) problems.push('senza programma esteso il riquadro ha già la classe scrolls');
if (before.editorH < 150) problems.push(`a riposo l'editor è alto solo ${before.editorH}px (minimo 150)`);
if (!whole.scrolls || whole.overflowY !== 'auto') problems.push('«Mostra tutto il programma» non abilita lo scroll');
if (whole.editorH < 255) problems.push(`con il programma esteso l'editor è alto solo ${whole.editorH}px`);
await page.click('button:has-text("Mostra solo ciò che serve")');

// 3. errore in console: scroll abilitato, editor visibile
await page.click('.monaco-editor');
await page.keyboard.press('Control+A');
await page.keyboard.type('print(variabile_inesistente)');
await page.click('button[aria-label="Esegui codice"]');
await page.waitForSelector('pre.console.err', { timeout: 120000 });
await page.waitForTimeout(300);
const err = await metrics();
console.log('errore in console:', JSON.stringify(err));
if (!err.scrolls || err.overflowY !== 'auto') problems.push("con l'errore il riquadro non scorre");
if (err.editorH < 255) problems.push(`con l'errore l'editor è alto solo ${err.editorH}px (schiacciato)`);
await page.screenshot({ path: '/tmp/task-error.png' });

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: ripresa dopo il ricaricamento e scroll del task funzionano sulla build di produzione.');
