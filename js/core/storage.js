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
