/**
 * services/pwa.js — Pemasangan aplikasi (PWA) dan service worker.
 *
 * Tombol "Install Aplikasi" ada di layar cover. Perilakunya:
 *  - Sudah terpasang / dibuka sebagai aplikasi  -> tombol disembunyikan.
 *  - Android/Chrome/Edge (browser menyediakan prompt) -> tombol langsung memunculkan dialog install.
 *  - iPhone/iPad (Safari)                       -> tombol menampilkan langkah manual "Tambah ke Layar Utama".
 *  - Browser lain                               -> tombol menampilkan petunjuk lewat menu browser.
 */

import { $ } from '../core/dom.js';
import { toast } from '../ui/toast.js';

/** Event pemasangan yang ditahan browser, dipakai saat tombol Install diketuk. */
let deferredPrompt = null;
let installedNow = false; // true setelah pengguna memasang di sesi ini

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: fullscreen)').matches
  || window.matchMedia('(display-mode: minimal-ui)').matches
  || window.navigator.standalone === true;

// iPadOS 13+ mengaku sebagai "Macintosh", jadi dikenali lewat layar sentuh.
const isIOS = () =>
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  && !window.MSStream;

const IOS_STEPS = 'Ketuk tombol Bagikan di Safari, lalu pilih "Tambah ke Layar Utama".';
const GENERIC_STEPS = 'Buka menu browser (titik tiga), lalu pilih "Install aplikasi" atau "Tambahkan ke layar utama".';

/** Sesuaikan tombol & petunjuk install di layar cover dengan keadaan perangkat. */
export function updateInstallUI() {
  const button = $('cover-install');
  const hint = $('cover-install-hint');
  if (!button || !hint) return;

  if (isStandalone() || installedNow) {
    button.style.display = 'none';
    hint.textContent = '';
    return;
  }

  button.style.display = '';
  if (deferredPrompt) hint.textContent = 'Pasang agar mudah dibuka dari layar utama dan bisa dibaca offline.';
  else if (isIOS()) hint.textContent = IOS_STEPS;
  else hint.textContent = '';
}

/** Tangkap event "bisa dipasang" dari browser dan perbarui tombol install. */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedNow = true;
    updateInstallUI();
    toast('Aplikasi berhasil dipasang');
  });

  // Dibuka sebagai aplikasi (mode standalone) berubah -> sesuaikan tombol.
  const mq = window.matchMedia('(display-mode: standalone)');
  if (mq.addEventListener) mq.addEventListener('change', updateInstallUI);
}

/** Dipanggil saat tombol "Install Aplikasi" diketuk. */
export async function installApp() {
  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    deferredPrompt = null; // event hanya bisa dipakai satu kali
    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') installedNow = true;
    } catch (e) {
      toast(GENERIC_STEPS, { duration: 5000 });
    }
    updateInstallUI();
    return;
  }

  if (isIOS()) {
    $('cover-install-hint').textContent = IOS_STEPS;
    toast(IOS_STEPS, { duration: 5000 });
  } else {
    // Browser belum menyediakan prompt (mis. sudah pernah ditolak, atau belum memenuhi syarat).
    $('cover-install-hint').textContent = GENERIC_STEPS;
    toast(GENERIC_STEPS, { duration: 5000 });
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
