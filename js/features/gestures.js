/**
 * features/gestures.js — Gestur sentuh & mouse di layar pembaca.
 *
 *  - Cubit dua jari        : zoom
 *  - Geser kiri/kanan      : ganti halaman (hanya saat tidak di-zoom)
 *  - Ketuk dua kali        : zoom 2x di titik ketukan / kembali normal
 *  - Ctrl + scroll mouse   : zoom di titik kursor (desktop)
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

/** Hapus pratinjau cubitan dari kanvas. */
function clearPreview() {
  canvas.style.transform = '';
  canvas.style.transformOrigin = '';
}

export function setupGestures() {
  let pinch = null;
  let swipe = null;
  let multiTouch = false;
  let lastTap = 0;

  /** Selesaikan cubitan: terapkan zoom akhir (dipanggil saat salah satu jari diangkat atau gestur batal). */
  const finishPinch = () => {
    if (!pinch) return;
    const finalZoom = pinch.baseZoom * pinch.ratio;
    const pinchAnchor = pinch.anchor;
    pinch = null;
    if (Math.abs(finalZoom - state.zoom) > 0.01) setZoom(finalZoom, true, pinchAnchor);
    else clearPreview();
  };

  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      multiTouch = true;
      swipe = null;
      lastTap = 0;
      clearPreview();
      const anchor = captureAnchor();
      pinch = { distance: distance(e.touches), baseZoom: state.zoom, ratio: 1, anchor, shiftX: 0, shiftY: 0 };
      if (anchor) {
        canvas.style.transformOrigin = `${anchor.fx * 100}% ${anchor.fy * 100}%`;
        // Jarak titik anchor ke tengah layar: hasil akhir zoom menaruh titik itu di tengah layar,
        // jadi pratinjau ikut bergeser ke sana agar tidak "melompat" saat jari diangkat.
        const v = viewer.getBoundingClientRect();
        const c = canvas.getBoundingClientRect();
        pinch.shiftX = (v.left + v.width / 2) - (c.left + anchor.fx * c.width);
        pinch.shiftY = (v.top + v.height / 2) - (c.top + anchor.fy * c.height);
      }
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
      // Cegah halaman ikut tergulir / ter-zoom oleh browser selama cubitan.
      if (e.cancelable) e.preventDefault();
      const target = clamp(pinch.baseZoom * (distance(e.touches) / pinch.distance), ZOOM_MIN, ZOOM_MAX);
      pinch.ratio = target / pinch.baseZoom;
      const follow = pinch.ratio > 1 ? 1 - 1 / pinch.ratio : 0; // makin besar zoom, makin dekat ke tengah
      canvas.style.transform = `translate(${pinch.shiftX * follow}px, ${pinch.shiftY * follow}px) scale(${pinch.ratio})`; // pratinjau instan, render tajam setelah jari diangkat
    }
  }, { passive: false });

  viewer.addEventListener('touchend', (e) => {
    // Cubitan selesai begitu salah satu jari diangkat.
    if (pinch && e.touches.length < 2) {
      finishPinch();
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

    // Ketuk dua kali = zoom 2x di titik ketukan / kembali normal.
    const isTap = Math.abs(dx) < TAP_MAX_MOVE && Math.abs(dy) < TAP_MAX_MOVE && duration < TAP_MAX_DURATION;
    if (isTap) {
      const now = Date.now();
      if (now - lastTap < DOUBLE_TAP_GAP) {
        lastTap = 0;
        if (state.zoom > FIT_ZOOM_LIMIT) setZoom(1);
        else setZoom(2, false, captureAnchor(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
      } else {
        lastTap = now;
      }
    }
  });

  // Gestur dibatalkan sistem (mis. panggilan masuk): rapikan, jangan biarkan pratinjau menggantung.
  viewer.addEventListener('touchcancel', () => {
    swipe = null;
    if (pinch) finishPinch();
  });

  // Zoom dengan Ctrl + scroll mouse / cubit di trackpad (desktop), berpusat di kursor
  viewer.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), true, captureAnchor(e.clientX, e.clientY));
  }, { passive: false });

  // Safari iOS: matikan zoom halaman bawaan browser agar tidak bentrok dengan zoom aplikasi.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    viewer.addEventListener(type, (e) => e.preventDefault());
  });
}
