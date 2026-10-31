// Controllo del layout a viewport da telefono (opzionale, non fa parte della CI: richiede Playwright con Chromium).
//   1. npm start            (in un altro terminale)
//   2. node scripts/check-responsive.mjs [http://localhost:4200]
// Verifica, a 360×640 con puntatore touch: nessuno scroll orizzontale, modali dentro lo schermo, bersagli toccabili ≥ 44 px.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright non è installato: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const base = process.argv[2] ?? 'http://localhost:4200';
const MIN = 44;
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const problems = [];

async function check(name) {
  const r = await page.evaluate((min) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const visible = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    // i link dentro un paragrafo o una lista sono esenti (WCAG 2.5.8, eccezione «inline»)
    const small = [...document.querySelectorAll('button, a[href], input, [role=button]')].filter(visible).filter((e) => !(e.tagName === 'A' && e.closest('p, li')))
      .filter((e) => { const b = e.getBoundingClientRect(); return b.height < min || b.width < min; })
      .map((e) => `${e.tagName.toLowerCase()} «${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28)}» ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
    const d = document.querySelector('[role=dialog]');
    const b = d?.getBoundingClientRect();
    return {
      hscroll: document.documentElement.scrollWidth - vw,
      dialogOut: b ? (b.bottom > vh + 1 || b.right > vw + 1 || b.top < -1 || b.left < -1) : false,
      small,
    };
  }, MIN);
  if (r.hscroll > 0) problems.push(`${name}: scroll orizzontale di ${r.hscroll}px`);
  if (r.dialogOut) problems.push(`${name}: la modale esce dallo schermo`);
  for (const s of r.small) problems.push(`${name}: bersaglio piccolo → ${s}`);
}

await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.goto(base);
await page.waitForSelector('app-navbar');
await check('home');
// La mappa su telefono: larga quanto lo schermo, blocchi ≥ 44 px e un tocco su un blocco funziona.
const map = await page.evaluate(() => {
  const c = document.querySelector('app-world-map canvas');
  const b = c.getBoundingClientRect();
  return { w: b.width, h: b.height, left: b.left, top: b.top, logicalW: c.width, logicalH: c.height };
});
if (map.w < 300) problems.push(`mappa: troppo stretta (${Math.round(map.w)} px)`);
const nodePx = (56 * map.w) / map.logicalW;
if (nodePx < MIN) problems.push(`mappa: blocchi di ${Math.round(nodePx)} px (< ${MIN})`);
console.log(`mappa: ${Math.round(map.w)}×${Math.round(map.h)} px, blocchi di ${Math.round(nodePx)} px`);
await page.mouse.click(map.left + (map.w * 100) / map.logicalW + 30, map.top + 4 + ((map.h - 8) * 120) / map.logicalH); // tocco a 30 px dal centro del blocco 1
await page.waitForURL(/\/missione\//, { timeout: 5000 }).catch(() => problems.push('mappa: il tocco sul blocco 1 non apre la missione'));
await page.goto(base);
await page.waitForSelector('app-world-map canvas');
await page.click('button:has-text("Cambia / cerca")');
await check('catalogo percorsi');
await page.keyboard.press('Escape');
await page.click('button:has-text("Privacy e dati"), button[aria-label="Apri menu"]').catch(() => undefined);
await page.goto(`${base}/info`);
await page.waitForTimeout(300);
await check('info');
await page.goto(`${base}/`);
await page.click('app-mission-card a');
await page.waitForSelector('[role=dialog]');
await check('missione: presentazione');
await page.click('button:has-text("Comincia")');
await check('missione: teoria');
await page.click('button:has-text("Salta la teoria")');
await page.waitForTimeout(300);
await check('missione: battaglia');
// Dashboard con il progetto completo (stato salvato come lo scriverebbe l'app)
await page.evaluate(() => {
  const ids = Array.from({ length: 10 }, (_, i) => `adventure-core-nuvole-${String(i + 1).padStart(2, '0')}`);
  localStorage.setItem('pixelademy.consent.v1', 'granted');
  localStorage.setItem('pixelademy.player.v1', JSON.stringify({ xp: 900, level: 5, completedMissionIds: ids, solvedCode: {}, liked: false, selectedPathId: 'adventure-core-nuvole', selectedCharacterId: 'adventure-core-aura' }));
});
await page.goto(`${base}/progetto/adventure-core-nuvole`);
await page.waitForSelector('app-bar-chart');
await check('dashboard del progetto');
await browser.close();

if (problems.length) {
  console.log(`${problems.length} problemi:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Layout mobile: nessun problema.');
