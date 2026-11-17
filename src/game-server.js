import {
  GAME_CONFIG,
  ORGANELLES,
  QUESTION_BANK,
  PLAYER_COLORS,
} from './constants.js';

export class GameServer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.rooms = new Map();
    this.sessions = new Map();
    this.tickInterval = null;
    this.cleanupInterval = null;
  }

  // Menangani permintaan HTTP & WebSocket upgrade
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('CELLBOUND Game Server (Durable Object) running.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => chars[(Math.random() * chars.length) | 0]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  send(ws, obj) {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(obj));
      } catch (err) {
        console.error('Send error:', err);
      }
    }
  }

  broadcastToPlayers(room, obj, skipWs = null) {
    const payload = JSON.stringify(obj);
    for (const player of room.players.values()) {
      if (player.ws !== skipWs && player.ws.readyState === 1) {
        try {
          player.ws.send(payload);
        } catch (err) {
          console.error('Broadcast to player error:', err);
        }
      }
    }
  }

  sendToHost(room, obj) {
    if (room && room.host) {
      this.send(room.host, obj);
    }
  }

  getBoard(room) {
    return [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      found: p.found.size,
      score: p.score,
    }));
  }

  syncBoard(room) {
    const b = this.getBoard(room);
    this.broadcastToPlayers(room, { t: 'board', board: b });
    this.sendToHost(room, { t: 'board', board: b });
  }

  nextQuestion(room) {
    room.tn = null;
    room.qi++;

    if (room.qi >= room.order.length) {
      return this.finishQuiz(room);
    }

    const question = room.order[room.qi];
    room.qOpen = true;
    room.qStart = Date.now();
    room.res = new Map();
    room.firstRight = false;

    for (const player of room.players.values()) {
      player.answered = false;
    }

    const msg = {
      t: 'q',
      i: room.qi,
      n: room.order.length,
      text: question[0],
      dur: GAME_CONFIG.QUIZ_DURATION_SEC,
    };

    this.broadcastToPlayers(room, msg);
    this.sendToHost(room, { ...msg, a: question[1] });

    room.tm = setTimeout(
      () => this.closeQuestion(room),
      GAME_CONFIG.QUIZ_DURATION_SEC * 1000 + 500
    );
  }

  closeQuestion(room) {
    if (!room.qOpen) return;
    room.qOpen = false;
    clearTimeout(room.tm);

    const question = room.order[room.qi];
    let rightCount = 0;
    let answeredCount = 0;

    for (const player of room.players.values()) {
      if (player.answered) answeredCount++;
    }
    for (const scoreGain of room.res.values()) {
      if (scoreGain > 0) rightCount++;
    }

    const stat = {
      i: room.qi,
      text: question[0],
      a: question[1],
      right: rightCount,
      answered: answeredCount,
      total: room.players.size,
    };
    room.stats.push(stat);

    const msg = {
      t: 'qres',
      i: room.qi,
      correct: question[1],
      gain: Object.fromEntries(room.res),
      board: this.getBoard(room),
    };

    this.broadcastToPlayers(room, msg);
    this.sendToHost(room, { ...msg, stat });

    room.tn = setTimeout(() => this.nextQuestion(room), 4000);
  }

  finishQuiz(room) {
    clearTimeout(room.tm);
    clearTimeout(room.tn);
    room.mode = 'lobby';
    room.qOpen = false;

    const b = this.getBoard(room);
    this.broadcastToPlayers(room, { t: 'final', board: b });
    this.sendToHost(room, { t: 'final', board: b, stats: room.stats });
  }

  ensureTickTimer() {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      let activePlayersCount = 0;

      for (const room of this.rooms.values()) {
        if (!room.players.size) continue;
        activePlayersCount += room.players.size;

        if (room.dirty) {
          room.dirty = false;
          this.broadcastToPlayers(room, {
            t: 'snap',
            p: [...room.players.values()].map((p) => [
              p.id,
              +p.x.toFixed(2),
              +p.z.toFixed(2),
            ]),
          });
        }
      }

      // Hentikan interval jika tidak ada pemain aktif untuk menghemat resource
      if (activePlayersCount === 0 && this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
    }, GAME_CONFIG.TICK_INTERVAL_MS);
  }

  ensureCleanupTimer() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms.entries()) {
        const isHostDead = !room.host || room.host.readyState !== 1;
        const isEmpty = room.players.size === 0;

        if (isHostDead && isEmpty && now - room.t0 > GAME_CONFIG.ROOM_MAX_IDLE_MS) {
          clearTimeout(room.tm);
          clearTimeout(room.tn);
          this.rooms.delete(code);
        }
      }

      if (this.rooms.size === 0 && this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    }, GAME_CONFIG.CLEANUP_INTERVAL_MS);
  }

  handleSession(ws) {
    ws.accept();

    const session = {
      ws,
      room: null,
      player: null,
      role: null,
      lastPos: 0,
    };
    this.sessions.set(ws, session);

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!msg || typeof msg.t !== 'string') return;
      this.handleMessage(session, msg);
    });

    const onClose = () => {
      this.handleClose(session);
      this.sessions.delete(ws);
    };

    ws.addEventListener('close', onClose);
    ws.addEventListener('error', onClose);
  }

  handleMessage(session, msg) {
    const { ws } = session;
    const room = session.room;
    const player = session.player;

    switch (msg.t) {
      case 'host': {
        const inputCode = String(msg.code || '').toUpperCase().trim();
        let targetRoom = this.rooms.get(inputCode);

        if (targetRoom && (!targetRoom.host || targetRoom.host.readyState !== 1)) {
          targetRoom.host = ws;
        } else {
          const code = this.generateRoomCode();
          targetRoom = {
            code,
            host: ws,
            players: new Map(),
            mode: 'lobby',
            order: [],
            stats: [],
            qi: -1,
            qOpen: false,
            qStart: 0,
            res: new Map(),
            firstRight: false,
            nid: 1,
            dirty: false,
            t0: Date.now(),
            tm: null,
            tn: null,
          };
          this.rooms.set(code, targetRoom);
        }

        session.room = targetRoom;
        session.role = 'host';

        this.send(ws, {
          t: 'hosted',
          code: targetRoom.code,
          board: this.getBoard(targetRoom),
          mode: targetRoom.mode,
          stats: targetRoom.stats,
        });

        this.ensureCleanupTimer();
        break;
      }

      case 'join': {
        const code = String(msg.code || '').toUpperCase().trim();
        const targetRoom = this.rooms.get(code);

        if (!targetRoom) {
          return this.send(ws, { t: 'err', m: 'Kode kelas tidak ditemukan.' });
        }
        if (targetRoom.players.size >= GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
          return this.send(ws, { t: 'err', m: 'Kelas penuh.' });
        }

        const rawName = String(msg.name || '').replace(/[<>&"'`]/g, '').trim();
        const name = rawName.slice(0, 16) || 'Siswa';
        const id = targetRoom.nid++;
        const color = PLAYER_COLORS[id % PLAYER_COLORS.length];

        const newPlayer = {
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

        targetRoom.players.set(id, newPlayer);
        session.room = targetRoom;
        session.player = newPlayer;
        session.role = 'player';

        this.send(ws, {
          t: 'joined',
          id,
          color: newPlayer.color,
          code: targetRoom.code,
          mode: targetRoom.mode,
          players: [...targetRoom.players.values()]
            .filter((p) => p !== newPlayer)
            .map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              x: p.x,
              z: p.z,
            })),
          board: this.getBoard(targetRoom),
        });

        this.broadcastToPlayers(
          targetRoom,
          {
            t: 'peer',
            id,
            name,
            color: newPlayer.color,
            x: newPlayer.x,
            z: newPlayer.z,
          },
          ws
        );

        this.syncBoard(targetRoom);
        this.ensureTickTimer();
        this.ensureCleanupTimer();
        break;
      }

      case 'pos': {
        if (!player || !room) return;
        const now = Date.now();
        if (now - session.lastPos < GAME_CONFIG.POSITION_THROTTLE_MS) return;
        session.lastPos = now;

        let x = +msg.x;
        let z = +msg.z;
        if (!isFinite(x) || !isFinite(z)) return;

        // Membatasi pergerakan pemain di dalam batas sel elips
        const ellipseVal =
          (x / GAME_CONFIG.BOUNDS.X_RADIUS) ** 2 +
          (z / GAME_CONFIG.BOUNDS.Z_RADIUS) ** 2;

        if (ellipseVal > 1) {
          const scale = 1 / Math.sqrt(ellipseVal);
          x *= scale;
          z *= scale;
        }

        player.x = x;
        player.z = z;
        room.dirty = true;
        break;
      }

      case 'found': {
        if (!player || !room) return;
        const organelleId = String(msg.id || '');
        if (!ORGANELLES.includes(organelleId) || player.found.has(organelleId)) return;

        player.found.add(organelleId);
        this.syncBoard(room);
        break;
      }

      case 'emo': {
        if (!player || !room) return;
        const emoteIdx = msg.i | 0;
        if (emoteIdx < 0 || emoteIdx > 3) return;

        this.broadcastToPlayers(room, {
          t: 'emote',
          id: player.id,
          i: emoteIdx,
        });
        break;
      }

      case 'ans': {
        if (!player || !room || !room.qOpen || msg.i !== room.qi || player.answered) return;

        player.answered = true;
        const currentQ = room.order[room.qi];
        const isCorrect = msg.id === currentQ[1];
        let gain = 0;

        if (isCorrect) {
          const elapsed = Date.now() - room.qStart;
          const timeLeft = Math.max(0, GAME_CONFIG.QUIZ_DURATION_SEC * 1000 - elapsed);
          gain = 100 + Math.round(timeLeft / 200);

          if (!room.firstRight) {
            room.firstRight = true;
            gain += 50; // Bonus penjawab benar tercepat pertama
          }
        }

        player.score += gain;
        room.res.set(player.id, gain);
        this.send(ws, { t: 'ack', i: room.qi });

        const allAnswered = [...room.players.values()].every((p) => p.answered);
        if (allAnswered) {
          this.closeQuestion(room);
        }
        break;
      }

      case 'start': {
        if (session.role !== 'host' || !room || room.mode === 'quiz') return;
        if (!room.players.size) {
          return this.send(ws, { t: 'err', m: 'Belum ada siswa di kelas.' });
        }

        // Acak 10 soal dari Bank Soal
        room.order = QUESTION_BANK.slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);
        room.stats = [];
        room.qi = -1;
        room.mode = 'quiz';

        for (const p of room.players.values()) {
          p.score = 0;
        }

        this.syncBoard(room);
        this.broadcastToPlayers(room, { t: 'mode', mode: 'quiz' });
        this.sendToHost(room, { t: 'mode', mode: 'quiz' });
        this.nextQuestion(room);
        break;
      }

      case 'stop': {
        if (session.role !== 'host' || !room || room.mode !== 'quiz') return;
        this.finishQuiz(room);
        break;
      }

      case 'reset': {
        if (session.role !== 'host' || !room) return;
        for (const p of room.players.values()) {
          p.score = 0;
        }
        this.syncBoard(room);
        break;
      }
    }
  }

  handleClose(session) {
    const { room, role, player, ws } = session;
    if (!room) return;

    if (role === 'host') {
      if (room.host === ws) {
        room.host = null;
      }
    } else if (player) {
      room.players.delete(player.id);
      this.broadcastToPlayers(room, { t: 'left', id: player.id });
      this.syncBoard(room);

      if (
        room.qOpen &&
        room.players.size > 0 &&
        [...room.players.values()].every((p) => p.answered)
      ) {
        this.closeQuestion(room);
      }
    }
  }
}
