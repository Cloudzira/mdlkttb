/**
 * features/toc.js — Layar daftar isi: daftar bab, pencarian, dan kartu "Terakhir dibaca".
 */

import { $ } from '../core/dom.js';
import { store } from '../core/storage.js';
import { escapeHtml } from '../core/utils.js';
import { STORAGE_KEYS } from '../config.js';
import { TOC_DATA } from '../data/toc.js';
import { chapterIndexForPage, chapterTitleForPage } from './chapters.js';
import { goToTocPage, openReader, preloadDocument } from './reader.js';

/** Tampilkan daftar bab. Bila `filter` diisi, hanya bab yang judulnya cocok. */
export function renderTocItems(filter = '') {
  const container = $('toc-list');
  const query = filter.trim().toLowerCase();
  const savedPage = parseInt(store.get(STORAGE_KEYS.savedPage, '1')) || 1;
  const currentIndex = chapterIndexForPage(savedPage);
  const rows = [];

  TOC_DATA.forEach((item, index) => {
    if (query && !item.title.toLowerCase().includes(query)) return;

    const levelClass = item.isSub ? 'toc-sub' : 'toc-head';
    const currentClass = (index === currentIndex && !query) ? 'current' : '';
    rows.push(`
            <div class="toc-item ${levelClass} ${currentClass}" role="button" tabindex="0" data-page="${item.page}">
              <span class="toc-item-title">${escapeHtml(item.title)}</span>
              <span class="toc-item-dots"></span>
              <span class="toc-item-page">${item.page}</span>
            </div>`);
  });

  container.innerHTML = rows.length
    ? rows.join('')
    : '<div class="empty-state">Tidak ada materi yang cocok dengan pencarian.</div>';

  // Setiap baris bisa diklik atau ditekan Enter/Spasi.
  container.querySelectorAll('.toc-item').forEach((el) => {
    const open = () => goToTocPage(parseInt(el.dataset.page));
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

/** Perbarui kartu "Terakhir dibaca" dan label tombol "Mulai/Lanjut Baca". */
export function updateProgressCard() {
  const savedPage = parseInt(store.get(STORAGE_KEYS.savedPage, '0')) || 0;
  const totalPages = parseInt(store.get(STORAGE_KEYS.bookTotal, '0')) || 0;
  const card = $('progress-card');
  const label = $('cta-label');

  if (savedPage < 1) {
    card.style.display = 'none';
    label.textContent = 'Mulai Baca';
    return;
  }

  card.style.display = '';
  label.textContent = 'Lanjut Baca';
  $('pc-title').textContent = chapterTitleForPage(savedPage);
  $('pc-page').textContent = totalPages ? `Halaman ${savedPage} dari ${totalPages}` : `Halaman ${savedPage}`;

  const percent = totalPages ? Math.round((savedPage / totalPages) * 100) : 0;
  $('pc-percent').textContent = totalPages ? `${percent}%` : '';
  $('pc-fill').style.width = percent + '%';
}

/** Muat buku di latar belakang setelah daftar isi tampil (saat browser sedang senggang). */
export function schedulePreload() {
  const PRELOAD_DELAY_MS = 2500;
  setTimeout(() => {
    const run = () => preloadDocument().then(updateProgressCard);
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
    else run();
  }, PRELOAD_DELAY_MS);
}

/** Pasang event pencarian dan kartu progres. */
export function setupTocEvents() {
  $('toc-search').addEventListener('input', (e) => renderTocItems(e.target.value));

  // Kartu progres bisa diaktifkan dengan keyboard
  $('progress-card').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openReader();
    }
  });
}
