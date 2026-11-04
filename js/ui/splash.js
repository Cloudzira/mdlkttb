/**
 * ui/splash.js — Animasi layar pembuka (splash screen).
 */

import { $ } from '../core/dom.js';
import { SPLASH_VISIBLE_MS, SPLASH_FADE_MS, SPLASH_LOGO_WAIT_MS } from '../config.js';

/**
 * Jalankan splash screen, lalu panggil onFinish saat selesai memudar.
 * Splash SELALU berakhir, walaupun logo gagal dimuat.
 */
export function playSplash(onFinish) {
  const splash = $('splash-screen');
  const logo = splash.querySelector('.splash-logo');

  const startAnimation = () => {
    splash.classList.add('run');
    setTimeout(() => {
      splash.classList.add('leaving');
      setTimeout(onFinish, SPLASH_FADE_MS);
    }, SPLASH_VISIBLE_MS);
  };

  // Mulai animasi setelah logo siap (decode), atau paling lambat setelah SPLASH_LOGO_WAIT_MS.
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    startAnimation();
  };

  setTimeout(start, SPLASH_LOGO_WAIT_MS);
  if (logo && logo.decode) logo.decode().then(start, start);
  else start();
}
