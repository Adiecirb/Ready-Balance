/**
  *CACHE.JS En lugar de ir a buscar los datos al servidor CADA VEZ que el usuario
  *abre la app, guardamos una copia local en el navegador.
  *
  *LOCALSTORAGE Espacio de almacenamiento que el navegador provee.
  *
  *SESSIONSTORAGE Los datos SE BORRAN cuando el usuario cierra el tab o el navegador.
 */

// SECCIÓN 1: CONFIGURACIÓN DEL MÓDULO DE CACHÉ

// Prefijo que agregamos a TODAS las claves en el storage.
// Ejemplo:  "alimentos", guardamos "nutriprecision_v1_alimentos"

const CACHE_PREFIX = "nutriprecision_v1_";

// Duración por defecto del caché en milisegundos(1 hora = 3,600,000 ms).
const DURACION_DEFAULT = 3_600_000; // Notación con _ para legibilidad

// SECCIÓN 2: FUNCIÓN GUARDAR CACHÉ

/**
 * Guarda datos en el navegador junto con un timestamp.
 * El timestamp permite saber si el caché sigue siendo válido.
 *
 * @param {string} clave - Nombre identificador del dato
 * @param {*} datos - Cualquier dato: array, objeto, string, número
 * @param {number} duracion - Milisegundos que será válido ( 1 hora)
 * @param {boolean} usarSession - Si true, usa SessionStorage (default: false)
 * @returns {boolean} - true si se guardó correctamente
 */

function guardarCache(clave, datos, duracion = DURACION_DEFAULT, usarSession = false) {
  try {
    
    const claveCompleta = CACHE_PREFIX + clave;

    // Date.now() retorna los milisegundos para saber cuándo guardamos el dato.
    const ahora = Date.now();

    const entrada = {
      datos: datos,             // Los datos reales que queremos guardar
      timestamp: ahora,         // ¿Cuándo se guardó?
      expira: ahora + duracion, // ¿Cuándo vence?
      version: window.CONFIG?.version || "1.0.0" // Versión del sistema
    };

    // JSON.stringify() convierte el objeto JavaScript a texto JSON.
    // Es necesario porque el storage solo guarda texto.
    const textoParaGuardar = JSON.stringify(entrada);

    if (usarSession) {
      // SessionStorage: se borra al cerrar el tab
      sessionStorage.setItem(claveCompleta, textoParaGuardar);
    } else {
      // LocalStorage: persiste entre sesiones
      localStorage.setItem(claveCompleta, textoParaGuardar);
    }

    console.log(`Cache guardado: '${clave}' (${formatearTamano(textoParaGuardar.length)})`);
    return true; 

  } catch (error) {
    // El caché puede fallar si el storage está lleno (QuotaExceededError)
    // o si el navegador está en modo privado con configuración restrictiva.
    // En ese caso, la app sigue funcionando pero sin caché.
    if (error.name === "QuotaExceededError") {
      console.warn(" Storage lleno. Limpiando caché antiguo...");
      limpiarCacheAntiguo();
    } else {
      console.error(" Error al guardar caché:", error.message);
    }
    return false; 
  }
}


// SECCIÓN 3: FUNCIÓN OBTENER CACHÉ

/**
 * Recupera datos del caché. Antes de retornarlos, verifica
 * que no hayan expirado.
 *
 * @param {string} clave - Nombre del dato a recuperar
 * @param {boolean} usarSession - Si true, busca en SessionStorage
 * @returns {*|null} - Los datos guardados, o null si no existen/expiraron
 */

function obtenerCache(clave, usarSession = false) {
  try {
    const claveCompleta = CACHE_PREFIX + clave;

    // Leemos el texto del storage correspondiente
    const textoGuardado = usarSession
      ? sessionStorage.getItem(claveCompleta)
      : localStorage.getItem(claveCompleta);

    // Si getItem() retorna null, significa que la clave no existe
    if (textoGuardado === null) {
      console.log(` Cache miss: '${clave}' no encontrado`);
      return null; // No hay caché para esta clave
    }

    // JSON.parse() convierte el texto JSON de vuelta a objeto JavaScript.
    // Es la operación inversa de JSON.stringify().
    const entrada = JSON.parse(textoGuardado);

    // Verificamos si el caché sigue siendo válido
    if (Date.now() > entrada.expira) {
      // El caché expiró: lo eliminamos para liberar espacio
      console.log(` Cache expirado: '${clave}'. Eliminando...`);
      eliminarCache(clave, usarSession);
      return null; // Indicamos que no hay caché válido
    }

    // Calculamos cuánto tiempo le queda al caché
    const minutosRestantes = Math.round((entrada.expira - Date.now()) / 60000);
    console.log(` Cache hit: '${clave}' (válido por ${minutosRestantes} min más)`);

    // Retornamos SOLO los datos, no los metadatos (timestamp, expira, etc.)
    return entrada.datos;

  } catch (error) {
    // Si el texto guardado estaba corrupto, JSON.parse() lanzará un error.
    // Limpiamos esa entrada corrupta y retornamos null.
    console.error(` Error al leer caché '${clave}':`, error.message);
    eliminarCache(clave, usarSession); // Borramos el dato corrupto
    return null;
  }
}


// SECCIÓN 4: FUNCIÓN ELIMINAR CACHÉ ESPECÍFICO

/**
 * Elimina un dato específico del caché.
 * Útil cuando sabemos que un dato fue actualizado.
 *
 * @param {string} clave - Nombre del dato a eliminar
 * @param {boolean} usarSession - Si true, elimina de SessionStorage
 * @returns {boolean} - true si se eliminó correctamente
 */
function eliminarCache(clave, usarSession = false) {
  try {
    const claveCompleta = CACHE_PREFIX + clave;

    // removeItem() elimina una entrada del storage por su clave.
    // Si la clave no existe, no hace nada (no lanza error).
    if (usarSession) {
      sessionStorage.removeItem(claveCompleta);
    } else {
      localStorage.removeItem(claveCompleta);
    }

    console.log(` Cache eliminado: '${clave}'`);
    return true;

  } catch (error) {
    console.error(` Error al eliminar caché '${clave}':`, error.message);
    return false;
  }
}


// SECCIÓN 5: FUNCIÓN LIMPIAR TODO EL CACHÉ
 
/** *
 * Elimina TODOS los datos del caché de nuestra aplicación.
 * Útil para: logout, reset del sistema, actualización de datos.
 *
 * IMPORTANTE: Solo borra las claves con nuestro prefijo.
 * No afecta datos de otras aplicaciones en el mismo navegador.
 *
 * @param {boolean} incluirSession - Si true, también limpia SessionStorage
 * @returns {number} - Cantidad de entradas eliminadas
 */
function limpiarCache(incluirSession = true) {
  let eliminados = 0;

  try {
    // localStorage.length indica cuántas claves hay guardadas
    // Iteramos de atrás hacia adelante porque vamos eliminando
    // (si iteramos de frente, los índices se desfasan al eliminar)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      // localStorage.key(i) retorna el nombre de la clave en posición i
      const clave = localStorage.key(i);

      // Solo eliminamos las claves que pertenecen a nuestra app
      // String.startsWith() verifica si el texto empieza con cierto prefijo
      if (clave && clave.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(clave);
        eliminados++;
      }
    }

    // Si también queremos limpiar SessionStorage
    if (incluirSession) {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const clave = sessionStorage.key(i);
        if (clave && clave.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(clave);
          eliminados++;
        }
      }
    }

    console.log(` Caché limpiado: ${eliminados} entradas eliminadas`);
    return eliminados;

  } catch (error) {
    console.error("Error al limpiar caché:", error.message);
    return eliminados;
  }
}


// SECCIÓN 6: FUNCIONES AUXILIARES DEL CACHÉ

// Elimina solo las entradas de caché que ya expiraron.Se usa cuando el storage está lleno (QuotaExceededError).
 
function limpiarCacheAntiguo() {
  const ahora = Date.now();
  let eliminados = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const clave = localStorage.key(i);
    if (!clave || !clave.startsWith(CACHE_PREFIX)) continue;

    try {
      const texto = localStorage.getItem(clave);
      const entrada = JSON.parse(texto);

      // Si ya expiró, lo eliminamos
      if (ahora > entrada.expira) {
        localStorage.removeItem(clave);
        eliminados++;
      }
    } catch {
      // Si el dato está corrupto, también lo eliminamos
      localStorage.removeItem(clave);
      eliminados++;
    }
  }

  console.log(` Caché antiguo limpiado: ${eliminados} entradas`);
}

/**
 * Retorna información sobre el uso actual del caché.
 * Útil para el panel de administración.
 * @returns {Object} - Estadísticas del caché
 */

function obtenerEstadisticasCache() {
  const ahora = Date.now();
  let totalEntradas = 0;
  let entradasValidas = 0;
  let entradasExpiradas = 0;
  let tamanoTotal = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (!clave || !clave.startsWith(CACHE_PREFIX)) continue;

    totalEntradas++;
    const texto = localStorage.getItem(clave) || "";
    tamanoTotal += texto.length;

    try {
      const entrada = JSON.parse(texto);
      if (ahora > entrada.expira) {
        entradasExpiradas++;
      } else {
        entradasValidas++;
      }
    } catch {
      entradasExpiradas++;
    }
  }

  return {
    totalEntradas,
    entradasValidas,
    entradasExpiradas,
    tamanoTotal: formatearTamano(tamanoTotal),
    // Porcentaje aproximado de uso (localStorage max ~5MB)
    porcentajeUso: Math.round((tamanoTotal / 5_000_000) * 100)
  };
}

/**
 * Convierte bytes a formato legible (KB, MB).
 * Función interna del módulo de caché.

 * @param {number} bytes - Número de bytes
 * @returns {string} - Texto formateado ("1.23 KB")
 */
function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


// SECCIÓN 7: CACHÉ INTELIGENTE — CARGAR CON FALLBACK

/** Implementa el patrón "Cache-First": primero revisa el caché, y solo si
 * no hay datos válidos, llama a la función de carga (fetch).
 *
 * @param {string} clave - Identificador del dato
 * @param {Function} fnCarga - Función async que carga los datos reales
 * @param {number} duracion - Cuánto tiempo cachear el resultado
 * @returns {Promise<*>} - Los datos (del caché o del servidor)
 */
async function cargarConCache(clave, fnCarga, duracion = DURACION_DEFAULT) {
  // PASO 1: Intentar obtener del caché
  const datosCacheados = obtenerCache(clave);

  if (datosCacheados !== null) {
    // Los datos están en caché y son válidos, retornamos directo
    return datosCacheados;
  }

  // PASO 2: No hay caché válido, cargar desde la fuente
  console.log(`🌐 Cargando desde fuente: '${clave}'...`);

  // fnCarga es una función que se pasa como parámetro.
  // se pueden pasar como argumentos, igual que un número o texto.
  const datosNuevos = await fnCarga();

  // PASO 3: Guardar en caché para la próxima vez
  guardarCache(clave, datosNuevos, duracion);

  // PASO 4: Retornar los datos frescos
  return datosNuevos;
}

// SECCIÓN 8: EXPORTAR FUNCIONES

// Exponemos todas las funciones públicas en el objeto global window
// para que main.js, config.js y utils.js puedan usarlas.
window.guardarCache = guardarCache;
window.obtenerCache = obtenerCache;
window.eliminarCache = eliminarCache;
window.limpiarCache = limpiarCache;
window.cargarConCache = cargarConCache;
window.obtenerEstadisticasCache = obtenerEstadisticasCache;

console.log(" Cache.js inicializado — LocalStorage y SessionStorage disponibles");