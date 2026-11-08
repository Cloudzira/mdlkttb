/**
 * ui/about.js — Modal "Tentang Aplikasi".
 */

import { $ } from '../core/dom.js';
import { APP_VERSION } from '../config.js';

export function openAbout() {
  const modal = $('about-modal');
  $('about-version').textContent = APP_VERSION;
  modal.classList.add('show');
  $('about-close').onclick = $('about-ok').onclick = () => closeAbout();
  modal.onclick = (e) => { if (e.target === modal) closeAbout(); };
  $('about-ok').focus();
}

export function closeAbout() {
  const modal = $('about-modal');
  modal.classList.remove('show');
  modal.onclick = $('about-close').onclick = $('about-ok').onclick = null;
}
