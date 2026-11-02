// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): il bonus platform parte, scorre per 15 secondi con i tocchi/tasti
// e finisce con il punteggio; poi si passa al task. Il «bot» legge le monete dall'annuncio per lo screen reader (aria-live).
//   npm run build && npx http-server dist/pixelademy/browser -p 4300 -s -P "http://localhost:4300?"
//   node scripts/check-platformer.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];

for (const [name, vp, mobile] of [['telefono', { width: 393, height: 852 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
  // una missione per tipo di moneta: indice, pop, len, dizionario (nuvole-07), somma, media, minimo/massimo, confronto
  for (const mission of ['liste-01', 'liste-02', 'liste-03', 'nuvole-07', 'nuvole-04', 'statistica-01', 'energia-03', 'outlier-02']) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base);
    await page.evaluate((id) => {
      localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted');
      const done = ['adventure-core-variabili-01', 'adventure-core-variabili-02', 'adventure-core-liste-01', 'adventure-core-liste-02', 'adventure-core-liste-03'];
      // le missioni precedenti dello stesso percorso (anche «Le Liste»: la missione stessa resta da fare)
      const [slug, n] = [id.slice(0, id.lastIndexOf('-')), +id.slice(id.lastIndexOf('-') + 1)];
      for (let i = 1; i < n; i++) done.push(`adventure-core-${slug}-${String(i).padStart(2, '0')}`);
      if (slug === 'liste') done.splice(done.indexOf(`adventure-core-liste-${String(n).padStart(2, '0')}`), 3);
      localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 0, level: 1, completedMissionIds: done, solvedCode: {}, liked: false, records: {}, selectedPathId: `adventure-core-${id.slice(0, id.lastIndexOf('-'))}`, selectedCharacterId: 'adventure-core-teo' }));
      sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ [`adventure-core-${id}`]: 'corsa' }));
      sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ [`adventure-core-${id}`]: true }));
      sessionStorage.setItem('pixelademy.intro.v1', '1');
    }, mission);
    await page.goto(`${base}/missione/adventure-core-${mission}`);
    const start = page.locator('button:has-text("Comincia")');
    if (await start.count()) await start.click();
    await page.waitForSelector('app-platformer canvas', { timeout: 10000 });
    const box = await page.locator('app-platformer canvas').boundingBox();
    if (!box || box.width < 200) problems.push(`${name} ${mission}: canvas troppo piccolo`);
    await page.locator('button:has-text("Via!")').click();
    const t0 = Date.now();
    let announced = 0, jumps = 0, last = '';
    while (!(await page.locator('app-platformer .end').count()) && Date.now() - t0 < 25000) {
      const txt = (await page.locator('app-platformer .sr').innerText()).trim();
      if (txt && txt !== last) { last = txt; announced++; }
      // salta ogni ~900 ms in modo non banale, con tasto o con tocco
      if ((Date.now() - t0) % 900 < 120) { jumps++; if (mobile) await page.touchscreen.tap(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)); else await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150); }
      await page.waitForTimeout(40);
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const text = (await page.locator('app-platformer').innerText()).replace(/\n/g, ' ');
    const ended = /Tempo!/.test(text);
    console.log(`${name} ${mission}: ${ended ? 'OK' : 'PROBLEMA'} (${secs} s, ${announced} monete annunciate, ${jumps} salti) — ${text.match(/Tempo! \d+ punti/)?.[0] ?? '?'}`);
    if (name === 'telefono') await page.screenshot({ path: `/tmp/plat-${mission}.png` });
    if (!ended || secs < 14 || secs > 20 || announced < 5) problems.push(`${name} ${mission}: la corsa non va come previsto`);
    await page.locator('button:has-text("Vai al task")').click().catch(() => page.locator('button:has-text("Salta il bonus")').click());
    await page.waitForSelector('section[aria-label="Task Python"]', { timeout: 5000 }).catch(() => problems.push(`${name} ${mission}: il task non si apre`));
    if (errs.length) problems.push(`${name} ${mission}: errori di pagina ${errs[0]}`);
    await ctx.close();
  }
}

// pausa: a metà corsa si ferma il tempo, un tocco sull'area non riprende, «Riprendi» sì
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted');
    localStorage.setItem('pixelademy.player.v1', JSON.stringify({ schemaVersion: 5, xp: 0, level: 1, completedMissionIds: ['adventure-core-variabili-01', 'adventure-core-variabili-02'], solvedCode: {}, liked: false, records: {}, selectedPathId: 'adventure-core-liste', selectedCharacterId: 'adventure-core-teo' }));
    sessionStorage.setItem('pixelademy.phase.v1', JSON.stringify({ 'adventure-core-liste-01': 'corsa' }));
    sessionStorage.setItem('pixelademy.bonus.v1', JSON.stringify({ 'adventure-core-liste-01': true }));
    sessionStorage.setItem('pixelademy.intro.v1', '1');
  });
  await page.goto(`${base}/missione/adventure-core-liste-01`);
  await page.waitForSelector('app-platformer canvas');
  await page.locator('button:has-text("Via!")').click();
  await page.waitForTimeout(3000);
  await page.locator('button.pause').click();
  const read = async () => +(await page.locator('app-platformer .stats b').first().innerText());
  const t1 = await read();
  await page.waitForTimeout(3000);
  const t2 = await read();
  console.log(`pausa: secondi rimasti ${t1} → ${t2} dopo 3 s di pausa`);
  if (t1 !== t2) problems.push('in pausa il tempo scorre');
  const box = await page.locator('app-platformer canvas').boundingBox();
  await page.touchscreen.tap(Math.round(box.x + 40), Math.round(box.y + 40)); // un tocco sull'area
  if (!(await page.locator('app-platformer .veil:has-text("In pausa")').count())) problems.push('un tocco sull\'area ha ripreso il gioco');
  await page.locator('.veil button:has-text("Riprendi")').click();
  await page.waitForTimeout(2200);
  const t3 = await read();
  console.log(`ripresa: secondi rimasti ${t2} → ${t3} dopo 2 s`);
  if (!(t3 < t2)) problems.push('dopo «Riprendi» il tempo non scorre');
  await ctx.close();
}
await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: il bonus platform si gioca per 15 secondi, si mette in pausa e porta al task.');
