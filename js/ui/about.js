/**
 * ui/about.js — Modal "Tentang Aplikasi" dan ikon media sosial.
 */

import { $ } from '../core/dom.js';
import { escapeHtml } from '../core/utils.js';
import { APP_VERSION } from '../config.js';
import { SOCIALS } from '../data/socials.js';
import { toast } from './toast.js';

/** Isi deretan ikon media sosial di modal "Tentang". */
export function renderSocials() {
  const html = SOCIALS.map((social, index) => {
    const icon = `<svg class="icon brand" viewBox="${social.vb}" aria-hidden="true"><path d="${social.path}"></path></svg>`;
    const name = escapeHtml(social.name);

    // Ada url -> tautan biasa. Belum ada url -> tombol yang memberi tahu "belum diisi".
    return social.url
      ? `<a class="social-btn" href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer" title="${name}" aria-label="${name}">${icon}</a>`
      : `<button type="button" class="social-btn" data-social="${index}" title="${name}" aria-label="${name}">${icon}</button>`;
  }).join('');

  const container = $('about-socials');
  container.innerHTML = html;
  container.querySelectorAll('[data-social]').forEach((button) => {
    button.addEventListener('click', () => {
      toast(`Tautan ${SOCIALS[parseInt(button.dataset.social)].name} belum diisi`);
    });
  });
}

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
