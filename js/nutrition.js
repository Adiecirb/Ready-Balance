// nutrition.js — Motor nutricional: asignación de alimentos reales por comida y objetivo

// ── Plantillas de alimentos por tiempo de comida y objetivo ──
// Cada entrada: [idAlimento, ...] — orden de preferencia por slot
const PLANTILLAS = {
  perdida_rapida: {
    Desayuno: { proteina: [3, 4], carb: [8, 9], grasa: [13], verdura: [17] },
    Almuerzo: { proteina: [2, 4], carb: [9, 7], grasa: [14], verdura: [16] },
    Comida:   { proteina: [1, 6], carb: [7, 9], grasa: [14], verdura: [16, 18] },
    Cena:     { proteina: [2, 1], carb: [9],    grasa: [13], verdura: [17, 18] },
    Snack:    { proteina: [4],    carb: [19],   grasa: [15], verdura: [] }
  },
  perdida_moderada: {
    Desayuno: { proteina: [3, 4], carb: [8, 12], grasa: [13], verdura: [17] },
    Almuerzo: { proteina: [1, 2], carb: [7, 9],  grasa: [14], verdura: [16] },
    Comida:   { proteina: [1, 5], carb: [7, 10], grasa: [13], verdura: [16, 18] },
    Cena:     { proteina: [2, 1], carb: [9],     grasa: [14], verdura: [17, 18] },
    Snack:    { proteina: [4],    carb: [19, 20], grasa: [15], verdura: [] }
  },
  mantenimiento: {
    Desayuno: { proteina: [3],    carb: [8, 12], grasa: [13], verdura: [17] },
    Almuerzo: { proteina: [1, 6], carb: [7, 11], grasa: [13], verdura: [16] },
    Comida:   { proteina: [5, 1], carb: [7, 10], grasa: [14], verdura: [16, 18] },
    Cena:     { proteina: [2, 1], carb: [11, 9], grasa: [15], verdura: [17] },
    Snack:    { proteina: [4],    carb: [19, 20], grasa: [15], verdura: [] }
  },
  ganancia_limpia: {
    Desayuno: { proteina: [3, 4], carb: [8, 12], grasa: [13, 15], verdura: [17] },
    Almuerzo: { proteina: [1, 6], carb: [7, 11], grasa: [13],     verdura: [16] },
    Comida:   { proteina: [6, 1], carb: [7, 10], grasa: [14],     verdura: [16, 18] },
    Cena:     { proteina: [5, 1], carb: [11, 7], grasa: [15, 13], verdura: [17] },
    Snack:    { proteina: [3, 4], carb: [20],    grasa: [15],     verdura: [] }
  },
  volumen: {
    Desayuno: { proteina: [3, 4], carb: [8, 12], grasa: [13, 15], verdura: [17] },
    Almuerzo: { proteina: [6, 1], carb: [7, 11], grasa: [13],     verdura: [16] },
    Comida:   { proteina: [6, 5], carb: [7, 10], grasa: [14, 13], verdura: [16, 18] },
    Cena:     { proteina: [1, 6], carb: [11, 7], grasa: [15],     verdura: [17, 18] },
    Snack:    { proteina: [3],    carb: [20, 19], grasa: [15],    verdura: [] }
  }
};

// Slots de macros que se incluyen según el número de comidas
const SLOTS_POR_COMIDA = {
  Desayuno: ['proteina', 'carb', 'grasa', 'verdura'],
  Almuerzo: ['proteina', 'verdura'],
  Comida:   ['proteina', 'carb', 'grasa', 'verdura'],
  Cena:     ['proteina', 'carb', 'verdura'],
  Snack:    ['proteina', 'carb', 'grasa']
};

// ── API pública ───────────────────────────────────────────

/**
 * Genera un plan alimenticio completo con gramajes reales.
 * @param {Object} params — { comidas, objetivo, alergias?, catalogoAlimentos }
 * @returns {Array} — comidas con items de alimentos + gramajes calculados
 */
export function generarPlan({ comidas, objetivo, alergias = [], catalogoAlimentos }) {
  const plantilla = PLANTILLAS[objetivo] ?? PLANTILLAS.mantenimiento;
  const indice    = _indexarAlimentos(catalogoAlimentos);

  return comidas.map(comida => {
    const slots    = SLOTS_POR_COMIDA[comida.nombre] ?? ['proteina', 'carb'];
    const template = plantilla[comida.nombre];
    if (!template) return { ...comida, items: [] };

    const items = slots.flatMap(slot => {
      const ids = template[slot] ?? [];
      // Primero que no esté en alergias
      const id  = ids.find(i => {
        const a = indice[i];
        return a && !_tieneAlergia(a, alergias);
      });
      if (!id) return [];
      const alimento = indice[id];
      if (!alimento) return [];

      const gramos = _calcularGramos(alimento, slot, comida);
      const gramosCompra = _gramosConMerma(gramos, alimento.merma);

      return [{
        id:           alimento.id,
        nombre:       alimento.nombre,
        categoria:    alimento.categoria,
        emoji:        _emoji(alimento.categoria),
        gramos:       Math.round(gramos),
        gramosCompra: Math.round(gramosCompra),
        unidad:       alimento.unidad,
        macros: {
          calorias:      _proporcion(alimento.calorias, gramos),
          proteina:      _proporcion(alimento.protein,  gramos),
          carbohidratos: _proporcion(alimento.carbs,    gramos),
          grasas:        _proporcion(alimento.fats,     gramos)
        }
      }];
    });

    // Totales reales de la comida (suma de items asignados)
    const totales = _sumarMacros(items);

    return { ...comida, items, totalesReales: totales };
  });
}

/**
 * Calcula los gramajes de compra para toda la semana.
 * @param {Array} planConItems — resultado de generarPlan()
 * @returns {Array} — { nombre, gramosCompra, unidad }[]
 */
export function calcularListaCompra(planConItems) {
  const acum = {};
  planConItems.forEach(comida => {
    (comida.items ?? []).forEach(item => {
      if (!acum[item.id]) {
        acum[item.id] = { nombre: item.nombre, gramosCompra: 0, unidad: item.unidad, emoji: item.emoji };
      }
      // × 7 días de la semana
      acum[item.id].gramosCompra += item.gramosCompra * 7;
    });
  });
  return Object.values(acum).map(a => ({
    ...a,
    gramosCompra: Math.round(a.gramosCompra)
  }));
}

// ── Privadas ──────────────────────────────────────────────

function _indexarAlimentos(catalogo) {
  return catalogo.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
}

// Gramaje objetivo por slot y meta de la comida (macro dominante)
function _calcularGramos(alimento, slot, comida) {
  const base100 = alimento.calorias; // kcal por 100 g
  if (base100 === 0) return 0;

  const caloriasSlot = _caloriasParaSlot(slot, comida);
  return (caloriasSlot / base100) * 100;
}

// Calorías asignadas a cada slot dentro de la comida
function _caloriasParaSlot(slot, comida) {
  const total = comida.calorias;
  const pct = {
    proteina: 0.40,
    carb:     0.35,
    grasa:    0.15,
    verdura:  0.10
  };
  return total * (pct[slot] ?? 0.20);
}

function _gramosConMerma(gramos, merma = 0) {
  return gramos / (1 - merma);
}

function _proporcion(valorPor100g, gramos) {
  return Math.round((valorPor100g * gramos) / 100);
}

function _sumarMacros(items) {
  return items.reduce((acc, i) => ({
    calorias:      acc.calorias      + i.macros.calorias,
    proteina:      acc.proteina      + i.macros.proteina,
    carbohidratos: acc.carbohidratos + i.macros.carbohidratos,
    grasas:        acc.grasas        + i.macros.grasas
  }), { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0 });
}

function _tieneAlergia(alimento, alergias) {
  if (!alergias.length) return false;
  const nombre = alimento.nombre.toLowerCase();
  return alergias.some(a => nombre.includes(a.toLowerCase()));
}

function _emoji(categoria) {
  return { proteína: '🥩', carbohidrato: '🍞', grasa: '🥑', verdura: '🥦', fruta: '🍎' }[categoria] ?? '🍽️';
}