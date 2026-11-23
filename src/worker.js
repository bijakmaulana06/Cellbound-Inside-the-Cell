import { GameServer } from './game-server.js';

export { GameServer };

const DEFAULT_CELLCY = {
  id: 'cellcy-default',
  name: 'Cellcy',
  subtitle: 'Karakter Bawaan · FBX Rig',
  type: 'fbx',
  format: 'FBX',
  icon: '🚀',
  url: 'models/cellcy_full_rigged.fbx',
  parts: [
    'models/cellcy_full_rigged.fbx.part0',
    'models/cellcy_full_rigged.fbx.part1',
  ],
  builtin: true,
};

const BUILTIN_CHARS = [
  DEFAULT_CELLCY,
  {
    id: 'nucleo-lp',
    name: 'Nucleo',
    subtitle: 'Karakter Robot · FBX Rig',
    type: 'fbx',
    format: 'FBX',
    icon: '🤖',
    url: 'models/Nucleo_Complete.fbx',
    parts: [
      'models/Nucleo_Complete.fbx.part0',
      'models/Nucleo_Complete.fbx.part1',
      'models/Nucleo_Complete.fbx.part2',
      'models/Nucleo_Complete.fbx.part3',
    ],
    builtin: true,
  },
];

const MIME_BY_EXT = {
  '.pmx': 'application/octet-stream',
  '.pmd': 'application/octet-stream',
  '.vmd': 'application/octet-stream',
  '.vpd': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tga': 'application/octet-stream',
  '.spa': 'application/octet-stream',
  '.sph': 'application/octet-stream',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function encodeKeyPath(key) {
  return key
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function getContentType(key) {
  const m = key.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return (m && MIME_BY_EXT[m[1]]) || 'application/octet-stream';
}

async function listAllR2Keys(bucket) {
  const keys = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const res = await bucket.list({ cursor, limit: 1000 });
    for (const obj of res.objects || []) keys.push(obj.key);
    if (!res.truncated || !res.cursor) break;
    cursor = res.cursor;
  }
  return keys;
}

async function handleApiCharacters(env) {
  if (!env.MMD_BUCKET) return null;
  try {
    const keys = await listAllR2Keys(env.MMD_BUCKET);
    const byDir = new Map();
    for (const key of keys) {
      if (!key || key.endsWith('/')) continue;
      const idx = key.lastIndexOf('/');
      const dir = idx >= 0 ? key.slice(0, idx) : '';
      const file = idx >= 0 ? key.slice(idx + 1) : key;
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir).push({ key, file });
    }

    const found = [];
    for (const [dir, entries] of byDir.entries()) {
      const pmxEntries = entries.filter((e) => /\.(pmx|pmd)$/i.test(e.file));
      if (!pmxEntries.length) continue;

      const thumbEntry =
        entries.find((e) => /^(preview|thumb|icon|cover)\.(png|jpe?g|webp)$/i.test(e.file)) ||
        entries.find((e) => /\.(png|jpe?g|webp)$/i.test(e.file) && !/(toon|spa|sph|normal|bump|mask|alpha|shadow)/i.test(e.file));

      for (const e of pmxEntries) {
        const base = e.file.replace(/\.(pmx|pmd)$/i, '');
        const folderName = dir ? dir.split('/').pop() : '';
        const displayName =
          pmxEntries.length === 1 && folderName && /^(model|mesh|character|main|index)$/i.test(base)
            ? folderName
            : base;
        found.push({
          id: 'mmd:' + e.key,
          name: displayName,
          subtitle: dir ? `MMD · ${dir}` : 'MMD · R2 Storage',
          type: 'mmd',
          format: e.file.toLowerCase().endsWith('.pmd') ? 'PMD' : 'PMX',
          url: 'models/mmd/' + encodeKeyPath(e.key),
          thumb: thumbEntry ? 'models/mmd/' + encodeKeyPath(thumbEntry.key) : null,
        });
      }
    }

    found.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return new Response(
      JSON.stringify({ dir: 'r2://cellbound-model', characters: [...BUILTIN_CHARS, ...found] }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('R2 list error:', err);
    return null;
  }
}

async function handleR2Asset(request, env, rawPath) {
  if (!env.MMD_BUCKET) return null;
  let key;
  try {
    key = decodeURIComponent(rawPath).replace(/\\/g, '/').replace(/^\/+/, '');
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!key || key.includes('..') || key === 'README.txt' || key === 'characters.json') {
    return null;
  }

  let obj = request.method === 'HEAD'
    ? await env.MMD_BUCKET.head(key)
    : await env.MMD_BUCKET.get(key);

  // Fallback case-insensitive: file .pmx buatan Windows sering berbeda huruf besar/kecil (mis. .PNG vs .png, Tex/ vs tex/)
  if (!obj) {
    const slash = key.indexOf('/');
    const prefix = slash > 0 ? key.slice(0, slash + 1) : '';
    const wantLower = key.toLowerCase();
    let cursor;
    let matchedKey = null;
    for (let page = 0; page < 10 && !matchedKey; page++) {
      const res = await env.MMD_BUCKET.list({ prefix, cursor, limit: 1000 });
      for (const o of res.objects || []) {
        if (o.key.toLowerCase() === wantLower) { matchedKey = o.key; break; }
      }
      if (!res.truncated || !res.cursor) break;
      cursor = res.cursor;
    }
    if (matchedKey) {
      obj = request.method === 'HEAD'
        ? await env.MMD_BUCKET.head(matchedKey)
        : await env.MMD_BUCKET.get(matchedKey);
    }
  }
  if (!obj) return null;

  const headers = new Headers();
  if (typeof obj.writeHttpMetadata === 'function') obj.writeHttpMetadata(headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', getContentType(key));
  if (obj.size !== undefined) headers.set('Content-Length', String(obj.size));
  if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    // 1. WebSocket Upgrade: alihkan ke Durable Object
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      if (!env.GAME) {
        return new Response('Durable Object binding GAME tidak ditemukan.', { status: 500 });
      }
      const id = env.GAME.idFromName('global-lobby');
      const stub = env.GAME.get(id);
      return stub.fetch(request);
    }

    // 2. API daftar karakter dinamis dari Cloudflare R2 (bucket cellbound-model)
    if (url.pathname === '/api/characters') {
      const r2Resp = await handleApiCharacters(env);
      if (r2Resp) return r2Resp;
      const fallbackUrl = new URL(request.url);
      fallbackUrl.pathname = '/models/mmd/characters.json';
      return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
    }

    // 3. Layani model & tekstur MMD langsung dari Cloudflare R2 (/models/mmd/*)
    if (url.pathname.startsWith('/models/mmd/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const r2Asset = await handleR2Asset(request, env, url.pathname.slice('/models/mmd/'.length));
      if (r2Asset) return r2Asset;
    }

    // 4. Pemetaan rute halaman
    let targetPath = url.pathname;
    if (targetPath === '/' || targetPath === '') {
      targetPath = '/home.html';
    } else if (targetPath === '/play') {
      targetPath = '/index.html';
    } else if (targetPath === '/guru') {
      targetPath = '/teacher.html';
    }

    // 5. Layani aset statis dari folder public
    if (targetPath !== url.pathname) {
      const targetUrl = new URL(request.url);
      targetUrl.pathname = targetPath;
      return env.ASSETS.fetch(new Request(targetUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
