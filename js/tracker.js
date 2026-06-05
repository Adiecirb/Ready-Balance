// tracker.js — Registro diario de consumo + estadísticas de progreso

import { guardarCache, obtenerCache } from './cache.js';

// ── Claves de almacenamiento ──────────────────────────────
const _claveRegistro = fecha => `registro_${fecha}`;      // un registro por día
const CLAVE_HISTORIAL = 'historial_semanas';               // resumen semanal

// Fecha de hoy en formato YYYY-MM-DD
export function hoy() {
  return new Date().toISOString().split('T')[0];
}

// Últimos N días como array de strings YYYY-MM-DD
export function ultimosDias(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();
}

// ── Registro del día ──────────────────────────────────────

/**
 * Obtiene el registro del día (o lo crea vacío).
 * @param {string} fecha — YYYY-MM-DD, por defecto hoy
 * @returns {Object} { fecha, comidas: { [nombreComida]: { completada, items } } }
 */
export function obtenerRegistroDia(fecha = hoy()) {
  return obtenerCache(_claveRegistro(fecha)) ?? {
    fecha,
    comidas: {},       // { Desayuno: { completada: false, items: [] }, ... }
    macrosConsumidos:  { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0 },
    pesoDelDia:        null,
    nota:              ''
  };
}

/**
 * Marca una comida como completada o no.
 * Recalcula los macros consumidos del día.
 */
export function toggleComidaCompletada(nombreComida, planComida, completada, fecha = hoy()) {
  const registro = obtenerRegistroDia(fecha);

  if (completada) {
    registro.comidas[nombreComida] = {
      completada: true,
      calorias:      planComida.totalesReales?.calorias      ?? planComida.calorias,
      proteina:      planComida.totalesReales?.proteina      ?? planComida.proteina,
      carbohidratos: planComida.totalesReales?.carbohidratos ?? planComida.carbohidratos,
      grasas:        planComida.totalesReales?.grasas        ?? planComida.grasas
    };
  } else {
    delete registro.comidas[nombreComida];
  }

  // Recalcular totales del día
  registro.macrosConsumidos = _sumarMacrosDia(registro.comidas);
  guardarCache(_claveRegistro(fecha), registro, 7 * 24 * 3_600_000); // TTL 7 días
  return registro;
}

/**
 * Guarda el peso corporal del día.
 */
export function guardarPesoDia(peso, fecha = hoy()) {
  const registro  = obtenerRegistroDia(fecha);
  registro.pesoDelDia = peso;
  guardarCache(_claveRegistro(fecha), registro, 7 * 24 * 3_600_000);
  // Actualizar historial de pesos
  _actualizarHistorialPeso(fecha, peso);
}

/**
 * Guarda una nota rápida del día.
 */
export function guardarNotaDia(nota, fecha = hoy()) {
  const registro = obtenerRegistroDia(fecha);
  registro.nota  = nota;
  guardarCache(_claveRegistro(fecha), registro, 7 * 24 * 3_600_000);
}

// ── Estadísticas semanales ────────────────────────────────

/**
 * Genera las estadísticas de los últimos 7 días.
 * @param {Object} macrosMeta — macros objetivo del plan
 * @returns {Object} estadísticas + arrays para gráficas
 */
export function estadisticasSemana(macrosMeta) {
  const dias    = ultimosDias(7);
  const filas   = dias.map(fecha => {
    const r = obtenerRegistroDia(fecha);
    return {
      fecha,
      etiqueta:     _etiquetaDia(fecha),
      completadas:  Object.values(r.comidas).filter(c => c.completada).length,
      calorias:     r.macrosConsumidos.calorias,
      proteina:     r.macrosConsumidos.proteina,
      carbohidratos:r.macrosConsumidos.carbohidratos,
      grasas:       r.macrosConsumidos.grasas,
      peso:         r.pesoDelDia
    };
  });

  const meta  = macrosMeta ?? { calorias: 1, proteina: 1, carbohidratos: 1, grasas: 1 };
  const diasConDatos  = filas.filter(f => f.calorias > 0);
  const promCalorias  = diasConDatos.length
    ? Math.round(diasConDatos.reduce((s, f) => s + f.calorias, 0) / diasConDatos.length)
    : 0;
  const cumplimiento  = diasConDatos.length
    ? Math.round(diasConDatos.reduce((s, f) => s + Math.min(f.calorias / meta.calorias, 1), 0) / Math.max(diasConDatos.length, 1) * 100)
    : 0;

  const pesos = filas.map(f => f.peso).filter(Boolean);
  const pesoActual  = pesos.at(-1) ?? null;
  const pesoInicial = pesos[0]     ?? null;

  return {
    filas,
    promCalorias,
    cumplimiento,
    diasRegistrados: diasConDatos.length,
    pesoActual,
    pesoInicial,
    tendenciaPeso:    pesos.length >= 2 ? +(pesoActual - pesoInicial).toFixed(1) : null
  };
}

/**
 * Retorna el historial de pesos para la gráfica de línea.
 */
export function historialPesos() {
  return obtenerCache('historial_pesos') ?? [];
}

// ── Privadas ──────────────────────────────────────────────

function _sumarMacrosDia(comidas) {
  return Object.values(comidas).reduce((acc, c) => ({
    calorias:      acc.calorias      + (c.calorias      ?? 0),
    proteina:      acc.proteina      + (c.proteina      ?? 0),
    carbohidratos: acc.carbohidratos + (c.carbohidratos ?? 0),
    grasas:        acc.grasas        + (c.grasas        ?? 0)
  }), { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0 });
}

function _actualizarHistorialPeso(fecha, peso) {
  const hist = obtenerCache('historial_pesos') ?? [];
  const idx  = hist.findIndex(h => h.fecha === fecha);
  if (idx >= 0) hist[idx].peso = peso;
  else          hist.push({ fecha, peso });
  // Mantener solo los últimos 30 días
  hist.sort((a, b) => a.fecha.localeCompare(b.fecha));
  guardarCache('historial_pesos', hist.slice(-30), 30 * 24 * 3_600_000);
}

function _etiquetaDia(fechaISO) {
  const d = new Date(fechaISO + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
}