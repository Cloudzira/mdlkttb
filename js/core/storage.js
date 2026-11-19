/**
 * core/storage.js — Pembungkus localStorage yang aman.
 *
 * Bila localStorage diblokir (mode privat, dsb.), fungsi-fungsi ini tidak error;
 * nilai bawaan (fallback) dikembalikan.
 */

export const store = {
  /** Ambil teks. Mengembalikan fallback jika belum ada. */
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  },

  /** Simpan nilai. */
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* abaikan */ }
  },

  /** Hapus nilai. */
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* abaikan */ }
  },

  /** Ambil objek JSON. Mengembalikan fallback jika kosong atau rusak. */
  getJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return (value && typeof value === 'object') ? value : fallback;
    } catch (e) {
      return fallback;
    }
  },
};

/**
 * Penyimpanan sementara per tab (sessionStorage): bertahan saat halaman di-refresh,
 * tetapi hilang saat tab/aplikasi ditutup. Dipakai untuk memulihkan layar & posisi baca setelah refresh.
 */
export const tabStore = {
  get(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* abaikan */ }
  },
  remove(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* abaikan */ }
  },
};

/** Apakah halaman ini dibuka karena di-refresh (bukan dibuka baru)? */
export function isPageReload() {
  try {
    const entry = performance.getEntriesByType('navigation')[0];
    if (entry) return entry.type === 'reload';
    return performance.navigation && performance.navigation.type === 1;
  } catch (e) {
    return false;
  }
}
