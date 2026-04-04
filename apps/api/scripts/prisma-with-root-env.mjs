import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
try {
  require('dotenv').config({ path: resolve(apiRoot, '../../.env') });
} catch {
  /* optional: Railway/CI usan solo variables de entorno */
}

const localBin = resolve(apiRoot, 'node_modules/.bin/prisma');
const hoistedBin = resolve(apiRoot, '../../node_modules/.bin/prisma');
const prismaBin = existsSync(localBin) ? localBin : hoistedBin;

const args = process.argv.slice(2);
const r = spawnSync(prismaBin, args, {
  stdio: 'inherit',
  cwd: apiRoot,
  env: process.env,
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
