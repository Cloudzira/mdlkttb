/**
 * theme-init.js — Menerapkan tema tersimpan SEBELUM halaman tampil.
 *
 * File ini sengaja dibuat terpisah dan bukan ES module, karena harus berjalan
 * lebih awal (di <head>) agar layar tidak berkedip dari gelap ke terang.
 * Kunci 'theme' harus sama dengan STORAGE_KEYS.theme di js/config.js.
 */
(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light') document.documentElement.classList.remove('dark');
  } catch (e) {
    // localStorage tidak tersedia: abaikan, pakai tema bawaan (gelap)
  }
})();
