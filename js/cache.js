/**
  *CACHE.JS En lugar de ir a buscar los datos al servidor CADA VEZ que el usuario
  *abre la app, guardamos una copia local en el navegador.
  *
  *LOCALSTORAGE Espacio de almacenamiento que el navegador provee.
  *
  *SESSIONSTORAGE Los datos SE BORRAN cuando el usuario cierra el tab o el navegador.
 */

// cache.js — LocalStorage/SessionStorage con TTL

import { CONFIG } from './config.js';

const PREFIX   = 'rb_v2_';
const TTL_DEF  = CONFIG.duracionCache;

// Serializa y guarda con timestamp de expiración
export function guardarCache(clave, datos, ttl = TTL_DEF, session = false) {
  try {
    const entrada = {
      datos,
      expira: Date.now() + ttl,
      version: CONFIG.version
    };
    const store = session ? sessionStorage : localStorage;
    store.setItem(PREFIX + clave, JSON.stringify(entrada));
    return true;
  } catch (err) {
    if (err.name === 'QuotaExceededError') _limpiarExpirados();
    console.warn('guardarCache:', err.message);
    return false;
  }
}

// Lee y valida TTL; retorna null si no existe o expiró
export function obtenerCache(clave, session = false) {
  try {
    const store  = session ? sessionStorage : localStorage;
    const raw    = store.getItem(PREFIX + clave);
    if (!raw) return null;
    const entrada = JSON.parse(raw);
    if (Date.now() > entrada.expira) {
      eliminarCache(clave, session);
      return null;
    }
    return entrada.datos;
  } catch {
    eliminarCache(clave, session);
    return null;
  }
}

// Borra una clave específica
export function eliminarCache(clave, session = false) {
  const store = session ? sessionStorage : localStorage;
  store.removeItem(PREFIX + clave);
}

// Limpia TODO el caché de la app (útil en logout)
export function limpiarCache(incluirSession = true) {
  _limpiarStore(localStorage);
  if (incluirSession) _limpiarStore(sessionStorage);
}

// Cache-first: usa caché válido o ejecuta fnCarga y cachea el resultado
export async function cargarConCache(clave, fnCarga, ttl = TTL_DEF) {
  const cached = obtenerCache(clave);
  if (cached !== null) return cached;
  const datos = await fnCarga();
  guardarCache(clave, datos, ttl);
  return datos;
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
      const e = JSON.parse(localStorage.getItem(k));
      if (ahora > e.expira) localStorage.removeItem(k);
    } catch {
      localStorage.removeItem(k);
    }
  }
}