// Unggah seluruh folder model MMD di public/models/mmd/ ke Cloudflare R2 bucket "cellbound-model"
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BUCKET = process.env.R2_BUCKET || 'cellbound-model';
const ROOT = path.resolve('public/models/mmd');
const SKIP_FILES = new Set(['README.txt', 'characters.json']);

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

if (!fs.existsSync(ROOT)) {
  console.error('Folder tidak ditemukan:', ROOT);
  process.exit(1);
}

const files = walk(ROOT);
console.log(`Mengunggah ${files.length} berkas MMD ke R2 bucket "${BUCKET}"...`);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let ok = 0;
for (let i = 0; i < files.length; i++) {
  const { full, rel } = files[i];
  const target = `${BUCKET}/${rel}`;
  process.stdout.write(`[${i + 1}/${files.length}] ${rel} ... `);
  execFileSync(npx, ['wrangler', 'r2', 'object', 'put', target, '--file', full, '--remote'], {
    stdio: 'pipe',
  });
  ok++;
  console.log('OK');
}
console.log(`Selesai! ${ok}/${files.length} berkas berhasil diunggah ke R2 "${BUCKET}".`);
