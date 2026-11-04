/**
 * core/utils.js — Fungsi bantu kecil yang dipakai di banyak tempat.
 */

/** Amankan teks sebelum dimasukkan ke HTML (mencegah injeksi). */
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[c]));

/** Batasi nilai agar berada di antara min dan max. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Hitung SHA-256 dari teks dan kembalikan sebagai string heksadesimal. */
export async function sha256(text) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
