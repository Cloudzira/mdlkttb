/**
 * features/chapters.js — Mencari bab berdasarkan nomor halaman.
 */

import { PAGE_OFFSET } from '../config.js';
import { TOC_DATA } from '../data/toc.js';

/** Indeks bab (di TOC_DATA) yang memuat halaman PDF `page`; -1 jika sebelum bab pertama. */
export function chapterIndexForPage(page) {
  const tocPage = page - PAGE_OFFSET;
  let index = -1;
  TOC_DATA.forEach((item, i) => {
    if (item.page <= tocPage) index = i;
  });
  return index;
}

/** Judul bab untuk halaman PDF `page`. */
export function chapterTitleForPage(page) {
  const index = chapterIndexForPage(page);
  return index >= 0 ? TOC_DATA[index].title : 'Halaman Awal';
}
