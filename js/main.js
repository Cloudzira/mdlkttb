/**
 * main.js — Titik masuk aplikasi.
 *
 * File ini hanya "merangkai" modul-modul lain:
 *   1. Menghubungkan tombol HTML (data-action) dengan fungsinya.
 *   2. Menentukan apa yang dijalankan saat tiap layar dibuka.
 *   3. Menjalankan splash screen lalu membuka layar yang sesuai.
 *
 * Peta folder js/:
 *   config.js    pengaturan (kata sandi, nama file buku, batas zoom, ...)
 *   data/        data statis (daftar isi)
 *   core/        fondasi: penyimpanan, state bersama, fungsi bantu, ikon
 *   services/    kerja di balik layar: memuat PDF, PWA, penyimpanan catatan, layar tetap menyala
 *   ui/          komponen tampilan umum: toast, dialog, pindah layar, tema
 *   features/    fitur per layar: login, daftar isi, pembaca, catatan, gestur
 */

import { $ } from './core/dom.js';
import { isLoggedIn } from './core/session.js';

import { setupActions } from './ui/actions.js';
import { onEnterScreen, showScreen, showToc, showBookmarks, setupBackButton } from './ui/router.js';
import { playSplash } from './ui/splash.js';
import { toggleTheme, applyThemeIcon } from './ui/theme.js';
import { openAbout } from './ui/about.js';

import { setupInstallPrompt, setupIosInstallHint, installApp, registerServiceWorker } from './services/pwa.js';
import { setupWakeLock } from './services/wake-lock.js';

import { setupAuthEvents, togglePassword, logout } from './features/auth.js';
import { renderTocItems, updateProgressCard, schedulePreload, setupTocEvents } from './features/toc.js';
import {
  enterReader, retryLoad, openReader, prevPage, nextPage, zoomIn, zoomOut, setupReaderEvents,
} from './features/reader.js';
import { setupGestures } from './features/gestures.js';
import { toggleNight, applyNight } from './features/night-mode.js';
import { renderBookmarks, openNoteModal, exportNotes } from './features/notes.js';
import { setupProtection, setupKeyboardShortcuts } from './features/keyboard.js';

// ---------------------------------------------------------------
// 1. Tombol HTML -> fungsi  (nama aksi = isi atribut data-action di index.html)
// ---------------------------------------------------------------
const ACTIONS = {
  'toggle-password': togglePassword,
  'open-about': openAbout,
  'show-bookmarks': showBookmarks,
  'show-toc': showToc,
  'toggle-theme': toggleTheme,
  'toggle-night': toggleNight,
  'logout': logout,
  'install-app': installApp,
  'open-reader': openReader,
  'open-note': openNoteModal,
  'export-notes': exportNotes,
  'retry-load': retryLoad,
  'zoom-in': zoomIn,
  'zoom-out': zoomOut,
  'prev-page': prevPage,
  'next-page': nextPage,
};

// ---------------------------------------------------------------
// 2. Aksi saat sebuah layar dibuka
// ---------------------------------------------------------------
function registerScreenHooks() {
  onEnterScreen('toc-screen', () => {
    updateProgressCard();
    renderTocItems($('toc-search').value);
    schedulePreload();
  });
  onEnterScreen('bookmarks-screen', renderBookmarks);
  onEnterScreen('reader-screen', enterReader);
}

// ---------------------------------------------------------------
// 3. Setelah splash: buka layar yang sesuai
// ---------------------------------------------------------------
function afterSplash() {
  try {
    if (isLoggedIn()) {
      $('splash-screen').classList.remove('active');
      showScreen('toc-screen', { push: false, replace: true });
    } else {
      showScreen('login-screen', { push: false });
    }
  } catch (e) {
    // Apa pun yang terjadi, jangan biarkan pengguna terjebak di splash.
    console.error(e);
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    $('login-screen').classList.add('active');
  }
}

/** Jalankan satu langkah awal; bila error, langkah lain tetap berjalan. */
function safely(step) {
  try { step(); } catch (e) { console.error(e); }
}

// ---------------------------------------------------------------
// Inisialisasi
// ---------------------------------------------------------------
function init() {
  setupActions(ACTIONS);
  registerScreenHooks();

  // Splash SELALU berakhir, walaupun ada bagian lain yang error.
  playSplash(afterSplash);

  // Tampilan awal
  safely(applyThemeIcon);
  safely(applyNight);
  safely(() => renderTocItems());
  safely(renderBookmarks);
  safely(updateProgressCard);

  // Event
  setupProtection();
  setupKeyboardShortcuts();
  setupBackButton();
  setupAuthEvents();
  setupTocEvents();
  setupReaderEvents();
  setupGestures();
  setupWakeLock();

  // PWA
  registerServiceWorker();
  setupIosInstallHint();
}

// Banner "Install" harus siap menangkap event dari browser sedini mungkin.
setupInstallPrompt();

// Modul dijalankan setelah HTML selesai dibaca, tetapi jaga-jaga bila belum.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
