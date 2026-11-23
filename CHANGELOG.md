# Changelog

Semua perubahan penting pada **CELLBOUND: Inside The Cell** didokumentasikan di berkas ini.

## [2.0.2] - 2026-11-23

### Diperbaiki & Ditingkatkan
- **Kompresi Draco untuk Nucleo (`12,91 MiB`, 1 File Tunggal, 100% Topologi Asli)**
  - Mengaktifkan kompresi geometri **Draco** (level 6, kuantisasi presisi 14-bit untuk posisi & UV) pada `public/models/Nucleo_Complete.glb` sehingga ukuran turun **5×** dari 64,22 MiB (3 bagian) menjadi **12,91 MiB** (1 file tunggal, aman di bawah batas 25 MiB Cloudflare Workers) tanpa mengurangi 1 pun vertex atau poligon (kompresi geometri 11,43×: 53,07 MiB → 4,64 MiB).
  - Menambahkan decoder Draco *self-hosted* (`public/lib/DRACOLoader.js` & `public/lib/draco/draco_decoder.wasm`, `draco_wasm_wrapper.js`, `draco_decoder.js`), MIME `.wasm: 'application/wasm'` di `server.js`, dan integrasi `DRACOLoader` di `public/index.html` & `public/char.js`.
  - Menghapus 3 berkas lama `public/models/Nucleo_Complete.glb.part0`–`part2` dan memperbarui katalog di `public/char.js`, `public/models/mmd/characters.json`, `server.js`, dan `src/worker.js`.

## [2.0.1] - 2026-11-23

### Diperbaiki & Ditingkatkan
- **Pemuatan Nucleo Jauh Lebih Cepat via GLB *Lossless* (100% Topologi Asli Utuh)**
  - Mengonversi `Nucleo_Complete.fbx` (85,23 MiB, 4 bagian) ke format biner **GLB *lossless*** (`public/models/Nucleo_Complete.glb.part0`–`part2`, total 64,22 MiB, ~21,41 MiB per bagian) dengan mempertahankan **100% mesh & topologi asli (697.385 vertex / 1.314.238 poligon)** serta tekstur PNG asli tanpa *decimate*.
  - Men-bake transformasi UV presisi (`Scale` + `Location`) dan `Apply Scale (1, 1, 1)` langsung pada model agar bebas retakan UV saat dilihat dekat.
  - Menambahkan dukungan pemuatan paralel + *in-memory cache* untuk aset `.glb` terpecah lewat `GLTFLoader.parse` di `public/char.js`, serta memastikan `RepeatWrapping` pada `Nucleo_LED_Face` agar seluruh 8 ekspresi wajah tetap sinkron.
  - Menghapus 4 berkas lama `public/models/Nucleo_Complete.fbx.part0`–`part3` dan memperbarui seluruh katalog (`public/models/mmd/characters.json`, `server.js`, `src/worker.js`, `public/char.js`).

## [2.0.0] - 2026-11-23

### Ditambahkan
- **Karakter 3D Baru: Nucleo (`Nucleo_Complete.fbx`)**
  - Menambahkan karakter robot **Nucleo** lengkap dengan jubah menyala (*emissive cape*), clasp bahu, cincin elektron orbital, dan wajah LED ekspresif ke menu **Pilih Karakter** / **Ganti Karakter**.
  - Memecah aset FBX (~85,23 MiB, 7 tekstur tertanam) menjadi 4 bagian (`public/models/Nucleo_Complete.fbx.part0`–`part3`, masing-masing ~21,31 MiB) agar tetap di bawah batas 25 MiB Cloudflare Workers Static Assets.
  - Mendaftarkan `Nucleo` di seluruh katalog karakter (`public/models/mmd/characters.json`, `server.js`, `src/worker.js`, dan fallback `BUILTIN_CHARS` di `public/char.js`) dengan ikon `🤖` dan badge `FBX · RIG`.
- **Fisika Jubah KawaiiPhysics Verlet untuk Model FBX (`setupFbxClothPhysics`)**
  - Menghubungkan 3 rantai tulang jubah Nucleo (`cape_mid_01..04`, `cape_l_01..04`, `cape_r_01..04`) ke solver KawaiiPhysics Verlet + PBD 2-arah yang sama seperti karakter MMD, baik untuk pemain utama maupun avatar teman di mode kelas.
  - Otomatis melewati klon tulang duplikat bawaan `FBXLoader` dan membangun collider kapsul anti-tembus pada punggung, pinggul, dan paha.
  - Menambahkan dorongan angin aerodinamis ke belakang & sedikit mengangkat saat berlari mengikuti `actorYaw`, serta riak ombak kain yang tetap melambai halus saat diam.
- **Sistem Ekspresi Wajah LED 4×2 (`Nucleo_Expressions_Sheet.png`)**
  - Mendukung 8 ekspresi wajah LED (`Senang ^ ^`, `Normal`, `Tenang u u`, `Wink ^ <`, `Kaget`, `Marah`, `Sedih`, `Cinta ♥ ♥`) plus mode **`✨ Auto`**.
  - Mode **Auto**: berkedip alami saat diam, sesekali *wink*/tersenyum, berubah ceria saat berlari, berubah mata hati (`♥ ♥`) saat selebrasi menemukan organel, serta bereaksi terhadap emote `1`–`4`.
  - Panel **EKSPRESI** otomatis muncul di dalam HUD kiri-atas saat memakai Nucleo (tersembunyi untuk karakter lain) dan dapat diganti cepat lewat klik tombol HUD atau pintasan keyboard **`X`**.
- **Sinkronisasi Ekspresi Multiplayer Mode Kelas**
  - Menambahkan pesan WebSocket `expr` di `server.js` (Node.js) dan `src/game-server.js` (Cloudflare Durable Object) dengan validasi 9 ID ekspresi serta penyimpanan status ekspresi per pemain untuk siswa yang bergabung belakangan (`joined` & `peer`).
  - Mengklon material dan tekstur wajah LED per avatar teman di `window.charPeer` (`public/char.js`) agar ekspresi setiap siswa independen.
  - Memperbarui `public/mp.js` untuk mengirim perubahan ekspresi lokal secara real-time, memperbarui wajah LED 3D teman, dan menampilkan kilasan ikon ekspresi di label nama teman.

### Diperbaiki & Ditingkatkan
- **Deteksi Orientasi Otomatis FBX**: `mountModel` di `public/char.js` kini otomatis mendeteksi sumbu vertikal Y-up vs Z-up (dari tulang `head` vs `hips/foot`) serta arah hadap `+Z` (dari posisi bahu kiri vs kanan) untuk semua model FBX.
- **Normalisasi UV & `repeat` Otomatis**: Otomatis mendeteksi dan memulihkan mesh FBX yang koordinat UV dan `texture.repeat`-nya terkompresi `1/16` (`[0..0.0625] × [0.9375..1]`) ke skala `[0..1] × [0..1]` dan `repeat (1, 1)`.
- **Dukungan Material Emissive FBX**: `upgradeFbxMaterial` kini mempertahankan `emissiveMap`, warna `emissive` non-putih (`Cape_Glow_Cyan`, `Cape_Trim_Mat`), `transparent`, dan `opacity`.
- **MIME & Sinkronisasi Katalog Bawaan**: Menambahkan MIME `.part2` dan `.part3` di `server.js`, serta menyinkronkan entri `BUILTIN_CHARS` di `fetchCharacters()` agar klien tetap memakai aset bawaan terbaru.

---

## [1.0.0] - 2026-11-20

- Rilis awal **CELLBOUND: Inside The Cell** (Zona 1: The Explorer, Zona 2: The Protein Factory, Mode Kelas Multiplayer WebSocket & Cloudflare Durable Objects).
- Sistem karakter 3D bawaan **Cellcy** (FBX Rig) dan dukungan karakter **MMD** (`.pmx`/`.pmd`) dari Cloudflare R2 (`cellbound-model`) dengan fisika rambut & kain KawaiiPhysics Verlet.
- Layar pemuatan aset layar penuh dengan progres byte real-time & pra-render GPU, serta beranda 3D interaktif Cellcy.
