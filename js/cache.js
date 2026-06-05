// cache.js — LocalStorage/SessionStorage con TTL + logger

import { CONFIG, log } from './config.js';

const PREFIX = CONFIG.cache.clave + '_';
const TTL    = CONFIG.cache.duracion;

// Serializa y guarda con timestamp de expiración
export function guardarCache(clave, datos, ttl = TTL, session = false) {
  try {
    const entrada = { datos, expira: Date.now() + ttl, v: CONFIG.version };
    (session ? sessionStorage : localStorage).setItem(PREFIX + clave, JSON.stringify(entrada));
    return true;
  } catch (err) {
    if (err.name === 'QuotaExceededError') _limpiarExpirados();
    log.warn('guardarCache:', err.message);
    return false;
  }
}

// Lee y valida TTL; retorna null si no existe o expiró
export function obtenerCache(clave, session = false) {
  try {
    const raw = (session ? sessionStorage : localStorage).getItem(PREFIX + clave);
    if (!raw) return null;
    const e = JSON.parse(raw);
    if (Date.now() > e.expira) { eliminarCache(clave, session); return null; }
    return e.datos;
  } catch {
    eliminarCache(clave, session);
    return null;
  }
}

export function eliminarCache(clave, session = false) {
  (session ? sessionStorage : localStorage).removeItem(PREFIX + clave);
}

// Limpia TODO el caché de la app (logout)
export function limpiarCache(incluirSession = true) {
  _limpiarStore(localStorage);
  if (incluirSession) _limpiarStore(sessionStorage);
  log.info('Caché limpiado');
}

// Cache-first: usa caché o ejecuta fn y cachea
export async function cargarConCache(clave, fn, ttl = TTL) {
  const cached = obtenerCache(clave);
  if (cached !== null) { log.info('Cache hit:', clave); return cached; }
  const datos = await fn();
  guardarCache(clave, datos, ttl);
  return datos;
}

// Estadísticas de uso — solo en modo debug
export function estadisticasCache() {
  const claves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) claves.push(k.replace(PREFIX, ''));
  }
  log.info('Claves en caché:', claves);
  return claves;
}

// ── Privadas ──────────────────────────────────────────────

function _limpiarStore(store) {
  for (let i = store.length - 1; i >= 0; i--) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) store.removeItem(k);
  }
}

function _limpiarExpirados() {
  const ahora = Date.now();
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (!k?.startsWith(PREFIX)) continue;
    try {
      if (ahora > JSON.parse(localStorage.getItem(k)).expira) localStorage.removeItem(k);
    } catch { localStorage.removeItem(k); }
  }
}