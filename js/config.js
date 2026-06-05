// config.js — Configuración global + logger de entorno

// ── Detectar entorno ──────────────────────────────────────
const ES_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

export const CONFIG = {
  version:  '8.0.0',
  appName:  'Ready Balance',
  entorno:  ES_DEV ? 'desarrollo' : 'producción',
  debug:    ES_DEV,

  rutas: {
    alimentos: './data/foods.json',
    usuarios:  './data/users.json',
    planes:    './data/plans.json'
  },

  cache: {
    duracion:   3_600_000,       // 1 hora
    duracionDia: 86_400_000,     // 24 horas
    clave:      'rb_v8'
  },

  fetch: {
    timeout: 5000                // 5 s antes de abortar
  },

  // Referencia OMS / valores nutricionales base
  nutricion: {
    proteinaPorKg:           0.8,
    carbohidratosPorcentaje: 0.50,
    grasasPorcentaje:        0.30,
    proteinasPorcentaje:     0.20
  }
};

// ── Logger controlado ─────────────────────────────────────
// En producción todos los métodos son no-ops → cero console.log
export const log = CONFIG.debug
  ? {
      info:  (...a) => console.log('[RB]',  ...a),
      warn:  (...a) => console.warn('[RB]', ...a),
      error: (...a) => console.error('[RB]',...a),
      time:  (l)    => console.time(l),
      timeEnd:(l)   => console.timeEnd(l)
    }
  : { info:()=>{}, warn:()=>{}, error:()=>{}, time:()=>{}, timeEnd:()=>{} };

// ── Fetch con timeout y AbortController ──────────────────
async function fetchJSON(url, nombre) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.fetch.timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${nombre}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Timeout al cargar ${nombre}`);
    throw err;
  }
}

// Carga paralela — retorna vacíos en caso de fallo parcial
export async function cargarDatos() {
  log.time('cargarDatos');
  try {
    const [alimentos, usuarios, planes] = await Promise.allSettled([
      fetchJSON(CONFIG.rutas.alimentos, 'alimentos'),
      fetchJSON(CONFIG.rutas.usuarios,  'usuarios'),
      fetchJSON(CONFIG.rutas.planes,    'planes')
    ]);
    log.timeEnd('cargarDatos');
    return {
      alimentos: alimentos.status === 'fulfilled' ? alimentos.value : [],
      usuarios:  usuarios.status  === 'fulfilled' ? usuarios.value  : [],
      planes:    planes.status    === 'fulfilled' ? planes.value    : []
    };
  } catch (err) {
    log.error('cargarDatos:', err.message);
    return { alimentos: [], usuarios: [], planes: [] };
  }
}

export async function cargarAlimentos() {
  return fetchJSON(CONFIG.rutas.alimentos, 'alimentos');
}