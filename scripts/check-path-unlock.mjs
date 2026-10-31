// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): l'Osservatorio si sblocca solo dopo Centro Mobilità.
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

await page.goto(base);
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted'); });
await page.goto(`${base}/`);
await page.waitForSelector('app-world-map canvas');
const title = await page.locator('h1').first().innerText();
console.log('giocatore nuovo, percorso iniziale:', title);
check(title.includes('Centro Mobilità'), `il percorso iniziale non è Centro Mobilità ma «${title}»`);

await page.click('button:has-text("Cambia / cerca")');
await page.waitForSelector('.result');
const rows = await page.$$eval('.result', (els) => els.map((e) => ({ t: e.querySelector('strong')?.textContent, disabled: e.disabled, note: e.querySelector('.lock-note')?.textContent ?? '' })));
console.log('catalogo:', JSON.stringify(rows.filter((r) => /Osservatorio|Mobilità/.test(r.t))));
const obs = rows.find((r) => r.t === 'Osservatorio delle Nuvole');
check(obs?.disabled && obs.note.includes('Completa «Centro Mobilità» per sbloccarlo'), 'l\'Osservatorio non è bloccato nel catalogo con il motivo');
check(rows.filter((r) => r.t !== 'Osservatorio delle Nuvole').every((r) => !r.disabled), 'altri percorsi bloccati per errore');
await page.keyboard.press('Escape');

await page.goto(`${base}/missione/adventure-core-nuvole-01`);
await page.waitForTimeout(800);
check(new URL(page.url()).pathname === '/', `la missione bloccata non rimanda alla home (${page.url()})`);
await page.goto(`${base}/progetto/adventure-core-nuvole`);
await page.waitForTimeout(500);
check((await page.locator('main').innerText()).includes('Percorso non trovato'), 'la Dashboard del percorso bloccato esiste');

// completando Centro Mobilità (stato salvato come lo scriverebbe l'app) l'Osservatorio si apre
await page.evaluate(() => localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 90, level: 2, completedMissionIds: ['adventure-core-mobilita-01', 'adventure-core-mobilita-02', 'adventure-core-mobilita-03'], solvedCode: {}, liked: false, telemetry: false, records: {}, selectedPathId: 'adventure-core-mobilita', selectedCharacterId: 'adventure-core-nilo' })));
await page.goto(`${base}/`);
await page.click('button:has-text("Cambia / cerca")');
await page.waitForSelector('.result');
const open = await page.$$eval('.result', (els) => els.find((e) => e.querySelector('strong')?.textContent === 'Osservatorio delle Nuvole')?.disabled);
console.log('dopo Centro Mobilità, Osservatorio bloccato:', open);
check(open === false, 'completato Centro Mobilità, l\'Osservatorio è ancora bloccato');
await page.click('.result:has(strong:text-is("Osservatorio delle Nuvole"))');
await page.waitForTimeout(500);
check((await page.locator('h1').first().innerText()).includes('Osservatorio'), 'scegliendo l\'Osservatorio sbloccato il percorso non cambia');
await page.goto(`${base}/missione/adventure-core-nuvole-01`);
await page.waitForTimeout(800);
check(page.url().includes('/missione/adventure-core-nuvole-01'), 'la prima missione dell\'Osservatorio sbloccato non si apre');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: l\'Osservatorio si sblocca solo dopo Centro Mobilità.');
