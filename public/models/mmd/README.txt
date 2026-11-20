==========================================================
  CELLBOUND - Folder Karakter MMD (.pmx / .pmd)
==========================================================

Cara menambahkan karakter MMD untuk dimainkan di dalam game:

1. Buat satu folder per karakter di dalam direktori ini, contoh:
   public/models/mmd/HatsuneMiku/
     ├── miku.pmx          (atau .pmd)
     ├── preview.png       (opsional: gambar ikon karakter di menu pilih)
     └── tex/              (folder tekstur .png / .tga / .bmp / .sph / .spa)

2. Jalankan server dengan `npm start`, lalu buka halaman game (/play).
   Server otomatis memindai semua file .pmx / .pmd di dalam folder ini
   dan menampilkannya di menu Pilih Karakter.

3. Catatan:
   - Karakter bawaan Cellcy (FBX) tetap tersedia sebagai pilihan default.
   - Rig standar MMD (bone Jepang seperti センター, 上半身, 首, 頭,
     左腕/右腕, 左ひじ/右ひじ, 左足/右足, 左ひざ/右ひざ, 足首, dan
     Grant bones seperti 左足D/右足D) otomatis dianimasikan saat
     idle, berjalan, berbelok, dan selebrasi.
   - Jika deploy statis (Cloudflare Workers), daftarkan karakter juga di
     public/models/mmd/characters.json.
