/**
 * features/notes.js — Penanda halaman & catatan (popup, daftar catatan, unduh).
 */

import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';
import { showBookmarks } from '../ui/router.js';
import { toast } from '../ui/toast.js';
import { showConfirm } from '../ui/dialogs.js';
import { getNotes, saveNotes } from '../services/notes-store.js';
import { chapterTitleForPage } from './chapters.js';
import { goToExactPage, updateReaderUI } from './reader.js';

/** Urutkan nomor halaman yang punya catatan, dari kecil ke besar. */
const sortedPages = (notes) => Object.keys(notes).map(Number).sort((a, b) => a - b);

// ===============================================================
// POPUP CATATAN (di layar pembaca)
// ===============================================================

/** Buka popup untuk menyimpan / mengubah / menghapus catatan halaman yang sedang dibaca. */
export function openNoteModal() {
  if (!state.pdfDoc) return;

  const page = state.pageNum;
  const notes = getNotes();
  const exists = Object.prototype.hasOwnProperty.call(notes, page);
  const modal = $('note-modal');
  const textarea = $('note-text');

  $('note-title').textContent = exists ? `Catatan Halaman ${page}` : `Simpan Halaman ${page}`;
  $('note-chapter').textContent = chapterTitleForPage(page);
  $('note-save').textContent = exists ? 'Perbarui' : 'Simpan';
  $('note-delete').style.display = exists ? '' : 'none';
  textarea.value = notes[page] || '';
  modal.classList.add('show');
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, 60);

  const close = () => {
    modal.classList.remove('show');
    $('note-save').onclick = $('note-cancel').onclick = $('note-delete').onclick = modal.onclick = textarea.onkeydown = null;
  };

  const save = () => {
    const all = getNotes();
    all[page] = textarea.value.trim();
    saveNotes(all);
    close();
    updateReaderUI();
    toast(
      exists ? `Catatan halaman ${page} diperbarui` : `Halaman ${page} disimpan`,
      { actionLabel: 'Lihat catatan', onAction: showBookmarks, duration: 3200 },
    );
  };

  const remove = async () => {
    const hasText = (textarea.value || '').trim().length > 0;
    close();
    if (hasText) {
      const confirmed = await showConfirm('Hapus penanda?', `Penanda dan catatan halaman ${page} akan dihapus.`, 'Hapus', false);
      if (!confirmed) return;
    }
    const all = getNotes();
    delete all[page];
    saveNotes(all);
    updateReaderUI();
    toast(`Penanda halaman ${page} dihapus`);
  };

  $('note-save').onclick = save;
  $('note-cancel').onclick = close;
  $('note-delete').onclick = remove;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  textarea.onkeydown = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  };
}

// ===============================================================
// LAYAR "PENANDA & CATATAN"
// ===============================================================

/** Tampilkan semua halaman yang ditandai beserta catatannya. */
export function renderBookmarks() {
  const notes = getNotes();
  const container = $('bookmarks-list');
  const pages = sortedPages(notes);

  $('bm-toolbar').style.display = pages.length ? '' : 'none';

  if (pages.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
              <svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              <p>Belum ada halaman yang ditandai.<br>Ketuk ikon penanda saat membaca untuk menyimpan halaman dan menulis catatan.</p>
              <button class="btn" style="margin-top:1rem;" data-action="open-reader">Mulai Membaca</button>
            </div>`;
    return;
  }

  container.innerHTML = pages.map((page) => `
          <div class="bm-item" data-page="${page}">
            <div class="bm-header">
              <div class="bm-info">
                <button class="bm-page-badge" data-open="${page}">Buka Halaman ${page}</button>
                <div class="bm-chapter">${escapeHtml(chapterTitleForPage(page))}</div>
              </div>
              <button class="btn-icon" style="width:32px;height:32px;" data-delete="${page}" title="Hapus" aria-label="Hapus penanda halaman ${page}">
                <svg class="icon" style="width:14px;height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
            <textarea class="bm-textarea" data-note="${page}" placeholder="Tulis poin penting di sini..." aria-label="Catatan halaman ${page}">${escapeHtml(notes[page] || '')}</textarea>
          </div>
        `).join('');

  container.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => goToExactPage(parseInt(button.dataset.open)));
  });
  container.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteBookmark(parseInt(button.dataset.delete)));
  });
  container.querySelectorAll('[data-note]').forEach((textarea) => {
    textarea.addEventListener('input', () => updateNote(parseInt(textarea.dataset.note), textarea.value));
  });
}

/** Simpan perubahan teks catatan (dipanggil setiap kali pengguna mengetik). */
function updateNote(page, text) {
  const notes = getNotes();
  notes[page] = text;
  saveNotes(notes);
}

async function deleteBookmark(page) {
  const confirmed = await showConfirm('Hapus penanda?', `Penanda dan catatan halaman ${page} akan dihapus.`, 'Hapus', false);
  if (!confirmed) return;

  const notes = getNotes();
  delete notes[page];
  saveNotes(notes);
  renderBookmarks();
  toast('Penanda dihapus');
}

// ===============================================================
// UNDUH CATATAN
// ===============================================================

/** Unduh semua catatan sebagai file teks (.txt). */
export function exportNotes() {
  const notes = getNotes();
  const pages = sortedPages(notes);
  if (!pages.length) return;

  const lines = ['CATATAN - MODUL AL FATIH', '========================', ''];
  pages.forEach((page) => {
    lines.push(`Halaman ${page} - ${chapterTitleForPage(page)}`);
    lines.push((notes[page] || '').trim() || '(tanpa catatan)');
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'catatan-modul-al-fatih.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast('Catatan diunduh');
}
