// auth.js — Firebase Auth + Firestore + guard de rutas (producción)

import { guardarCache, obtenerCache, eliminarCache, limpiarCache } from './cache.js';
import { log } from './config.js';

// ── Firebase config (credenciales reales del proyecto) ────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAuwGzIjDSfy5mQ8zoUyK1JNwqaxjQTWcQ",
  authDomain:        "ready-balance.firebaseapp.com",
  projectId:         "ready-balance",
  storageBucket:     "ready-balance.firebasestorage.app",
  messagingSenderId: "1063174966405",
  appId:             "1:1063174966405:web:0a2155a6b145490896edec"
};

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

const CLAVE_SESION = 'sesion_usuario';
const CLAVE_PERFIL = 'perfil_usuario';

// ── Estado reactivo ───────────────────────────────────────
let _usuario = null;
const _listeners = [];

onAuthStateChanged(auth, async u => {
  _usuario = u;
  if (u) {
    const perfil = await _perfilFirestore(u.uid);
    if (perfil) guardarCache(CLAVE_SESION, { uid: u.uid, email: u.email, ...perfil });
  } else {
    eliminarCache(CLAVE_SESION);
  }
  _listeners.forEach(fn => fn(_usuario));
});

export function observarSesion(cb) { _listeners.push(cb); cb(_usuario); }
export function obtenerUsuarioActual() { return _usuario; }

// ── Registro ──────────────────────────────────────────────
export async function registrar(correo, password, nombre, rol = 'usuario') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, password);
    await updateProfile(cred.user, { displayName: nombre });
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      nombre, correo, rol,
      fechaRegistro: new Date().toISOString(),
      planActivo: null
    });
    log.info('Registro OK:', correo);
    return { uid: cred.user.uid, email: correo, nombre };
  } catch (err) {
    log.error('registrar:', err.code);
    throw new Error(_msg(err.code));
  }
}

// ── Login ─────────────────────────────────────────────────
export async function login(correo, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, correo, password);
    log.info('Login OK:', correo);
    return { uid: cred.user.uid, email: correo };
  } catch (err) {
    log.error('login:', err.code);
    throw new Error(_msg(err.code));
  }
}

// ── Logout ────────────────────────────────────────────────
export async function logout() {
  try {
    await signOut(auth);
    limpiarCache();
    log.info('Logout OK');
    location.href = './index.html';
  } catch (err) {
    log.error('logout:', err);
  }
}

// ── Recuperar contraseña ──────────────────────────────────
export async function resetPassword(correo) {
  try {
    await sendPasswordResetEmail(auth, correo);
    return { ok: true };
  } catch (err) {
    throw new Error(_msg(err.code));
  }
}

// ── Guard de rutas ────────────────────────────────────────
const RUTAS_PROTEGIDAS = ['dashboard.html'];

export function protegerRuta() {
  const pagina = location.pathname.split('/').pop() || 'index.html';
  if (!RUTAS_PROTEGIDAS.includes(pagina)) return true;

  // Check inmediato por caché (evita parpadeo)
  const sesion = obtenerCache(CLAVE_SESION);
  if (!sesion) {
    // Espera al observer de Firebase (~200ms)
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, u => {
        unsub();
        if (!u) { location.href = './index.html'; resolve(false); }
        else resolve(true);
      });
    });
  }
  return true;
}

// ── Firestore — perfil nutricional ───────────────────────
export async function guardarPerfilFirestore(uid, perfil) {
  try {
    await updateDoc(doc(db, 'usuarios', uid), {
      perfilNutricional: perfil,
      ultimaActualizacion: new Date().toISOString()
    });
    guardarCache(CLAVE_PERFIL, perfil);
    log.info('Perfil guardado en Firestore');
    return { ok: true };
  } catch (err) {
    log.error('guardarPerfilFirestore:', err);
    return { ok: false };
  }
}

export async function cargarPerfilNutricional(uid) {
  const cached = obtenerCache(CLAVE_PERFIL);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (!snap.exists()) return null;
    const { perfilNutricional } = snap.data();
    if (perfilNutricional) guardarCache(CLAVE_PERFIL, perfilNutricional);
    return perfilNutricional ?? null;
  } catch { return null; }
}

async function _perfilFirestore(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// ── Mensajes amigables ────────────────────────────────────
function _msg(code) {
  return ({
    'auth/email-already-in-use':   'Este correo ya está registrado.',
    'auth/invalid-email':          'El correo no tiene formato válido.',
    'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found':         'No existe una cuenta con este correo.',
    'auth/wrong-password':         'Contraseña incorrecta.',
    'auth/invalid-credential':     'Correo o contraseña incorrectos.',
    'auth/too-many-requests':      'Demasiados intentos. Espera un momento.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
  })[code] ?? 'Ocurrió un error inesperado.';
}