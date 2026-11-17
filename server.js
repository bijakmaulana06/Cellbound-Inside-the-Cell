import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  GAME_CONFIG,
  ORGANELLES,
  QUESTION_BANK,
  PLAYER_COLORS,
} from './src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = +process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
};

// HTTP Server untuk menyajikan file statis
const srv = http.createServer((req, res) => {
  let u;
  try {
    u = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  // Routing halaman
  if (u === '/') u = '/home.html';
  if (u === '/play') u = '/index.html';
  if (u === '/guru') u = '/teacher.html';

  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB + path.sep)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  fs.readFile(f, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('404 Not Found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// Manajemen Room WebSocket
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[(Math.random() * chars.length) | 0]).join('');
  } while (rooms.has(code));
  return code;
}

function sendJson(ws, obj) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastToPlayers(room, obj, skipWs = null) {
  const payload = JSON.stringify(obj);
  for (const player of room.players.values()) {
    if (player.ws !== skipWs && player.ws.readyState === 1) {
      player.ws.send(payload);
    }
  }
}

function sendToHost(room, obj) {
  if (room && room.host) {
    sendJson(room.host, obj);
  }
}

function getBoard(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    found: p.found.size,
    score: p.score,
  }));
}

function syncRoom(room) {
  const board = getBoard(room);
  broadcastToPlayers(room, { t: 'board', board });
  sendToHost(room, { t: 'board', board });
}

function nextQuestion(room) {
  room.tn = null;
  room.qi++;

  if (room.qi >= room.order.length) {
    return finishQuiz(room);
  }

  const q = room.order[room.qi];
  room.qOpen = true;
  room.qStart = Date.now();
  room.res = new Map();
  room.firstRight = false;

  for (const p of room.players.values()) {
    p.answered = false;
  }

  const msg = {
    t: 'q',
    i: room.qi,
    n: room.order.length,
    text: q[0],
    dur: GAME_CONFIG.QUIZ_DURATION_SEC,
  };

  broadcastToPlayers(room, msg);
  sendToHost(room, { ...msg, a: q[1] });

  room.tm = setTimeout(
    () => closeQuestion(room),
    GAME_CONFIG.QUIZ_DURATION_SEC * 1000 + 500
  );
}

function closeQuestion(room) {
  if (!room.qOpen) return;
  room.qOpen = false;
  clearTimeout(room.tm);

  const q = room.order[room.qi];
  let right = 0;
  let answered = 0;

  for (const p of room.players.values()) {
    if (p.answered) answered++;
  }
  for (const gain of room.res.values()) {
    if (gain > 0) right++;
  }

  const stat = {
    i: room.qi,
    text: q[0],
    a: q[1],
    right,
    answered,
    total: room.players.size,
  };
  room.stats.push(stat);

  const msg = {
    t: 'qres',
    i: room.qi,
    correct: q[1],
    gain: Object.fromEntries(room.res),
    board: getBoard(room),
  };

  broadcastToPlayers(room, msg);
  sendToHost(room, { ...msg, stat });

  room.tn = setTimeout(() => nextQuestion(room), 4000);
}

function finishQuiz(room) {
  clearTimeout(room.tm);
  clearTimeout(room.tn);
  room.mode = 'lobby';
  room.qOpen = false;

  const board = getBoard(room);
  broadcastToPlayers(room, { t: 'final', board });
  sendToHost(room, { t: 'final', board, stats: room.stats });
}

// WebSocket Server
const wss = new WebSocketServer({ server: srv, maxPayload: 2048 });
wss.on('error', () => {});

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => {
    ws.alive = true;
  });
  ws.lastPos = 0;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!msg || typeof msg.t !== 'string') return;

    const r = ws.room;
    const p = ws.player;

    switch (msg.t) {
      case 'host': {
        const inputCode = String(msg.code || '').toUpperCase().trim();
        let room = rooms.get(inputCode);

        if (room && (!room.host || room.host.readyState !== 1)) {
          room.host = ws;
        } else {
          const code = generateCode();
          room = {
            code,
            host: ws,
            players: new Map(),
            mode: 'lobby',
            order: [],
            stats: [],
            qi: -1,
            qOpen: false,
            nid: 1,
            dirty: false,
            t0: Date.now(),
          };
          rooms.set(code, room);
        }

        ws.room = room;
        ws.role = 'host';
        sendJson(ws, {
          t: 'hosted',
          code: room.code,
          board: getBoard(room),
          mode: room.mode,
          stats: room.stats,
        });
        break;
      }

      case 'join': {
        const code = String(msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return sendJson(ws, { t: 'err', m: 'Kode kelas tidak ditemukan.' });
        }
        if (room.players.size >= GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
          return sendJson(ws, { t: 'err', m: 'Kelas penuh.' });
        }

        const name =
          String(msg.name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'Siswa';
        const id = room.nid++;
        const color = PLAYER_COLORS[id % PLAYER_COLORS.length];

        const pl = {
          id,
          name,
          color,
          x: -4,
          z: 10,
          found: new Set(),
          score: 0,
          answered: false,
          ws,
        };

        room.players.set(id, pl);
        ws.room = room;
        ws.player = pl;
        ws.role = 'player';

        sendJson(ws, {
          t: 'joined',
          id,
          color: pl.color,
          code: room.code,
          mode: room.mode,
          players: [...room.players.values()]
            .filter((q) => q !== pl)
            .map((q) => ({
              id: q.id,
              name: q.name,
              color: q.color,
              x: q.x,
              z: q.z,
            })),
          board: getBoard(room),
        });

        broadcastToPlayers(
          room,
          {
            t: 'peer',
            id,
            name,
            color: pl.color,
            x: pl.x,
            z: pl.z,
          },
          ws
        );

        syncRoom(room);
        break;
      }

      case 'pos': {
        if (!p) return;
        const now = Date.now();
        if (now - ws.lastPos < GAME_CONFIG.POSITION_THROTTLE_MS) return;
        ws.lastPos = now;

        let x = +msg.x;
        let z = +msg.z;
        if (!isFinite(x) || !isFinite(z)) return;

        const e =
          (x / GAME_CONFIG.BOUNDS.X_RADIUS) ** 2 +
          (z / GAME_CONFIG.BOUNDS.Z_RADIUS) ** 2;

        if (e > 1) {
          const s = 1 / Math.sqrt(e);
          x *= s;
          z *= s;
        }

        p.x = x;
        p.z = z;
        r.dirty = true;
        break;
      }

      case 'found': {
        if (!p || !ORGANELLES.includes(msg.id) || p.found.has(msg.id)) return;
        p.found.add(msg.id);
        syncRoom(r);
        break;
      }

      case 'emo': {
        if (!p) return;
        const i = msg.i | 0;
        if (i < 0 || i > 3) return;
        broadcastToPlayers(r, { t: 'emote', id: p.id, i });
        break;
      }

      case 'ans': {
        if (!p || !r.qOpen || msg.i !== r.qi || p.answered) return;
        p.answered = true;

        const q = r.order[r.qi];
        const ok = msg.id === q[1];
        let gain = 0;

        if (ok) {
          const elapsed = Date.now() - r.qStart;
          const timeLeft = Math.max(0, GAME_CONFIG.QUIZ_DURATION_SEC * 1000 - elapsed);
          gain = 100 + Math.round(timeLeft / 200);

          if (!r.firstRight) {
            r.firstRight = true;
            gain += 50;
          }
        }

        p.score += gain;
        r.res.set(p.id, gain);
        sendJson(ws, { t: 'ack', i: r.qi });

        if ([...r.players.values()].every((q) => q.answered)) {
          closeQuestion(r);
        }
        break;
      }

      case 'start': {
        if (ws.role !== 'host' || !r || r.mode === 'quiz') return;
        if (!r.players.size) {
          return sendJson(ws, { t: 'err', m: 'Belum ada siswa di kelas.' });
        }

        r.order = QUESTION_BANK.slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);
        r.stats = [];
        r.qi = -1;
        r.mode = 'quiz';

        for (const q of r.players.values()) {
          q.score = 0;
        }

        syncRoom(r);
        broadcastToPlayers(r, { t: 'mode', mode: 'quiz' });
        sendToHost(r, { t: 'mode', mode: 'quiz' });
        nextQuestion(r);
        break;
      }

      case 'stop': {
        if (ws.role !== 'host' || !r || r.mode !== 'quiz') return;
        finishQuiz(r);
        break;
      }

      case 'reset': {
        if (ws.role !== 'host' || !r) return;
        for (const q of r.players.values()) {
          q.score = 0;
        }
        syncRoom(r);
        break;
      }
    }
  });

  ws.on('close', () => {
    const r = ws.room;
    if (!r) return;

    if (ws.role === 'host') {
      if (r.host === ws) r.host = null;
    } else if (ws.player) {
      r.players.delete(ws.player.id);
      broadcastToPlayers(r, { t: 'left', id: ws.player.id });
      syncRoom(r);

      if (r.qOpen && r.players.size && [...r.players.values()].every((q) => q.answered)) {
        closeQuestion(r);
      }
    }
  });
});

// Broadcast snapshot posisi pemain secara berkala (10 Hz)
setInterval(() => {
  for (const r of rooms.values()) {
    if (!r.dirty || !r.players.size) continue;
    r.dirty = false;
    broadcastToPlayers(r, {
      t: 'snap',
      p: [...r.players.values()].map((q) => [q.id, +q.x.toFixed(2), +q.z.toFixed(2)]),
    });
  }
}, GAME_CONFIG.TICK_INTERVAL_MS);

// Pembersihan koneksi mati & room kadaluwarsa
setInterval(() => {
  for (const w of wss.clients) {
    if (!w.alive) {
      w.terminate();
    } else {
      w.alive = false;
      w.ping();
    }
  }

  const now = Date.now();
  for (const [code, r] of rooms) {
    if ((!r.host || r.host.readyState !== 1) && !r.players.size && now - r.t0 > GAME_CONFIG.ROOM_MAX_IDLE_MS) {
      rooms.delete(code);
    }
  }
}, GAME_CONFIG.CLEANUP_INTERVAL_MS);

// Menjalankan server
let port = PORT;
let tries = 0;

srv.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && tries < 30) {
    console.log(`Port ${port} sedang dipakai, mencoba ${port + 1}...`);
    tries++;
    port++;
    setTimeout(() => srv.listen(port), 50);
  } else {
    console.error(e.message);
    process.exit(1);
  }
});

srv.listen(port, () => {
  const P = srv.address().port;
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

  console.log(`CELLBOUND Kelas berjalan di port ${P}`);
  console.log(`  Guru   : http://localhost:${P}/guru`);
  ips.forEach((ip) => console.log(`  Siswa  : http://${ip}:${P}/   (jaringan yang sama)`));
});
