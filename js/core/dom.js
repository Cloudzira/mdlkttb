/**
 * core/dom.js — Pintasan untuk mengambil elemen HTML berdasarkan id.
 */

/** @param {string} id  @returns {HTMLElement} */
export const $ = (id) => document.getElementById(id);
