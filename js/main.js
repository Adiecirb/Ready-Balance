// main.js — Router SPA + FASE 4: dashboard con motor nutricional real

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
import { generarPlan, calcularListaCompra } from './nutrition.js';

// ── Router ────────────────────────────────────────────────
const pagina = location.pathname.split('/').pop() || 'index.html';

observarSesion((user) => {
  if (user) console.log('Sesión activa:', user.email ?? user.uid);
});

if (pagina === 'index.html' || pagina === '') {
  initIndex();
} else if (pagina === 'dashboard.html') {
  if (!protegerRuta()) { /* protegerRuta redirige sola */ } else { initDashboard(); }
} else if (pagina === 'blogs.html') {
  initBlogs();
}

// ══════════════════════════════════════════════════════════
// INDEX
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
    puntos[actual]?.classList.add('activo');
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
  const estado = {};

  const irA = i => {
    pasos.forEach(p => p.classList.remove('activo'));
    pasoActual = i;
    pasos[pasoActual].classList.add('activo');
  };

  const abrir = () => { vista.style.display = 'flex'; document.body.style.overflow = 'hidden'; irA(0); };
  const cerrar = () => { vista.style.display = 'none'; document.body.style.overflow = 'auto'; };

  btnAbrir?.addEventListener('click', abrir);
  btnCerrar?.addEventListener('click', cerrar);

  document.querySelectorAll('.btn-siguiente-oscuro').forEach(btn => {
    btn.addEventListener('click', () => { if (pasoActual < pasos.length - 1) irA(pasoActual + 1); });
  });
  document.querySelectorAll('.btn-atras').forEach(btn => {
    btn.addEventListener('click', () => { if (pasoActual > 0) irA(pasoActual - 1); });
  });

  // Objetivo
  document.querySelectorAll('#q-bienvenida .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-bienvenida .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.objetivoTexto = this.innerText.trim();
      const titulo = document.getElementById('titulo-meta-ritmo');
      if (titulo) {
        const map = {
          'Pérdida de peso':                              '¡Así que estás aquí para perder peso!',
          'Ganar músculo y perder grasa':                 '¡Así que estás aquí para ganar músculo y perder grasa!',
          'Ganar músculo, perder grasa es secundario':    '¡Tu prioridad es ganar masa muscular a tope!',
          'Comer más sano sin perder peso':               '¡Estás aquí para comer más sano y mantenerte!'
        };
        titulo.innerText = map[estado.objetivoTexto] ?? estado.objetivoTexto;
      }
    });
  });

  // Datos antropométricos — revelación progresiva
  const botonesGenero  = document.querySelectorAll('#bloque-genero .btn-pildora');
  const bloqueEdad     = document.getElementById('bloque-edad');
  const bloquePeso     = document.getElementById('bloque-peso');
  const bloqueEstatura = document.getElementById('bloque-estatura');
  const btnSigConocer  = document.getElementById('btn-siguiente-conocer');

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
    estado.estatura = this.value ? +this.value : null;
    btnSigConocer?.classList.toggle('oculto', !this.value);
    btnSigConocer?.classList.toggle('visible', !!this.value);
  });

  // Slider ritmo
  const slider = document.getElementById('slider-ritmo');
  if (slider) {
    const iconos = document.querySelectorAll('.icono-ritmo');
    const act = () => {
      const v   = +slider.value;
      const pct = ((v - 1) / 2) * 100;
      slider.style.background = `linear-gradient(to right,#F09A59 ${pct}%,#EEEEEE ${pct}%)`;
      iconos.forEach((ic, idx) => ic.classList.toggle('activo', idx === v - 1));
      estado.ritmo = v;
    };
    slider.addEventListener('input', act);
    act();
  }

  // Restricciones
  document.querySelectorAll('#q-restricciones .btn-opcion-mitad').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-restricciones .btn-opcion-mitad').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      const caja = document.getElementById('caja-alergia');
      const si   = this.innerText.trim() === 'Sí';
      caja?.classList.toggle('oculto',  !si);
      caja?.classList.toggle('visible',  si);
      if (!si) document.getElementById('input-alergia').value = '';
    });
  });

  // Número de comidas
  document.querySelectorAll('#q-comidas .btn-tarjeta-comida').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-comidas .btn-tarjeta-comida').forEach(t => t.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.nComidas = +this.querySelector('.texto-comida').innerText;
    });
  });

  // Actividad
  document.querySelectorAll('#q-actividad .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-actividad .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.actividadTexto = this.innerText.trim();
    });
  });

  // Factor éxito
  document.querySelectorAll('#q-factor .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-factor .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
    });
  });

  // Pantalla cargando → calcula + redirige
  document.addEventListener('click', e => {
    const btnSig = e.target.closest('.btn-siguiente-oscuro');
    if (!btnSig || btnSig.disabled) return;
    const sig = btnSig.closest('.paso-cuestionario')?.nextElementSibling;
    if (sig?.id === 'q-cargando') {
      _calcularYGuardar(estado);
      setTimeout(() => { location.href = './dashboard.html'; }, 3200);
    }
  });

  // Registro
  document.getElementById('btn-registrate')?.addEventListener('click', async () => {
    const correo = document.getElementById('reg-correo')?.value;
    const nombre = document.getElementById('reg-nombre')?.value;
    const pass   = document.getElementById('reg-pass')?.value;
    if (!correo || !nombre || !pass) { alert('Por favor completa todos los campos.'); return; }
    try {
      const { uid } = await registrar(correo, pass, nombre, 'usuario');
      estado.uid    = uid;
      estado.correo = correo;
      estado.nombre = nombre;
      if (pasoActual < pasos.length - 1) irA(pasoActual + 1);
    } catch (err) { alert('Error en registro: ' + err.message); }
  });

  document.getElementById('btn-toggle-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('reg-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });
}

async function _calcularYGuardar(est) {
  try {
    const { alimentos } = await cargarDatos();
    const tmb       = calcularTMB(est);
    const actividad = textoANivelActividad(est.actividadTexto);
    const objetivo  = textoAObjetivo(est.objetivoTexto);
    const tdee      = calcularTDEE(tmb, actividad);
    const calObj    = calcularCaloriasObjetivo(tdee, objetivo);
    const macros    = calcularMacros(calObj, objetivo);
    const imc       = calcularIMC(est.peso, est.estatura);

    // Distribución por comidas
    const comidasBase = distribuirPorComidas(macros, est.nComidas ?? 3);

    // ── FASE 4: asignar alimentos reales ──
    const alergias   = est.alergia ? [est.alergia] : [];
    const comidasPlan = generarPlan({
      comidas:           comidasBase,
      objetivo,
      alergias,
      catalogoAlimentos: alimentos
    });

    const perfil = {
      ...est,
      tmb, tdee, calObj, macros, imc,
      comidas:  comidasPlan,
      actividad, objetivo,
      fechaCreacion: new Date().toISOString()
    };

    guardarCache('perfil_usuario', perfil);
    if (est.uid) guardarPerfilFirestore(est.uid, perfil);
    console.log('Perfil FASE 4 calculado:', perfil);
  } catch (err) {
    console.error('Error calculando perfil:', err);
  }
}

function _revelar(el) { el?.classList.remove('oculto'); el?.classList.add('visible'); }

// ══════════════════════════════════════════════════════════
// MODALES AUTH
// ══════════════════════════════════════════════════════════

function _initModalesAuth() {
  const modalLogin     = document.getElementById('modal-login');
  const modalRecuperar = document.getElementById('modal-recuperar');
  const vistaCuestionario = document.getElementById('vista-cuestionario');

  document.getElementById('btn-crear-cuenta')?.addEventListener('click', () => {
    vistaCuestionario.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('btn-iniciar-sesion')?.addEventListener('click', () => {
    modalLogin.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('btn-cerrar-login')?.addEventListener('click', () => {
    modalLogin.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  document.getElementById('btn-ir-registro')?.addEventListener('click', () => {
    modalLogin.style.display = 'none';
    vistaCuestionario.style.display = 'flex';
  });

  document.getElementById('btn-recuperar-pass')?.addEventListener('click', () => {
    modalLogin.style.display    = 'none';
    modalRecuperar.style.display = 'flex';
  });

  document.getElementById('btn-cerrar-recuperar')?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  document.getElementById('btn-volver-login')?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none';
    modalLogin.style.display     = 'flex';
  });

  document.getElementById('btn-toggle-login-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('login-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('form-login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass  = document.getElementById('login-pass').value;
    const btn   = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerText = 'Accediendo...';
    try {
      await login(email, pass);
      location.href = './dashboard.html';
    } catch (err) {
      alert('Error: ' + err.message);
      btn.disabled = false; btn.innerText = 'Acceder';
    }
  });

  document.getElementById('form-recuperar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('recuperar-email').value;
    const btn   = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerText = 'Enviando...';
    try {
      await resetPassword(email);
      alert('Email de recuperación enviado. Revisa tu bandeja.');
      modalRecuperar.style.display = 'none';
      modalLogin.style.display     = 'flex';
      e.target.reset();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false; btn.innerText = 'Enviar email';
    }
  });

  [modalLogin, modalRecuperar].forEach(m => {
    m?.addEventListener('click', e => {
      if (e.target === m) { m.style.display = 'none'; document.body.style.overflow = 'auto'; }
    });
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD — FASE 4
// ══════════════════════════════════════════════════════════

async function initDashboard() {
  _initMenuLateral();

  document.getElementById('btn-logout')?.addEventListener('click', async e => {
    e.preventDefault();
    if (confirm('¿Cerrar sesión?')) { await logout(); location.href = './index.html'; }
  });

  const perfil = obtenerCache('perfil_usuario');
  const loading = document.getElementById('rb-loading');

  if (!perfil) {
    loading?.remove();
    _renderSinPlan();
    return;
  }

  // Cargar catálogo para lista de compra
  const { alimentos } = await cargarDatos();

  loading?.remove();

  // Renderizar banner de bienvenida + macros globales
  _renderBanner(perfil);

  // Tabs del navbar
  _initTabs(perfil, alimentos);
}

function _initTabs(perfil, alimentos) {
  const links = document.querySelectorAll('.nav-link[data-tab]');
  const main  = document.getElementById('contenido-principal');

  const paneles = {
    dietas:  () => _renderDietas(perfil),
    compra:  () => _renderCompra(perfil, alimentos),
    perfil:  () => _renderPerfil(perfil),
    avance:  () => _renderAvance(perfil)
  };

  const activar = tab => {
    links.forEach(l => l.classList.toggle('activo', l.dataset.tab === tab));
    // Limpiar contenido anterior (excepto banner que va arriba)
    main.querySelectorAll('.rb-tab-panel').forEach(p => p.remove());
    const panel = document.createElement('div');
    panel.className = 'rb-tab-panel activo';
    main.appendChild(panel);
    paneles[tab]?.(panel);
  };

  links.forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    activar(l.dataset.tab);
  }));

  // Tab inicial
  activar('dietas');
}

// ── Banner de bienvenida + macros globales ────────────────
function _renderBanner(perfil) {
  const main    = document.getElementById('contenido-principal');
  const banner  = document.createElement('section');
  banner.className = 'bloque-comida';
  banner.style.marginBottom = '0';

  const nombre  = perfil.nombre ? sanitizar(perfil.nombre) : '';
  const macros  = perfil.macros ?? {};
  const imc     = perfil.imc    ?? {};

  banner.innerHTML = `
    <h2 class="titulo-comida">Hola${nombre ? ', ' + nombre : ''} 👋</h2>
    <p style="color:#8C9BA5;margin:0 0 14px;font-size:0.9rem;">${formatearFecha()}</p>
    <div class="rb-resumen">
      ${_macroCardHTML('🔥', macros.calorias ?? '—', 'kcal', 'Calorías')}
      ${_macroCardHTML('🥩', macros.proteina ?? '—', 'g', 'Proteína')}
      ${_macroCardHTML('🍞', macros.carbohidratos ?? '—', 'g', 'Carbos')}
      ${_macroCardHTML('🥑', macros.grasas ?? '—', 'g', 'Grasas')}
    </div>
    <div class="rb-imc-badge">
      📊 IMC: <strong>${imc.imc ?? '—'}</strong> — ${imc.clasificacion ?? ''}
    </div>`;

  main.prepend(banner);
}

function _macroCardHTML(emoji, valor, unidad, label) {
  return `
    <div class="rb-macro-card">
      <span class="rb-macro-emoji">${emoji}</span>
      <strong class="rb-macro-valor">${valor}</strong>
      <small class="rb-macro-unidad">${unidad}</small>
      <span class="rb-macro-label">${label}</span>
    </div>`;
}

// ── TAB: Mis Dietas ───────────────────────────────────────
function _renderDietas(perfil, contenedor) {
  const el = contenedor ?? document.querySelector('.rb-tab-panel.activo');
  if (!el) return;
  const comidas = perfil.comidas ?? [];

  if (!comidas.length) {
    el.innerHTML = '<p style="text-align:center;color:#8C9BA5;padding:40px 0">Sin comidas en el plan.</p>';
    return;
  }

  comidas.forEach(comida => {
    const bloque = _clonarTemplate('tpl-bloque-comida');
    bloque.querySelector('.rb-comida-nombre').textContent = comida.nombre;
    bloque.querySelector('.rb-comida-kcal').textContent   = `${comida.calorias} kcal`;
    bloque.querySelector('.rb-comida-objetivos').textContent =
      `Objetivo → P: ${comida.proteina}g · C: ${comida.carbohidratos}g · G: ${comida.grasas}g`;

    const itemsWrap = bloque.querySelector('.rb-items');
    (comida.items ?? []).forEach(item => {
      const nodo = _clonarTemplate('tpl-item-alimento');
      nodo.querySelector('.rb-item-emoji').textContent     = item.emoji;
      nodo.querySelector('.rb-item-nombre').textContent    = sanitizar(item.nombre);
      nodo.querySelector('.rb-item-macros').textContent    =
        `P: ${item.macros.proteina}g · C: ${item.macros.carbohidratos}g · G: ${item.macros.grasas}g`;
      nodo.querySelector('.rb-gramos-val').textContent     = item.gramos;
      nodo.querySelector('.rb-gramos-unidad').textContent  = item.unidad;
      itemsWrap.appendChild(nodo);
    });

    // Totales reales vs objetivo
    const tot = comida.totalesReales;
    if (tot) {
      bloque.querySelector('.rb-comida-totales').textContent =
        `Real → ${tot.calorias} kcal · P: ${tot.proteina}g · C: ${tot.carbohidratos}g · G: ${tot.grasas}g`;
    }

    el.appendChild(bloque);
  });
}

// ── TAB: Lista de Compra ──────────────────────────────────
function _renderCompra(perfil, alimentos, contenedor) {
  const el = contenedor ?? document.querySelector('.rb-tab-panel.activo');
  if (!el) return;

  const lista = calcularListaCompra(perfil.comidas ?? []);

  const titulo = document.createElement('h3');
  titulo.style.cssText = 'margin-bottom:16px;color:#1A3636;font-size:1.1rem;';
  titulo.textContent   = '🛒 Compras para la semana';
  el.appendChild(titulo);

  if (!lista.length) {
    el.innerHTML += '<p style="color:#8C9BA5;text-align:center;">Sin datos de compra.</p>';
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'rb-lista-compra';

  lista.forEach(item => {
    const div = document.createElement('div');
    div.className = 'rb-compra-item';
    div.innerHTML = `
      <span>${item.emoji} <strong class="rb-compra-nombre">${sanitizar(item.nombre)}</strong></span>
      <span class="rb-compra-gramos">${item.gramosCompra} ${item.unidad}</span>`;
    wrap.appendChild(div);
  });

  el.appendChild(wrap);
}

// ── TAB: Mi Perfil ────────────────────────────────────────
function _renderPerfil(perfil, contenedor) {
  const el = contenedor ?? document.querySelector('.rb-tab-panel.activo');
  if (!el) return;

  const datos = [
    ['👤 Nombre',    perfil.nombre    ?? '—'],
    ['⚧  Género',    perfil.genero    ?? '—'],
    ['🎂 Edad',      perfil.edad ? perfil.edad + ' años' : '—'],
    ['⚖️  Peso',      perfil.peso ? perfil.peso + ' kg'  : '—'],
    ['📏 Estatura',  perfil.estatura ? perfil.estatura + ' cm' : '—'],
    ['🎯 Objetivo',  _labelObjetivo(perfil.objetivo)],
    ['🏃 Actividad', _labelActividad(perfil.actividad)],
    ['📅 Plan desde', perfil.fechaCreacion ? new Date(perfil.fechaCreacion).toLocaleDateString('es-MX') : '—'],
    ['🔥 TMB',       perfil.tmb ? Math.round(perfil.tmb) + ' kcal' : '—'],
    ['⚡ TDEE',      perfil.tdee ? perfil.tdee + ' kcal' : '—']
  ];

  const titulo = document.createElement('h3');
  titulo.style.cssText = 'margin-bottom:16px;color:#1A3636;font-size:1.1rem;';
  titulo.textContent   = '👤 Mi Perfil Nutricional';
  el.appendChild(titulo);

  const grid = document.createElement('div');
  grid.className = 'rb-perfil-grid';

  datos.forEach(([label, valor]) => {
    const item = document.createElement('div');
    item.className = 'rb-perfil-item';
    item.innerHTML = `<strong>${label}</strong><span>${sanitizar(String(valor))}</span>`;
    grid.appendChild(item);
  });

  el.appendChild(grid);
}

// ── TAB: Mi Avance ────────────────────────────────────────
function _renderAvance(perfil, contenedor) {
  const el = contenedor ?? document.querySelector('.rb-tab-panel.activo');
  if (!el) return;

  const macros = perfil.macros ?? {};

  // Progreso simulado (FASE 5 conectará datos reales)
  const barras = [
    { label: 'Proteína',      actual: macros.proteina ?? 0,      meta: macros.proteina ?? 1,       unidad: 'g' },
    { label: 'Carbohidratos', actual: macros.carbohidratos ?? 0, meta: macros.carbohidratos ?? 1,   unidad: 'g' },
    { label: 'Grasas',        actual: macros.grasas ?? 0,        meta: macros.grasas ?? 1,           unidad: 'g' },
    { label: 'Calorías',      actual: macros.calorias ?? 0,      meta: macros.calorias ?? 1,         unidad: 'kcal' }
  ];

  const titulo = document.createElement('h3');
  titulo.style.cssText = 'margin-bottom:16px;color:#1A3636;font-size:1.1rem;';
  titulo.textContent   = '📊 Tu plan en números';
  el.appendChild(titulo);

  barras.forEach(({ label, actual, meta, unidad }) => {
    const pct = meta ? Math.min(Math.round((actual / meta) * 100), 100) : 0;
    const wrap = document.createElement('div');
    wrap.className = 'rb-avance-barra-wrap';
    wrap.innerHTML = `
      <div class="rb-avance-barra-label">
        <span>${label}</span><span>${actual} / ${meta} ${unidad}</span>
      </div>
      <div class="rb-avance-barra-bg">
        <div class="rb-avance-barra-fill" style="width:${pct}%"></div>
      </div>`;
    el.appendChild(wrap);
  });

  // Nota de progreso
  const nota = document.createElement('p');
  nota.style.cssText = 'color:#8C9BA5;font-size:0.85rem;margin-top:24px;text-align:center;';
  nota.textContent   = 'El seguimiento diario estará disponible próximamente.';
  el.appendChild(nota);
}

// ── Sin plan ──────────────────────────────────────────────
function _renderSinPlan() {
  const main = document.getElementById('contenido-principal');
  if (!main) return;
  main.innerHTML = `
    <div class="rb-sin-plan">
      <p>Aún no tienes un plan generado.</p>
      <a href="./index.html">Crear mi plan</a>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────
function _clonarTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function _labelObjetivo(clave) {
  return {
    perdida_rapida:   'Pérdida rápida',
    perdida_moderada: 'Pérdida moderada',
    mantenimiento:    'Mantenimiento',
    ganancia_limpia:  'Ganancia limpia',
    volumen:          'Volumen'
  }[clave] ?? clave ?? '—';
}

function _labelActividad(clave) {
  return {
    sedentario:  'Sedentario',
    ligero:      'Ligero (1-3 días)',
    moderado:    'Moderado (3-5 días)',
    activo:      'Activo (6-7 días)',
    muy_activo:  'Muy activo'
  }[clave] ?? clave ?? '—';
}

// ══════════════════════════════════════════════════════════
// BLOGS
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
  botones.forEach(b => b.addEventListener('click', e => { e.preventDefault(); filtrar(b.dataset.filtro); }));
  const param = new URLSearchParams(location.search).get('filtro');
  if (param) filtrar(param);
}

// ══════════════════════════════════════════════════════════
// MENÚ LATERAL
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