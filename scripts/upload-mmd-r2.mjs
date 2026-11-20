// Unggah seluruh folder model MMD di public/models/mmd/ ke Cloudflare R2 bucket "cellbound-model"
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BUCKET = process.env.R2_BUCKET || 'cellbound-model';
const ROOT = path.resolve('public/models/mmd');
const WRANGLER_BIN = path.resolve('node_modules/wrangler/bin/wrangler.js');
const SKIP_FILES = new Set(['README.txt', 'characters.json']);
const CONCURRENCY = 6;

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (ent.isFile()) {
      const rel = path.relative(ROOT, full).replace(/\\/g, '/');
      if (SKIP_FILES.has(rel) || /\.zip$/i.test(ent.name)) continue;
      out.push({ full, rel });
    }
  }
  return out;
}

function uploadOne(file) {
  return new Promise((resolve, reject) => {
    const target = `${BUCKET}/${file.rel}`;
    const args = ['r2', 'object', 'put', target, '--file', file.full, '--remote'];
    const child = fs.existsSync(WRANGLER_BIN)
      ? spawn(process.execPath, [WRANGLER_BIN, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
      : spawn(`npx wrangler r2 object put "${target}" --file "${file.full}" --remote`, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';
    child.stderr.on('data', (d) => { errBuf += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Gagal (${code}) ${file.rel}: ${errBuf.trim()}`));
    });
  });
}

if (!fs.existsSync(ROOT)) {
  console.error('Folder tidak ditemukan:', ROOT);
  process.exit(1);
}

const files = walk(ROOT);
console.log(`Mengunggah ${files.length} berkas MMD ke R2 bucket "${BUCKET}" (${CONCURRENCY} paralel)...`);

let nextIdx = 0;
let done = 0;
const failed = [];

async function worker() {
  while (nextIdx < files.length) {
    const idx = nextIdx++;
    const f = files[idx];
    try {
      await uploadOne(f);
      done++;
      if (done % 10 === 0 || done === files.length || /\.(pmx|pmd)$/i.test(f.rel)) {
        console.log(`[${done}/${files.length}] OK: ${f.rel}`);
      }
    } catch (e) {
      failed.push(f.rel);
      console.error(e.message);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker()));
console.log(`Selesai! ${done}/${files.length} berkas berhasil diunggah ke R2 "${BUCKET}".`);
if (failed.length) {
  console.error('Gagal:', failed.length, failed);
  process.exit(1);
}
