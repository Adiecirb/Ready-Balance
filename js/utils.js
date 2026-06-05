// utils.js — Motor nutricional + helpers generales

// ── Nutricional ───────────────────────────────────────────

// TMB: Mifflin-St Jeor (más precisa que Harris-Benedict)
export function calcularTMB({ peso, estatura, edad, genero }) {
  const base = 10 * peso + 6.25 * estatura - 5 * edad;
  return genero === 'masculino' ? base + 5 : base - 161;
}

// Factor de actividad → TDEE (gasto total diario)
const FACTOR_ACTIVIDAD = {
  sedentario:   1.2,   // sin ejercicio
  ligero:       1.375, // 1-3 días/semana
  moderado:     1.55,  // 3-5 días/semana
  activo:       1.725, // 6-7 días/semana
  muy_activo:   1.9    // atleta / doble sesión
};

export function calcularTDEE(tmb, nivelActividad) {
  return Math.round(tmb * (FACTOR_ACTIVIDAD[nivelActividad] ?? 1.55));
}

// Calorías objetivo según meta del usuario
export function calcularCaloriasObjetivo(tdee, objetivo) {
  const ajuste = {
    perdida_rapida:    -500,
    perdida_moderada:  -300,
    mantenimiento:        0,
    ganancia_limpia:   +250,
    volumen:           +500
  };
  return Math.round(tdee + (ajuste[objetivo] ?? 0));
}

// Distribución de macros en gramos según objetivo
export function calcularMacros(calorias, objetivo) {
  // Porcentajes adaptados por objetivo
  const pct = {
    perdida_rapida:   { p: 0.35, c: 0.40, g: 0.25 },
    perdida_moderada: { p: 0.30, c: 0.45, g: 0.25 },
    mantenimiento:    { p: 0.25, c: 0.50, g: 0.25 },
    ganancia_limpia:  { p: 0.25, c: 0.50, g: 0.25 },
    volumen:          { p: 0.25, c: 0.50, g: 0.25 }
  }[objetivo] ?? { p: 0.25, c: 0.50, g: 0.25 };

  return {
    proteina:      Math.round((calorias * pct.p) / 4),  // 4 kcal/g
    carbohidratos: Math.round((calorias * pct.c) / 4),
    grasas:        Math.round((calorias * pct.g) / 9),  // 9 kcal/g
    calorias
  };
}

// IMC + clasificación OMS
export function calcularIMC(peso, estatura) {
  const estaturaM = estatura / 100;
  const imc = peso / (estaturaM * estaturaM);
  let clasificacion;
  if      (imc < 18.5) clasificacion = 'Bajo peso';
  else if (imc < 25)   clasificacion = 'Normal';
  else if (imc < 30)   clasificacion = 'Sobrepeso';
  else if (imc < 35)   clasificacion = 'Obesidad I';
  else if (imc < 40)   clasificacion = 'Obesidad II';
  else                 clasificacion = 'Obesidad III';
  return { imc: +imc.toFixed(1), clasificacion };
}

// Peso ideal rango (Devine + variante)
export function rangoPesoIdeal(estatura, genero) {
  const cm = estatura - 152.4;
  const base = genero === 'masculino'
    ? 50  + 0.906 * cm
    : 45.5 + 0.906 * cm;
  return { min: Math.round(base - 5), max: Math.round(base + 5) };
}

// Distribución de macros por tiempo de comida
export function distribuirPorComidas(macros, nComidas) {
  const pct = _pctPorComidas(nComidas);
  return pct.map((p, i) => ({
    nombre:        ['Desayuno', 'Almuerzo', 'Comida', 'Cena', 'Snack'][i] ?? `Comida ${i + 1}`,
    calorias:      Math.round(macros.calorias      * p),
    proteina:      Math.round(macros.proteina      * p),
    carbohidratos: Math.round(macros.carbohidratos * p),
    grasas:        Math.round(macros.grasas        * p)
  }));
}

function _pctPorComidas(n) {
  return {
    2: [0.55, 0.45],
    3: [0.30, 0.35, 0.35],
    4: [0.25, 0.30, 0.30, 0.15],
    5: [0.20, 0.15, 0.30, 0.25, 0.10]
  }[n] ?? [0.30, 0.35, 0.35];
}

// ── Cálculo de calorías de macros ────────────────────────
export function calculateCalories(protein, carbs, fats) {
  return protein * 4 + carbs * 4 + fats * 9;
}

// ── Nivel de actividad a partir del texto del cuestionario ──
export function textoANivelActividad(texto) {
  if (!texto) return 'moderado';
  if (texto.includes('6-7')) return 'muy_activo';
  if (texto.includes('4-5')) return 'activo';
  if (texto.includes('2-3')) return 'moderado';
  if (texto.includes('1 día')) return 'ligero';
  return 'sedentario';
}

// Objetivo del texto del cuestionario → clave interna
export function textoAObjetivo(texto) {
  if (!texto) return 'mantenimiento';
  if (texto.includes('Pérdida')) return 'perdida_moderada';
  if (texto.includes('músculo') && texto.includes('grasa')) return 'ganancia_limpia';
  if (texto.includes('músculo')) return 'volumen';
  return 'mantenimiento';
}

// ── Helpers UI ────────────────────────────────────────────

export function sanitizar(str) {
  return String(str).replace(/[<>"'&]/g, c => ({
    '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
  }[c]));
}

export function formatearFecha(date = new Date()) {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function formatearNumero(n, decimales = 0) {
  return Number(n).toFixed(decimales);
}