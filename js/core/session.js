/**
 * core/session.js — Status login pengguna (disimpan di browser).
 */

import { STORAGE_KEYS } from '../config.js';
import { store } from './storage.js';

export const isLoggedIn = () => !!store.get(STORAGE_KEYS.loggedIn);
export const startSession = (name) => store.set(STORAGE_KEYS.loggedIn, name);
export const endSession = () => store.remove(STORAGE_KEYS.loggedIn);
