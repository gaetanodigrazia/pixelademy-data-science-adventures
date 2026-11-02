// Prova nel browser sulla BUILD DI PRODUZIONE (opzionale, non in CI): in fondo alla home resta uno spazio libero (≥ 64 px),
// così il badge di Netlify (fisso, in basso a destra) non copre «Cerca eroi». Vale su desktop e su telefono.
//   node scripts/check-home-bottom.mjs [http://localhost:4300]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:4300';
const browser = await chromium.launch();
const problems = [];
for (const [name, vp, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['desktop basso', { width: 1280, height: 650 }, false], ['telefono', { width: 393, height: 852 }, true]]) {
  const page = await (await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile })).newPage();
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pixelademy.consent.v1', 'granted'); });
  await page.goto(`${base}/`);
  await page.waitForSelector('button:has-text("Cerca eroi")');
  const btn = page.locator('button:has-text("Cerca eroi")');
  await btn.scrollIntoViewIfNeeded();
  const b = await btn.boundingBox();
  const free = vp.height - (b.y + b.height);
  console.log(`${name}: «Cerca eroi» finisce a ${Math.round(b.y + b.height)} px su ${vp.height}: spazio libero ${Math.round(free)} px`);
  if (free < 64) problems.push(`${name}: sotto «Cerca eroi» restano solo ${Math.round(free)} px`);
}
await browser.close();
if (problems.length) { console.log(`PROBLEMI:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('OK: in fondo alla home c\'è spazio per il badge.');
