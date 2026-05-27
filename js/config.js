 /* CONFIG.JS 
  Este es el archivo de CONFIGURACIÓN del sistema. Carga todos los 
  datos que la aplicación necesita(alimentos, usuarios, planes) desde 
  archivos JSON externos.Centraliza toda la configuración en un solo lugar. 
 
  FETCH() — Peticiones HTTP para cargar los archivos JSON. Es asíncrono, por eso usamos async/await.
  ASYNC/AWAIT — Permite escribir código asíncrono de forma más legible, como si fuera síncrono.
  PROMISE.ALL() — Carga los 3 archivos JSON al mismo tiempo, lo que es más eficiente que cargarlos uno por uno.
  RESPONSE.JSON() — Convierte la respuesta del servidor de texto JSON a un objeto/array de JavaScript.
  */

// SECCIÓN 1: CONFIGURACIÓN GLOBAL DEL SISTEMA
// Objeto que centraliza toda la configuración de la aplicación.



const CONFIG = {

  version: '1.0.0',

  appName: 'Redy Balance' ,

    // RUTAS a los archivos JSON de datos.

  rutas: {
    alimentos: "./data/foods.json",   // Catálogo de ingredientes
    usuarios: "./data/users.json",    // Perfiles de usuarios
    planes: "./data/plans.json"       // Planes alimenticios
  },

    // Tiempo máximo en milisegundos antes de cancelar una petición.
    tiempoLimite: 5000,

      // Clave que se usará en LocalStorage para guardar el caché.
  claveCache: 'redyBalanceCache',

    // Duración en milisegundos para considerar el caché como válido (ej. 1 hora).
  duracionCache: 3600000,

  // Valores nutricionales de referencia diaria (según OMS).
  // Estos son los requerimientos promedio para un adulto de 70 kg.
  valoresReferencia: {
    caloriasBase: 2000,          // Calorías diarias recomendadas
    proteinaPorKg: 0.8,          // Gramos de proteína por kg de peso
    carbohidratosPorcentaje: 0.5, // 50% de calorías de carbohidratos
    grasasPorcentaje: 0.3,        // 30% de calorías de grasas
    proteínasPorcentaje: 0.2      // 20% de calorías de proteínas
  }
};

// SECCIÓN 2: FUNCIÓN PRINCIPAL DE CARGA DE DATOS

//Carga los tres archivos JSON al mismo tiempo usando Promise.all(), lo que es
 //más eficiente que cargarlos uno por uno.
 
 
async function cargarDatos() {
  try {
    // console.log() imprime mensajes en la consola del navegador.
    console.log(" Iniciando carga de datos del sistema...");

    // Promise.all() ejecuta varias promesas AL MISMO TIEMPO.
  const [alimentos, usuarios, planes] = await Promise.all([
      // Cada llamada a obtenerJSON() hace fetch() + valida + convierte a objeto
      obtenerJSON(CONFIG.rutas.alimentos, "alimentos"),
      obtenerJSON(CONFIG.rutas.usuarios, "usuarios"),
      obtenerJSON(CONFIG.rutas.planes, "planes")
    ]);


// Si los 3 archivos cargaron correctamente.
    console.log("Datos cargados exitosamente:", {
      totalAlimentos: alimentos.length,
      totalUsuarios: usuarios.length,
      totalPlanes: planes.length
    });

    // Retornamos un objeto con todos los datos organizados.
    // Cualquier archivo JS puede usar este retorno.
    return { alimentos, usuarios, planes };

  } catch (error) {
    console.error("Error al cargar datos:", error.message);

   return manejarError(error);
  }
}

// SECCIÓN 3: FUNCIÓN AUXILIAR PARA PETICIONES HTTP
//Hace la petición HTTP real. Encapsula el fetch()
 /**
 * @param {string} url - Ruta al archivo JSON
 * @param {string} nombreRecurso - Nombre para mensajes de error
 * @returns {Promise<Array|Object>} - Los datos del JSON
 */
async function obtenerJSON(url, nombreRecurso) {
  try {
    // AbortController permite cancelar una petición después de X tiempo.
    const controlador = new AbortController();

    const temporizador = setTimeout(
      () => controlador.abort(),    // abort() cancela el fetch
      CONFIG.tiempoLimite
    );


    const response = await fetch(url, {
      method: "GET",                     // Tipo de petición: leer datos
      signal: controlador.signal,        // Conecta el cancelador
      headers: {
        "Accept": "application/json"     // Le decimos al servidor qué queremos
      }
    });

    // Limpiamos el temporizador porque la petición ya terminó
    clearTimeout(temporizador);

    // response.ok es true cuando el servidor respondió con 2xx (200, 201, etc.)
    // Si el archivo no existe, el servidor responde 404 y ok es false
    if (!response.ok) {
      // Lanzamos un error personalizado con información útil
      throw new Error(
        `Error HTTP ${response.status}: No se pudo cargar '${nombreRecurso}' desde ${url}`
      );
    }

    // response.json() lee el cuerpo de la respuesta y lo convierte
    // de texto JSON a un objeto/array de JavaScript.
    // Esta operación también es asíncrona, por eso usamos await.
    const datos = await response.json();

    if (!validarEstructuraDatos(datos, nombreRecurso)) {
      throw new Error(`Los datos de '${nombreRecurso}' tienen un formato incorrecto`);
    }

    console.log(`   ${nombreRecurso}: ${Array.isArray(datos) ? datos.length + " registros" : "cargado"}`);

    return datos;

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Tiempo agotado al cargar '${nombreRecurso}'. Verifica tu conexión.`);
    }
    throw error;
  }
}

// SECCIÓN 4: VALIDACIÓN DE ESTRUCTURA DE DATOS
//Verifica que los datos JSON descargados tengan la estructura
// correcta antes de usarlos. Evita errores difíciles de depurar.

 /**
 * @param {*} datos - Los datos recibidos
 * @param {string} tipo - Tipo de datos para saber qué validar
 * @returns {boolean} - true si los datos son válidos
 */

function validarEstructuraDatos(datos, tipo) {
  if (!datos) return false;

  // Para alimentos, usuarios y planes esperamos un array
  if (tipo === "alimentos" || tipo === "usuarios" || tipo === "planes") {
    if (!Array.isArray(datos)) {
      console.warn(` Se esperaba un array para '${tipo}', se recibió: ${typeof datos}`);
      return false;
    }

    if (datos.length === 0) {
      console.warn(` El archivo '${tipo}' está vacío`);
      return true;
    }
  }

  return true; 
}

// SECCIÓN 5: MANEJO DE ERRORES 
// Si ocurre cualquier error durante la carga de datos, esta función se encarga de
//  mostrar un mensaje amigable al usuario y retornar estructuras vacías para que la aplicación no se rompa por completo.

/**
 * @param {Error} error - El error que ocurrió
 * @returns {Object} - Estructura vacía para evitar errores en la app
 */
function manejarError(error) {
  // Buscamos el elemento HTML donde mostrar errores al usuario
  const contenedorError = document.getElementById("error-mensaje");

  if (contenedorError) {
    // Mostramos el error en la interfaz (no solo en consola)
    contenedorError.innerHTML = `
      <div class="alerta alerta-error">
        <strong> Error al cargar datos</strong>
        <p>${error.message}</p>
        <p>Verifica que los archivos JSON existen en la carpeta /data/</p>
        <button onclick="location.reload()"> Reintentar</button>
      </div>
    `;
    contenedorError.style.display = "block";
  }

  // Retornamos estructuras vacías para que no se rompa
  // La interfaz quedará vacía pero funcional
  return {
    alimentos: [],
    usuarios: [],
    planes: []
  };
}

// SECCIÓN 6: FUNCIÓN DE RECARGA FORZADA
// Limpia el caché y vuelve a cargar todo desde cero.
//Útil cuando el administrador actualiza los datos.

// @returns {Promise<Object>} - Datos frescos desde los archivos JSON
 

async function recargarDatos() {
  console.log("🔄 Forzando recarga de datos (limpiando caché)...");

  // Eliminamos el caché existente para forzar descarga fresca
  // La función limpiarCache() está definida en cache.js
  if (typeof limpiarCache === "function") {
    limpiarCache();
  }

  // Cargamos los datos de nuevo desde los archivos JSON
  return await cargarDatos();
}

// SECCIÓN 7: EXPORTAR FUNCIONES Y CONFIGURACIÓN
// Hacemos disponibles las funciones para otros archivos JS.
// En proyectos sin módulos ES6, usamos el objeto window.
// window es el objeto global del navegador

window.CONFIG = CONFIG;
window.cargarDatos = cargarDatos;
window.recargarDatos = recargarDatos;

// Imprimimos confirmación de que el archivo cargó correctamente
console.log(` Config.js v${CONFIG.version} inicializado — ${CONFIG.appName}`);
