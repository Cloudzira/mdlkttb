/**
 * ui/toast.js — Pesan singkat yang muncul di bawah layar.
 */

import { $ } from '../core/dom.js';

const DEFAULT_DURATION_MS = 2600;
let hideTimer = null;

/**
 * Tampilkan pesan singkat.
 * @param {string} message  Teks pesan.
 * @param {object} [options]
 * @param {string}   [options.actionLabel]  Teks tombol aksi (opsional).
 * @param {Function} [options.onAction]     Dipanggil saat tombol aksi diketuk.
 * @param {number}   [options.duration]     Lama tampil (ms).
 */
export function toast(message, options = {}) {
  const box = $('toast');
  const button = $('toast-action');
  $('toast-text').textContent = message;

  if (options.actionLabel && options.onAction) {
    button.style.display = '';
    button.textContent = options.actionLabel;
    button.onclick = () => {
      box.classList.remove('show');
      options.onAction();
    };
  } else {
    button.style.display = 'none';
    button.onclick = null;
  }

  box.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => box.classList.remove('show'), options.duration || DEFAULT_DURATION_MS);
}
