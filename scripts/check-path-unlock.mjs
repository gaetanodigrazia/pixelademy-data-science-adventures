// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): Le Variabili e Le Liste bloccano tutti gli altri percorsi,
// e l'Osservatorio si apre solo dopo tutti gli altri percorsi.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-path-unlock.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: 'it-IT', viewport: { width: 1100, height: 800 } })).newPage();
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const ids = (slug, n) => Array.from({ length: n }, (_, i) => `adventure-core-${slug}-${String(i + 1).padStart(2, '0')}`);
const all = () => [...ids('variabili', 2), ...ids('liste', 3), ...ids('mobilita', 3), ...ids('energia', 3), ...ids('statistica', 6), ...ids('outlier', 5), ...ids('probabilita', 4), 'challenges-pandas-01', 'challenges-pandas-02', 'challenges-pandas-03'];
const save = (slugs) => page.evaluate((done) => localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 0, level: 1, completedMissionIds: done, solvedCode: {}, liked: false, records: {}, selectedPathId: 'adventure-core-variabili', selectedCharacterId: 'adventure-core-nilo' })), slugs);
const catalog = async () => {
  await page.goto(`${base}/`);
  await page.click('button:has-text("Cambia / cerca")');
  await page.waitForSelector('.result');
  return page.$$eval('.result', (els) => els.map((e) => ({ t: e.querySelector('strong')?.textContent, disabled: e.disabled, note: e.querySelector('.lock-note')?.textContent ?? '' })));
};

await page.goto(base);
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted'); });
await page.goto(`${base}/`);
await page.waitForSelector('app-world-map canvas');
const title = await page.locator('h1').first().innerText();
console.log('giocatore nuovo, percorso iniziale:', title);
check(title.includes('Le Variabili'), `il percorso iniziale non è Le Variabili ma «${title}»`);

let rows = await catalog();
console.log('catalogo:', JSON.stringify(rows.map((r) => `${r.disabled ? '🔒' : '·'} ${r.t}`)));
check(rows[0]?.t === 'Le Variabili' && !rows[0].disabled, 'Le Variabili non sono il primo percorso sbloccato');
check(rows[1]?.t === 'Le Liste' && rows[1].disabled, 'Le Liste non sono seconde e bloccate');
check(rows.slice(1).every((r) => r.disabled), 'dopo Le Variabili ci sono percorsi sbloccati');
check(rows.find((r) => r.t === 'Centro Mobilità')?.note.includes('Le Variabili'), 'Centro Mobilità non dice cosa manca');
await page.keyboard.press('Escape');
await page.goto(`${base}/missione/adventure-core-mobilita-01`);
await page.waitForTimeout(800);
check(new URL(page.url()).pathname === '/', `una missione bloccata non rimanda alla home (${page.url()})`);

await save(ids('variabili', 2));
rows = await catalog();
check(!rows.find((r) => r.t === 'Le Liste').disabled, 'completate Le Variabili, Le Liste sono ancora bloccate');
check(rows.find((r) => r.t === 'Centro Mobilità').disabled, 'Centro Mobilità si apre senza Le Liste');
await page.keyboard.press('Escape');

await save([...ids('variabili', 2), ...ids('liste', 3)]);
rows = await catalog();
check(!rows.find((r) => r.t === 'Centro Mobilità').disabled, 'completati i percorsi base, Centro Mobilità è ancora bloccato');
const obs = rows.find((r) => r.t === 'Osservatorio delle Nuvole');
check(obs.disabled && obs.note.includes('Centro Mobilità') && obs.note.includes('Sfide con pandas') && !obs.note.includes('Le Variabili'), `l'Osservatorio dovrebbe mancare degli altri percorsi (${obs.note})`);
await save([...all()].filter((id) => !id.startsWith('challenges-')));
rows = await catalog();
check(rows.find((r) => r.t === 'Osservatorio delle Nuvole').disabled, 'senza le sfide pandas l\'Osservatorio è sbloccato');
await page.keyboard.press('Escape');
await page.goto(`${base}/progetto/adventure-core-nuvole`);
await page.waitForTimeout(500);
check((await page.locator('main').innerText()).includes('Percorso non trovato'), 'la Dashboard del percorso bloccato esiste');

await save(all());
await page.goto(`${base}/missione/adventure-core-nuvole-01`);
await page.waitForTimeout(800);
check(page.url().includes('/missione/adventure-core-nuvole-01'), 'la prima missione dell\'Osservatorio sbloccato non si apre');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: Variabili e Liste sbloccano gli altri percorsi; l\'Osservatorio si apre dopo tutti gli altri.');
