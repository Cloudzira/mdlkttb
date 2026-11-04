/**
 * features/reader-overlay.js — Lapisan "memuat / error" di atas layar pembaca.
 */

import { $ } from '../core/dom.js';
import { BOOK_FILE } from '../config.js';

/**
 * Atur tampilan overlay.
 * @param {'loading'|'error'|'hide'} mode
 * @param {string} [text]       Teks utama.
 * @param {string} [subText]    Teks kecil di bawahnya.
 * @param {number|null} [progress]  0..1 untuk bilah progres; null = tanpa bilah.
 */
export function setOverlay(mode, text = '', subText = '', progress = null) {
  const overlay = $('reader-overlay');
  if (mode === 'hide') {
    overlay.classList.remove('show');
    return;
  }

  overlay.classList.add('show');
  const isError = mode === 'error';

  $('ov-spinner').style.display = isError ? 'none' : '';
  $('ov-text').textContent = text;
  $('ov-sub').textContent = subText;
  $('ov-retry').style.display = isError ? '' : 'none';
  $('ov-back').style.display = isError ? '' : 'none';
  $('ov-bar').style.display = (!isError && progress !== null) ? '' : 'none';
  if (progress !== null) $('ov-bar-fill').style.width = Math.round(progress * 100) + '%';
}

/** Ubah error pemuatan menjadi [judul, penjelasan] yang ramah pengguna. */
export function describeLoadError(error) {
  const code = error && error.message;
  if (code === 'NOT_FOUND') {
    return ['Dokumen tidak ditemukan', `Pastikan file ${BOOK_FILE} ada di folder yang sama dengan index.html.`];
  }
  if (code === 'DECRYPT_FAILED') {
    return ['Dokumen gagal dibuka', 'File buku tidak cocok dengan kunci enkripsi. Pastikan file buku.enc dibuat dengan kata kunci yang sama.'];
  }
  if (code === 'NO_PDFJS') {
    return ['Komponen pembaca belum termuat', 'Periksa koneksi internet lalu muat ulang halaman ini.'];
  }
  return ['Gagal memuat dokumen', 'Periksa koneksi internet Anda lalu coba lagi.'];
}
