/**
 * features/reader.js — Layar pembaca: membuka halaman, menggambar PDF, navigasi, dan zoom.
 */

import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { store, tabStore, isPageReload } from '../core/storage.js';
import { clamp } from '../core/utils.js';
import { isLoggedIn } from '../core/session.js';
import {
  PAGE_OFFSET, MAX_PAGE_WIDTH, ZOOM_MIN, ZOOM_MAX,
  MAX_CANVAS_PIXELS, MAX_PIXEL_RATIO, STORAGE_KEYS, TAB_KEYS,
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

/** Posisi baca (halaman + titik tengah layar) yang dipulihkan SEKALI setelah refresh. */
let pendingPosition = null;
if (isPageReload() && tabStore.get(TAB_KEYS.screen) === 'reader-screen') {
  try { pendingPosition = JSON.parse(tabStore.get(TAB_KEYS.readerPos)); } catch (e) { pendingPosition = null; }
}

/** Keadaan gambar yang sedang tampil di kanvas (dipakai untuk pratinjau zoom instan). */
const view = { page: 0, zoom: 1, width: 0, height: 0 };

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

    // Setelah refresh: kembali ke titik yang sama di halaman yang sama (bukan ke awal halaman).
    const saved = pendingPosition;
    pendingPosition = null;
    const canRestore = saved && saved.page === state.pageNum
      && Number.isFinite(saved.fx) && Number.isFinite(saved.fy);
    renderPage(state.pageNum, canRestore ? { fx: clamp(saved.fx, 0, 1), fy: clamp(saved.fy, 0, 1) } : undefined);
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
 * @param {{fx:number, fy:number|null}|'keep'} [anchor]
 *        Titik tengah yang dipertahankan. Kosong = halaman baru (rata tengah, mulai dari atas).
 *        'keep' = pertahankan posisi layar saat ini (dipakai saat zoom/rotasi).
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
  // Redupkan hanya saat ganti halaman; saat zoom/rotasi gambar lama tetap terang (tanpa berkedip).
  if (pageNumber !== view.page) canvas.classList.add('loading');

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

    // Zoom/rotasi: catat titik tengah layar tepat sebelum gambar diganti (pengguna mungkin sudah menggeser).
    const keepAnchor = anchor === 'keep' ? captureAnchor() : anchor;

    canvas.width = offscreen.width;
    canvas.height = offscreen.height;
    ctx.drawImage(offscreen, 0, 0);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.classList.remove('loading');
    state.renderTask = null;

    // Lepaskan memori kanvas sementara (penting di iPhone/Safari agar tidak crash saat zoom besar).
    offscreen.width = offscreen.height = 0;
    try { page.cleanup(); } catch (e) { /* abaikan */ }

    view.page = pageNumber;
    view.zoom = state.zoom;
    view.width = cssWidth;
    view.height = cssHeight;

    // Halaman baru: rata tengah & mulai dari atas. Zoom/rotasi: pertahankan titik tengah.
    restoreAnchor(keepAnchor || { fx: 0.5, fy: null });
    savePosition();
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') return;
    console.error(err);
    if (token === state.renderToken) {
      canvas.classList.remove('loading');
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';
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

/**
 * Titik pada halaman (pecahan 0..1) yang berada di posisi (x, y) layar.
 * Tanpa argumen = titik tengah area baca. Nilai selalu dibatasi 0..1 sehingga zoom tidak
 * "melompat" ketika halaman lebih kecil dari layar (mis. saat diperkecil).
 */
export function captureAnchor(x, y) {
  const viewerRect = viewer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return null;
  const px = x === undefined ? viewerRect.left + viewerRect.width / 2 : x;
  const py = y === undefined ? viewerRect.top + viewerRect.height / 2 : y;
  const fx = clamp((px - canvasRect.left) / canvasRect.width, 0, 1);
  let fy = clamp((py - canvasRect.top) / canvasRect.height, 0, 1);
  // Halaman lebih pendek dari layar (zoom kecil): zoom berpusat di tengah halaman, bukan di tepi bawahnya.
  if (y === undefined && canvasRect.height < viewerRect.height) fy = 0.5;
  return { fx, fy };
}

/** Gulir agar titik anchor kembali berada di tengah layar. */
function restoreAnchor(anchor) {
  if (!anchor) return;
  const viewerRect = viewer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  viewer.scrollLeft += (canvasRect.left + anchor.fx * canvasRect.width) - (viewerRect.left + viewerRect.width / 2);
  if (anchor.fy === null) viewer.scrollTop = 0;
  else viewer.scrollTop += (canvasRect.top + anchor.fy * canvasRect.height) - (viewerRect.top + viewerRect.height / 2);
}

/**
 * Ubah zoom.
 * Gambar lama langsung diperbesar/diperkecil seketika (pratinjau), lalu digambar ulang
 * dengan tajam di latar belakang.
 * @param {number}  zoomValue  Zoom baru.
 * @param {boolean} [silent]   true = jangan tampilkan pesan "Zoom xx%".
 * @param {object}  [anchor]   Titik yang dipertahankan di tengah layar (bawaan: titik tengah layar).
 */
export function setZoom(zoomValue, silent, anchor) {
  let next = clamp(Math.round(zoomValue * 100) / 100, ZOOM_MIN, ZOOM_MAX);
  if (Math.abs(next - 1) < 0.04) next = 1; // mudah kembali ke "pas layar"
  if (next === state.zoom) {
    // Pastikan sisa pratinjau cubitan (jika ada) dibersihkan.
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    return;
  }

  const keepAnchor = anchor || captureAnchor();
  const previousZoom = view.zoom || state.zoom;
  state.zoom = next;
  store.set(STORAGE_KEYS.zoom, state.zoom);
  if (!silent) toast(`Zoom ${Math.round(state.zoom * 100)}%`, { duration: 900 });
  if (!state.pdfDoc) return;

  // Pratinjau instan: ubah ukuran tampil gambar lama sesuai zoom baru.
  if (view.width && view.height && keepAnchor) {
    const ratio = next / previousZoom;
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.style.width = (view.width * ratio) + 'px';
    canvas.style.height = (view.height * ratio) + 'px';
    restoreAnchor(keepAnchor);
  }
  renderPage(state.pageNum, 'keep');
}

export const zoomIn = () => setZoom(state.zoom * 1.25);
export const zoomOut = () => setZoom(state.zoom / 1.25);

/** Simpan halaman & titik tengah layar saat ini (hanya bila gambar sedang stabil, tidak dalam proses render). */
function savePosition() {
  if (!state.pdfDoc || state.renderTask || canvas.classList.contains('loading')) return;
  if (!$('reader-screen').classList.contains('active')) return;
  const anchor = captureAnchor();
  if (!anchor) return;
  tabStore.set(TAB_KEYS.readerPos, JSON.stringify({ page: state.pageNum, fx: anchor.fx, fy: anchor.fy }));
}

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

  // Simpan posisi baca (per tab) tiap selesai menggulir, agar bisa dipulihkan setelah refresh.
  let scrollTimer;
  viewer.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(savePosition, 200);
  }, { passive: true });
  window.addEventListener('pagehide', savePosition);

  // Gambar ulang saat ukuran layar berubah (rotasi HP / resize jendela)
  // (Hanya bila LEBAR berubah; perubahan tinggi akibat bilah alamat/keyboard tidak perlu gambar ulang.)
  let resizeTimer;
  let lastWidth = viewer.clientWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!state.pdfDoc || !$('reader-screen').classList.contains('active')) return;
      const width = viewer.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      renderPage(state.pageNum, 'keep');
    }, 250);
  });
}
