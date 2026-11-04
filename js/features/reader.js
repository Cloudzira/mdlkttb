/**
 * features/reader.js — Layar pembaca: membuka halaman, menggambar PDF, navigasi, dan zoom.
 */

import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { store } from '../core/storage.js';
import { clamp } from '../core/utils.js';
import { isLoggedIn } from '../core/session.js';
import {
  PAGE_OFFSET, MAX_PAGE_WIDTH, ZOOM_MIN, ZOOM_MAX,
  MAX_CANVAS_PIXELS, MAX_PIXEL_RATIO, STORAGE_KEYS,
} from '../config.js';
import { showScreen } from '../ui/router.js';
import { toast } from '../ui/toast.js';
import { loadPDF, setLoadStatusListener } from '../services/pdf-loader.js';
import { hasNote } from '../services/notes-store.js';
import { chapterTitleForPage } from './chapters.js';
import { setOverlay, describeLoadError } from './reader-overlay.js';

// Elemen yang juga dipakai modul lain (gestur, mode malam)
export const canvas = $('pdf-canvas');
export const viewer = $('pdf-viewer-container');
const ctx = canvas.getContext('2d');

// ===============================================================
// MEMUAT DOKUMEN
// ===============================================================

/** Muat PDF lalu isi total halaman di tampilan. */
async function loadDocument() {
  const doc = await loadPDF();
  $('page-count').textContent = doc.numPages;
  $('page-num').max = doc.numPages;
  return doc;
}

/** Muat di latar belakang agar tombol "Lanjut Baca" terasa instan. */
export function preloadDocument() {
  if (state.pdfDoc || state.pdfPromise || !isLoggedIn()) return Promise.resolve();
  if (navigator.connection && navigator.connection.saveData) return Promise.resolve();
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return Promise.resolve(); // HP RAM kecil: jangan muat di latar belakang
  return loadDocument().catch(() => {});
}

/** Dipanggil saat layar pembaca dibuka. */
export async function enterReader() {
  try {
    if (!state.pdfDoc) {
      setOverlay('loading', 'Menyiapkan dokumen...', '', null);
      await loadDocument();
    }
    setOverlay('hide');
    state.pageNum = clamp(state.pageNum, 1, state.pdfDoc.numPages);
    renderPage(state.pageNum);
  } catch (err) {
    console.error(err);
    const [title, detail] = describeLoadError(err);
    setOverlay('error', title, detail);
  }
}

/** Tombol "Coba Lagi" pada overlay error. */
export function retryLoad() {
  state.pdfPromise = null;
  enterReader();
}

// ===============================================================
// MENGGAMBAR HALAMAN
// ===============================================================

/**
 * Gambar halaman PDF ke kanvas.
 * @param {number} pageNumber  Nomor halaman PDF.
 * @param {{fx:number, fy:number|null}} [anchor]  Titik tengah yang dipertahankan saat zoom/rotasi.
 */
export async function renderPage(pageNumber, anchor) {
  if (!state.pdfDoc) return;

  pageNumber = clamp(pageNumber, 1, state.pdfDoc.numPages);
  state.pageNum = pageNumber;
  const token = ++state.renderToken;

  // Batalkan render sebelumnya yang belum selesai.
  if (state.renderTask) {
    try { state.renderTask.cancel(); } catch (e) { /* abaikan */ }
    state.renderTask = null;
  }
  updateReaderUI();
  canvas.classList.add('loading');

  try {
    const page = await state.pdfDoc.getPage(pageNumber);
    if (token !== state.renderToken) return; // sudah ada render yang lebih baru

    // Hitung ukuran tampil (CSS) sesuai lebar layar dan zoom.
    const baseViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(200, viewer.clientWidth - 32);
    const fitWidth = Math.min(availableWidth, MAX_PAGE_WIDTH);
    const cssScale = (fitWidth / baseViewport.width) * state.zoom;
    const cssWidth = baseViewport.width * cssScale;
    const cssHeight = baseViewport.height * cssScale;

    // Resolusi tajam, tapi dibatasi agar HP tidak kehabisan memori.
    let outputScale = cssScale * Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (baseViewport.width * outputScale * baseViewport.height * outputScale > MAX_CANVAS_PIXELS) {
      outputScale = Math.sqrt(MAX_CANVAS_PIXELS / (baseViewport.width * baseViewport.height));
    }

    // Gambar dulu di kanvas tersembunyi, baru disalin (mencegah layar berkedip).
    const viewport = page.getViewport({ scale: outputScale });
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.floor(viewport.width);
    offscreen.height = Math.floor(viewport.height);
    const offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.fillStyle = '#ffffff';
    offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    state.renderTask = page.render({ canvasContext: offscreenCtx, viewport });
    await state.renderTask.promise;
    if (token !== state.renderToken) return;

    canvas.width = offscreen.width;
    canvas.height = offscreen.height;
    ctx.drawImage(offscreen, 0, 0);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.classList.remove('loading');
    state.renderTask = null;

    // Halaman baru: rata tengah & mulai dari atas. Zoom/rotasi: pertahankan titik tengah.
    restoreAnchor(anchor || { fx: 0.5, fy: null });
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') return;
    console.error(err);
    if (token === state.renderToken) {
      canvas.classList.remove('loading');
      toast('Gagal menampilkan halaman. Coba lagi.');
    }
  }
}

/** Perbarui semua teks/tombol pembaca sesuai halaman saat ini, lalu simpan posisi baca. */
export function updateReaderUI() {
  const total = state.pdfDoc ? state.pdfDoc.numPages : 0;
  const page = state.pageNum;

  $('page-num').value = page;
  $('page-count').textContent = total || 0;
  $('btn-prev').disabled = page <= 1;
  $('btn-next').disabled = !total || page >= total;
  $('rt-main').textContent = chapterTitleForPage(page);
  $('rt-sub').textContent = total ? `Halaman ${page} dari ${total}` : `Halaman ${page}`;
  $('read-progress-fill').style.width = total ? ((page / total) * 100) + '%' : '0%';
  $('btn-bookmark').classList.toggle('active', hasNote(page));

  // Simpan posisi terakhir dibaca secara otomatis.
  store.set(STORAGE_KEYS.savedPage, page);
}

// ===============================================================
// NAVIGASI HALAMAN
// ===============================================================

/** Lompat ke halaman PDF `n`. */
export function goToPdfPage(n, resetScroll = true) {
  if (!state.pdfDoc) return;
  n = clamp(n, 1, state.pdfDoc.numPages);
  if (resetScroll) viewer.scrollTop = 0;
  renderPage(n);
}

export function prevPage() {
  if (state.pdfDoc && state.pageNum > 1) goToPdfPage(state.pageNum - 1);
}

export function nextPage() {
  if (state.pdfDoc && state.pageNum < state.pdfDoc.numPages) goToPdfPage(state.pageNum + 1);
}

/** Buka pembaca di halaman terakhir dibaca. */
export function openReader() {
  state.pageNum = parseInt(store.get(STORAGE_KEYS.savedPage, '1')) || 1;
  showScreen('reader-screen');
}

/** Buka pembaca dari nomor halaman DAFTAR ISI (memperhitungkan PAGE_OFFSET). */
export function goToTocPage(tocPage) {
  state.pageNum = Math.max(1, tocPage + PAGE_OFFSET);
  store.set(STORAGE_KEYS.savedPage, state.pageNum);
  showScreen('reader-screen');
}

/** Buka pembaca di nomor halaman PDF yang tepat (dipakai oleh daftar catatan). */
export function goToExactPage(page) {
  state.pageNum = Math.max(1, page);
  store.set(STORAGE_KEYS.savedPage, state.pageNum);
  showScreen('reader-screen');
}

// ===============================================================
// ZOOM
// ===============================================================

/** Titik tengah layar pada halaman (pecahan 0..1), agar zoom selalu berpusat di tengah. */
export function captureAnchor() {
  const viewerRect = viewer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return null;
  return {
    fx: ((viewerRect.left + viewerRect.width / 2) - canvasRect.left) / canvasRect.width,
    fy: ((viewerRect.top + viewerRect.height / 2) - canvasRect.top) / canvasRect.height,
  };
}

/** Gulir agar titik anchor kembali berada di tengah layar. */
function restoreAnchor(anchor) {
  const viewerRect = viewer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  if (!anchor) return;

  viewer.scrollLeft += (canvasRect.left + anchor.fx * canvasRect.width) - (viewerRect.left + viewerRect.width / 2);
  if (anchor.fy === null) viewer.scrollTop = 0;
  else viewer.scrollTop += (canvasRect.top + anchor.fy * canvasRect.height) - (viewerRect.top + viewerRect.height / 2);
}

/**
 * Ubah zoom.
 * @param {number}  zoomValue  Zoom baru.
 * @param {boolean} [silent]   true = jangan tampilkan pesan "Zoom xx%".
 * @param {object}  [anchor]   Titik tengah yang dipertahankan.
 */
export function setZoom(zoomValue, silent, anchor) {
  const next = clamp(Math.round(zoomValue * 100) / 100, ZOOM_MIN, ZOOM_MAX);
  if (next === state.zoom) return;

  const keepAnchor = anchor || captureAnchor();
  state.zoom = next;
  store.set(STORAGE_KEYS.zoom, state.zoom);
  if (!silent) toast(`Zoom ${Math.round(state.zoom * 100)}%`, { duration: 900 });
  if (state.pdfDoc) renderPage(state.pageNum, keepAnchor);
}

export const zoomIn = () => setZoom(state.zoom * 1.25);
export const zoomOut = () => setZoom(state.zoom / 1.25);

// ===============================================================
// PENGATURAN EVENT
// ===============================================================

/** Pasang semua pendengar event milik layar pembaca. */
export function setupReaderEvents() {
  // Laporan status pemuatan PDF -> overlay
  setLoadStatusListener((text, subText, progress) => setOverlay('loading', text, subText, progress));

  // Ketik nomor halaman lalu Enter / pindah fokus
  const pageInput = $('page-num');
  const commitPage = () => {
    const n = parseInt(pageInput.value);
    if (state.pdfDoc && n >= 1 && n <= state.pdfDoc.numPages) goToPdfPage(n);
    else pageInput.value = state.pageNum;
  };
  pageInput.addEventListener('change', commitPage);
  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { commitPage(); pageInput.blur(); }
  });
  pageInput.addEventListener('focus', () => pageInput.select());

  // Gambar ulang saat ukuran layar berubah (rotasi HP / resize jendela)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.pdfDoc && $('reader-screen').classList.contains('active')) {
        renderPage(state.pageNum, captureAnchor());
      }
    }, 250);
  });
}
