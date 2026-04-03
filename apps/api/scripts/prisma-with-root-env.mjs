import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(apiRoot, '../../.env') });

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
