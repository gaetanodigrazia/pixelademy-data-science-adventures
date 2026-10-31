// Scarica in public/pyodide i pacchetti Python extra (pandas e le sue dipendenze) dalla CDN ufficiale di Pyodide, verificando lo sha256
// del lock file: il sito li serve poi dal proprio dominio (e il Service Worker li tiene offline).
//   node scripts/fetch-pyodide-packages.mjs          scarica quelli che mancano (se la rete manca avvisa e prosegue)
//   node scripts/fetch-pyodide-packages.mjs --plan   stampa cosa servirebbe, senza rete
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WANTED = ['pandas'];
const lock = JSON.parse(readFileSync('node_modules/pyodide/pyodide-lock.json', 'utf8'));
const version = JSON.parse(readFileSync('node_modules/pyodide/package.json', 'utf8')).version;

/** I pacchetti richiesti con le loro dipendenze (in ordine di dipendenza). */
export function plan(names) {
  const seen = new Set();
  const out = [];
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = lock.packages[n];
    if (!p) throw new Error(`pacchetto sconosciuto nel lock file: ${n}`);
    (p.depends ?? []).forEach(visit);
    out.push({ name: n, file: p.file_name, sha256: p.sha256 });
  };
  names.forEach(visit);
  return out;
}

const packages = plan(WANTED);
if (process.argv.includes('--plan')) {
  console.log(JSON.stringify({ version, packages }));
  process.exit(0);
}

const dir = 'public/pyodide';
mkdirSync(dir, { recursive: true });
let failed = 0;
for (const p of packages) {
  const target = join(dir, p.file);
  if (existsSync(target) && createHash('sha256').update(readFileSync(target)).digest('hex') === p.sha256) continue;
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${p.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== p.sha256) throw new Error('sha256 diverso da quello del lock file');
    writeFileSync(target, buf);
    console.log(`pyodide: ${p.file} (${(buf.length / 1048576).toFixed(1)} MB)`);
  } catch (e) {
    failed++;
    console.warn(`pyodide: ${p.file} non scaricato (${e.message}): le sfide con pandas non funzioneranno finché non c'è.`);
  }
}
console.log(`pyodide: ${packages.length - failed}/${packages.length} pacchetti extra pronti in ${dir}`);
