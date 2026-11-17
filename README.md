# CELLBOUND: Inside The Cell · Mode Kelas (Multiplayer)

Game edukasi 3D tentang organel sel. Guru membuat kelas dengan kode, siswa bergabung dari browser masing-masing.

## Menjalankan
Butuh Node.js 18+. (Dependensi `ws` sudah disertakan di `node_modules`; jika perlu: `npm install`.)

    npm start            # atau: node server.js
    PORT=8080 npm start  # ganti port

1. Guru membuka `http://<alamat-server>:3000/guru` -> tampil KODE KELAS.
2. Siswa membuka `http://<alamat-server>:3000/`, klik **Gabung Kelas**, isi nama + kode
   (atau langsung buka tautan `/?kode=ABCDE`).
3. Semua siswa menjelajah sel bersama (avatar berwarna, emote 1-4, papan skor langsung).
4. Guru menekan **Mulai Kuis Balapan**: 10 soal acak, 20 detik per soal. Skor = 100 + bonus kecepatan (+50 untuk yang tercepat benar).

Satu laptop guru dan siswa harus berada di jaringan yang sama (Wi-Fi sekolah), atau deploy ke hosting Node.js
(Render, Railway, Fly.io, VPS). Bila memakai HTTPS, WebSocket otomatis memakai wss://.

Mode solo tetap tersedia: klik **Mulai Misi** (tanpa server pun bisa dibuka lewat `public/index.html`, kecuali Mode Kelas).

## Struktur
- `server.js` : server HTTP + WebSocket (ruang kelas, sinkron posisi 10 Hz, kuis, skor). Kunci jawaban hanya di server.
- `public/index.html` : game 3D (Three.js lokal) · `public/mp.js` : klien multiplayer
- `public/char.js` + `public/models/` : karakter pemain 3D (Cellcy) dan animasi proseduralnya
- `public/teacher.html` : dashboard guru (progres siswa, skor, analisis soal yang sering salah)

## Catatan
Batas 80 siswa per kelas. Kelas disimpan di memori server (hilang saat server restart).
Dashboard guru menyimpan kode di sessionStorage, jadi refresh halaman guru tidak memutus kelas.

## Visual v2
Tekstur prosedural (bump/roughness noise), material fisik berkilau (clearcoat + pantulan environment),
shader fresnel/rim, wobble organik, kaustik di lantai, langit-langit sitoplasma (GLSL), bokeh & berkas cahaya,
bloom, jejak probe, percikan + guncangan kamera saat menemukan organel, membran bergelombang.
Perangkat lemah/HP lama: tambahkan `?lq=1` pada alamat untuk mematikan bloom (mis. `/?lq=1&kode=ABCDE`).
Atur kecerahan: tambahkan `?exp=0.8` (lebih gelap) atau `?exp=1.1` (lebih terang) pada alamat. Bloom: `?lq=1` untuk mematikan.

## Port
Jika port 3000 sedang dipakai, server otomatis mencoba 3001, 3002, dst. (sampai 30 kali) dan menampilkan alamat guru serta alamat siswa (IP jaringan) di terminal. Port awal bisa diganti dengan `PORT=8080 npm start`.

## Zona 2: The Protein Factory (solo)
Buka dari layar awal ("Zona 2: Pabrik Protein") atau dari kartu penutup Zona 1.
Semua interaksi berupa seret objek langsung di dunia 3D:
1. Translasi: seret tRNA dengan antikodon yang berpasangan dengan kodon mRNA (A-U, G-C) ke ribosom.
2. RE kasar: seret polipeptida ke translokon, lihat pelipatan protein, lalu seret vesikel menyusuri jalur ke Golgi.
3. Golgi: seret 2 gugus gula ke situs pengikat (glikosilasi), lalu seret vesikel ke tujuan yang benar (lisosom atau membran sel).
Zona 2 belum tersedia di mode kelas (multiplayer).

### Pembaruan visual & kemudahan (Zona 2 v2)
- mRNA kini untai dengan basa berhuruf (A/U/G/C) + bingkai situs A; tRNA berbentuk L dengan huruf antikodon; protein berupa pita pelangi; RE kasar bertumpuk, Golgi sisterna tipis, membran bilayer.
- Zona 1: nukleus berisi heliks ganda DNA (pasangan basa berwarna).
- Lebih mudah: legenda pasangan basa, bingkai hijau/merah saat tRNA didekatkan, area jatuh lebih besar, petunjuk berdenyut setelah salah atau diam 9 detik, klik tanpa menggeser tidak dihitung jawaban.

### Zona 2 v3
- Kodon/antikodon bergaya DNA: untai mRNA berupa tulang punggung heliks dengan basa berhuruf sebagai anak tangga; tRNA punya lengan antikodon heliks yang sama.
- Protein berbentuk kartun sungguhan: heliks alfa (merah), lembaran beta (kuning), lengkungan (abu-abu).
- Penyortiran lebih jelas: label berwarna LISOSOM (hijau) dan MEMBRAN SEL (biru), jalur titik bergerak menuju masing-masing tujuan, dan area LUAR SEL di balik membran.

### Tekstur sederhana (Zona 2)
Permukaan halus ala clay (tanpa bump/noise), warna lebih lembut dan terang, tetap 3D lewat pencahayaan.

## Joystick (Zona 1)
- Joystick virtual muncul otomatis di perangkat sentuh (kiri bawah). Di desktop, klik tombol "Joystick: OFF/ON" di kanan bawah. Pilihan tersimpan.
- Gamepad (USB/Bluetooth) langsung terbaca: stik kiri atau D-pad untuk bergerak, tombol A untuk interaksi (sama seperti tombol E).
- Keyboard (WASD/panah) dan klik lantai tetap berfungsi.

## Karakter 3D (Zona 1)
Pemain memakai model **Cellcy** (`public/models/Cellcy.glb`, rig Mixamo, satu mesh skinned) yang berjalan,
berbelok mengikuti arah gerak, dan diberi aura warna pemain.
- Model asli 37 MB (tekstur 3×4096 px) sudah dioptimalkan menjadi ±1,4 MB (tekstur 1024 px + JPEG) agar cepat diunduh di Wi-Fi kelas. Geometri tidak diubah.
- `public/lib/GLTFLoader.js` + `SkeletonUtils.js` (three r128) untuk memuat model dan mengkloning avatar teman di mode kelas.
- `public/char.js` berisi animasi prosedural: lengan diturunkan otomatis dari pose-T, ayunan kaki/tangan mengikuti kecepatan, badan mengangguk, dan kepala bergoyang halus. Model ini tidak punya animasi bawaan, jadi tidak perlu file animasi.
- Bila model gagal dimuat, game otomatis kembali memakai probe lama (tidak error).
- Dibuka langsung dari `public/index.html` (file://)? Model tetap muncul karena tersedia salinan base64 `models/Cellcy.b64.js` (dimuat hanya pada file://).

Mengganti karakter: timpa `public/models/Cellcy.glb` (rig Mixamo, menghadap +Z, tinggi ±1,7 unit) lalu sesuaikan `SCALE` di `public/char.js`.
Untuk file://, buat ulang `public/models/Cellcy.b64.js` (base64 dari GLB).

## Layar sempit (HP) di Zona 2
Header, legenda, toast, dan panel petunjuk tidak lagi saling menimpa. Kamera otomatis menjauh pada layar potret agar semua tRNA dan target terlihat.

## Beranda
- `/` : beranda sederhana (pilih Zona 1, Zona 2, atau gabung kelas dengan nama + kode). Tautan guru `/?kode=ABCDE` mengisi kode otomatis.
- `/play` : game itu sendiri. Parameter: `?go=zona1`, `?go=zona2`, `?go=join&kode=ABCDE&nama=Nama`.
- `/guru` : dashboard guru.
