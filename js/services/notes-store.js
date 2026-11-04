/**
 * services/notes-store.js — Penyimpanan penanda & catatan halaman.
 *
 * Bentuk data: { "12": "catatan halaman 12", "40": "" }
 * Kunci = nomor halaman, nilai = teks catatan (boleh kosong).
 */

import { STORAGE_KEYS, NOTE_PLACEHOLDER_OLD } from '../config.js';
import { store } from '../core/storage.js';

/** Ambil semua catatan. */
export function getNotes() {
  const notes = store.getJSON(STORAGE_KEYS.notes, {});
  // Bersihkan teks bawaan lama agar catatan kosong tampil rapi.
  Object.keys(notes).forEach((page) => {
    if (notes[page] === NOTE_PLACEHOLDER_OLD) notes[page] = '';
  });
  return notes;
}

/** Simpan semua catatan. */
export function saveNotes(notes) {
  store.set(STORAGE_KEYS.notes, JSON.stringify(notes));
}

/** Apakah halaman ini sudah ditandai? */
export function hasNote(page) {
  return Object.prototype.hasOwnProperty.call(getNotes(), page);
}
