// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): la «Corsa dei condizionali» di «Le Liste» si gioca fino al traguardo
// (rispondendo giusto leggendo la condizione) su telefono e su desktop, e il task resta raggiungibile.
// Il bonus compare a caso dopo una buona battaglia: qui si salta la battaglia impostando direttamente la fase «corsa» e il sorteggio riuscito.
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-runner.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];

/** Valuta la condizione mostrata (`prezzi[3] < 6`, `len(carrello) > 4`) sul codice mostrato sopra. */
const truth = (code, cond) => {
  const state = { list: JSON.parse(code[0].replace(/^\w+ = /, '')) };
  if (code[1]) { const m = /append\((\d+)\)/.exec(code[1]); if (m) state.list.push(+m[1]); else state.list.pop(); }
  let m;
  if ((m = /^len\(\w+\) (>|==) (\d+)$/.exec(cond))) return m[1] === '>' ? state.list.length > +m[2] : state.list.length === +m[2];
  m = /^\w+\[(-?\d+)\] (>=|<=|>|<) (\d+(?:\.\d+)?)$/.exec(cond);
  const i = +m[1]; const x = state.list[i < 0 ? state.list.length + i : i]; const t = +m[3];
  return { '>': x > t, '<': x < t, '>=': x >= t, '<=': x <= t }[m[2]];
};

for (const [name, vp, mobile] of [['telefono', { width: 393, height: 852 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
  for (const mission of ['liste-01', 'liste-02', 'liste-03']) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base);
    await page.evaluate((id) => {
      localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted');
      localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 0, level: 1, completedMissionIds: ['adventure-core-variabili-01', 'adventure-core-variabili-02'], solvedCode: {}, liked: false, records: {}, selectedPathId: 'adventure-core-liste', selectedCharacterId: 'adventure-core-teo' }));
      sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [`adventure-core-${id}`]: 'corsa' }));
      sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ [`adventure-core-${id}`]: true }));
      sessionStorage.setItem('pixelademy.intro.v1', '1');
    }, mission);
    // le missioni 2 e 3 richiedono la precedente: segniamola completata
    if (mission !== 'liste-01') {
      await page.evaluate((id) => {
        const s = JSON.parse(localStorage.getItem('pixelademy.player.v1'));
        s.completedMissionIds.push('adventure-core-liste-01'); if (id === 'liste-03') s.completedMissionIds.push('adventure-core-liste-02');
        localStorage.setItem('pixelademy.player.v1', JSON.stringify(s));
      }, mission);
    }
    await page.goto(`${base}/missione/adventure-core-${mission}`);
    const start = page.locator('button:has-text("Comincia")');
    if (await start.count()) await start.click();
    await page.waitForSelector('app-runner', { timeout: 10000 });
    for (let i = 0; i < 30; i++) {
      if (await page.locator('.end').count()) break; // traguardo
      await page.waitForSelector('.obstacle code', { timeout: 4000 });
      const code = await page.locator('.code code').allInnerTexts();
      const cond = (await page.locator('.obstacle code').innerText()).trim();
      const jump = truth(code.map((c) => c.replace(/\s+#.*$/, '')), cond);
      await page.locator('.row button').nth(jump ? 0 : 1).click();
      await page.waitForTimeout(1000);
      if (i === 4 && mission === 'liste-01' && name === 'telefono') await page.screenshot({ path: '/tmp/run-meta.png' });
    }
    const text = await page.locator('app-runner').innerText();
    const ok = /Errori 0/.test(text) && text.includes('Traguardo');
    if (mission === 'liste-01' && name === 'telefono') await page.screenshot({ path: '/tmp/run-fine.png' });
    console.log(`${name} ${mission}: ${ok ? 'OK' : 'PROBLEMA'} — ${text.replace(/\n/g, ' ').match(/Punti \d+ · Errori \d+/)?.[0]}`);
    if (!ok) problems.push(`${name} ${mission}: la corsa non finisce senza errori`);
    await page.locator('button:has-text("Vai al task")').click();
    await page.waitForSelector('section[aria-label="Task Python"]', { timeout: 5000 }).catch(() => problems.push(`${name} ${mission}: il task non si apre`));
    if (errs.length) problems.push(`${name} ${mission}: errori di pagina ${errs[0]}`);
    await ctx.close();
  }
}
await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: la corsa si gioca fino al traguardo e porta al task.');
