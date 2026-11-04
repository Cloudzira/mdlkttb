/**
 * features/night-mode.js — Mode baca malam (warna halaman PDF dibalik).
 */

import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { store } from '../core/storage.js';
import { STORAGE_KEYS } from '../config.js';
import { toast } from '../ui/toast.js';

/** Terapkan status mode malam ke kanvas dan tombolnya. */
export function applyNight() {
  $('pdf-canvas').classList.toggle('night', state.nightMode);
  $('btn-night').classList.toggle('active', state.nightMode);
}

export function toggleNight() {
  state.nightMode = !state.nightMode;
  store.set(STORAGE_KEYS.nightMode, state.nightMode ? '1' : '0');
  applyNight();
  toast(state.nightMode ? 'Mode baca malam aktif' : 'Mode baca malam nonaktif');
}
