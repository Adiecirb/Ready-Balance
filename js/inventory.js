// inventory.js — Inventario semanal, mermas y costos

// Precios MXN por kg por categoría (fallback si el alimento no tiene precio_kg)
const PRECIO_POR_CATEGORIA = {
  proteína:     90,
  carbohidrato: 25,
  grasa:        80,
  verdura:      30,
  fruta:        35
};

/**
 * Calcula el inventario semanal completo.
 * @param {Object} perfil — perfil con comidas[]
 * @param {Array}  catalogo — foods.json
 * @returns {Array} filas de inventario con merma y costo
 */
export function calcularInventarioSemanal(perfil, catalogo) {
  const idxCatalogo = catalogo.reduce((a, f) => { a[f.id] = f; return a; }, {});
  const acum        = {};

  (perfil.comidas ?? []).forEach(comida => {
    (comida.items ?? []).forEach(item => {
      const base = idxCatalogo[item.id];
      if (!base) return;
      if (!acum[item.id]) {
        acum[item.id] = {
          id:                item.id,
          nombre:            base.nombre,
          categoria:         base.categoria,
          unidad:            base.unidad ?? 'g',
          merma_porcentaje:  Math.round((base.merma ?? 0) * 100),
          precio_kg:         base.precio_kg ?? PRECIO_POR_CATEGORIA[base.categoria] ?? 50,
          gramos_diarios:    0
        };
      }
      acum[item.id].gramos_diarios += item.gramos;
    });
  });

  return Object.values(acum).map(a => {
    const neto_diario    = a.gramos_diarios;
    const neto_semanal   = neto_diario * 7;
    const merma_pct      = a.merma_porcentaje / 100;
    const merma_gramos   = Math.round(neto_semanal * merma_pct);
    const total_compra   = neto_semanal + merma_gramos;
    const costo_total    = ((total_compra / 1000) * a.precio_kg).toFixed(2);

    return {
      ...a,
      gramaje_neto_semanal:  Math.round(neto_semanal),
      merma_gramos,
      gramaje_total_compra:  Math.round(total_compra),
      costo_total
    };
  }).sort((a, b) => a.categoria.localeCompare(b.categoria));
}

/**
 * Costos totales y por categoría.
 */
export function calcularCostosTotales(inventario) {
  const costos_categoria = {};
  let total = 0;
  let gramaje_total = 0;

  inventario.forEach(item => {
    const costo = parseFloat(item.costo_total);
    total       += costo;
    gramaje_total += item.gramaje_total_compra;
    if (!costos_categoria[item.categoria]) costos_categoria[item.categoria] = 0;
    costos_categoria[item.categoria] += costo;
  });

  // Redondear costos por categoría
  Object.keys(costos_categoria).forEach(k => {
    costos_categoria[k] = costos_categoria[k].toFixed(2);
  });

  return {
    costo_total:          total.toFixed(2),
    items_totales:        inventario.length,
    gramaje_total_compra: gramaje_total,
    costos_categoria
  };
}

/**
 * Mermas agrupadas por categoría.
 */
export function calcularMermasPorCategoria(inventario) {
  const mermas = {};

  inventario.forEach(item => {
    if (!mermas[item.categoria]) {
      mermas[item.categoria] = { items: 0, merma_total_gramos: 0, pcts: [] };
    }
    mermas[item.categoria].items++;
    mermas[item.categoria].merma_total_gramos += item.merma_gramos;
    mermas[item.categoria].pcts.push(item.merma_porcentaje);
  });

  Object.keys(mermas).forEach(k => {
    const m = mermas[k];
    m.porcentaje_promedio = m.pcts.length
      ? Math.round(m.pcts.reduce((s, p) => s + p, 0) / m.pcts.length)
      : 0;
    delete m.pcts;
  });

  return mermas;
}

/**
 * Lista de compra ordenada por categoría (para ir al super).
 */
export function generarListaCompraOptimizada(inventario) {
  return [...inventario]
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
    .map(i => ({
      nombre:   i.nombre,
      categoria:i.categoria,
      cantidad: i.gramaje_total_compra,
      unidad:   i.unidad,
      costo:    i.costo_total
    }));
}