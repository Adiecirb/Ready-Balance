// main.js — Entrada principal, router por vista + autenticación Firebase

import { cargarDatos }         from './config.js';
import { guardarCache, obtenerCache, limpiarCache } from './cache.js';
import {
  calcularTMB, calcularTDEE, calcularCaloriasObjetivo,
  calcularMacros, calcularIMC, distribuirPorComidas,
  textoANivelActividad, textoAObjetivo, sanitizar, formatearFecha
} from './utils.js';
import {
  registrar, login, logout, resetPassword, observarSesion,
  protegerRuta, estaAutenticado, guardarPerfilFirestore, obtenerUsuarioActual
} from './auth.js';

// Detecta la página actual y lanza el módulo correspondiente
const pagina = location.pathname.split('/').pop() || 'index.html';

// Observer de sesión global (se ejecuta al iniciar la app)
observarSesion((user, datosUsuario) => {
  console.log('Estado de sesión actualizado:', user ? user.email : 'sin sesión');
});

if (pagina === 'index.html' || pagina === '') {
  initIndex();

} else if (pagina === 'dashboard.html') {

  if (!protegerRuta()) {
    location.href = './index.html';
} else {
  initDashboard();
}
} else if (pagina === 'blogs.html') {

  initBlogs();
}
// ══════════════════════════════════════════════════════════
// INDEX — Carrusel + cuestionario + onboarding
// ══════════════════════════════════════════════════════════

function initIndex() {
  _initCarrusel();
  _initCuestionario();
  _initMenuLateral();
  _initModalesAuth();
}

function _initCarrusel() {
  const slides = document.querySelectorAll('.slide-experiencia');
  const puntos  = document.querySelectorAll('.punto');
  if (!slides.length) return;
  let actual = 0;

  const mostrar = i => {
    slides.forEach(s => s.classList.remove('activo'));
    puntos.forEach(p => p.classList.remove('activo'));
    actual = i;
    slides[actual].classList.add('activo');
    puntos[actual].classList.add('activo');
  };

  setInterval(() => mostrar((actual + 1) % slides.length), 5000);
  puntos.forEach((p, i) => p.addEventListener('click', () => mostrar(i)));
}

function _initCuestionario() {
  const btnAbrir  = document.getElementById('btn-abrir-cuestionario');
  const vista     = document.getElementById('vista-cuestionario');
  const btnCerrar = document.getElementById('btn-cerrar-cuestionario');
  if (!vista) return;

  const pasos = Array.from(document.querySelectorAll('.paso-cuestionario'));
  let pasoActual = 0;
  // Estado acumulado del cuestionario
  const estado = {};

  const irA = i => {
    pasos.forEach(p => p.classList.remove('activo'));
    pasoActual = i;
    pasos[pasoActual].classList.add('activo');
  };

  btnAbrir?.addEventListener('click', () => {
    vista.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    irA(0);
  });
  btnCerrar?.addEventListener('click', () => {
    vista.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  // Botones siguiente / atrás globales
  document.querySelectorAll('.btn-siguiente-oscuro').forEach(btn => {
    btn.addEventListener('click', () => {
      if (pasoActual < pasos.length - 1) irA(pasoActual + 1);
    });
  });
  document.querySelectorAll('.btn-atras').forEach(btn => {
    btn.addEventListener('click', () => {
      if (pasoActual > 0) irA(pasoActual - 1);
    });
  });

  // Opción de bienvenida → persiste objetivo
  document.querySelectorAll('#q-bienvenida .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-bienvenida .btn-opcion')
        .forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.objetivoTexto = this.innerText.trim();
      const titulo = document.getElementById('titulo-meta-ritmo');
      if (titulo) {
        const map = {
          'Pérdida de peso':                    '¡Así que estás aquí para perder peso!',
          'Ganar músculo y perder grasa':        '¡Así que estás aquí para ganar músculo y perder grasa!',
          'Ganar músculo, perder grasa es secundario': '¡Tu prioridad es ganar masa muscular a tope!',
          'Comer más sano sin perder peso':      '¡Estás aquí para comer más sano y mantenerte!'
        };
        titulo.innerText = map[estado.objetivoTexto] ?? estado.objetivoTexto;
      }
    });
  });

  // Revelación progresiva en "Vamos a conocerte"
  const botonesGenero = document.querySelectorAll('#bloque-genero .btn-pildora');
  const bloqueEdad    = document.getElementById('bloque-edad');
  const bloquePeso    = document.getElementById('bloque-peso');
  const bloqueEstatura = document.getElementById('bloque-estatura');
  const btnSigConocer = document.getElementById('btn-siguiente-conocer');

  botonesGenero.forEach(btn => {
    btn.addEventListener('click', function () {
      botonesGenero.forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.genero = this.innerText.trim().toLowerCase();
      _revelar(bloqueEdad);
    });
  });

  document.getElementById('input-edad')?.addEventListener('input', function () {
    if (this.value) { estado.edad = +this.value; _revelar(bloquePeso); }
  });
  document.getElementById('input-peso')?.addEventListener('input', function () {
    if (this.value) { estado.peso = +this.value; _revelar(bloqueEstatura); }
  });
  document.getElementById('input-estatura')?.addEventListener('input', function () {
    if (this.value) {
      estado.estatura = +this.value;
      btnSigConocer?.classList.remove('oculto');
      btnSigConocer?.classList.add('visible');
    } else {
      btnSigConocer?.classList.add('oculto');
      btnSigConocer?.classList.remove('visible');
    }
  });

  // Slider de ritmo
  const slider = document.getElementById('slider-ritmo');
  if (slider) {
    const iconos = document.querySelectorAll('.icono-ritmo');
    const actualizar = () => {
      const v   = +slider.value;
      const pct = ((v - 1) / 2) * 100;
      slider.style.background = `linear-gradient(to right,#F09A59 ${pct}%,#EEEEEE ${pct}%)`;
      iconos.forEach((ic, idx) => ic.classList.toggle('activo', idx === v - 1));
      estado.ritmo = v;
    };
    slider.addEventListener('input', actualizar);
    actualizar();
  }

  // Sí/No restricciones
  document.querySelectorAll('#q-restricciones .btn-opcion-mitad').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-restricciones .btn-opcion-mitad')
        .forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      const caja = document.getElementById('caja-alergia');
      const si   = this.innerText.trim() === 'Sí';
      caja?.classList.toggle('oculto',  !si);
      caja?.classList.toggle('visible',  si);
      if (!si && document.getElementById('input-alergia'))
        document.getElementById('input-alergia').value = '';
    });
  });

  // Tarjetas de comidas
  document.querySelectorAll('#q-comidas .btn-tarjeta-comida').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-comidas .btn-tarjeta-comida')
        .forEach(t => t.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.nComidas = +this.querySelector('.texto-comida').innerText;
    });
  });

  // Actividad física
  document.querySelectorAll('#q-actividad .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-actividad .btn-opcion')
        .forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.actividadTexto = this.innerText.trim();
    });
  });

  // Factor éxito
  document.querySelectorAll('#q-factor .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-factor .btn-opcion')
        .forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
    });
  });

  // Pantalla de carga → calcula y redirige
  document.addEventListener('click', e => {
    const btnSig = e.target.closest('.btn-siguiente-oscuro');
    if (!btnSig || btnSig.disabled) return;
    const pantallaActual = btnSig.closest('.paso-cuestionario');
    const siguiente = pantallaActual?.nextElementSibling;
    if (siguiente?.id === 'q-cargando') {
      _calcularYGuardar(estado);
      setTimeout(() => { location.href = './dashboard.html'; }, 3200);
    }
  });

  // Registro con Firebase
  document.getElementById('btn-registrate')?.addEventListener('click', async () => {
    const correo = document.getElementById('reg-correo')?.value;
    const nombre = document.getElementById('reg-nombre')?.value;
    const pass   = document.getElementById('reg-pass')?.value;
    if (!correo || !nombre || !pass) {
      alert('Por favor completa todos los campos.');
      return;
    }
    try {
      const { uid } = await registrar(correo, pass, nombre, 'usuario');
      estado.uid = uid;
      estado.correo = correo;
      estado.nombre = nombre;
      if (pasoActual < pasos.length - 1) irA(pasoActual + 1);
    } catch (err) {
      alert('Error en registro: ' + err.message);
    }
  });

  // Toggle visibilidad contraseña
  document.getElementById('btn-toggle-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('reg-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });
}

// Calcula plan completo, persiste en caché y Firestore
function _calcularYGuardar(est) {
  try {
    const tmb      = calcularTMB(est);
    const actividad = textoANivelActividad(est.actividadTexto);
    const objetivo  = textoAObjetivo(est.objetivoTexto);
    const tdee     = calcularTDEE(tmb, actividad);
    const calObj   = calcularCaloriasObjetivo(tdee, objetivo);
    const macros   = calcularMacros(calObj, objetivo);
    const imc      = calcularIMC(est.peso, est.estatura);
    const comidas  = distribuirPorComidas(macros, est.nComidas ?? 3);

    const perfil = {
      ...est,
      tmb, tdee, calObj, macros, imc,
      comidas, actividad, objetivo,
      fechaCreacion: new Date().toISOString()
    };
    
    // Guarda en localStorage
    guardarCache('perfil_usuario', perfil);
    
    // Guarda en Firestore si usuario está autenticado
    if (est.uid) {
      guardarPerfilFirestore(est.uid, perfil);
    }
    
    console.log('Perfil calculado:', perfil);
  } catch (err) {
    console.error('Error calculando perfil:', err);
  }
}

function _revelar(el) {
  el?.classList.remove('oculto');
  el?.classList.add('visible');
}

// ══════════════════════════════════════════════════════════
// MODALES AUTH — Login, registro y recuperación
// ══════════════════════════════════════════════════════════

function _initModalesAuth() {
  const modalLogin = document.getElementById('modal-login');
  const modalRecuperar = document.getElementById('modal-recuperar');
  const vistaCuestionario = document.getElementById('vista-cuestionario');
  
  // Botones header
  const btnCrearCuenta = document.getElementById('btn-crear-cuenta');
  const btnIniciarSesion = document.getElementById('btn-iniciar-sesion');
  
  // Botones login
  const btnCerrarLogin = document.getElementById('btn-cerrar-login');
  const btnRecuperarPass = document.getElementById('btn-recuperar-pass');
  const btnIrRegistro = document.getElementById('btn-ir-registro');
  const formLogin = document.getElementById('form-login');
  
  // Botones recuperar
  const btnCerrarRecuperar = document.getElementById('btn-cerrar-recuperar');
  const btnVolverLogin = document.getElementById('btn-volver-login');
  const formRecuperar = document.getElementById('form-recuperar');
  
  // Toggle visibilidad contraseña login
  document.getElementById('btn-toggle-login-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('login-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  
  // Abrir modal login desde header
  btnCrearCuenta?.addEventListener('click', () => {
    vistaCuestionario.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  
  btnIniciarSesion?.addEventListener('click', () => {
    modalLogin.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  
  // Cerrar modal login
  btnCerrarLogin?.addEventListener('click', () => {
    modalLogin.style.display = 'none';
    document.body.style.overflow = 'auto';
  });
  
  // Ir a formulario de registro desde login
  btnIrRegistro?.addEventListener('click', () => {
    modalLogin.style.display = 'none';
    vistaCuestionario.style.display = 'flex';
  });
  
  // Recuperar contraseña
  btnRecuperarPass?.addEventListener('click', () => {
    modalLogin.style.display = 'none';
    modalRecuperar.style.display = 'flex';
  });
  
  // Cerrar modal recuperar
  btnCerrarRecuperar?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none';
    document.body.style.overflow = 'auto';
  });
  
  // Volver a login desde recuperar
  btnVolverLogin?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none';
    modalLogin.style.display = 'flex';
  });
  
  // Submit login
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    
    try {
      const btnSubmit = formLogin.querySelector('button[type="submit"]');
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Accediendo...';
      
      await login(email, pass);
      alert('¡Bienvenido! Redirigiendo...');
      setTimeout(() => { location.href = './dashboard.html'; }, 1500);
    } catch (err) {
      alert('Error: ' + (err.message || 'Credenciales inválidas'));
      formLogin.querySelector('button[type="submit"]').disabled = false;
      formLogin.querySelector('button[type="submit"]').innerText = 'Acceder';
    }
  });
  
  // Submit recuperar contraseña
  formRecuperar?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recuperar-email').value;
    
    try {
      const btnSubmit = formRecuperar.querySelector('button[type="submit"]');
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Enviando...';
      
      await resetPassword(email);
      alert('Email de recuperación enviado. Revisa tu bandeja.');
      modalRecuperar.style.display = 'none';
      modalLogin.style.display = 'flex';
      formRecuperar.reset();
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Enviar email';
    } catch (err) {
      alert('Error: ' + (err.message || 'No se pudo enviar el email'));
      formRecuperar.querySelector('button[type="submit"]').disabled = false;
      formRecuperar.querySelector('button[type="submit"]').innerText = 'Enviar email';
    }
  });
  
  // Cerrar modales al clickear afuera
  modalLogin?.addEventListener('click', (e) => {
    if (e.target === modalLogin) {
      modalLogin.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
  
  modalRecuperar?.addEventListener('click', (e) => {
    if (e.target === modalRecuperar) {
      modalRecuperar.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD — Renderiza plan nutricional desde caché
// ══════════════════════════════════════════════════════════

async function initDashboard() {
  _initMenuLateral();
  _initFiltrosBlog();
  
  // Botón de logout
  document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      const resultado = await logout();
      if (resultado) {
        location.href = './index.html';
      }
    }
  });

  const perfil = obtenerCache('perfil_usuario');

  if (!perfil) {
    _renderSinPerfil();
    return;
  }

  _renderResumen(perfil);
  await _renderComidas(perfil);
}

function _renderSinPerfil() {
  const main = document.querySelector('.contenedor-principal-planes');
  if (!main) return;
  main.innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <p style="font-size:1.2rem;color:#8C9BA5;margin-bottom:20px;">
        Aún no tienes un plan generado.
      </p>
      <a href="./index.html" class="btn-primario" style="
        display:inline-block;padding:14px 32px;background:#6CBE71;
        color:#fff;border-radius:30px;text-decoration:none;font-weight:bold;">
        Crear mi plan
      </a>
    </div>`;
}

function _renderResumen(perfil) {
  // Tarjeta de resumen nutricional en la parte superior del dashboard
  const main = document.querySelector('.contenedor-principal-planes');
  if (!main || !perfil.macros) return;

  const resumen = document.createElement('section');
  resumen.className = 'bloque-comida';
  resumen.innerHTML = `
    <h2 class="titulo-comida">
      Hola${perfil.nombre ? ', ' + sanitizar(perfil.nombre) : ''} 👋
    </h2>
    <p style="color:#8C9BA5;margin:0 0 16px;font-size:0.95rem;">
      ${formatearFecha()}
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      ${_macroCard('🔥 Calorías', perfil.macros.calorias, 'kcal')}
      ${_macroCard('🥩 Proteína', perfil.macros.proteina, 'g')}
      ${_macroCard('🍞 Carbos',   perfil.macros.carbohidratos, 'g')}
      ${_macroCard('🥑 Grasas',  perfil.macros.grasas, 'g')}
      ${_macroCard('📊 IMC',     perfil.imc?.imc, perfil.imc?.clasificacion ?? '')}
    </div>`;
  main.prepend(resumen);
}

function _macroCard(label, valor, unidad) {
  return `
    <div style="background:#fff;border-radius:12px;padding:14px 20px;
      min-width:110px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center;">
      <div style="font-size:1.4rem;font-weight:bold;color:#1A3636;">${valor}</div>
      <div style="font-size:0.75rem;color:#8C9BA5;">${unidad}</div>
      <div style="font-size:0.8rem;color:#6B7280;margin-top:4px;">${label}</div>
    </div>`;
}

async function _renderComidas(perfil) {
  const { alimentos } = await cargarDatos();
  const comidas = perfil.comidas ?? [];

  // IDs de secciones existentes en dashboard.html
  const idMap = {
    'Desayuno': 'datos-desayuno',
    'Almuerzo': 'datos-almuerzo',
    'Comida':   'datos-comida'
  };

  comidas.forEach(comida => {
    const contenedor = document.getElementById(idMap[comida.nombre]);
    if (!contenedor) return;

    // Alimentos de ejemplo (FASE 4 los asignará por objetivo)
    const items = alimentos.slice(0, 2).map(a => `
      <div style="display:flex;align-items:center;gap:12px;
        padding:10px;background:#fff;border-radius:10px;
        box-shadow:0 1px 4px rgba(0,0,0,0.05);margin-bottom:8px;">
        <span style="font-size:1.4rem;">🍽️</span>
        <div>
          <div style="font-weight:600;color:#1A3636;font-size:0.95rem;">
            ${sanitizar(a.name ?? a.nombre ?? 'Alimento')}
          </div>
          <div style="font-size:0.8rem;color:#8C9BA5;">
            P: ${a.protein ?? 0}g · C: ${a.carbs ?? 0}g · G: ${a.fats ?? 0}g
          </div>
        </div>
        <div style="margin-left:auto;font-size:0.85rem;font-weight:bold;color:#6CBE71;">
          ${calculateCaloriesLocal(a.protein, a.carbs, a.fats)} kcal
        </div>
      </div>`).join('');

    contenedor.innerHTML = `
      <div style="background:#EAF4F4;border-radius:10px;padding:10px 14px;
        margin-bottom:10px;font-size:0.85rem;color:#1A3636;">
        🎯 <strong>${comida.calorias} kcal</strong> · 
        P: ${comida.proteina}g · C: ${comida.carbohidratos}g · G: ${comida.grasas}g
      </div>
      ${items || '<p class="texto-fantasma">Sin alimentos asignados aún.</p>'}`;
  });
}

function calculateCaloriesLocal(p = 0, c = 0, g = 0) {
  return Math.round(p * 4 + c * 4 + g * 9);
}

// ══════════════════════════════════════════════════════════
// BLOGS — Filtrado por categoría + lectura de URL
// ══════════════════════════════════════════════════════════

function initBlogs() {
  _initMenuLateral();
  _initFiltrosBlog();
}

function _initFiltrosBlog() {
  const botones  = document.querySelectorAll('#menu-filtros-blog .nav-link');
  const tarjetas = document.querySelectorAll('.tarjeta-articulo');
  if (!botones.length) return;

  const filtrar = cat => {
    botones.forEach(b => b.classList.toggle('activo', b.dataset.filtro === cat));
    tarjetas.forEach(t => {
      const visible = cat === 'todos' || t.dataset.categoria === cat;
      t.style.opacity   = visible ? '1' : '0';
      t.style.transform = visible ? 'scale(1)' : 'scale(0.92)';
      setTimeout(() => { t.style.display = visible ? 'block' : 'none'; }, visible ? 0 : 280);
    });
  };

  botones.forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    filtrar(b.dataset.filtro);
  }));

  // Auto-filtro por parámetro de URL
  const param = new URLSearchParams(location.search).get('filtro');
  if (param) filtrar(param);
}

// ══════════════════════════════════════════════════════════
// MENÚ LATERAL — Compartido entre dashboard y blogs
// ══════════════════════════════════════════════════════════

function _initMenuLateral() {
  const btnAbrir  = document.getElementById('btn-menu-lateral');
  const btnCerrar = document.getElementById('btn-cerrar-menu');
  const sidebar   = document.getElementById('sidebar-menu');
  const overlay   = document.getElementById('overlay-menu');
  if (!btnAbrir || !sidebar) return;

  const abrir  = () => { sidebar.classList.add('activo');    overlay?.classList.add('activo'); };
  const cerrar = () => { sidebar.classList.remove('activo'); overlay?.classList.remove('activo'); };

  btnAbrir.addEventListener('click', abrir);
  btnCerrar?.addEventListener('click', cerrar);
  overlay?.addEventListener('click', cerrar);
}