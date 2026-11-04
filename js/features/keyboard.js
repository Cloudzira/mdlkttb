/**
 * features/keyboard.js — Pintasan keyboard dan perlindungan dasar.
 */

import { $ } from '../core/dom.js';
import { closeAbout } from '../ui/about.js';
import { showToc } from '../ui/router.js';
import { nextPage, prevPage, zoomIn, zoomOut } from './reader.js';

/**
 * Proteksi dasar (hanya penghalang ringan): blokir klik kanan serta
 * pintasan Simpan (Ctrl+S), Cetak (Ctrl+P), Lihat Sumber (Ctrl+U), dan F12.
 */
export function setupProtection() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    const isBlockedShortcut = (e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase());
    if (isBlockedShortcut || e.key === 'F12') e.preventDefault();
  });
}

/** Apakah ada kotak dialog yang sedang terbuka? */
const isAnyModalOpen = () =>
  ['note-modal', 'modal', 'about-modal'].some((id) => $(id).classList.contains('show'));

/** Pintasan untuk layar pembaca: panah, PageUp/PageDown, +/-, Esc. */
export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Pintasan yang sudah diblokir di setupProtection() tidak diproses lagi.
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) return;
    if (e.key === 'F12') return;

    if (e.key === 'Escape' && $('about-modal').classList.contains('show')) {
      closeAbout();
      return;
    }
    if (isAnyModalOpen()) return;
    if (!$('reader-screen').classList.contains('active')) return;

    // Jangan ganggu saat pengguna sedang mengetik.
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); nextPage(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prevPage(); }
    else if (e.key === '+' || e.key === '=') { zoomIn(); }
    else if (e.key === '-') { zoomOut(); }
    else if (e.key === 'Escape') { showToc(); }
  });
}
