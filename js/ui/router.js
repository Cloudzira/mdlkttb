/**
 * ui/router.js — Perpindahan antar layar.
 *
 * Aplikasi ini hanya punya satu halaman HTML; tiap "layar" adalah <div class="screen">
 * yang ditampilkan/disembunyikan. Modul lain mendaftarkan aksi yang harus dijalankan
 * saat sebuah layar dibuka lewat onEnterScreen() (lihat main.js).
 */

import { $ } from '../core/dom.js';
import { isLoggedIn } from '../core/session.js';
import { keepScreenAwake } from '../services/wake-lock.js';

/** Layar yang hanya boleh dibuka setelah login. */
const PROTECTED_SCREENS = ['toc-screen', 'bookmarks-screen', 'reader-screen'];

/** Daftar aksi saat layar dibuka: { idLayar: fungsi } */
const enterHooks = {};

/** Daftarkan fungsi yang dijalankan setiap kali layar `id` dibuka. */
export function onEnterScreen(id, callback) {
  enterHooks[id] = callback;
}

/**
 * Tampilkan sebuah layar.
 * @param {string} id  id layar, mis. 'toc-screen'.
 * @param {object} [options]
 * @param {boolean} [options.push]     false = jangan tambah riwayat browser.
 * @param {boolean} [options.replace]  true = timpa riwayat saat ini.
 */
export function showScreen(id, options = {}) {
  // Belum login? Arahkan ke layar login.
  if (PROTECTED_SCREENS.includes(id) && !isLoggedIn()) id = 'login-screen';

  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  $(id).classList.add('active');

  // Layar pembaca: jaga layar tetap menyala. Layar lain: kembali normal.
  keepScreenAwake(id === 'reader-screen');

  // Catat di riwayat browser agar tombol Back di HP berfungsi.
  if (PROTECTED_SCREENS.includes(id)) {
    const entry = { screen: id };
    const shouldReplace = options.replace || (options.push === false && !history.state);
    const shouldPush = options.push !== false && !(history.state && history.state.screen === id);

    if (shouldReplace) history.replaceState(entry, '');
    else if (shouldPush) history.pushState(entry, '');
  }

  if (enterHooks[id]) enterHooks[id]();
}

export const showToc = () => showScreen('toc-screen', { push: false, replace: true });
export const showBookmarks = () => showScreen('bookmarks-screen');

/** Tombol Back pada HP/browser: pindah ke layar yang tersimpan di riwayat. */
export function setupBackButton() {
  window.addEventListener('popstate', (e) => {
    const screen = e.state && e.state.screen;
    if (screen) showScreen(screen, { push: false });
  });
}
