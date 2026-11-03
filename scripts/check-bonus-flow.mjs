// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): il flusso vero del bonus. Si gioca la battaglia di «Le Variabili»
// (il quiz si risolve leggendo il codice mostrato): 0 e 1 errore sbloccano il bonus (sempre, anche cambiando Math.random), 2 errori no, con il messaggio.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-bonus-flow.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];

async function play({ random, wrongClicks, playBonus = false }) {
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
  let end = '';
  if (bonusButton) {
    await page.locator('[role=dialog] button:has-text("Al bonus")').click();
    platform = await page.waitForSelector('app-platformer canvas', { timeout: 5000 }).then(() => true).catch(() => false);
    if (playBonus && platform) {
      // bot: salta ~1,4 s dopo l'annuncio di una moneta «Va presa» (la moneta arriva sull'eroe proprio allora)
      await page.locator('button:has-text("Via!")').click();
      let last = '';
      const t0 = Date.now();
      while (Date.now() - t0 < 18000 && !(await page.locator('app-platformer .end').count())) {
        const t = (await page.locator('app-platformer .sr').innerText()).trim();
        if (t && t !== last) { last = t; if (/Va presa/.test(t)) setTimeout(() => page.keyboard.press('ArrowUp').catch(() => undefined), 1400); }
        await page.waitForTimeout(50);
      }
      end = (await page.locator('app-platformer .end').innerText().catch(() => '')).replace(/\n/g, ' ');
    }
  }
  await ctx.close();
  return { dialog, steps, bonusButton, platform, end };
}

const clean = await play({ random: 0.9, wrongClicks: 0 }); // il sorteggio non esiste più: Math.random non deve contare
console.log('0 errori:', clean.bonusButton ? 'bonus sbloccato' : 'NIENTE bonus', '|', clean.steps, '| platform visibile:', clean.platform);
if (!clean.bonusButton || !clean.platform || !/Bonus sbloccato/.test(clean.dialog)) problems.push('con 0 errori il bonus non si sblocca');

const played = await play({ random: 0.5, wrongClicks: 0, playBonus: true });
console.log('bonus giocato bene:', played.end);
if (!/Tempo!/.test(played.end)) problems.push('il bonus non finisce');
if (!/\+\d+ XP extra/.test(played.end)) problems.push('a fine bonus non si vedono gli XP extra guadagnati');

const clean2 = await play({ random: 0.1, wrongClicks: 0 });
if (!clean2.bonusButton) problems.push('con 0 errori il bonus dipende dal caso');

const one = await play({ random: 0.9, wrongClicks: 1 });
console.log('1 errore:', one.bonusButton ? 'bonus sbloccato (atteso)' : 'NIENTE bonus');
if (!one.bonusButton) problems.push('con 1 errore (consentito) il bonus non si sblocca');

const two = await play({ random: 0.1, wrongClicks: 2 });
console.log('2 errori:', two.bonusButton ? 'bonus sbloccato' : 'non sbloccato (atteso)', '|', two.dialog.match(/Bonus non sbloccato[^.]*\./)?.[0] ?? '(nessun messaggio)');
if (two.bonusButton) problems.push('con 2 errori il bonus si sblocca');
if (!/Bonus non sbloccato: hai fatto 2 errori, ne servono al massimo 1/.test(two.dialog)) problems.push('con 2 errori manca il messaggio «Bonus non sbloccato»');

await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: il bonus si sblocca con al massimo 1 errore, senza sorteggio.');
