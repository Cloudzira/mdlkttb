/**
 * ui/theme.js — Tema terang / gelap.
 */

import { $ } from '../core/dom.js';
import { store } from '../core/storage.js';
import { STORAGE_KEYS } from '../config.js';
import { ICON_SUN, ICON_MOON } from '../core/icons.js';

const THEME_COLOR_DARK = '#0e0a05';
const THEME_COLOR_LIGHT = '#f7f1e3';

/** Ganti antara tema gelap dan terang, lalu simpan pilihannya. */
export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  store.set(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  applyThemeIcon();
}

/** Sesuaikan ikon tombol tema (matahari/bulan) dan warna bilah browser. */
export function applyThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-icon').forEach((el) => {
    el.innerHTML = isDark ? ICON_SUN : ICON_MOON;
  });

  const meta = $('meta-theme-color');
  if (meta) meta.setAttribute('content', isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}
