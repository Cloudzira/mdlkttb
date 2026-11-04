/**
 * config.js — Pengaturan utama aplikasi.
 *
 * Ubah nilai di file ini bila ingin menyesuaikan aplikasi.
 * File lain tidak perlu disentuh untuk pengaturan sehari-hari.
 */

// ---------------------------------------------------------------
// Informasi aplikasi
// ---------------------------------------------------------------
export const APP_VERSION = '1.0.0';

// ---------------------------------------------------------------
// Buku & akses
// ---------------------------------------------------------------
export const BOOK_FILE = 'buku.enc'; // nama file buku terenkripsi
export const PASSWORD_HASH = 'c137713cd766243a20c31618b675867669be5bf6ee088fceb56d1c2ee9a51388'; // SHA-256 dari kata sandi

// Jika nomor halaman di daftar isi berselisih dengan nomor halaman PDF,
// isi selisihnya di sini (misalnya 2).
export const PAGE_OFFSET = 0;

// ---------------------------------------------------------------
// Dekripsi buku (PENTING: jangan diubah kecuali buku.enc dibuat ulang
// dengan kunci yang sama, karena nilai ini harus cocok persis)
// ---------------------------------------------------------------
export const BOOK_PASSPHRASE = 'KurniapediaSecretPass2026';
export const BOOK_SALT = 'salt';
export const PBKDF2_ITERATIONS = 100000;
export const IV_LENGTH = 16; // 16 byte pertama file buku.enc adalah IV

// ---------------------------------------------------------------
// Tampilan pembaca
// ---------------------------------------------------------------
export const MAX_PAGE_WIDTH = 900; // lebar maksimum halaman di layar besar (px)
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;
export const MAX_CANVAS_PIXELS = 14e6; // batas piksel kanvas agar HP tidak kehabisan memori
export const MAX_PIXEL_RATIO = 2.5;

// ---------------------------------------------------------------
// Pustaka PDF.js (dimuat dari CDN saat dibutuhkan)
// ---------------------------------------------------------------
export const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

// ---------------------------------------------------------------
// Splash screen (milidetik)
// ---------------------------------------------------------------
export const SPLASH_VISIBLE_MS = 2500; // lama splash tampil setelah animasi dimulai
export const SPLASH_FADE_MS = 350; // lama animasi memudar
export const SPLASH_LOGO_WAIT_MS = 800; // batas tunggu logo; lewat dari ini animasi tetap jalan

// ---------------------------------------------------------------
// Catatan
// ---------------------------------------------------------------
// Teks bawaan versi lama; bila ditemukan akan dikosongkan agar catatan tampil rapi.
export const NOTE_PLACEHOLDER_OLD = 'Tulis poin catatan penting di sini...';

// ---------------------------------------------------------------
// Nama kunci penyimpanan di browser (localStorage)
// Catatan: js/theme-init.js memakai kunci 'theme' yang sama.
// ---------------------------------------------------------------
export const STORAGE_KEYS = {
  loggedIn: 'is_logged_in',
  theme: 'theme',
  nightMode: 'night_mode',
  savedPage: 'saved_page',
  zoom: 'reader_zoom',
  bookTotal: 'book_total',
  notes: 'kurniapedia_notes',
};
