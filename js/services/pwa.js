/**
 * services/pwa.js — Pemasangan aplikasi (PWA) dan service worker.
 */

import { $ } from '../core/dom.js';
import { toast } from '../ui/toast.js';

/** Event pemasangan yang ditahan browser, dipakai saat tombol Install diketuk. */
let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

/** Tangkap event "bisa dipasang" dari browser dan tampilkan banner Install. */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone()) $('install-banner').classList.add('show');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    $('install-banner').classList.remove('show');
    toast('Aplikasi berhasil dipasang');
  });
}

/** Safari iOS tidak punya tombol install otomatis, jadi tampilkan petunjuk manual. */
export function setupIosInstallHint() {
  if (isIOS() && !isStandalone()) {
    $('install-text').textContent = 'Ketuk tombol Bagikan lalu pilih "Tambah ke Layar Utama".';
    $('install-banner').classList.add('show');
  }
}

/** Dipanggil saat tombol "Install" diketuk. */
export async function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') $('install-banner').classList.remove('show');
    deferredPrompt = null;
    return;
  }

  if (isIOS()) {
    toast('Ketuk tombol Bagikan, lalu "Tambah ke Layar Utama".');
  } else {
    toast('Gunakan menu browser lalu pilih "Install aplikasi" / "Tambahkan ke layar utama".');
  }
}

/**
 * Daftarkan service worker (agar bisa dibaca offline).
 * Butuh file sw.js di folder yang sama; jika tidak ada, aplikasi tetap berjalan normal.
 */
export function registerServiceWorker() {
  const secureContext = location.protocol === 'https:' || location.hostname === 'localhost';
  if ('serviceWorker' in navigator && secureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
