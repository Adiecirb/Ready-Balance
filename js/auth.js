// auth.js — Autenticación local con localStorage (sin Firebase)
// TEMPORAL: Para testing. Luego migrar a Firebase

import { guardarCache, obtenerCache, eliminarCache } from './cache.js';

// BD local en memoria (para esta sesión)
const usuariosDB = JSON.parse(localStorage.getItem('rb_usuarios_db') || '{}');
let usuarioActual = null;

// ── Registro ──────────────────────────────────────────────
export async function registrar(email, password, nombre, rol = 'usuario') {
  try {
    // Validar que no exista
    if (usuariosDB[email]) {
      throw new Error('auth/email-already-in-use');
    }
    
    // Validar contraseña
    if (password.length < 6) {
      throw new Error('auth/weak-password');
    }
    
    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Guardar usuario
    usuariosDB[email] = {
      uid,
      email,
      password, // ⚠️ SOLO PARA TESTING - nunca en producción
      nombre,
      rol,
      fechaCreacion: new Date().toISOString(),
      perfil: null
    };
    
    localStorage.setItem('rb_usuarios_db', JSON.stringify(usuariosDB));
    guardarCache('usuarioId', uid);
    console.log('✓ Usuario registrado:', email);
    return { uid, email, nombre };
  } catch (err) {
    console.error('❌ Registro fallido:', err.message);
    throw err;
  }
}

// ── Login ──────────────────────────────────────────────
export async function login(email, password) {
  try {
    const usuario = usuariosDB[email];
    
    if (!usuario) {
      throw new Error('auth/user-not-found');
    }
    
    if (usuario.password !== password) {
      throw new Error('auth/wrong-password');
    }
    
    usuarioActual = usuario;
    guardarCache('usuarioId', usuario.uid);
    guardarCache('perfilUsuarioFirebase', usuario);
    console.log('✓ Login exitoso:', email);
    return { uid: usuario.uid, ...usuario };
  } catch (err) {
    console.error('❌ Login fallido:', err.message);
    throw err;
  }
}

// ── Logout ──────────────────────────────────────────────
export async function logout() {
  try {
    usuarioActual = null;
    eliminarCache('usuarioId');
    eliminarCache('perfil_usuario');
    eliminarCache('perfilUsuarioFirebase');
    console.log('✓ Logout exitoso');
    return true;
  } catch (err) {
    console.error('❌ Logout fallido:', err.message);
    return false;
  }
}

// ── Recuperación de contraseña ──────────────────────────────────────────────
export async function resetPassword(email) {
  try {
    if (!usuariosDB[email]) {
      throw new Error('auth/user-not-found');
    }
    console.log('✓ Email de reset enviado (simulado):', email);
    // TEMPORAL: En consola muestra la contraseña (solo para testing)
    alert('📧 Email de reset enviado.\n\nTEMPORAL: Tu contraseña es: ' + usuariosDB[email].password);
    return true;
  } catch (err) {
    console.error('❌ Reset fallido:', err.message);
    throw err;
  }
}

// ── Observer de sesión ──────────────────────────────────────────────
export function observarSesion(callback) {
  const uid = obtenerCache('usuarioId');
  if (uid) {
    // Buscar usuario por uid
    for (const email in usuariosDB) {
      if (usuariosDB[email].uid === uid) {
        usuarioActual = usuariosDB[email];
        callback(usuarioActual, usuarioActual);
        return;
      }
    }
  }
  callback(null, null);
}

// ── Obtener usuario actual ──────────────────────────────────────────────
export function obtenerUsuarioActual() {
  return usuarioActual;
}

// ── Guardar perfil nutricional ──────────────────────────────────────────────
export async function guardarPerfilFirestore(uid, perfilCompleto) {
  try {
    // Buscar usuario por uid y actualizar perfil
    for (const email in usuariosDB) {
      if (usuariosDB[email].uid === uid) {
        usuariosDB[email].perfil = perfilCompleto;
        usuariosDB[email].fechaActualizacion = new Date().toISOString();
        localStorage.setItem('rb_usuarios_db', JSON.stringify(usuariosDB));
        guardarCache('perfilUsuarioFirebase', usuariosDB[email]);
        console.log('✓ Perfil guardado');
        return true;
      }
    }
    throw new Error('Usuario no encontrado');
  } catch (err) {
    console.error('❌ Error guardando perfil:', err.message);
    return false;
  }
}

// ── Guard de rutas ──────────────────────────────────────────────
export function protegerRuta() {
  const uid = obtenerCache('usuarioId');
  if (!uid) {
    console.warn('⚠️ Acceso denegado: usuario no autenticado');
    location.href = './index.html';
    return false;
  }
  return true;
}

// ── Verificar si está autenticado ──────────────────────────────────────────────
export function estaAutenticado() {
  return !!obtenerCache('usuarioId');
}