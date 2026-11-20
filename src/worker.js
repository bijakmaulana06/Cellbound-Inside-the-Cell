import { GameServer } from './game-server.js';

export { GameServer };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    // 1. WebSocket Upgrade: alihkan ke Durable Object
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      if (!env.GAME) {
        return new Response('Durable Object binding GAME tidak ditemukan.', { status: 500 });
      }
      // Semua sesi menggunakan instans Durable Object terpusat agar room tersinkronisasi
      const id = env.GAME.idFromName('global-lobby');
      const stub = env.GAME.get(id);
      return stub.fetch(request);
    }

    // 2. Pemetaan rute halaman & API daftar karakter statis
    let targetPath = url.pathname;
    if (targetPath === '/api/characters') {
      targetPath = '/models/mmd/characters.json';
    } else if (targetPath === '/' || targetPath === '') {
      targetPath = '/home.html';
    } else if (targetPath === '/play') {
      targetPath = '/index.html';
    } else if (targetPath === '/guru') {
      targetPath = '/teacher.html';
    }

    // 3. Layani aset statis dari folder public
    if (targetPath !== url.pathname) {
      const targetUrl = new URL(request.url);
      targetUrl.pathname = targetPath;
      return env.ASSETS.fetch(new Request(targetUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
