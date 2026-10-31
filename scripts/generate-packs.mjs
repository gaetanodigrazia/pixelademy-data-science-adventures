// Scopre automaticamente i pack in src/app/content/<pack-id>/pack.ts
// e genera src/app/core/data/packs.generated.ts (file generato, non committato).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src/app/content');
const outFile = join(root, 'src/app/core/data/packs.generated.ts');

const ids = readdirSync(contentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(contentDir, d.name, 'pack.ts')))
  .map((d) => d.name)
  .sort();

const imports = ids.map((id, i) => `import pack${i} from '../../content/${id}/pack';`);
const body = [
  '// GENERATO da scripts/generate-packs.mjs — non modificare a mano.',
  "import type { ContentPack } from '../models/content-pack.model';",
  ...imports,
  '',
  `export const PACKS: ContentPack[] = [${ids.map((_, i) => `pack${i}`).join(', ')}];`,
  '',
].join('\n');

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, body);
console.log(`packs: ${ids.length} pack trovati (${ids.join(', ')})`);
