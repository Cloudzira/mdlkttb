/**
 * features/gestures.js — Gestur sentuh & mouse di layar pembaca.
 *
 *  - Cubit dua jari        : zoom
 *  - Geser kiri/kanan      : ganti halaman (hanya saat tidak di-zoom)
 *  - Ketuk dua kali        : zoom 2x / kembali normal
 *  - Ctrl + scroll mouse   : zoom (desktop)
 */

import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { ZOOM_MIN, ZOOM_MAX } from '../config.js';
import { canvas, viewer, captureAnchor, setZoom, nextPage, prevPage } from './reader.js';

// Batas pengenalan gestur
const SWIPE_MIN_DISTANCE = 70; // px
const SWIPE_MAX_DURATION = 700; // ms
const TAP_MAX_MOVE = 10; // px
const TAP_MAX_DURATION = 250; // ms
const DOUBLE_TAP_GAP = 320; // ms
const FIT_ZOOM_LIMIT = 1.05; // zoom di bawah ini dianggap "pas layar"

/** Jarak antara dua jari. */
const distance = (touches) => Math.hypot(
  touches[0].clientX - touches[1].clientX,
  touches[0].clientY - touches[1].clientY,
);

export function setupGestures() {
  let pinch = null;
  let swipe = null;
  let multiTouch = false;
  let lastTap = 0;

  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      multiTouch = true;
      swipe = null;
      const anchor = captureAnchor();
      pinch = { distance: distance(e.touches), baseZoom: state.zoom, ratio: 1, anchor };
      if (anchor) canvas.style.transformOrigin = `${anchor.fx * 100}% ${anchor.fy * 100}%`;
    } else if (e.touches.length === 1) {
      if (!pinch) multiTouch = false;
      swipe = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
        wasFit: state.zoom <= FIT_ZOOM_LIMIT,
      };
    }
  }, { passive: true });

  viewer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinch) {
      const target = clamp(pinch.baseZoom * (distance(e.touches) / pinch.distance), ZOOM_MIN, ZOOM_MAX);
      pinch.ratio = target / pinch.baseZoom;
      canvas.style.transform = `scale(${pinch.ratio})`; // pratinjau instan, render tajam setelah jari diangkat
    }
  }, { passive: true });

  viewer.addEventListener('touchend', (e) => {
    // Cubitan selesai: terapkan zoom akhir.
    if (pinch && e.touches.length === 0) {
      const finalZoom = pinch.baseZoom * pinch.ratio;
      const pinchAnchor = pinch.anchor;
      pinch = null;
      if (Math.abs(finalZoom - state.zoom) > 0.01) {
        setZoom(finalZoom, true, pinchAnchor);
      } else {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
      }
      return;
    }
    if (multiTouch || e.touches.length !== 0 || !swipe || e.changedTouches.length !== 1) return;

    const dx = e.changedTouches[0].clientX - swipe.x;
    const dy = e.changedTouches[0].clientY - swipe.y;
    const duration = Date.now() - swipe.time;
    const wasFit = swipe.wasFit;
    swipe = null;

    // Geser kiri/kanan hanya mengganti halaman saat tidak sedang di-zoom.
    const isHorizontalSwipe = Math.abs(dx) > SWIPE_MIN_DISTANCE
      && Math.abs(dy) < Math.abs(dx) * 0.6
      && duration < SWIPE_MAX_DURATION;
    if (wasFit && isHorizontalSwipe) {
      if (dx < 0) nextPage(); else prevPage();
      return;
    }

    // Ketuk dua kali = zoom 2x / kembali normal.
    const isTap = Math.abs(dx) < TAP_MAX_MOVE && Math.abs(dy) < TAP_MAX_MOVE && duration < TAP_MAX_DURATION;
    if (isTap) {
      const now = Date.now();
      if (now - lastTap < DOUBLE_TAP_GAP) {
        lastTap = 0;
        setZoom(state.zoom > FIT_ZOOM_LIMIT ? 1 : 2);
      } else {
        lastTap = now;
      }
    }
  });

  // Zoom dengan Ctrl + scroll mouse (desktop)
  viewer.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), true);
  }, { passive: false });
}
