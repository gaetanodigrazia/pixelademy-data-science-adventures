// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): la classifica globale facoltativa. Si intercetta /api/classifica con un finto server
// e si controlla: nulla parte prima dell'iscrizione (aprire la classifica fa solo una lettura), l'iscrizione richiede il salvataggio locale e le due caselle,
// il codice segreto resta nel browser, «Cancella i dati» esce prima dalla classifica (e se il server non risponde si ferma), l'uscita cancella.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-board.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = 'http://pixelademy.test:4300';
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP pixelademy.test 127.0.0.1'] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();
const problems = [];
const ok = (c, m) => { if (!c) problems.push(m); };

const TOKEN = 'ab'.repeat(32);
const calls = [];
let down = false;
let joined = false;
await page.route('**/api/classifica', async (route) => {
  const r = route.request();
  const body = r.postData() ? JSON.parse(r.postData()) : null;
  calls.push({ method: r.method(), body, cred: r.headers()['cookie'] ?? null });
  if (down && r.method() === 'POST') return route.abort();
  const json = (status, b) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) });
  if (r.method() === 'GET') return json(200, { top: [{ n: 4, xp: 900, level: 5 }, ...(joined ? [{ n: 12, xp: 0, level: 1 }] : [])] });
  if (body.action === 'join') { joined = true; return json(200, { n: 12, token: TOKEN, xp: 0, level: 1 }); }
  if (body.action === 'leave') { joined = false; return json(200, { ok: true }); }
  return json(200, { n: 12, xp: 0, level: 1 });
});
await page.route('**/api/visite', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"count":1}' }));
await page.route('**/api/mi-piace', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"count":1}' }));

await page.goto(`${base}/`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/`);
await page.waitForSelector('app-world-map canvas');
await page.waitForTimeout(500);
ok(calls.length === 0, 'prima di aprire la classifica non deve partire nessuna richiesta');

await page.click('.profile-btn');
await page.click('.board-btn');
await page.waitForSelector('app-board-modal table.board');
ok(calls.length === 1 && calls[0].method === 'GET', 'aprire la classifica deve fare solo una lettura (GET)');
ok((await page.locator('table.board').innerText()).includes('Giocatore 4'), 'la classifica deve mostrare «Giocatore 4»');
// senza consenso al salvataggio: niente iscrizione
ok(await page.getByRole('button', { name: 'Consenti il salvataggio' }).isVisible(), 'senza salvataggio locale si deve chiedere prima il consenso');
ok((await page.getByRole('button', { name: 'Entra in classifica' }).count()) === 0, 'senza salvataggio non deve esserci «Entra in classifica»');
await page.getByRole('button', { name: 'Consenti il salvataggio' }).click();
const joinBtn = page.getByRole('button', { name: 'Entra in classifica' });
ok(await joinBtn.isDisabled(), 'il pulsante deve essere disabilitato a caselle vuote');
await page.getByLabel('Dichiaro di avere almeno 14 anni').check();
ok(await joinBtn.isDisabled(), 'con una sola casella il pulsante deve restare disabilitato');
await page.getByLabel(/Acconsento a pubblicare/).check();
await page.waitForTimeout(200);
ok(await joinBtn.isEnabled(), 'con entrambe le caselle il pulsante deve attivarsi');
await joinBtn.click();
await page.waitForSelector('text=Sei in classifica come «Giocatore 12»');
const join = calls.find((c) => c.body?.action === 'join');
ok(join && join.body.consent === true && join.body.adult === true, 'l\'iscrizione deve inviare consenso e 14 anni');
ok(join && Object.keys(join.body).sort().join() === 'action,adult,consent,level,xp', 'l\'iscrizione deve inviare solo azione, consenso, età, XP e livello');
ok(join?.cred === null, 'nessun cookie nella richiesta');
const st = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelademy.player.v1') ?? 'null'));
ok(st?.board?.n === 12 && st.board.token === TOKEN, 'numero e codice devono essere salvati nel browser');
ok((await page.locator('tr.me').innerText()).includes('tu'), 'la propria riga deve essere evidenziata');
await page.screenshot({ path: '/tmp/board-joined.png' });
await page.locator('app-board-modal button[aria-label=Chiudi]').click();

// «Cancella i dati» con il server giù: si ferma e dice perché; il codice resta
down = true;
await page.click('.privacy');
await page.getByRole('button', { name: /Cancella dati salvati/ }).click();
await page.waitForSelector('text=Prima non è stato possibile cancellare');
ok((await page.evaluate(() => localStorage.getItem('pixelademy.player.v1'))) !== null, 'con il server giù i dati locali devono restare');
// server su: prima esce dalla classifica, poi cancella
down = false;
const before = calls.length;
await page.getByRole('button', { name: /Cancella dati salvati/ }).click();
await page.waitForSelector('text=Dati salvati cancellati dal browser');
const leave = calls.slice(before).find((c) => c.body?.action === 'leave');
ok(leave && leave.body.n === 12 && leave.body.token === TOKEN, 'prima di cancellare i dati deve partire «leave» con numero e codice');
ok((await page.evaluate(() => localStorage.getItem('pixelademy.player.v1'))) === null, 'i dati locali devono risultare cancellati');
await browser.close();
if (problems.length) { console.error('PROBLEMI:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('OK: classifica globale (lettura, iscrizione, codice nel browser, cancellazione prima dei dati locali)');
