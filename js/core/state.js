/**
 * core/state.js — Data bersama yang berubah selama aplikasi berjalan.
 *
 * Semua modul membaca/menulis lewat objek `state` ini (bukan variabel global),
 * sehingga mudah dilacak siapa yang mengubah apa.
 */

import { STORAGE_KEYS } from '../config.js';
import { store } from './storage.js';

export const state = {
  /** Dokumen PDF yang sudah terbuka (objek PDF.js), atau null. */
  pdfDoc: null,
  /** Promise proses pemuatan PDF yang sedang berjalan, atau null. */
  pdfPromise: null,

  /** Halaman PDF yang sedang dibaca (dimulai dari 1). */
  pageNum: parseInt(store.get(STORAGE_KEYS.savedPage, '1')) || 1,
  /** Tingkat zoom (1 = pas lebar layar). */
  zoom: parseFloat(store.get(STORAGE_KEYS.zoom, '1')) || 1,
  /** Mode baca malam (warna halaman dibalik). */
  nightMode: store.get(STORAGE_KEYS.nightMode) === '1',

  /** Penanda render terbaru, untuk membatalkan render yang sudah usang. */
  renderToken: 0,
  /** Tugas render PDF.js yang sedang berjalan, atau null. */
  renderTask: null,
};
