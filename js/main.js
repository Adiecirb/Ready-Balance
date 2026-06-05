// main.js — Router SPA + FASE 6: reportes PDF

import { cargarDatos }         from './config.js';
import { guardarCache, obtenerCache } from './cache.js';
import {
  calcularTMB, calcularTDEE, calcularCaloriasObjetivo,
  calcularMacros, calcularIMC, distribuirPorComidas,
  textoANivelActividad, textoAObjetivo, sanitizar, formatearFecha
} from './utils.js';
import {
  registrar, login, logout, resetPassword, observarSesion,
  protegerRuta, guardarPerfilFirestore
} from './auth.js';
import { generarPlan, calcularListaCompra } from './nutrition.js';
import {
  hoy, ultimosDias, obtenerRegistroDia,
  toggleComidaCompletada, guardarPesoDia,
  guardarNotaDia, estadisticasSemana, historialPesos
} from './tracker.js';
import { generarReportePlan, generarReporteProgreso } from './reports.js';

// ── Router ────────────────────────────────────────────────
const pagina = location.pathname.split('/').pop() || 'index.html';

observarSesion(user => { if (user) console.log('Sesión:', user.email ?? user.uid); });

if (pagina === 'index.html' || pagina === '') {
  initIndex();
} else if (pagina === 'dashboard.html') {
  if (!protegerRuta()) { /* redirige sola */ } else { initDashboard(); }
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

  btnAbrir?.addEventListener('click', () => {
    vista.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    irA(0);
  });
  btnCerrar?.addEventListener('click', () => {
    vista.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  document.querySelectorAll('.btn-siguiente-oscuro').forEach(btn => {
    btn.addEventListener('click', () => { if (pasoActual < pasos.length - 1) irA(pasoActual + 1); });
  });
  document.querySelectorAll('.btn-atras').forEach(btn => {
    btn.addEventListener('click', () => { if (pasoActual > 0) irA(pasoActual - 1); });
  });

  document.querySelectorAll('#q-bienvenida .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-bienvenida .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.objetivoTexto = this.innerText.trim();
      const titulo = document.getElementById('titulo-meta-ritmo');
      if (titulo) {
        const map = {
          'Pérdida de peso':                           '¡Así que estás aquí para perder peso!',
          'Ganar músculo y perder grasa':              '¡Aquí para ganar músculo y perder grasa!',
          'Ganar músculo, perder grasa es secundario': '¡Tu prioridad es ganar masa muscular!',
          'Comer más sano sin perder peso':            '¡Estás aquí para comer más sano!'
        };
        titulo.innerText = map[estado.objetivoTexto] ?? estado.objetivoTexto;
      }
    });
  });

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
    btnSigConocer?.classList.toggle('oculto',  !this.value);
    btnSigConocer?.classList.toggle('visible', !!this.value);
  });

  const slider = document.getElementById('slider-ritmo');
  if (slider) {
    const iconos = document.querySelectorAll('.icono-ritmo');
    const act = () => {
      const v = +slider.value, pct = ((v - 1) / 2) * 100;
      slider.style.background = `linear-gradient(to right,#F09A59 ${pct}%,#EEEEEE ${pct}%)`;
      iconos.forEach((ic, idx) => ic.classList.toggle('activo', idx === v - 1));
      estado.ritmo = v;
    };
    slider.addEventListener('input', act); act();
  }

  document.querySelectorAll('#q-restricciones .btn-opcion-mitad').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-restricciones .btn-opcion-mitad').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      const caja = document.getElementById('caja-alergia');
      const si   = this.innerText.trim() === 'Sí';
      caja?.classList.toggle('oculto', !si);
      caja?.classList.toggle('visible', si);
      if (!si) document.getElementById('input-alergia').value = '';
    });
  });

  document.querySelectorAll('#q-comidas .btn-tarjeta-comida').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-comidas .btn-tarjeta-comida').forEach(t => t.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.nComidas = +this.querySelector('.texto-comida').innerText;
    });
  });

  document.querySelectorAll('#q-actividad .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-actividad .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
      estado.actividadTexto = this.innerText.trim();
    });
  });

  document.querySelectorAll('#q-factor .btn-opcion').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#q-factor .btn-opcion').forEach(b => b.classList.remove('seleccionado'));
      this.classList.add('seleccionado');
    });
  });

  document.addEventListener('click', e => {
    const btnSig = e.target.closest('.btn-siguiente-oscuro');
    if (!btnSig || btnSig.disabled) return;
    const sig = btnSig.closest('.paso-cuestionario')?.nextElementSibling;
    if (sig?.id === 'q-cargando') {
      _calcularYGuardar(estado);
      setTimeout(() => { location.href = './dashboard.html'; }, 3200);
    }
  });

  document.getElementById('btn-registrate')?.addEventListener('click', async () => {
    const correo = document.getElementById('reg-correo')?.value;
    const nombre = document.getElementById('reg-nombre')?.value;
    const pass   = document.getElementById('reg-pass')?.value;
    if (!correo || !nombre || !pass) { alert('Por favor completa todos los campos.'); return; }
    try {
      const { uid } = await registrar(correo, pass, nombre, 'usuario');
      estado.uid = uid; estado.correo = correo; estado.nombre = nombre;
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
    const comidasBase = distribuirPorComidas(macros, est.nComidas ?? 3);
    const alergias  = est.alergia ? [est.alergia] : [];
    const comidas   = generarPlan({ comidas: comidasBase, objetivo, alergias, catalogoAlimentos: alimentos });
    const perfil    = {
      ...est, tmb, tdee, calObj, macros, imc, comidas, actividad, objetivo,
      pesoInicial:   est.peso,
      fechaCreacion: new Date().toISOString()
    };
    guardarCache('perfil_usuario', perfil);
    if (est.uid) guardarPerfilFirestore(est.uid, perfil);
  } catch (err) { console.error('_calcularYGuardar:', err); }
}

function _revelar(el) { el?.classList.remove('oculto'); el?.classList.add('visible'); }

// ══════════════════════════════════════════════════════════
// MODALES AUTH
// ══════════════════════════════════════════════════════════

function _initModalesAuth() {
  const modalLogin     = document.getElementById('modal-login');
  const modalRecuperar = document.getElementById('modal-recuperar');
  const vistaCuest     = document.getElementById('vista-cuestionario');

  document.getElementById('btn-crear-cuenta')?.addEventListener('click', () => {
    vistaCuest.style.display = 'flex'; document.body.style.overflow = 'hidden';
  });
  document.getElementById('btn-iniciar-sesion')?.addEventListener('click', () => {
    modalLogin.style.display = 'flex'; document.body.style.overflow = 'hidden';
  });
  document.getElementById('btn-cerrar-login')?.addEventListener('click', () => {
    modalLogin.style.display = 'none'; document.body.style.overflow = 'auto';
  });
  document.getElementById('btn-ir-registro')?.addEventListener('click', () => {
    modalLogin.style.display = 'none'; vistaCuest.style.display = 'flex';
  });
  document.getElementById('btn-recuperar-pass')?.addEventListener('click', () => {
    modalLogin.style.display = 'none'; modalRecuperar.style.display = 'flex';
  });
  document.getElementById('btn-cerrar-recuperar')?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none'; document.body.style.overflow = 'auto';
  });
  document.getElementById('btn-volver-login')?.addEventListener('click', () => {
    modalRecuperar.style.display = 'none'; modalLogin.style.display = 'flex';
  });
  document.getElementById('btn-toggle-login-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('login-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('form-login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerText = 'Accediendo...';
    try {
      await login(document.getElementById('login-email').value,
                  document.getElementById('login-pass').value);
      location.href = './dashboard.html';
    } catch (err) {
      alert('Error: ' + err.message);
      btn.disabled = false; btn.innerText = 'Acceder';
    }
  });

  document.getElementById('form-recuperar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerText = 'Enviando...';
    try {
      await resetPassword(document.getElementById('recuperar-email').value);
      alert('Email de recuperación enviado. Revisa tu bandeja.');
      modalRecuperar.style.display = 'none'; modalLogin.style.display = 'flex';
      e.target.reset();
    } catch (err) { alert('Error: ' + err.message); }
    finally { btn.disabled = false; btn.innerText = 'Enviar email'; }
  });

  [modalLogin, modalRecuperar].forEach(m => {
    m?.addEventListener('click', e => {
      if (e.target === m) { m.style.display = 'none'; document.body.style.overflow = 'auto'; }
    });
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD — FASE 5
// ══════════════════════════════════════════════════════════

async function initDashboard() {
  _initMenuLateral();

  document.getElementById('btn-logout')?.addEventListener('click', async e => {
    e.preventDefault();
    if (confirm('¿Cerrar sesión?')) { await logout(); location.href = './index.html'; }
  });

  const perfil  = obtenerCache('perfil_usuario');
  const loading = document.getElementById('rb-loading');

  if (!perfil) { loading?.remove(); _renderSinPlan(); return; }

  const { alimentos } = await cargarDatos();
  loading?.remove();

  _renderBanner(perfil);
  _initTabs(perfil, alimentos);
}

function _initTabs(perfil, alimentos) {
  const links  = document.querySelectorAll('.nav-link[data-tab]');
  const main   = document.getElementById('contenido-principal');

  const paneles = {
    hoy:    el => _renderHoy(perfil, el),
    dietas: el => _renderDietas(perfil, el),
    compra: el => _renderCompra(perfil, el),
    perfil: el => _renderPerfil(perfil, el),
    avance: el => _renderAvance(perfil, el)
  };

  const activar = tab => {
    links.forEach(l => l.classList.toggle('activo', l.dataset.tab === tab));
    main.querySelectorAll('.rb-tab-panel').forEach(p => p.remove());
    const panel = document.createElement('div');
    panel.className = 'rb-tab-panel activo';
    main.appendChild(panel);
    paneles[tab]?.(panel);
  };

  links.forEach(l => l.addEventListener('click', e => { e.preventDefault(); activar(l.dataset.tab); }));
  activar('hoy'); // Tab inicial: registro del día
}

// ── Banner ────────────────────────────────────────────────
function _renderBanner(perfil) {
  const main   = document.getElementById('contenido-principal');
  const banner = document.createElement('section');
  banner.className = 'bloque-comida';
  banner.style.marginBottom = '0';
  const nombre = perfil.nombre ? sanitizar(perfil.nombre) : '';
  const macros = perfil.macros ?? {};
  const imc    = perfil.imc    ?? {};
  banner.innerHTML = `
    <h2 class="titulo-comida">Hola${nombre ? ', ' + nombre : ''} 👋</h2>
    <p style="color:#8C9BA5;margin:0 0 14px;font-size:0.9rem;">${formatearFecha()}</p>
    <div class="rb-resumen">
      ${_macroCardHTML('🔥', macros.calorias ?? '—', 'kcal', 'Calorías')}
      ${_macroCardHTML('🥩', macros.proteina ?? '—', 'g', 'Proteína')}
      ${_macroCardHTML('🍞', macros.carbohidratos ?? '—', 'g', 'Carbos')}
      ${_macroCardHTML('🥑', macros.grasas ?? '—', 'g', 'Grasas')}
    </div>
    <div class="rb-imc-badge">📊 IMC: <strong>${imc.imc ?? '—'}</strong> — ${imc.clasificacion ?? ''}</div>`;
  main.prepend(banner);
}

function _macroCardHTML(e, v, u, l) {
  return `<div class="rb-macro-card">
    <span class="rb-macro-emoji">${e}</span>
    <strong class="rb-macro-valor">${v}</strong>
    <small class="rb-macro-unidad">${u}</small>
    <span class="rb-macro-label">${l}</span>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// TAB: HOY — Registro diario + anillo calórico
// ══════════════════════════════════════════════════════════

function _renderHoy(perfil, el) {
  const macros   = perfil.macros ?? {};
  const comidas  = perfil.comidas ?? [];
  const registro = obtenerRegistroDia(hoy());

  // ── Anillo calórico ───────────────────────────────────
  const consumido = registro.macrosConsumidos.calorias;
  const meta      = macros.calorias || 1;
  const pct       = Math.min(consumido / meta, 1);
  const radio     = 48; const circunferencia = 2 * Math.PI * radio;
  const offset    = circunferencia * (1 - pct);

  const secHoy = document.createElement('section');
  secHoy.className = 'bloque-comida';
  secHoy.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">📅 Registro de hoy</h3>
    <div class="rb-hoy-grid">
      <div class="rb-anillo-wrap">
        <svg class="rb-anillo-svg" width="110" height="110" viewBox="0 0 110 110">
          <circle class="rb-anillo-bg"   cx="55" cy="55" r="${radio}"/>
          <circle class="rb-anillo-fill" cx="55" cy="55" r="${radio}"
            stroke-dasharray="${circunferencia}"
            stroke-dashoffset="${offset}" id="anillo-calorias"/>
        </svg>
        <div class="rb-anillo-texto">
          <span class="rb-anillo-valor" id="anillo-val">${consumido}</span>
          <span class="rb-anillo-label">/ ${meta} kcal</span>
        </div>
      </div>
      <div class="rb-macros-dia" id="barras-macros">
        ${_barrasMacrosHTML(registro.macrosConsumidos, macros)}
      </div>
    </div>`;
  el.appendChild(secHoy);

  // ── Checklist de comidas ──────────────────────────────
  const secCheck = document.createElement('section');
  secCheck.className = 'bloque-comida';
  secCheck.innerHTML = `<h3 class="titulo-comida" style="font-size:1rem;">✅ Comidas del día</h3>
    <div class="rb-checklist" id="checklist-comidas"></div>`;
  el.appendChild(secCheck);

  const checklist = secCheck.querySelector('#checklist-comidas');
  comidas.forEach(comida => {
    const completada = !!registro.comidas[comida.nombre]?.completada;
    const item = document.createElement('div');
    item.className = `rb-check-item${completada ? ' completada' : ''}`;
    item.dataset.comida = comida.nombre;
    item.innerHTML = `
      <div class="rb-check-circulo">${completada ? '✓' : ''}</div>
      <div class="rb-check-info">
        <span class="rb-check-nombre">${comida.nombre}</span>
        <small class="rb-check-macros">
          P: ${comida.proteina}g · C: ${comida.carbohidratos}g · G: ${comida.grasas}g
        </small>
      </div>
      <span class="rb-check-kcal">${comida.calorias} kcal</span>`;

    item.addEventListener('click', () => {
      const ahora   = !item.classList.contains('completada');
      const reg     = toggleComidaCompletada(comida.nombre, comida, ahora);
      item.classList.toggle('completada', ahora);
      item.querySelector('.rb-check-circulo').textContent = ahora ? '✓' : '';
      // Actualizar anillo y barras
      _actualizarAnillo(reg.macrosConsumidos, macros);
    });

    checklist.appendChild(item);
  });

  // ── Peso del día ──────────────────────────────────────
  const secPeso = document.createElement('section');
  secPeso.className = 'bloque-comida';
  const pesoActual = registro.pesoDelDia ?? '';
  secPeso.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">⚖️ Peso corporal hoy</h3>
    <div class="rb-peso-form">
      <input type="number" class="rb-peso-input" id="input-peso-hoy"
        placeholder="Ej. 70.5" step="0.1" value="${pesoActual}">
      <button class="rb-peso-btn" id="btn-guardar-peso">Guardar</button>
    </div>`;
  el.appendChild(secPeso);

  secPeso.querySelector('#btn-guardar-peso').addEventListener('click', () => {
    const val = +secPeso.querySelector('#input-peso-hoy').value;
    if (!val || val < 20 || val > 300) { alert('Ingresa un peso válido (20-300 kg)'); return; }
    guardarPesoDia(val);
    _toast('Peso guardado ✓');
  });

  // ── Nota del día ──────────────────────────────────────
  const secNota = document.createElement('section');
  secNota.className = 'bloque-comida';
  secNota.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">📝 Nota del día</h3>
    <textarea class="rb-nota-area" id="nota-dia" rows="3"
      placeholder="¿Cómo te sentiste hoy? ¿Algo a mejorar?">${registro.nota ?? ''}</textarea>
    <button class="rb-nota-btn" id="btn-guardar-nota">Guardar nota</button>`;
  el.appendChild(secNota);

  secNota.querySelector('#btn-guardar-nota').addEventListener('click', () => {
    const nota = secNota.querySelector('#nota-dia').value;
    guardarNotaDia(nota);
    _toast('Nota guardada ✓');
  });
}

function _barrasMacrosHTML(consumido, meta) {
  const filas = [
    { label: 'Proteína',  actual: consumido.proteina,      total: meta.proteina ?? 1,      clase: 'fill-proteina', u: 'g' },
    { label: 'Carbos',    actual: consumido.carbohidratos,  total: meta.carbohidratos ?? 1, clase: 'fill-carbos',   u: 'g' },
    { label: 'Grasas',    actual: consumido.grasas,         total: meta.grasas ?? 1,        clase: 'fill-grasas',   u: 'g' }
  ];
  return filas.map(({ label, actual, total, clase, u }) => {
    const pct = Math.min(Math.round((actual / total) * 100), 100);
    return `
      <div class="rb-macro-row">
        <span class="rb-macro-row-label">${label}</span>
        <div class="rb-macro-row-bar">
          <div class="rb-macro-row-fill ${clase}" style="width:${pct}%"></div>
        </div>
        <span class="rb-macro-row-val">${actual}/${total}${u}</span>
      </div>`;
  }).join('');
}

function _actualizarAnillo(consumido, meta) {
  const radio    = 48;
  const circ     = 2 * Math.PI * radio;
  const pct      = Math.min(consumido.calorias / (meta.calorias || 1), 1);
  const anillo   = document.getElementById('anillo-calorias');
  const valEl    = document.getElementById('anillo-val');
  const barrasEl = document.getElementById('barras-macros');
  if (anillo) anillo.style.strokeDashoffset = circ * (1 - pct);
  if (valEl)  valEl.textContent = consumido.calorias;
  if (barrasEl) barrasEl.innerHTML = _barrasMacrosHTML(consumido, meta);
}

// ══════════════════════════════════════════════════════════
// TAB: AVANCE — Gráfica semanal + tendencia de peso
// ══════════════════════════════════════════════════════════

function _renderAvance(perfil, el) {
  const macros = perfil.macros ?? {};
  const stats  = estadisticasSemana(macros);

  // ── Cards de estadísticas ─────────────────────────────
  const secStats = document.createElement('section');
  secStats.className = 'bloque-comida';
  secStats.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">📊 Esta semana</h3>
    <div class="rb-stats-grid">
      ${_statCard('📅', stats.diasRegistrados, 'Días registrados')}
      ${_statCard('🎯', stats.cumplimiento + '%', 'Cumplimiento cal.')}
      ${_statCard('🔥', stats.promCalorias || '—', 'Prom. calorías/día')}
      ${_statCard('⚖️', stats.pesoActual ? stats.pesoActual + ' kg' : '—', 'Peso actual')}
    </div>`;
  el.appendChild(secStats);

  // ── Tendencia de peso ─────────────────────────────────
  if (stats.tendenciaPeso !== null) {
    const signo    = stats.tendenciaPeso > 0 ? '+' : '';
    const clase    = stats.tendenciaPeso < 0 ? 'baja' : stats.tendenciaPeso > 0 ? 'sube' : 'igual';
    const emoji    = stats.tendenciaPeso < 0 ? '📉' : stats.tendenciaPeso > 0 ? '📈' : '➡️';
    const secTend  = document.createElement('section');
    secTend.className = 'bloque-comida';
    secTend.innerHTML = `
      <h3 class="titulo-comida" style="font-size:1rem;">📈 Tendencia de peso (7 días)</h3>
      <div class="rb-tendencia">
        <span>${emoji}</span>
        <span class="rb-tendencia-valor ${clase}">${signo}${stats.tendenciaPeso} kg</span>
        <span>vs hace 7 días (${stats.pesoInicial ?? '—'} kg)</span>
      </div>`;
    el.appendChild(secTend);
  }

  // ── Gráfica de barras semanal ─────────────────────────
  const secGrafica = document.createElement('section');
  secGrafica.className = 'bloque-comida';

  const maxCal  = Math.max(...stats.filas.map(f => f.calorias), macros.calorias ?? 1);

  const barrasHTML = stats.filas.map(fila => {
    const pct   = Math.round((fila.calorias / maxCal) * 100);
    const vacia = fila.calorias === 0;
    return `
      <div class="rb-barra-col">
        <div class="rb-barra-bg">
          <div class="rb-barra-fill${vacia ? ' vacia' : ''}" style="height:${pct}%"
            title="${fila.calorias} kcal"></div>
        </div>
        <span class="rb-barra-val">${fila.calorias || ''}</span>
        <span class="rb-barra-label">${fila.etiqueta}</span>
      </div>`;
  }).join('');

  const metaPct = macros.calorias ? Math.round((macros.calorias / maxCal) * 100) : 0;

  secGrafica.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">🔥 Calorías diarias</h3>
    <div class="rb-meta-line-wrap">
      <div class="rb-meta-line" style="margin-bottom:${metaPct}%; margin-top: calc(${100 - metaPct}% - 2px);"></div>
      <span class="rb-meta-etiqueta">Meta: ${macros.calorias ?? 0} kcal</span>
    </div>
    <div class="rb-grafica-wrap">
      <div class="rb-grafica-barras">${barrasHTML}</div>
    </div>`;
  el.appendChild(secGrafica);

  // ── Barras de macros promedio vs meta ─────────────────
  const secMacros = document.createElement('section');
  secMacros.className = 'bloque-comida';

  const macrosAvg = stats.diasRegistrados > 0
    ? {
        proteina:      Math.round(stats.filas.reduce((s,f)=>s+f.proteina,0)      / stats.diasRegistrados),
        carbohidratos: Math.round(stats.filas.reduce((s,f)=>s+f.carbohidratos,0) / stats.diasRegistrados),
        grasas:        Math.round(stats.filas.reduce((s,f)=>s+f.grasas,0)        / stats.diasRegistrados),
        calorias:      stats.promCalorias
      }
    : { proteina: 0, carbohidratos: 0, grasas: 0, calorias: 0 };

  const filasMacros = [
    { label: 'Prot. prom.', actual: macrosAvg.proteina,      total: macros.proteina ?? 1,      clase: 'fill-proteina', u: 'g' },
    { label: 'Carb. prom.', actual: macrosAvg.carbohidratos, total: macros.carbohidratos ?? 1, clase: 'fill-carbos',   u: 'g' },
    { label: 'Gras. prom.', actual: macrosAvg.grasas,        total: macros.grasas ?? 1,        clase: 'fill-grasas',   u: 'g' }
  ];

  secMacros.innerHTML = `
    <h3 class="titulo-comida" style="font-size:1rem;">🍽️ Promedio macros vs meta</h3>
    <div class="rb-macros-dia" style="margin-top:8px;">
      ${filasMacros.map(({ label, actual, total, clase, u }) => {
        const pct = Math.min(Math.round((actual / total) * 100), 100);
        return `<div class="rb-macro-row">
          <span class="rb-macro-row-label">${label}</span>
          <div class="rb-macro-row-bar">
            <div class="rb-macro-row-fill ${clase}" style="width:${pct}%"></div>
          </div>
          <span class="rb-macro-row-val">${actual}/${total}${u}</span>
        </div>`;
      }).join('')}
    </div>`;
  el.appendChild(secMacros);

  // ── Botón Reporte de Progreso PDF ────────────────────
  const btnWrap = document.createElement('div');
  btnWrap.className = 'rb-pdf-wrap';
  btnWrap.innerHTML = `
    <button class="rb-pdf-btn rb-pdf-btn--oscuro" id="btn-pdf-progreso">
      📊 Descargar Reporte de Progreso
    </button>`;
  el.appendChild(btnWrap);

  el.querySelector('#btn-pdf-progreso').addEventListener('click', async () => {
    const btn = el.querySelector('#btn-pdf-progreso');
    btn.disabled = true; btn.textContent = '⏳ Generando PDF...';
    try {
      await generarReporteProgreso(perfil, stats);
    } catch (err) {
      console.error('PDF Progreso:', err);
      alert('Error al generar el PDF. Verifica que jsPDF esté cargado.');
    } finally {
      btn.disabled = false; btn.innerHTML = '📊 Descargar Reporte de Progreso';
    }
  });
}

function _statCard(emoji, valor, label) {
  return `<div class="rb-stat-card">
    <div class="rb-stat-emoji">${emoji}</div>
    <strong class="rb-stat-valor">${valor}</strong>
    <small class="rb-stat-label">${label}</small>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// TABS YA EXISTENTES (sin cambios de lógica)
// ══════════════════════════════════════════════════════════

function _renderDietas(perfil, el) {
  (perfil.comidas ?? []).forEach(comida => {
    const bloque = _clonarTemplate('tpl-bloque-comida');
    bloque.querySelector('.rb-comida-nombre').textContent = comida.nombre;
    bloque.querySelector('.rb-comida-kcal').textContent   = `${comida.calorias} kcal`;
    bloque.querySelector('.rb-comida-objetivos').textContent =
      `Objetivo → P: ${comida.proteina}g · C: ${comida.carbohidratos}g · G: ${comida.grasas}g`;
    const wrap = bloque.querySelector('.rb-items');
    (comida.items ?? []).forEach(item => {
      const nodo = _clonarTemplate('tpl-item-alimento');
      nodo.querySelector('.rb-item-emoji').textContent    = item.emoji;
      nodo.querySelector('.rb-item-nombre').textContent   = sanitizar(item.nombre);
      nodo.querySelector('.rb-item-macros').textContent   =
        `P: ${item.macros.proteina}g · C: ${item.macros.carbohidratos}g · G: ${item.macros.grasas}g`;
      nodo.querySelector('.rb-gramos-val').textContent    = item.gramos;
      nodo.querySelector('.rb-gramos-unidad').textContent = item.unidad;
      wrap.appendChild(nodo);
    });
    const tot = comida.totalesReales;
    if (tot) bloque.querySelector('.rb-comida-totales').textContent =
      `Real → ${tot.calorias} kcal · P: ${tot.proteina}g · C: ${tot.carbohidratos}g · G: ${tot.grasas}g`;
    el.appendChild(bloque);
  });
}

function _renderCompra(perfil, el) {
  const lista  = calcularListaCompra(perfil.comidas ?? []);
  const titulo = document.createElement('h3');
  titulo.style.cssText = 'margin-bottom:16px;color:#1A3636;font-size:1.1rem;';
  titulo.textContent   = '🛒 Compras para la semana';
  el.appendChild(titulo);
  if (!lista.length) { el.innerHTML += '<p style="color:#8C9BA5;text-align:center;">Sin datos de compra.</p>'; return; }
  const wrap = document.createElement('div');
  wrap.className = 'rb-lista-compra';
  lista.forEach(item => {
    const div = document.createElement('div');
    div.className = 'rb-compra-item';
    div.innerHTML = `<span>${item.emoji} <strong class="rb-compra-nombre">${sanitizar(item.nombre)}</strong></span>
      <span class="rb-compra-gramos">${item.gramosCompra} ${item.unidad}</span>`;
    wrap.appendChild(div);
  });
  el.appendChild(wrap);
}

function _renderPerfil(perfil, el) {
  const datos = [
    ['👤 Nombre',    perfil.nombre    ?? '—'],
    ['⚧  Género',    perfil.genero    ?? '—'],
    ['🎂 Edad',      perfil.edad    ? perfil.edad    + ' años' : '—'],
    ['⚖️  Peso',      perfil.peso    ? perfil.peso    + ' kg'   : '—'],
    ['📏 Estatura',  perfil.estatura ? perfil.estatura + ' cm'  : '—'],
    ['🎯 Objetivo',  _labelObjetivo(perfil.objetivo)],
    ['🏃 Actividad', _labelActividad(perfil.actividad)],
    ['📅 Plan desde',perfil.fechaCreacion ? new Date(perfil.fechaCreacion).toLocaleDateString('es-MX') : '—'],
    ['🔥 TMB',       perfil.tmb  ? Math.round(perfil.tmb)  + ' kcal' : '—'],
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

  // ── Botón Reporte PDF ─────────────────────────────────
  const btnWrap = document.createElement('div');
  btnWrap.className = 'rb-pdf-wrap';
  btnWrap.innerHTML = `
    <button class="rb-pdf-btn" id="btn-pdf-plan">
      📄 Descargar Plan en PDF
    </button>`;
  el.appendChild(btnWrap);

  el.querySelector('#btn-pdf-plan').addEventListener('click', async () => {
    const btn = el.querySelector('#btn-pdf-plan');
    btn.disabled = true; btn.textContent = '⏳ Generando PDF...';
    try {
      // Adjuntar lista de compra precalculada al perfil
      const perfilConLista = {
        ...perfil,
        _listaCompra: calcularListaCompra(perfil.comidas ?? [])
      };
      await generarReportePlan(perfilConLista);
    } catch (err) {
      console.error('PDF Plan:', err);
      alert('Error al generar el PDF. Verifica que jsPDF esté cargado.');
    } finally {
      btn.disabled = false; btn.innerHTML = '📄 Descargar Plan en PDF';
    }
  });
}

function _renderSinPlan() {
  document.getElementById('contenido-principal').innerHTML = `
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
  return { perdida_rapida:'Pérdida rápida', perdida_moderada:'Pérdida moderada',
    mantenimiento:'Mantenimiento', ganancia_limpia:'Ganancia limpia', volumen:'Volumen' }[clave] ?? clave ?? '—';
}
function _labelActividad(clave) {
  return { sedentario:'Sedentario', ligero:'Ligero (1-3 días)', moderado:'Moderado (3-5 días)',
    activo:'Activo (6-7 días)', muy_activo:'Muy activo' }[clave] ?? clave ?? '—';
}
function _toast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1A3636;color:#fff;padding:10px 24px;border-radius:30px;
    font-size:0.9rem;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);
    animation:fadeIn 0.2s ease;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
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