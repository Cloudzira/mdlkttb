/**
 * ui/dialogs.js — Kotak dialog konfirmasi (Ya / Batal).
 */

import { $ } from '../core/dom.js';

/**
 * Tampilkan dialog konfirmasi dan tunggu jawaban pengguna.
 * @param {string}  title            Judul dialog.
 * @param {string}  text             Isi pesan.
 * @param {string}  [okLabel='Ya']   Teks tombol setuju.
 * @param {boolean} [danger=true]    true = tombol merah.
 * @returns {Promise<boolean>}       true jika pengguna menekan tombol setuju.
 */
export function showConfirm(title, text, okLabel = 'Ya', danger = true) {
  return new Promise((resolve) => {
    const modal = $('modal');
    const okButton = $('modal-ok');
    const cancelButton = $('modal-cancel');

    $('modal-title').textContent = title;
    $('modal-text').textContent = text;
    okButton.textContent = okLabel;
    okButton.className = danger ? 'btn btn-danger' : 'btn';
    modal.classList.add('show');

    const close = (answer) => {
      modal.classList.remove('show');
      okButton.onclick = null;
      cancelButton.onclick = null;
      modal.onclick = null;
      resolve(answer);
    };

    okButton.onclick = () => close(true);
    cancelButton.onclick = () => close(false);
    modal.onclick = (e) => { if (e.target === modal) close(false); };
    cancelButton.focus();
  });
}
