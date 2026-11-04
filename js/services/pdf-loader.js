/**
 * services/pdf-loader.js — Memuat pustaka PDF.js dan membuka buku terenkripsi.
 *
 * Alur memuat buku:
 *   1. ensurePdfJs()   -> muat pustaka PDF.js dari CDN
 *   2. fetchBook()     -> unduh file buku.enc (dengan laporan progres)
 *   3. decryptBook()   -> dekripsi AES-CBC menjadi data PDF
 *   4. PDF.js membuka data PDF -> disimpan di state.pdfDoc
 *
 * Modul ini tidak menyentuh tampilan. Laporan status dikirim lewat
 * setLoadStatusListener() supaya tampilan (overlay) diatur oleh modul pembaca.
 */

import {
  BOOK_FILE, BOOK_PASSPHRASE, BOOK_SALT, PBKDF2_ITERATIONS, IV_LENGTH,
  PDFJS_BASE, STORAGE_KEYS,
} from '../config.js';
import { state } from '../core/state.js';
import { store } from '../core/storage.js';

// ---------------------------------------------------------------
// Laporan status ke tampilan
// ---------------------------------------------------------------
let statusListener = () => {};

/** Daftarkan fungsi (teks, subTeks, progres 0..1 atau null) yang menerima laporan status. */
export function setLoadStatusListener(listener) {
  statusListener = listener;
}

// ---------------------------------------------------------------
// 1. Pustaka PDF.js (dimuat saat dibutuhkan, bukan di awal,
//    supaya aplikasi langsung tampil walau sinyal lambat)
// ---------------------------------------------------------------
let pdfJsPromise = null;

export function ensurePdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_BASE + 'pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
      resolve();
    };
    script.onerror = () => {
      pdfJsPromise = null;
      script.remove();
      reject(new Error('NO_PDFJS'));
    };
    document.head.appendChild(script);
  });

  return pdfJsPromise;
}

// ---------------------------------------------------------------
// 2. Unduh buku terenkripsi
// ---------------------------------------------------------------
async function fetchBook(onProgress) {
  const response = await fetch(BOOK_FILE);
  if (!response.ok) throw new Error('NOT_FOUND');

  const totalBytes = parseInt(response.headers.get('Content-Length')) || 0;
  if (!response.body || !response.body.getReader) return await response.arrayBuffer();

  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (totalBytes) onProgress(Math.min(0.99, receivedBytes / totalBytes));
  }

  // Gabungkan semua potongan menjadi satu buffer.
  const all = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return all.buffer;
}

// ---------------------------------------------------------------
// 3. Dekripsi buku (AES-CBC; kunci diturunkan dengan PBKDF2)
// ---------------------------------------------------------------
async function decryptBook(encryptedBuffer) {
  const iv = new Uint8Array(encryptedBuffer, 0, IV_LENGTH);
  const cipherText = new Uint8Array(encryptedBuffer, IV_LENGTH);
  const encoder = new TextEncoder();

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', encoder.encode(BOOK_PASSPHRASE), { name: 'PBKDF2' }, false, ['deriveKey'],
  );

  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(BOOK_SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-CBC', length: 256 }, false, ['decrypt'],
  );

  try {
    return await window.crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, cipherText);
  } catch (e) {
    throw new Error('DECRYPT_FAILED');
  }
}

// ---------------------------------------------------------------
// 4. Buka dokumen
// ---------------------------------------------------------------
const DOWNLOAD_HINT = 'Mohon tunggu, proses pertama kali bisa agak lama.';

/**
 * Muat buku (sekali saja). Jika sudah dimuat atau sedang dimuat, hasil yang sama dipakai ulang.
 * @returns {Promise<object>} dokumen PDF.js
 */
export function loadPDF() {
  if (state.pdfDoc) return Promise.resolve(state.pdfDoc);
  if (state.pdfPromise) return state.pdfPromise;

  state.pdfPromise = (async () => {
    statusListener('Menyiapkan pembaca...', '', null);
    await ensurePdfJs();

    statusListener('Mengunduh dokumen...', DOWNLOAD_HINT, 0);
    const encrypted = await fetchBook((progress) => {
      statusListener(`Mengunduh dokumen... ${Math.round(progress * 100)}%`, DOWNLOAD_HINT, progress);
    });

    statusListener('Membuka dokumen aman...', 'Sedang mendekripsi isi buku.', 1);
    const decrypted = await decryptBook(encrypted);

    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(decrypted) }).promise;
    state.pdfDoc = doc;
    store.set(STORAGE_KEYS.bookTotal, doc.numPages);
    return doc;
  })();

  // Jika gagal, kosongkan agar bisa dicoba lagi.
  state.pdfPromise.catch(() => { state.pdfPromise = null; });
  return state.pdfPromise;
}
