/**
 * ui/actions.js — Menghubungkan tombol di HTML dengan fungsi JavaScript.
 *
 * Di index.html, tombol memakai atribut data-action, contoh:
 *     <button data-action="zoom-in">
 * Satu pendengar klik di sini membaca nama aksi itu lalu menjalankan fungsi yang cocok.
 * Daftar aksi (nama -> fungsi) ada di main.js.
 */

/**
 * @param {Object<string, Function>} handlers  Peta nama aksi ke fungsi.
 */
export function setupActions(handlers) {
  document.addEventListener('click', (e) => {
    const element = e.target.closest('[data-action]');
    if (!element) return;

    const handler = handlers[element.dataset.action];
    if (handler) handler();
  });
}
