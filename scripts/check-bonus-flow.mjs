// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): il flusso vero del bonus. Si gioca la battaglia di «Le Variabili»
// (il quiz si risolve leggendo il codice mostrato), con il sorteggio forzato a favore e poi contrario, e con un errore di troppo.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-bonus-flow.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];

async function play({ random, wrongClicks }) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((r) => { Math.random = () => r; }, random);
  const page = await ctx.newPage();
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('pixelademy.intro.v1', '1'); localStorage.setItem('pixelademy.consent.v1', 'granted'); });
  await page.goto(`${base}/missione/adventure-core-variabili-01`);
  const start = page.locator('button:has-text("Comincia")');
  if (await start.count()) await start.click();
  await page.locator('button:has-text("Salta la teoria")').click();
  await page.waitForSelector('.gm-query');
  const number = await page.locator('.code li code').first().innerText().then((t) => /misura = (\d+)/.exec(t)?.[1]);
  let wrong = wrongClicks;
  for (let step = 0; step < 2; step++) {
    const query = await page.locator('.gm-query').innerText();
    const want = step === 0 ? number : `Misura: ${number}`;
    const opts = page.locator('.gm-row button');
    if (wrong-- > 0) { // un errore apposta: la prima opzione che non è quella giusta
      const texts = await opts.allInnerTexts();
      await opts.nth(texts.findIndex((t) => t.trim() !== want)).click();
      await page.waitForTimeout(200);
    }
    const texts = await opts.allInnerTexts();
    await opts.nth(texts.findIndex((t) => t.trim() === want)).click();
    await page.waitForTimeout(300);
    const cont = page.locator('button:has-text("Continua")');
    if (await cont.count()) await cont.click();
    void query;
  }
  await page.waitForSelector('[role=dialog]');
  const dialog = (await page.locator('[role=dialog]').innerText()).replace(/\n/g, ' ');
  const steps = (await page.locator('.steps').innerText()).replace(/\n/g, ' | ');
  const bonusButton = await page.locator('[role=dialog] button:has-text("Al bonus")').count();
  let platform = false;
  if (bonusButton) { await page.locator('[role=dialog] button:has-text("Al bonus")').click(); platform = await page.waitForSelector('app-platformer canvas', { timeout: 5000 }).then(() => true).catch(() => false); }
  await ctx.close();
  return { dialog, steps, bonusButton, platform };
}

const yes = await play({ random: 0.1, wrongClicks: 0 });
console.log('buon gioco + sorteggio favorevole:', yes.bonusButton ? 'bonus offerto' : 'NIENTE bonus', '|', yes.steps, '| platform visibile:', yes.platform);
if (!yes.bonusButton || !yes.platform || !/Bonus sbloccato/.test(yes.dialog)) problems.push('con buon gioco e sorteggio favorevole il bonus non compare');

const luck = await play({ random: 0.9, wrongClicks: 0 });
console.log('buon gioco + sorteggio sfavorevole:', luck.bonusButton ? 'bonus offerto' : 'nessun bonus (atteso)');
if (luck.bonusButton) problems.push('il sorteggio sfavorevole offre comunque il bonus');

const one = await play({ random: 0.1, wrongClicks: 1 });
console.log('1 errore + sorteggio favorevole:', one.bonusButton ? 'bonus offerto (atteso)' : 'NIENTE bonus');
if (!one.bonusButton) problems.push('con 1 errore (consentito) il bonus non compare');

const two = await play({ random: 0.1, wrongClicks: 2 });
console.log('2 errori + sorteggio favorevole:', two.bonusButton ? 'bonus offerto' : 'nessun bonus (atteso)', '|', two.dialog.match(/Finisci la battaglia[^.]*\./)?.[0] ?? '(nessun suggerimento)');
if (two.bonusButton) problems.push('con 2 errori il bonus compare');
if (!/Finisci la battaglia/.test(two.dialog)) problems.push('con 2 errori manca il suggerimento su come sbloccarlo');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: il bonus segue la regola (≤1 errore + sorteggio).');
