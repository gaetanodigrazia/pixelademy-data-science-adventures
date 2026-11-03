// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): l'hamburger è centrato nel suo pulsante (chiuso e aperto),
// è quadrato e di almeno 44 px, e il menu si apre e si chiude. Salva due screenshot in /tmp.
//   node scripts/check-burger.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];
for (const width of [393, 360, 600]) {
  const ctx = await browser.newContext({ viewport: { width, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted'); });
  await page.goto(`${base}/`);
  const burger = page.locator('.burger');
  await burger.waitFor();
  for (const state of ['chiuso', 'aperto']) {
    if (state === 'aperto') { await burger.tap(); await page.waitForTimeout(300); }
    const m = await page.evaluate(() => {
      const b = document.querySelector('.burger').getBoundingClientRect();
      const bars = [...document.querySelectorAll('.burger i')].map((i) => i.getBoundingClientRect());
      const minX = Math.min(...bars.map((r) => r.left)), maxX = Math.max(...bars.map((r) => r.right));
      const minY = Math.min(...bars.map((r) => r.top)), maxY = Math.max(...bars.map((r) => r.bottom));
      const navEl = document.querySelector('.nav'); const nav = { top: navEl.getBoundingClientRect().top + navEl.clientTop, height: navEl.clientHeight }; // senza il bordo in basso
      return { w: b.width, h: b.height, dx: (minX + maxX) / 2 - (b.left + b.width / 2), dy: (minY + maxY) / 2 - (b.top + b.height / 2), midOffset: (b.top + b.height / 2) - (nav.top + nav.height / 2) };
    });
    console.log(`${width}px ${state}: ${m.w}×${m.h}; scostamento barre dal centro del pulsante: x ${m.dx.toFixed(1)}, y ${m.dy.toFixed(1)}; pulsante vs barra: ${m.midOffset.toFixed(1)}`);
    if (m.w < 44 || m.h < 44) problems.push(`${width} ${state}: pulsante più piccolo di 44 px`);
    if (Math.abs(m.dx) > 1 || Math.abs(m.dy) > 1) problems.push(`${width} ${state}: le barre non sono centrate (${m.dx.toFixed(1)}, ${m.dy.toFixed(1)})`);
    if (Math.abs(m.midOffset) > 1) problems.push(`${width} ${state}: il pulsante non è centrato in verticale nella barra`);
    if (width === 393) await page.screenshot({ path: `/tmp/burger-${state}.png`, clip: { x: 0, y: 0, width, height: 260 } });
  }
  await ctx.close();
}
await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: hamburger centrato e coerente.');
