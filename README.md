# CELLBOUND: Inside The Cell · Mode Kelas (Multiplayer)

Game edukasi 3D tentang organel sel untuk siswa SMA. Guru membuat kelas dengan kode unik, siswa bergabung dari browser masing-masing untuk menjelajah sel bersama secara real-time dan berlomba menjawab kuis cepat.

---

## Opsi Menjalankan & Deploy

Aplikasi ini mendukung 2 mode deployment:
1. **Cloudflare Workers (Rekomendasi - Serverless & Edge)**:
   - WebSocket berjalan di atas **Cloudflare Durable Objects** sehingga state kelas & pemain tersinkronkan secara global.
   - Aset frontend disajikan langsung lewat **Cloudflare Workers Assets**.
   - Cukup 1 perintah deploy (`npx wrangler deploy`), langsung dapat domain HTTPS + WSS gratis.
2. **Node.js Lokal / VPS / PaaS**:
   - Menjalankan `server.js` bawaan menggunakan pustaka `ws`.

---

## 1. Menjalankan di Cloudflare Workers

### A. Pengujian Lokal (Development)
Jalankan perintah berikut:
```bash
npm run dev
# atau: npx wrangler dev
```
Buka alamat yang muncul di terminal (biasanya `http://localhost:8787`).

### B. Deploy ke Cloudflare Workers
1. Pastikan sudah login ke akun Cloudflare di CLI:
   ```bash
   npx wrangler login
   ```
2. Deploy Worker:
   ```bash
   npm run deploy
   # atau: npx wrangler deploy
   ```
3. Cloudflare akan memberikan URL publik (contoh: `https://cellbound-kelas.<subdomain>.workers.dev`).
   - Halaman Siswa: `https://cellbound-kelas.<subdomain>.workers.dev/`
   - Dashboard Guru: `https://cellbound-kelas.<subdomain>.workers.dev/guru`

> **Catatan Durable Objects**: Cloudflare Workers kini menyertakan Durable Objects pada paket gratis (Free Tier). Sinkronisasi multi-pemain dan WebSocket berjalan otomatis tanpa server tambahan.

---

## 2. Menjalankan di Node.js (Lokal / VPS)

Butuh Node.js 18+.

```bash
npm start            # atau: node server.js
PORT=8080 npm start  # jika ingin port lain
```

1. Guru membuka `http://<alamat-server>:3000/guru` -> tampil KODE KELAS.
2. Siswa membuka `http://<alamat-server>:3000/`, klik **Gabung Kelas**, isi nama + kode (atau langsung buka `/?kode=ABCDE`).
3. Semua siswa menjelajah sel bersama (avatar 3D berwarna, emote 1-4, leaderboard real-time).
4. Guru menekan **Mulai Kuis Balapan**: 10 soal acak, 20 detik per soal. Skor = 100 + bonus kecepatan (+50 untuk yang tercepat benar).

---

## Struktur Proyek

```text
cellbound-kelas/
├── src/
│   ├── worker.js           # Entrypoint Cloudflare Workers (Routing + WS DO upgrade)
│   ├── game-server.js      # Durable Object: Logika WebSocket multiplayer & kuis
│   └── constants.js        # Bank soal, daftar organel, konfigurasi game
├── public/                 # Berkas statis frontend
│   ├── home.html           # Halaman awal / rute /
│   ├── index.html          # Game 3D / rute /play
│   ├── teacher.html        # Dashboard guru / rute /guru
│   ├── mp.js               # Klien multiplayer WebSocket
│   ├── char.js             # Karakter 3D Cellcy & animasi prosedural
│   ├── joystick.js         # Kontrol sentuh / virtual joystick
│   ├── zona2.js            # Zona 2: Pabrik Protein (solo)
│   ├── lib/                # Three.js add-ons (GLTFLoader, Bloom, Composer)
│   └── models/             # Model 3D Cellcy (GLB & fallback Base64)
├── server.js               # Server Node.js mandiri (alternatif tanpa wrangler)
├── wrangler.jsonc          # Konfigurasi Cloudflare Workers + Assets + Durable Objects
└── package.json
```

---

## Fitur Game

- **Zona 1 (The Explorer)**: Jelajahi sel hewan dalam 3D, temukan 13 organel, pelajari fungsinya, emote bersama teman, dan ikuti kuis balapan.
- **Zona 2 (The Protein Factory)**: Simulasi perakitan protein interaktif (translasi mRNA di ribosom, modifikasi di RE kasar, penyortiran di Badan Golgi).
- **Anti-Curang**: Kunci jawaban kuis dan perhitungan skor disimpan hanya di sisi server.
- **Dukungan Kontrol Lengkap**: Keyboard (WASD/panah), mouse klik lantai, virtual joystick untuk HP/layar sentuh, dan Gamepad Bluetooth/USB.

## Beranda 3D (Cellcy menyapa)
- `public/home.html` — beranda mewah: Cellcy 3D melambai, menoleh mengikuti kursor, melompat saat diklik, dan bereaksi saat kartu disorot.
- `public/home3d.js` — adegan 3D (pelataran emas, gelembung organel, debu emas, percikan).
- `public/cellcy-rig.js` — rig animasi prosedural Cellcy untuk beranda (lambaian, menoleh, napas, lompat).
- Tanpa WebGL, beranda tetap berfungsi (logo statis sebagai pengganti). Pengguna "kurangi gerakan" mendapat animasi minimal.
