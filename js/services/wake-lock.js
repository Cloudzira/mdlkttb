/**
 * services/wake-lock.js — Menjaga layar tetap menyala saat membaca.
 *
 * Memakai Screen Wake Lock API bawaan browser (Chrome/Edge/Samsung Internet di Android,
 * Safari iOS 16.4+, dan aplikasi yang sudah di-install). Selama layar pembaca terbuka,
 * layar tidak akan meredup atau mati sendiri.
 *
 * Cara kerja singkat:
 *  - keepScreenAwake(true)  dipanggil router saat layar pembaca dibuka.
 *  - keepScreenAwake(false) dipanggil router saat pindah ke layar lain.
 *  - Browser otomatis melepas kunci saat tab disembunyikan / HP dikunci,
 *    jadi kunci dipasang ulang sendiri ketika pengguna kembali ke aplikasi.
 */

let sentinel = null;     // objek kunci dari browser (null = belum/tidak memegang kunci)
let wanted = false;      // apakah layar pembaca sedang terbuka (kunci diinginkan)
let requesting = false;  // mencegah permintaan ganda yang berbarengan

const isSupported = () => 'wakeLock' in navigator;

/** Minta kunci ke browser. Gagal diam-diam (mis. mode hemat baterai). */
async function acquire() {
  if (!wanted || !isSupported() || sentinel || requesting) return;
  if (document.visibilityState !== 'visible') return;

  requesting = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    // Pengguna mungkin sudah keluar dari pembaca selagi menunggu.
    if (!wanted) {
      lock.release().catch(() => {});
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch (e) {
    // Ditolak browser (baterai lemah / hemat daya). Akan dicoba lagi saat layar disentuh.
    sentinel = null;
  } finally {
    requesting = false;
  }
}

/** Lepas kunci agar layar kembali mengikuti pengaturan HP. */
function release() {
  if (!sentinel) return;
  const lock = sentinel;
  sentinel = null;
  lock.release().catch(() => {});
}

/**
 * Nyalakan / matikan penjagaan layar.
 * @param {boolean} on  true = layar dijaga tetap menyala.
 */
export function keepScreenAwake(on) {
  wanted = !!on;
  if (wanted) acquire();
  else release();
}

/** Pasang pendengar sekali saja saat aplikasi dimulai (dipanggil dari main.js). */
export function setupWakeLock() {
  // Kembali ke aplikasi (buka kunci layar, pindah tab, dll.) -> pasang ulang kunci.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquire();
  });

  // Cadangan: sebagian browser baru mengizinkan setelah ada sentuhan pengguna.
  ['pointerdown', 'touchend', 'keydown'].forEach((type) => {
    document.addEventListener(type, () => { if (wanted && !sentinel) acquire(); }, { passive: true });
  });
}
