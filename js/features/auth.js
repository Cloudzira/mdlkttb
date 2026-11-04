/**
 * features/auth.js — Login & logout.
 *
 * Catatan: ini penghalang ringan di sisi browser (kata sandi dibandingkan lewat hash SHA-256),
 * bukan keamanan tingkat server.
 */

import { $ } from '../core/dom.js';
import { sha256 } from '../core/utils.js';
import { startSession, endSession } from '../core/session.js';
import { PASSWORD_HASH } from '../config.js';
import { ICON_EYE, ICON_EYE_OFF } from '../core/icons.js';
import { showScreen } from '../ui/router.js';
import { showConfirm } from '../ui/dialogs.js';

const SHAKE_DURATION_MS = 400;

/** Proses formulir login. */
async function handleLogin(e) {
  e.preventDefault();

  const name = $('username').value.trim();
  const password = $('password').value;
  const errorBox = $('pwd-error');
  const errorText = $('pwd-error-text');
  const card = document.querySelector('.auth-card');

  // Tampilkan pesan error dan goyangkan kartu login.
  const fail = (message) => {
    errorText.textContent = message;
    errorBox.style.display = 'flex';
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), SHAKE_DURATION_MS);
  };

  if (!name) return fail('Nama / username wajib diisi.');
  if (!password) return fail('Kata sandi wajib diisi.');

  let hash = '';
  try {
    hash = await sha256(password);
  } catch (err) {
    return fail('Browser tidak mendukung login aman. Buka lewat https.');
  }
  if (hash !== PASSWORD_HASH) return fail('Kata sandi salah. Silakan coba lagi.');

  errorBox.style.display = 'none';
  startSession(name);
  $('password').value = '';
  showScreen('toc-screen', { push: false, replace: true });
}

/** Tampilkan / sembunyikan kata sandi (ikon mata). */
export function togglePassword() {
  const input = $('password');
  const willShow = input.type === 'password';
  input.type = willShow ? 'text' : 'password';
  $('eye-icon').innerHTML = willShow ? ICON_EYE_OFF : ICON_EYE;
}

/** Keluar dari aplikasi setelah konfirmasi. Catatan pengguna tetap tersimpan. */
export async function logout() {
  const confirmed = await showConfirm(
    'Keluar dari aplikasi?',
    'Anda perlu memasukkan kata sandi lagi untuk membuka modul. Catatan Anda tetap tersimpan.',
    'Keluar',
    false,
  );
  if (!confirmed) return;

  endSession();
  $('username').value = '';
  $('password').value = '';
  showScreen('login-screen', { push: false, replace: true });
}

/** Pasang event formulir login. */
export function setupAuthEvents() {
  $('login-form').addEventListener('submit', handleLogin);
  $('password').addEventListener('input', () => { $('pwd-error').style.display = 'none'; });
}
