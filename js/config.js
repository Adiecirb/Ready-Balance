 /* CONFIG.JS 
  Este es el archivo de CONFIGURACIÓN del sistema. Carga todos los 
  datos que la aplicación necesita(alimentos, usuarios, planes) desde 
  archivos JSON externos.Centraliza toda la configuración en un solo lugar. 
 
  FETCH() — Peticiones HTTP para cargar los archivos JSON. Es asíncrono, por eso usamos async/await.
  ASYNC/AWAIT — Permite escribir código asíncrono de forma más legible, como si fuera síncrono.
  PROMISE.ALL() — Carga los 3 archivos JSON al mismo tiempo, lo que es más eficiente que cargarlos uno por uno.
  RESPONSE.JSON() — Convierte la respuesta del servidor de texto JSON a un objeto/array de JavaScript.
  */

//// config.js — Configuración global y carga de datos

export const CONFIG = {
  version: '2.0.0',
  appName: 'Ready Balance',
  rutas: {
    alimentos: './data/foods.json',
    usuarios:  './data/users.json',
    planes:    './data/plans.json'
  },
  tiempoLimite: 5000,
  claveCache: 'readyBalanceCache',
  duracionCache: 3_600_000,
  // Referencia OMS para adulto promedio
  valoresRef: {
    caloriasBase:            2000,
    proteinaPorKg:           0.8,
    carbohidratosPorcentaje: 0.50,
    grasasPorcentaje:        0.30,
    proteinasPorcentaje:     0.20
  }
};

// Fetch con timeout interno
async function fetchJSON(url, nombre) {
  const ctrl   = new AbortController();
  const timer  = setTimeout(() => ctrl.abort(), CONFIG.tiempoLimite);
  try {
    const res = await fetch(url, {
      method:  'GET',
      signal:  ctrl.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${nombre}`);
    const data = await res.json();
    // Acepta array vacío pero no null/undefined
    if (data === null || data === undefined) throw new Error(`Datos nulos: ${nombre}`);
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Timeout: ${nombre}`);
    throw err;
  }
}

// Carga paralela de los tres JSON
export async function cargarDatos() {
  try {
    const [alimentos, usuarios, planes] = await Promise.all([
      fetchJSON(CONFIG.rutas.alimentos, 'alimentos'),
      fetchJSON(CONFIG.rutas.usuarios,  'usuarios'),
      fetchJSON(CONFIG.rutas.planes,    'planes')
    ]);
    return { alimentos, usuarios, planes };
  } catch (err) {
    console.error('cargarDatos:', err.message);
    return { alimentos: [], usuarios: [], planes: [] };
  }
}

// Carga individual de un recurso
export async function cargarAlimentos() {
  return fetchJSON(CONFIG.rutas.alimentos, 'alimentos');
}