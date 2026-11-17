// Konstanta dan Bank Soal CELLBOUND

export const GAME_CONFIG = {
  QUIZ_DURATION_SEC: 20,
  MAX_PLAYERS_PER_ROOM: 80,
  TICK_INTERVAL_MS: 100, // 10 Hz sinkronisasi posisi
  CLEANUP_INTERVAL_MS: 30000,
  ROOM_MAX_IDLE_MS: 600000, // 10 menit
  POSITION_THROTTLE_MS: 40,
  BOUNDS: {
    X_RADIUS: 24,
    Z_RADIUS: 17.2,
  },
};

export const ORGANELLES = [
  'membran',
  'sitoplasma',
  'nukleus',
  'nukleolus',
  'ribosom',
  'rer',
  'rehalus',
  'golgi',
  'vesikel',
  'mitokondria',
  'lisosom',
  'peroksisom',
  'sentriol',
];

export const ORGANELLE_NAMES = {
  membran: 'Membran sel',
  sitoplasma: 'Sitoplasma',
  nukleus: 'Nukleus',
  nukleolus: 'Nukleolus',
  ribosom: 'Ribosom',
  rer: 'RE kasar',
  rehalus: 'RE halus',
  golgi: 'Badan Golgi',
  vesikel: 'Vesikel',
  mitokondria: 'Mitokondria',
  lisosom: 'Lisosom',
  peroksisom: 'Peroksisom',
  sentriol: 'Sentriol',
};

// Kunci jawaban disimpan hanya di server (anti-curang)
export const QUESTION_BANK = [
  ['Klik struktur yang menjadi <b>pusat kendali sel</b> dan menyimpan DNA.', 'nukleus'],
  ['Klik bagian yang <b>merakit subunit ribosom</b>.', 'nukleolus'],
  ['Klik pembatas sel yang <b>mengatur keluar-masuk zat</b> secara selektif.', 'membran'],
  ['Klik cairan tempat <b>glikolisis</b> dan banyak reaksi metabolisme berlangsung.', 'sitoplasma'],
  ['Klik struktur kecil <b>tanpa membran</b> yang menerjemahkan mRNA menjadi protein.', 'ribosom'],
  ['Klik kantung pipih yang <b>ditempeli ribosom</b> dan memproses protein baru.', 'rer'],
  ['Klik retikulum yang <b>tanpa ribosom</b>, membuat lipid, dan menetralkan racun.', 'rehalus'],
  ['Klik tumpukan sisterna yang <b>memodifikasi, menyortir, dan mengemas</b> protein.', 'golgi'],
  ['Klik kantung kecil yang menjadi <b>kurir pengangkut zat</b> antar organel.', 'vesikel'],
  ['Klik organel berkrista yang menghasilkan <b>ATP</b>.', 'mitokondria'],
  ['Klik organel berisi <b>enzim hidrolitik</b> untuk pencernaan intrasel.', 'lisosom'],
  ['Klik organel yang mengubah <b>H\u2082O\u2082 beracun menjadi air dan oksigen</b>.', 'peroksisom'],
  ['Klik pasangan silinder yang membentuk <b>benang spindel</b> saat sel membelah.', 'sentriol'],
];

export const PLAYER_COLORS = [
  '#4ff0d0',
  '#ffb347',
  '#ff7ad9',
  '#8fb7ff',
  '#b6ff4a',
  '#ff6b6b',
  '#c58bff',
  '#ffe27a',
  '#6bffb0',
  '#ff9d3c',
];
